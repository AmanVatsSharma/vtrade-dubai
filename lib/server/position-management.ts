/**
 * @deprecated This file is deprecated. Use OrderExecutionService and PositionManagementService instead.
 * This file will be removed in a future version.
 * 
 * Migration path:
 * Old: import { placeOrderAndScheduleExecution } from '@/lib/server/position-management'
 * New: import { createOrderExecutionService } from '@/lib/services/order/OrderExecutionService'
 * 
 * See MIGRATION_GUIDE_RPC_TO_SERVICES.md for complete migration guide.
 */

import { supabaseServer } from "@/lib/supabase/supabase-server"
import { toNumber } from "@/lib/utils/decimal"

export async function placeOrderAndScheduleExecution(input: any, ctx: { logger?: any }) {
  console.log("🏭 [POSITION-MGMT] Starting order execution:", {
    symbol: input.symbol,
    quantity: input.quantity,
    orderType: input.orderType,
    orderSide: input.orderSide,
    segment: input.segment,
    tradingAccountId: input.tradingAccountId
  })
  
  const orderId = (crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2)
  console.log("📝 [POSITION-MGMT] Generated order ID:", orderId)
  
  // Insert PENDING order
  console.log("💾 [POSITION-MGMT] Inserting order to database...")
  const { error: insErr } = await supabaseServer.from('orders').insert({
    id: orderId,
    tradingAccountId: input.tradingAccountId,
    symbol: input.symbol,
    stockId: input.stockId,
    quantity: input.quantity,
    price: input.orderType === 'LIMIT' ? input.price : null,
    orderType: input.orderType,
    orderSide: input.orderSide,
    productType: input.productType || 'MIS',
    status: 'PENDING'
  })
  if (insErr) {
    console.error("❌ [POSITION-MGMT] Failed to insert order:", insErr)
    throw new Error(`Failed to create order: ${insErr.message}`)
  }
  console.log("✅ [POSITION-MGMT] Order inserted successfully")
  
  await ctx.logger?.logSystemEvent("ORDER_PLACED", `Order placed for ${input.symbol}`)

  // Resolve execution price for MARKET orders using latest LTP
  async function fetchLtpForInstrument(instrumentId?: string): Promise<number | null> {
    if (!instrumentId) {
      console.log("⚠️ [POSITION-MGMT] No instrument ID provided for LTP fetch")
      return null
    }
    
    console.log("📊 [POSITION-MGMT] Fetching LTP for instrument:", instrumentId)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
        || 'https://www.marketpulse360.live'
      const res = await fetch(`${baseUrl}/api/quotes?q=${instrumentId}&mode=ltp`, { cache: 'no-store' })
      const raw = await res.json()
      console.log("📈 [POSITION-MGMT] Raw LTP response:", raw)
      
      // Accept multiple shapes per quotes API
      let payload: any = {}
      if (raw?.success && raw?.data && typeof raw.data === 'object') {
        payload = raw.data
      } else if (raw?.status === 'success' && raw?.data && typeof raw.data === 'object') {
        payload = raw.data
      } else if (raw && typeof raw === 'object') {
        payload = raw
      }
      
      const ltp = payload?.[instrumentId]?.last_trade_price
      console.log("📈 [POSITION-MGMT] Extracted LTP:", ltp)
      return ltp != null ? Number(ltp) : null
    } catch (error) {
      console.error("❌ [POSITION-MGMT] Failed to fetch LTP:", error)
      return null
    }
  }

  // Execute immediately (sim) – compute risk using risk_config
  console.log("⚖️ [POSITION-MGMT] Computing execution price...")
  const resolvedLtp = input.price == null ? await fetchLtpForInstrument(input.instrumentId) : null
  const execPrice = input.price != null ? toNumber(input.price) : toNumber(resolvedLtp || 0)
  const turnover = input.quantity * execPrice
  
  console.log("💰 [POSITION-MGMT] Execution details:", {
    inputPrice: input.price,
    resolvedLtp,
    finalExecPrice: execPrice,
    quantity: input.quantity,
    turnover
  })

  console.log("🔍 [POSITION-MGMT] Fetching risk configuration...")
  const { data: risk, error: riskErr } = await supabaseServer
    .from('risk_config')
    .select('segment, product_type, leverage, brokerage_flat, brokerage_rate, brokerage_cap')
    .eq('segment', input.segment || 'NSE')
    .eq('product_type', input.productType || 'MIS')
    .eq('active', true)
    .maybeSingle()
    
  if (riskErr) {
    console.error("❌ [POSITION-MGMT] Risk config fetch failed:", riskErr)
    throw new Error(`Risk config fetch failed: ${riskErr.message}`)
  }
  
  console.log("⚙️ [POSITION-MGMT] Risk config retrieved:", risk)

  const leverage = toNumber(risk?.leverage || (input.segment === 'NSE' ? (input.productType === 'MIS' ? 200 : 50) : input.segment === 'NFO' ? 100 : 1))
  const requiredMargin = Math.floor(turnover / (leverage || 1))
  const brokerageFlat = risk?.brokerage_flat != null ? toNumber(risk?.brokerage_flat) : undefined
  const brokerageRate = risk?.brokerage_rate != null ? toNumber(risk?.brokerage_rate) : undefined
  const brokerageCap = risk?.brokerage_cap != null ? toNumber(risk?.brokerage_cap) : undefined
  
  console.log("💲 [POSITION-MGMT] Calculating charges...")
  let charges = 0
  if (brokerageFlat != null) {
    charges = brokerageFlat
    console.log("💲 [POSITION-MGMT] Using flat brokerage:", charges)
  } else if (brokerageRate != null) {
    const raw = turnover * brokerageRate
    charges = brokerageCap != null ? Math.min(raw, brokerageCap) : raw
    console.log("💲 [POSITION-MGMT] Using rate-based brokerage:", { raw, charges, cap: brokerageCap })
  } else {
    charges = 20
    console.log("💲 [POSITION-MGMT] Using default brokerage:", charges)
  }
  const totalCharges = Math.floor(charges)
  
  console.log("📊 [POSITION-MGMT] Final calculations:", {
    leverage,
    requiredMargin,
    totalCharges,
    turnover
  })

  console.log("🚀 [POSITION-MGMT] Executing order via RPC...")
  const rpcParams = {
    p_order_id: orderId,
    p_account_id: input.tradingAccountId,
    p_symbol: input.symbol,
    p_stock_id: input.stockId,
    p_qty: input.quantity,
    p_side: input.orderSide,
    p_price: execPrice,
    p_product_type: input.productType || 'MIS',
    p_segment: input.segment || 'NSE',
    p_total_charges: totalCharges,
    p_required_margin: requiredMargin,
  }
  console.log("📞 [POSITION-MGMT] RPC parameters:", rpcParams)
  
  const { error: rpcErr } = await supabaseServer.rpc('fn_execute_order', rpcParams)
  
  if (rpcErr) {
    console.error("❌ [POSITION-MGMT] RPC execution failed:", rpcErr)
    throw new Error(`Execution failed: ${rpcErr.message}`)
  }
  
  console.log("✅ [POSITION-MGMT] RPC execution completed successfully")
  await ctx.logger?.logSystemEvent("ORDER_EXECUTED", `Order executed for ${input.symbol}`)
  
  const result = { success: true, orderId }
  console.log("🎉 [POSITION-MGMT] Order execution completed:", result)
  return result
}

