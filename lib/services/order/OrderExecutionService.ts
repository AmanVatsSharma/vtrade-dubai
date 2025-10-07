/**
 * Order Execution Service
 * 
 * Core service for order placement and execution:
 * - Order validation
 * - Margin calculation and blocking
 * - Order creation
 * - Scheduled execution (3-second delay for simulation)
 * - Position management
 * - Comprehensive logging
 * 
 * All operations use Prisma transactions for atomicity
 */

import { executeInTransaction } from "@/lib/services/utils/prisma-transaction"
import { OrderRepository } from "@/lib/repositories/OrderRepository"
import { PositionRepository } from "@/lib/repositories/PositionRepository"
import { FundManagementService } from "@/lib/services/funds/FundManagementService"
import { MarginCalculator } from "@/lib/services/risk/MarginCalculator"
import { TradingLogger } from "@/lib/services/logging/TradingLogger"
import { OrderType, OrderSide } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { PriceResolutionService } from "@/lib/services/order/PriceResolutionService"
import { MarketRealismService } from "@/lib/services/order/MarketRealismService"

console.log("🚀 [ORDER-EXECUTION-SERVICE] Module loaded")

export interface PlaceOrderInput {
  tradingAccountId: string
  stockId: string
  instrumentId: string
  symbol: string
  quantity: number
  price?: number | null
  orderType: OrderType
  orderSide: OrderSide
  productType: string
  segment: string
  lotSize?: number
}

export interface OrderExecutionResult {
  success: boolean
  orderId: string
  message: string
  executionScheduled: boolean
  marginBlocked: number
  chargesDeducted: number
}

export class OrderExecutionService {
  private orderRepo: OrderRepository
  private positionRepo: PositionRepository
  private fundService: FundManagementService
  private marginCalculator: MarginCalculator
  private logger: TradingLogger
  private priceResolution: PriceResolutionService
  private marketRealism: MarketRealismService

  constructor(logger?: TradingLogger) {
    this.orderRepo = new OrderRepository()
    this.positionRepo = new PositionRepository()
    this.marginCalculator = new MarginCalculator()
    this.logger = logger || new TradingLogger()
    this.fundService = new FundManagementService(this.logger)
    this.priceResolution = new PriceResolutionService()
    this.marketRealism = new MarketRealismService()
    
    console.log("🏗️ [ORDER-EXECUTION-SERVICE] Service instance created with enhanced price resolution")
  }

