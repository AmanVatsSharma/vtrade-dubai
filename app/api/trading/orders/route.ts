import { NextResponse } from 'next/server'
import { createOrderExecutionService } from '@/lib/services/order/OrderExecutionService'
import { createTradingLogger } from '@/lib/services/logging/TradingLogger'
import { placeOrderSchema, modifyOrderSchema, cancelOrderSchema } from '@/lib/server/validation'

export async function POST(req: Request) {
  console.log("🌐 [API-ORDERS] POST request received")
  
  try {
    const body = await req.json()
    console.log("📝 [API-ORDERS] Request body:", body)
    
    const input = placeOrderSchema.parse(body)
    console.log("✅ [API-ORDERS] Schema validation passed")
    
    // Create logger with context
    const logger = createTradingLogger({
      tradingAccountId: input.tradingAccountId,
      userId: input.userId,
      clientId: input.userId,
      symbol: input.symbol
    })
    
    // Create service and place order
    const orderService = createOrderExecutionService(logger)
    const result = await orderService.placeOrder(input)
    console.log("🎉 [API-ORDERS] Order placement result:", result)
    
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("❌ [API-ORDERS] POST error:", {
      name: error?.name,
      message: error?.message,
      issues: error?.issues
    })
    
    const message = error?.issues?.[0]?.message || error?.message || 'Invalid request'
    const status = error?.name === 'ZodError' ? 400 : 500
    
    console.log("📤 [API-ORDERS] Sending error response:", { message, status })
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(req: Request) {
  console.log("🌐 [API-ORDERS] PATCH request received")
  
  try {
    const body = await req.json()
    console.log("📝 [API-ORDERS] Modify request body:", body)
    
    const input = modifyOrderSchema.parse(body)
    console.log("✅ [API-ORDERS] Modify schema validation passed")
    
    // Create service and modify order
    const orderService = createOrderExecutionService()
    const result = await orderService.modifyOrder(input.orderId, {
      price: input.price,
      quantity: input.quantity
    })
    console.log("🎉 [API-ORDERS] Order modification result:", result)
    
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("❌ [API-ORDERS] PATCH error:", {
      name: error?.name,
      message: error?.message,
      issues: error?.issues
    })
    
    const message = error?.issues?.[0]?.message || error?.message || 'Invalid request'
    const status = error?.name === 'ZodError' ? 400 : 500
    
    console.log("📤 [API-ORDERS] Sending modify error response:", { message, status })
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(req: Request) {
  console.log("🌐 [API-ORDERS] DELETE request received")
  
  try {
    const body = await req.json()
    console.log("📝 [API-ORDERS] Cancel request body:", body)
    
    const input = cancelOrderSchema.parse(body)
    console.log("✅ [API-ORDERS] Cancel schema validation passed")
    
    // Create service and cancel order
    const orderService = createOrderExecutionService()
    const result = await orderService.cancelOrder(input.orderId)
    console.log("🎉 [API-ORDERS] Order cancellation result:", result)
    
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error("❌ [API-ORDERS] DELETE error:", {
      name: error?.name,
      message: error?.message,
      issues: error?.issues
    })
    
    const message = error?.issues?.[0]?.message || error?.message || 'Invalid request'
    const status = error?.name === 'ZodError' ? 400 : 500
    
    console.log("📤 [API-ORDERS] Sending cancel error response:", { message, status })
    return NextResponse.json({ error: message }, { status })
  }
}