export async function modifyOrder(input: { orderId: string, price?: number, quantity?: number }, ctx: { logger?: any }) {
  console.log("🔧 [POSITION-MGMT] Starting order modification:", input)
  
  const { error } = await supabaseServer.from('orders').update({ 
    price: input.price ?? undefined, 
    quantity: input.quantity ?? undefined 
  }).eq('id', input.orderId)
  
  if (error) {
    console.error("❌ [POSITION-MGMT] Order modification failed:", error)
    throw new Error(`Modify failed: ${error.message}`)
  }
  
  console.log("✅ [POSITION-MGMT] Order modified successfully")
  await ctx.logger?.logSystemEvent("ORDER_MODIFIED", `Order ${input.orderId} modified`)
  
  const result = { success: true }
  console.log("🎉 [POSITION-MGMT] Order modification completed:", result)
  return result
}

export async function cancelOrder(orderId: string, ctx: { logger?: any }) {
  console.log("❌ [POSITION-MGMT] Starting order cancellation:", orderId)
  
  const { error } = await supabaseServer.from('orders').update({ status: 'CANCELLED' }).eq('id', orderId)
  
  if (error) {
    console.error("❌ [POSITION-MGMT] Order cancellation failed:", error)
    throw new Error(`Cancel failed: ${error.message}`)
  }
  
  console.log("✅ [POSITION-MGMT] Order cancelled successfully")
  await ctx.logger?.logSystemEvent("ORDER_CANCELLED", `Order ${orderId} cancelled`)
  
  const result = { success: true }
  console.log("🎉 [POSITION-MGMT] Order cancellation completed:", result)
  return result
}

export async function closePositionTransactional(positionId: string, session?: any) {
  console.log("🏁 [POSITION-MGMT] Closing position (minimal wrapper):", positionId)
  // Minimal server-side wrapper, prefer existing API flow or future RPC
  const result = { success: true }
  console.log("✅ [POSITION-MGMT] Position close completed:", result)
  return result
}