  /**
   * Place an order (main entry point)
   * - Validates order
   * - Calculates margin
   * - Blocks funds
   * - Creates order
   * - Schedules execution
   */
  async placeOrder(input: PlaceOrderInput): Promise<OrderExecutionResult> {
    console.log("🚀 [ORDER-EXECUTION-SERVICE] Placing order:", {
      symbol: input.symbol,
      quantity: input.quantity,
      orderType: input.orderType,
      orderSide: input.orderSide
    })

    await this.logger.logOrder("ORDER_PLACEMENT_START", `Placing ${input.orderSide} order for ${input.symbol}`, {
      symbol: input.symbol,
      quantity: input.quantity,
      orderType: input.orderType,
      productType: input.productType,
      segment: input.segment
    })

    try {
      // Step 1: Validate order
      await this.validateOrder(input)
      console.log("✅ [ORDER-EXECUTION-SERVICE] Order validation passed")

      // Step 2: Resolve execution price using multi-tier strategy
      const priceResolution = await this.priceResolution.resolveExecutionPrice({
        instrumentId: input.instrumentId,
        stockId: input.stockId,
        symbol: input.symbol,
        orderType: input.orderType,
        limitPrice: input.price,
        dialogPrice: input.price  // Pass dialog price as fallback
      })

      console.log("💰 [ORDER-EXECUTION-SERVICE] Price resolution:", {
        price: priceResolution.price,
        source: priceResolution.source,
        confidence: priceResolution.confidence,
        warnings: priceResolution.warnings
      })

      // Step 2b: Apply market realism (bid-ask spread + slippage)
      const marketRealism = await this.marketRealism.applyMarketRealism(
        priceResolution.price,
        input.orderSide,
        input.segment,
        input.quantity,
        input.lotSize || 1
      )

      console.log("💸 [ORDER-EXECUTION-SERVICE] Market realism applied:", {
        basePrice: marketRealism.basePrice,
        executionPrice: marketRealism.executionPrice,
        spreadPercent: marketRealism.spreadPercent,
        slippagePercent: marketRealism.slippagePercent,
        totalImpact: marketRealism.totalImpactPercent + '%'
      })

      const executionPrice = marketRealism.executionPrice
      const allWarnings = [...priceResolution.warnings, ...marketRealism.warnings]

      // Step 3: Calculate margin and charges
      const marginCalc = await this.marginCalculator.calculateMargin(
        input.segment,
        input.productType,
        input.quantity,
        executionPrice,
        input.lotSize || 1
      )

      console.log("📊 [ORDER-EXECUTION-SERVICE] Margin calculation:", marginCalc)

      await this.logger.logOrder("MARGIN_CALCULATED", "Margin and charges calculated", {
        requiredMargin: marginCalc.requiredMargin,
        brokerage: marginCalc.brokerage,
        totalCharges: marginCalc.totalCharges,
        totalRequired: marginCalc.totalRequired,
        priceSource: priceResolution.source,
        priceConfidence: priceResolution.confidence,
        basePrice: marketRealism.basePrice,
        executionPrice: marketRealism.executionPrice,
        priceImpact: marketRealism.totalImpactPercent + '%'
      })

      // Step 4: Validate sufficient funds
      const validation = await this.marginCalculator.validateMargin(
        input.tradingAccountId,
        marginCalc.requiredMargin,
        marginCalc.totalCharges
      )

      if (!validation.isValid) {
        console.error("❌ [ORDER-EXECUTION-SERVICE] Insufficient funds:", validation)
        throw new Error(
          `Insufficient funds. Required: ₹${validation.requiredAmount}, Available: ₹${validation.availableMargin}, Shortfall: ₹${validation.shortfall}`
        )
      }

      console.log("✅ [ORDER-EXECUTION-SERVICE] Sufficient funds available")

      // Step 5: Execute in transaction (atomic operation)
      const result = await executeInTransaction(async (tx) => {
        // Block margin
        console.log("🔒 [ORDER-EXECUTION-SERVICE] Blocking margin:", marginCalc.requiredMargin)
        await this.fundService.blockMargin(
          input.tradingAccountId,
          marginCalc.requiredMargin,
          `Margin blocked for ${input.orderSide} ${input.symbol}`
        )

        // Deduct charges
        console.log("💸 [ORDER-EXECUTION-SERVICE] Deducting charges:", marginCalc.totalCharges)
        await this.fundService.debit(
          input.tradingAccountId,
          marginCalc.totalCharges,
          `Brokerage and charges for ${input.orderSide} ${input.symbol}`
        )

        // Create order
        console.log("📝 [ORDER-EXECUTION-SERVICE] Creating order record")
        
        // Verify stockId exists in database to prevent foreign key constraint errors
        const stockExists = await tx.stock.findUnique({
          where: { id: input.stockId },
          select: { id: true }
        })
        
        if (!stockExists) {
          console.error("❌ [ORDER-EXECUTION-SERVICE] Stock not found in database:", input.stockId)
          throw new Error(`Stock not found: ${input.symbol}. Please refresh stock data.`)
        }
        
        const order = await this.orderRepo.create(
          {
            tradingAccountId: input.tradingAccountId,
            stockId: input.stockId, // Now verified to exist
            symbol: input.symbol,
            quantity: input.quantity,
            price: input.orderType === OrderType.LIMIT && input.price !== null ? input.price : executionPrice,
            orderType: input.orderType,
            orderSide: input.orderSide,
            productType: input.productType,
            status: 'PENDING'
          },
          tx
        )

        console.log("✅ [ORDER-EXECUTION-SERVICE] Order created:", order.id)

        return {
          orderId: order.id,
          marginBlocked: marginCalc.requiredMargin,
          chargesDeducted: marginCalc.totalCharges,
          executionPrice
        }
      })

      await this.logger.logOrder("ORDER_PLACED", `Order placed successfully: ${result.orderId}`, {
        orderId: result.orderId,
        marginBlocked: result.marginBlocked,
        chargesDeducted: result.chargesDeducted
      })

      // Step 6: Schedule execution (3 seconds delay for simulation)
      console.log("⏰ [ORDER-EXECUTION-SERVICE] Scheduling order execution in 3 seconds")
      this.scheduleExecution(result.orderId, input, result.executionPrice)

      // Prepare response with warnings
      let responseMessage = "Order placed successfully. Execution scheduled."
      if (allWarnings.length > 0) {
        responseMessage += " Note: " + allWarnings.join('; ')
      }

      const response: OrderExecutionResult = {
        success: true,
        orderId: result.orderId,
        message: responseMessage,
        executionScheduled: true,
        marginBlocked: result.marginBlocked,
        chargesDeducted: result.chargesDeducted
      }

      console.log("🎉 [ORDER-EXECUTION-SERVICE] Order placement completed:", response)
      return response

    } catch (error: any) {
      console.error("❌ [ORDER-EXECUTION-SERVICE] Order placement failed:", error)
      await this.logger.error("ORDER_PLACEMENT_FAILED", error.message, error, {
        symbol: input.symbol,
        quantity: input.quantity
      })
      throw error
    }
  }

