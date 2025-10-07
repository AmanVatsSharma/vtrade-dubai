import { NextResponse } from 'next/server'
import { createFundManagementService } from '@/lib/services/funds/FundManagementService'
import { createTradingLogger } from '@/lib/services/logging/TradingLogger'

export async function POST(req: Request) {
  console.log("🌐 [API-FUNDS] POST request received")
  
  try {
    const body = await req.json()
    console.log("📝 [API-FUNDS] Request body:", body)
    
    const { tradingAccountId, amount, type, description, userId } = body

    if (!tradingAccountId || !amount || !type) {
      console.error("❌ [API-FUNDS] Missing required fields:", { tradingAccountId, amount, type })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log("💰 [API-FUNDS] Processing fund operation:", { tradingAccountId, amount, type })

    // Create logger with context
    const logger = createTradingLogger({
      tradingAccountId,
      userId,
      clientId: userId
    })

    // Create service and execute operation
    const fundService = createFundManagementService(logger)
    let result

    switch (type) {
      case 'BLOCK':
        console.log("🔒 [API-FUNDS] Executing BLOCK operation")
        result = await fundService.blockMargin(
          tradingAccountId, 
          amount, 
          description || 'Margin blocked for order'
        )
        break
      
      case 'RELEASE':
        console.log("🔓 [API-FUNDS] Executing RELEASE operation")
        result = await fundService.releaseMargin(
          tradingAccountId, 
          amount, 
          description || 'Margin released'
        )
        break
      
      case 'CREDIT':
        console.log("💰 [API-FUNDS] Executing CREDIT operation")
        result = await fundService.credit(
          tradingAccountId, 
          amount, 
          description || 'Credit'
        )
        break
      
      case 'DEBIT':
        console.log("💸 [API-FUNDS] Executing DEBIT operation")
        result = await fundService.debit(
          tradingAccountId, 
          amount, 
          description || 'Debit'
        )
        break
      
      default:
        console.error("❌ [API-FUNDS] Invalid operation type:", type)
        return NextResponse.json({ error: 'Invalid operation type' }, { status: 400 })
    }
    
    console.log("✅ [API-FUNDS] Fund operation completed successfully")
    console.log("🎉 [API-FUNDS] Fund operation result:", result)
    
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('❌ [API-FUNDS] Fund management error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.log("📤 [API-FUNDS] Sending error response:", errorMessage)
    
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
