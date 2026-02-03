export const runtime = 'nodejs';
import { NextResponse } from 'next/server'
import { createOrderExecutionService } from '@/lib/services/order/OrderExecutionService'
import { createTradingLogger } from '@/lib/services/logging/TradingLogger'
import { placeOrderSchema, modifyOrderSchema, cancelOrderSchema } from '@/lib/server/validation'
import { checkRateLimit, getRateLimitKey, RateLimitPresets } from '@/lib/services/security/RateLimiter'
import { trackOperation } from '@/lib/services/monitoring/PerformanceMonitor'
import { getSegmentTradingSession } from '@/lib/server/market-timing'

export async function POST(req: Request) {
  console.log("🌐 [API-ORDERS] POST request received")
  const nowMs = () => (typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now())
  const t0 = nowMs()
  
  try {
    const body = await req.json()
    console.log("📝 [API-ORDERS] Request body:", body)
    console.log("⏱️ [API-ORDERS] parseBody ms", Math.round(nowMs() - t0))
    
    const segmentHint = typeof body?.segment === 'string'
      ? body.segment
      : (typeof body?.exchange === 'string' ? body.exchange : undefined)

    // Enforce market hours per segment (NSE vs MCX windows)
    const { session: tradingWindow, reason: windowReason } = await getSegmentTradingSession(segmentHint)
    console.log("⏱️ [API-ORDERS] marketSessionCheck ms", Math.round(nowMs() - t0))
    if (tradingWindow !== 'open') {
      console.warn(`⛔ [API-ORDERS] Blocked order outside trading window`, {
        segment: segmentHint,
        tradingWindow,
        reason: windowReason
      })
      return NextResponse.json({
        error: windowReason || 'Orders are allowed only during active trading windows.',
        marketSession: tradingWindow
      }, { status: 403 })
    }
    
    // Rate limiting - 20 orders per minute per user
    const rateLimitKey = getRateLimitKey('orders', body.userId || 'anonymous')
    const rateLimit = checkRateLimit(rateLimitKey, RateLimitPresets.TRADING)
    
    if (!rateLimit.allowed) {
      console.warn("⚠️ [API-ORDERS] Rate limit exceeded:", rateLimitKey)
      return NextResponse.json({
        error: 'Too many orders. Please wait before placing more orders.',
        retryAfter: rateLimit.retryAfter
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(RateLimitPresets.TRADING.maxRequests),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
          'X-RateLimit-Reset': rateLimit.resetAt.toISOString(),
          'Retry-After': String(rateLimit.retryAfter || 60)
        }
      })
    }
    
    const input = placeOrderSchema.parse(body)
    console.log("✅ [API-ORDERS] Schema validation passed")
    console.log("⏱️ [API-ORDERS] schemaParse ms", Math.round(nowMs() - t0))
    
    // Track performance
    const result = await trackOperation('order_placement', async () => {
      // Create logger with context
      const logger = createTradingLogger({
        tradingAccountId: input.tradingAccountId,
        userId: input.userId,
        clientId: input.userId,
        symbol: input.symbol
      })
      
      // Create service and place order
      const orderService = createOrderExecutionService(logger)
      return await orderService.placeOrder(input)
    }, { userId: input.userId, symbol: input.symbol })
    console.log("⏱️ [API-ORDERS] placeOrder_total ms", Math.round(nowMs() - t0))
    
    console.log("🎉 [API-ORDERS] Order placement result:", result)
    
    const httpStatus = result?.executionScheduled ? 202 : 200
    return NextResponse.json(result, { 
      status: httpStatus,
      headers: {
        'X-RateLimit-Limit': String(RateLimitPresets.TRADING.maxRequests),
        'X-RateLimit-Remaining': String(rateLimit.remaining),
        'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
      }
    })
  } catch (error: any) {
    console.error("❌ [API-ORDERS] POST error:", {
      name: error?.name,
      message: error?.message,
      issues: error?.issues
    })
    console.log("⏱️ [API-ORDERS] total_failed ms", Math.round(nowMs() - t0))
    
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