  /**
   * Schedule order execution (3-second delay)
   */
  private scheduleExecution(orderId: string, input: PlaceOrderInput, executionPrice: number): void {
    console.log("⏰ [ORDER-EXECUTION-SERVICE] Scheduling execution for order:", orderId)

    setTimeout(async () => {
      try {
        console.log("🎯 [ORDER-EXECUTION-SERVICE] Executing scheduled order:", orderId)
        await this.executeOrder(orderId, input, executionPrice)
      } catch (error: any) {
        console.error("❌ [ORDER-EXECUTION-SERVICE] Scheduled execution failed:", error)
        await this.logger.error("ORDER_EXECUTION_FAILED", error.message, error, {
          orderId
        })
      }
    }, 3000) // 3 seconds
  }

  /**
   * Execute order (called after 3-second delay)
   * - Updates position
   * - Marks order as executed
   * - Logs everything
   */
  private async executeOrder(
    orderId: string,
    input: PlaceOrderInput,
    executionPrice: number
  ): Promise<void> {
    console.log("🎯 [ORDER-EXECUTION-SERVICE] Executing order:", orderId)

    await this.logger.logOrder("ORDER_EXECUTION_START", `Executing order: ${orderId}`, {
      orderId,
      symbol: input.symbol,
      executionPrice
    })

    try {
      await executeInTransaction(async (tx) => {
        // Calculate signed quantity (positive for BUY, negative for SELL)
        const signedQuantity = input.orderSide === OrderSide.BUY 
          ? input.quantity 
          : -input.quantity

        console.log("📊 [ORDER-EXECUTION-SERVICE] Signed quantity:", signedQuantity)

        // Upsert position (create or update)
        console.log("📈 [ORDER-EXECUTION-SERVICE] Updating position")
        const position = await this.positionRepo.upsert(
          input.tradingAccountId,
          input.stockId,
          input.symbol,
          signedQuantity,
          executionPrice,
          tx
        )

        console.log("✅ [ORDER-EXECUTION-SERVICE] Position updated:", position.id)

        // Mark order as executed
        console.log("✅ [ORDER-EXECUTION-SERVICE] Marking order as executed")
        await this.orderRepo.markExecuted(
          orderId,
          input.quantity,
          executionPrice,
          tx
        )

        await this.logger.logPosition("POSITION_UPDATED", `Position updated for ${input.symbol}`, {
          positionId: position.id,
          quantity: position.quantity,
          averagePrice: Number(position.averagePrice)
        })
      })

      await this.logger.logOrder("ORDER_EXECUTED", `Order executed successfully: ${orderId}`, {
        orderId,
        executionPrice,
        symbol: input.symbol
      })

      console.log("🎉 [ORDER-EXECUTION-SERVICE] Order execution completed:", orderId)

    } catch (error: any) {
      console.error("❌ [ORDER-EXECUTION-SERVICE] Order execution failed:", error)
      await this.logger.error("ORDER_EXECUTION_ERROR", error.message, error, {
        orderId
      })
      throw error
    }
  }

  /**
   * Validate order parameters
   */
  private async validateOrder(input: PlaceOrderInput): Promise<void> {
    console.log("🔍 [ORDER-EXECUTION-SERVICE] Validating order:", input.symbol)

    // Validate quantity
    if (input.quantity <= 0) {
      throw new Error("Quantity must be greater than 0")
    }

    // Validate LIMIT order has price
    if (input.orderType === OrderType.LIMIT && !input.price) {
      throw new Error("LIMIT orders must have a price")
    }

    // Validate trading account exists
    const account = await prisma.tradingAccount.findUnique({
      where: { id: input.tradingAccountId }
    })

    if (!account) {
      throw new Error("Trading account not found")
    }

    console.log("✅ [ORDER-EXECUTION-SERVICE] Order validation completed")
  }

  /**
   * DEPRECATED: Old price resolution method
   * Now using PriceResolutionService for robust multi-tier price fetching
   * 
   * Kept for reference but should not be called
   */
  private async resolveExecutionPrice_DEPRECATED(input: PlaceOrderInput): Promise<number> {
    console.warn("⚠️ [ORDER-EXECUTION-SERVICE] DEPRECATED method called - use PriceResolutionService instead")
    
    // This method is now deprecated and replaced by PriceResolutionService
    // which provides multi-tier fallback (Live -> Cached -> Estimated)
    throw new Error("This method is deprecated. Use PriceResolutionService instead.")
  }

