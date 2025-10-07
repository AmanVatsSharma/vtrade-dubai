import { NextResponse } from "next/server"
import { createPositionManagementService } from '@/lib/services/position/PositionManagementService'
import { createTradingLogger } from '@/lib/services/logging/TradingLogger'

export async function POST(req: Request) {
  console.log("🌐 [API-POSITIONS] POST request received (close position)")
  
  try {
    const body = await req.json()
    console.log("📝 [API-POSITIONS] Close position request body:", body)
    
    let { positionId, tradingAccountId } = body

    if (!positionId) {
      console.error("❌ [API-POSITIONS] Missing positionId")
      return new NextResponse('Position ID required', { status: 400 })
    }

    // If tradingAccountId not provided, fetch it from position
    if (!tradingAccountId) {
      console.log("📊 [API-POSITIONS] Trading account ID not provided, fetching from position...")
      const { prisma } = await import('@/lib/prisma')
      const position = await prisma.position.findUnique({
        where: { id: positionId },
        select: { tradingAccountId: true }
      })
      
      if (!position) {
        console.error("❌ [API-POSITIONS] Position not found:", positionId)
        return new NextResponse('Position not found', { status: 404 })
      }
      
      tradingAccountId = position.tradingAccountId
      console.log("✅ [API-POSITIONS] Fetched tradingAccountId from position:", tradingAccountId)
    }

    console.log("🏁 [API-POSITIONS] Starting position closure:", { positionId, tradingAccountId })
    
    // Create logger with context
    const logger = createTradingLogger({
      tradingAccountId,
      positionId
    })
    
    // Create service and close position
    const positionService = createPositionManagementService(logger)
    const result = await positionService.closePosition(positionId, tradingAccountId)
    console.log("🎉 [API-POSITIONS] Position closure result:", result)
    
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('❌ [API-POSITIONS] Position closure error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.log("📤 [API-POSITIONS] Sending error response:", errorMessage)
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  console.log("🌐 [API-POSITIONS] PATCH request received (update position)")
  
  try {
    const body = await req.json()
    console.log("📝 [API-POSITIONS] Update position request body:", body)
    
    const { positionId, tradingAccountId, updates } = body
    
    if (!positionId || !tradingAccountId || !updates) {
      console.error("❌ [API-POSITIONS] Missing required fields:", { positionId, tradingAccountId, hasUpdates: !!updates })
      return new NextResponse('Missing required fields', { status: 400 })
    }

    console.log("🔧 [API-POSITIONS] Position update details:", { positionId, tradingAccountId, updates })

    // Create logger with context
    const logger = createTradingLogger({
      tradingAccountId,
      positionId
    })
    
    // Create service and update position
    const positionService = createPositionManagementService(logger)
    const result = await positionService.updatePosition(positionId, {
      stopLoss: updates.stopLoss,
      target: updates.target
    })
    
    console.log("✅ [API-POSITIONS] Position updated successfully")
    console.log("🎉 [API-POSITIONS] Position update result:", result)
    
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("❌ [API-POSITIONS] PATCH error:", error)
    const errorMessage = error?.message || 'Invalid request'
    console.log("📤 [API-POSITIONS] Sending update error response:", errorMessage)
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
