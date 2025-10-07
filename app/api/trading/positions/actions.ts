import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Database } from "@/types/supabase"
import { supabaseServer } from "@/lib/supabase/supabase-server"
import { toNumber } from "@/lib/utils/decimal"

/**
 * Server-side Supabase client
 * Use this in API routes and Server Components
 */
export async function getServerSupabase() {
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookies()
  })
  return supabase
}

/**
 * Close a position and properly handle the fund management
 */
export async function closePositionWithFundManagement(
  positionId: string,
  tradingAccountId: string
) {
  console.log("🏁 [POSITION-ACTIONS] Starting position closure with fund management:", {
    positionId,
    tradingAccountId
  })
  
  const supabase = await getServerSupabase()

  // 1) Fetch enriched position (with stock for segment) and last executed order for productType inference
  console.log("📊 [POSITION-ACTIONS] Fetching position data...")
  const { data: posRes, error: positionError } = await supabase
    .from("positions")
    .select("id,tradingAccountId,symbol,quantity,averagePrice,unrealizedPnL,dayPnL,stock:Stock(segment, instrumentId)")
    .eq("id", positionId)
    .single()

  if (positionError || !posRes) {
    console.error("❌ [POSITION-ACTIONS] Failed to fetch position:", positionError)
    throw new Error(`Failed to fetch position: ${positionError?.message}`)
  }

  console.log("✅ [POSITION-ACTIONS] Position data retrieved:", posRes)

  const quantity = toNumber(posRes.quantity)
  const avg = toNumber(posRes.averagePrice)
  
  console.log("🔢 [POSITION-ACTIONS] Position numbers:", { quantity, averagePrice: avg })

  // 2) Fetch LTP server-side to simulate exit price
  console.log("📈 [POSITION-ACTIONS] Fetching current LTP for exit price...")
  let exitPrice = avg
  try {
    if (posRes.stock?.[0]?.instrumentId) {
      console.log("📊 [POSITION-ACTIONS] Fetching LTP for instrument:", posRes.stock[0].instrumentId)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
        || 'https://www.marketpulse360.live'
      const res = await fetch(`${baseUrl}/api/quotes?q=${posRes.stock[0].instrumentId}&mode=ltp`, { cache: 'no-store' })
      const quoteData = await res.json()
      console.log("📈 [POSITION-ACTIONS] LTP response:", quoteData)
      
      const payload = quoteData?.success ? quoteData.data.data : quoteData
      const ltp = payload?.data?.[posRes.stock[0].instrumentId]?.last_trade_price || payload?.[posRes.stock[0].instrumentId]?.last_trade_price
      
      if (ltp != null) {
        exitPrice = Number(ltp)
        console.log("✅ [POSITION-ACTIONS] Updated exit price from LTP:", exitPrice)
      } else {
        console.log("⚠️ [POSITION-ACTIONS] No LTP found, using average price:", exitPrice)
      }
    } else {
      console.log("⚠️ [POSITION-ACTIONS] No instrument ID, using average price:", exitPrice)
    }
  } catch (error) {
    console.error("❌ [POSITION-ACTIONS] Failed to fetch LTP:", error)
    console.log("⚠️ [POSITION-ACTIONS] Using average price as exit price:", exitPrice)
  }

  // 3) Compute realized P&L
  const realizedPnl = (exitPrice - avg) * quantity
  console.log("💰 [POSITION-ACTIONS] P&L calculation:", {
    exitPrice,
    avgPrice: avg,
    quantity,
    realizedPnl
  })

  // 4) Compute margin to release based on simple policy (can be moved to risk_config)
  const turnover = Math.abs(quantity) * avg
  const segment = posRes.stock?.[0]?.segment
  const productType = undefined // optional: infer from last executed order if needed
  
  console.log("🔍 [POSITION-ACTIONS] Computing margin to release:", {
    turnover,
    segment,
    productType
  })
  
  function computeRequiredMargin(seg: string | undefined, t: number, pt?: string) {
    const isEquity = seg === 'NSE' || seg === 'NSE_EQ'
    const isFno = seg === 'NFO'
    if (pt === 'INTRADAY' || pt === 'MIS') {
      if (isEquity) return t * 0.1
      if (isFno) return t * 0.2
      return t * 0.1
    }
    return t
  }
  const releasedMargin = Math.floor(computeRequiredMargin(segment, turnover, productType))
  console.log("💸 [POSITION-ACTIONS] Margin to release:", releasedMargin)

  // 5) Update position to qty 0 and store realized P&L in fields
  console.log("💾 [POSITION-ACTIONS] Updating position to closed state...")
  const { error: closeError } = await supabase
    .from("positions")
    .update({ quantity: 0, stopLoss: null, target: null, unrealizedPnL: realizedPnl, dayPnL: realizedPnl })
    .eq("id", positionId)

  if (closeError) {
    console.error("❌ [POSITION-ACTIONS] Failed to update position:", closeError)
    throw new Error(`Failed to close position: ${closeError.message}`)
  }
  console.log("✅ [POSITION-ACTIONS] Position updated to closed state")

  // 6) Use transactional RPC to release margin and apply realized PnL atomically
  console.log("🚀 [POSITION-ACTIONS] Calling RPC to finalize position closure...")
  const rpcParams = {
    p_position_id: positionId,
    p_account_id: tradingAccountId,
    p_exit_price: exitPrice,
    p_release_margin: releasedMargin,
  }
  console.log("📞 [POSITION-ACTIONS] RPC parameters:", rpcParams)
  
  const { error: rpcErr } = await supabaseServer.rpc('fn_close_position', rpcParams)
  
  if (rpcErr) {
    console.error("❌ [POSITION-ACTIONS] RPC finalization failed:", rpcErr)
    throw new Error(`Failed to finalize close: ${rpcErr.message}`)
  }
  console.log("✅ [POSITION-ACTIONS] RPC finalization completed successfully")

  const result = { success: true, marginReleased: releasedMargin, realizedPnl, exitPrice }
  console.log("🎉 [POSITION-ACTIONS] Position closure completed:", result)
  return result
}