  /**
   * Cancel a pending order
   */
  async cancelOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    console.log("❌ [ORDER-EXECUTION-SERVICE] Cancelling order:", orderId)

    await this.logger.logOrder("ORDER_CANCEL_START", `Cancelling order: ${orderId}`, {
      orderId
    })

    try {
      await executeInTransaction(async (tx) => {
        // Get order details
        const order = await this.orderRepo.findById(orderId, tx)

        if (!order) {
          throw new Error("Order not found")
        }

        if (order.status !== 'PENDING') {
          throw new Error(`Cannot cancel ${order.status} order`)
        }

        // Mark order as cancelled
        await this.orderRepo.markCancelled(orderId, tx)

        // Release margin - use the average price if order was filled, otherwise use the order price
        // For MARKET orders without price, fetch current stock price as fallback
        let priceForMarginCalc = Number(order.averagePrice || order.price || 0)
        
        if (priceForMarginCalc === 0 && order.Stock) {
          // Fallback to stock's LTP for margin calculation
          priceForMarginCalc = order.Stock.ltp
          console.log("⚠️ [ORDER-EXECUTION-SERVICE] Using stock LTP for margin calculation:", priceForMarginCalc)
        }
        
        if (priceForMarginCalc === 0) {
          console.error("❌ [ORDER-EXECUTION-SERVICE] Cannot calculate margin - no price available")
          throw new Error("Unable to calculate margin for order cancellation")
        }

        const marginCalc = await this.marginCalculator.calculateMargin(
          order.Stock?.segment || 'NSE',
          order.productType,
          order.quantity,
          priceForMarginCalc,
          order.Stock?.lot_size || 1
        )

        console.log("💰 [ORDER-EXECUTION-SERVICE] Releasing margin:", {
          requiredMargin: marginCalc.requiredMargin,
          priceUsed: priceForMarginCalc,
          segment: order.Stock?.segment,
          productType: order.productType
        })

        await this.fundService.releaseMargin(
          order.tradingAccountId,
          marginCalc.requiredMargin,
          `Margin released for cancelled order ${orderId}`
        )

        console.log("✅ [ORDER-EXECUTION-SERVICE] Order cancelled and margin released")
      })

      await this.logger.logOrder("ORDER_CANCELLED", `Order cancelled successfully: ${orderId}`, {
        orderId
      })

      return {
        success: true,
        message: "Order cancelled successfully"
      }

    } catch (error: any) {
      console.error("❌ [ORDER-EXECUTION-SERVICE] Order cancellation failed:", error)
      await this.logger.error("ORDER_CANCEL_FAILED", error.message, error, { orderId })
      throw error
    }
  }

  /**
   * Modify a pending order
   */
  async modifyOrder(
    orderId: string,
    updates: { price?: number; quantity?: number }
  ): Promise<{ success: boolean; message: string }> {
    console.log("🔧 [ORDER-EXECUTION-SERVICE] Modifying order:", { orderId, updates })

    await this.logger.logOrder("ORDER_MODIFY_START", `Modifying order: ${orderId}`, {
      orderId,
      updates
    })

    try {
      await executeInTransaction(async (tx) => {
        const order = await this.orderRepo.findById(orderId, tx)

        if (!order) {
          throw new Error("Order not found")
        }

        if (order.status !== 'PENDING') {
          throw new Error(`Cannot modify ${order.status} order`)
        }

        // Update order
        await this.orderRepo.update(orderId, updates, tx)

        console.log("✅ [ORDER-EXECUTION-SERVICE] Order modified")
      })

      await this.logger.logOrder("ORDER_MODIFIED", `Order modified successfully: ${orderId}`, {
        orderId,
        updates
      })

      return {
        success: true,
        message: "Order modified successfully"
      }

    } catch (error: any) {
      console.error("❌ [ORDER-EXECUTION-SERVICE] Order modification failed:", error)
      await this.logger.error("ORDER_MODIFY_FAILED", error.message, error, { orderId, updates })
      throw error
    }
  }
}

/**
 * Create order execution service instance
 */
export function createOrderExecutionService(logger?: TradingLogger): OrderExecutionService {
  console.log("🏭 [ORDER-EXECUTION-SERVICE] Creating service instance")
  return new OrderExecutionService(logger)
}

console.log("✅ [ORDER-EXECUTION-SERVICE] Module initialized")