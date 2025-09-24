import { NextResponse } from "next/server"
import { closePositionWithFundManagement } from "./actions"
import { supabaseServer } from "@/lib/supabase/supabase-server"
import { toNumber } from "@/lib/utils/decimal"
import { releaseMargin } from "@/lib/server/fund-management"

export async function POST(req: Request) {
  console.log("🌐 [API-POSITIONS] POST request received (close position)")
  
  try {
    const body = await req.json()
    console.log("📝 [API-POSITIONS] Close position request body:", body)
    
    const { positionId, tradingAccountId } = body

    if (!positionId || !tradingAccountId) {
      console.error("❌ [API-POSITIONS] Missing required fields:", { positionId, tradingAccountId })
      return new NextResponse('Missing required fields', { status: 400 })
    }

    console.log("🏁 [API-POSITIONS] Starting position closure:", { positionId, tradingAccountId })
    const result = await closePositionWithFundManagement(positionId, tradingAccountId)
    console.log("🎉 [API-POSITIONS] Position closure result:", result)
    
    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('❌ [API-POSITIONS] Position closure error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.log("📤 [API-POSITIONS] Sending error response:", errorMessage)
    
    return new NextResponse(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export async function PATCH(req: Request) {
  console.log("🌐 [API-POSITIONS] PATCH request received (update position)")
  
  try {
    const body = await req.json()
    console.log("📝 [API-POSITIONS] Update position request body:", body)
    
    const { positionId, tradingAccountId, updates, shouldReleaseMargin } = body
    
    if (!positionId || !tradingAccountId || !updates) {
      console.error("❌ [API-POSITIONS] Missing required fields:", { positionId, tradingAccountId, hasUpdates: !!updates })
      return new NextResponse('Missing required fields', { status: 400 })
    }

    console.log("🔧 [API-POSITIONS] Position update details:", { positionId, tradingAccountId, updates, shouldReleaseMargin })

    // Optionally release margin via unified funds API when closing or reducing
    if (shouldReleaseMargin) {
      console.log("🔓 [API-POSITIONS] Releasing margin for position update...")
      
      // Fetch position for margin computation context
      const { data: pos, error } = await supabaseServer
        .from('positions')
        .select('id, quantity, averagePrice, stock:Stock(segment)')
        .eq('id', positionId)
        .single()
        
      if (error || !pos) {
        console.error("❌ [API-POSITIONS] Position not found for margin release:", error)
        return NextResponse.json({ error: 'Position not found' }, { status: 404 })
      }
      
      console.log("📊 [API-POSITIONS] Position data for margin calculation:", pos)
      
      const turnover = Math.abs(toNumber(pos.quantity)) * toNumber(pos.averagePrice)
      const seg = pos.stock?.[0]?.segment
      const isEquity = seg === 'NSE' || seg === 'NSE_EQ'
      const isFno = seg === 'NFO'
      const margin = Math.floor(isEquity ? turnover * 0.1 : isFno ? turnover * 0.2 : turnover)
      
      console.log("💰 [API-POSITIONS] Margin calculation:", { turnover, segment: seg, isEquity, isFno, margin })
      
      await releaseMargin(tradingAccountId, margin, `position_update_${positionId}`)
      console.log("✅ [API-POSITIONS] Margin released successfully")
    }

    console.log("💾 [API-POSITIONS] Updating position in database...")
    const { error: updErr } = await supabaseServer
      .from('positions')
      .update(updates)
      .eq('id', positionId)

    if (updErr) {
      console.error("❌ [API-POSITIONS] Position update failed:", updErr)
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    console.log("✅ [API-POSITIONS] Position updated successfully")
    const result = { success: true }
    console.log("🎉 [API-POSITIONS] Position update result:", result)
    
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("❌ [API-POSITIONS] PATCH error:", error)
    const errorMessage = error?.message || 'Invalid request'
    console.log("📤 [API-POSITIONS] Sending update error response:", errorMessage)
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
