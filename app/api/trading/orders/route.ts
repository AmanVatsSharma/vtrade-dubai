import { NextResponse } from 'next/server'
import { placeOrder, modifyOrder, cancelOrder } from '@/lib/server/order-execution'
import { placeOrderSchema, modifyOrderSchema, cancelOrderSchema } from '@/lib/server/validation'

export async function POST(req: Request) {
  console.log("🌐 [API-ORDERS] POST request received")
  
  try {
    const body = await req.json()
    console.log("📝 [API-ORDERS] Request body:", body)
    
    const input = placeOrderSchema.parse(body)
    console.log("✅ [API-ORDERS] Schema validation passed")
    
    const result = await placeOrder(input)
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
    
    const result = await modifyOrder(input)
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
    
    const result = await cancelOrder(input)
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
