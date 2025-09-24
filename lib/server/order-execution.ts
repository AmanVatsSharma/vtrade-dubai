import { createLoggerFromSession } from "@/lib/logger"
import { placeOrderSchema, modifyOrderSchema, cancelOrderSchema, type PlaceOrderInput } from "./validation"

// Placeholder server stubs – to be wired to RPC-backed modules
import * as Funds from "./fund-management"
import * as Positions from "./position-management"

export async function placeOrder(payload: PlaceOrderInput, session?: any) {
  console.log("🚀 [ORDER-EXECUTION] Starting order placement:", {
    symbol: payload.symbol,
    quantity: payload.quantity,
    orderType: payload.orderType,
    orderSide: payload.orderSide,
    price: payload.price,
    tradingAccountId: payload.tradingAccountId
  })
  
  const input = placeOrderSchema.parse(payload)
  console.log("✅ [ORDER-EXECUTION] Order validation passed:", input)
  
  const logger = session ? createLoggerFromSession(session, input.tradingAccountId) : null
  await logger?.logSystemEvent("ORDER_START", `Placing order for ${input.symbol}`)
  
  try {
    // Delegate to Positions/Funds module orchestration (actual execution handled async/background)
    const result = await Positions.placeOrderAndScheduleExecution(input, { logger })
    console.log("✅ [ORDER-EXECUTION] Order placement completed:", result)
    return result
  } catch (error) {
    console.error("❌ [ORDER-EXECUTION] Order placement failed:", error)
    throw error
  }
}

export async function modifyOrder(payload: unknown, session?: any) {
  console.log("🔧 [ORDER-EXECUTION] Starting order modification:", payload)
  
  const input = modifyOrderSchema.parse(payload)
  console.log("✅ [ORDER-EXECUTION] Modify order validation passed:", input)
  
  const logger = session ? createLoggerFromSession(session) : null
  await logger?.logSystemEvent("ORDER_MODIFY_START", `Modifying order ${input.orderId}`)
  
  try {
    const result = await Positions.modifyOrder(input, { logger })
    console.log("✅ [ORDER-EXECUTION] Order modification completed:", result)
    return result
  } catch (error) {
    console.error("❌ [ORDER-EXECUTION] Order modification failed:", error)
    throw error
  }
}

export async function cancelOrder(payload: unknown, session?: any) {
  console.log("❌ [ORDER-EXECUTION] Starting order cancellation:", payload)
  
  const input = cancelOrderSchema.parse(payload)
  console.log("✅ [ORDER-EXECUTION] Cancel order validation passed:", input)
  
  const logger = session ? createLoggerFromSession(session) : null
  await logger?.logSystemEvent("ORDER_CANCEL_START", `Cancelling order ${input.orderId}`)
  
  try {
    const result = await Positions.cancelOrder(input.orderId, { logger })
    console.log("✅ [ORDER-EXECUTION] Order cancellation completed:", result)
    return result
  } catch (error) {
    console.error("❌ [ORDER-EXECUTION] Order cancellation failed:", error)
    throw error
  }
}



