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
import { OrderType, OrderSide, OrderStatus, Prisma } from "@prisma/client"
import type { Stock } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { PriceResolutionService } from "@/lib/services/order/PriceResolutionService"
import { MarketRealismService } from "@/lib/services/order/MarketRealismService"
import { TransactionRepository } from "@/lib/repositories/TransactionRepository"

console.log("🚀 [ORDER-EXECUTION-SERVICE] Module loaded")

export interface PlaceOrderInput {
  tradingAccountId: string
  stockId?: string | null
  instrumentId?: string | null
  symbol: string
  quantity: number
  price?: number | null
  orderType: OrderType
  orderSide: OrderSide
  productType?: string | null
  segment?: string | null
  token?: number | null
  exchange?: string | null
  name?: string | null
  ltp?: number | null
  close?: number | null
  strikePrice?: number | null
  optionType?: string | null
  expiry?: string | null
  lotSize?: number | null
  watchlistItemId?: string | null
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
  private transactionRepo: TransactionRepository

  constructor(logger?: TradingLogger) {
    this.orderRepo = new OrderRepository()
    this.positionRepo = new PositionRepository()
    this.marginCalculator = new MarginCalculator()
    this.logger = logger || new TradingLogger()
    this.fundService = new FundManagementService(this.logger)
    this.priceResolution = new PriceResolutionService()
    this.marketRealism = new MarketRealismService()
    this.transactionRepo = new TransactionRepository()
    
    console.log("🏗️ [ORDER-EXECUTION-SERVICE] Service instance created with enhanced price resolution")
  }

  /**
   * Place an order (main entry point) - INSTANT EXECUTION
   * - Validates order
   * - Uses dialog price directly (no price resolution delay)
   * - Calculates margin
   * - Blocks funds
   * - Creates order
   * - Executes immediately (no 3-second delay)
   */
  async placeOrder(input: PlaceOrderInput): Promise<OrderExecutionResult> {
    const normalizedSegment = (input.segment || input.exchange || 'NSE').toUpperCase()
    const normalizedProductType = (() => {
      const raw = (input.productType || 'MIS').toUpperCase()
      if (raw === 'INTRADAY') return 'MIS'
      if (raw === 'DELIVERY' || raw === 'CNC') return 'DELIVERY'
      return raw
    })()
    const normalizedLotSize = input.lotSize && input.lotSize > 0 ? input.lotSize : 1

    console.log("🚀 [ORDER-EXECUTION-SERVICE] Placing order (INSTANT MODE):", {
      symbol: input.symbol,
      quantity: input.quantity,
      orderType: input.orderType,
      orderSide: input.orderSide,
      dialogPrice: input.price,
      segment: normalizedSegment,
      productType: normalizedProductType,
      token: input.token,
      instrumentId: input.instrumentId
    })

    await this.logger.logOrder("ORDER_PLACEMENT_START", `Placing ${input.orderSide} order for ${input.symbol}`, {
      symbol: input.symbol,
      quantity: input.quantity,
      orderType: input.orderType,
      productType: normalizedProductType,
      segment: normalizedSegment,
      token: input.token,
      instrumentId: input.instrumentId,
      watchlistItemId: input.watchlistItemId
    })

    try {
      // Step 1: Validate order
      await this.validateOrder(input)
      console.log("✅ [ORDER-EXECUTION-SERVICE] Order validation passed")

      // Step 2: Use dialog price directly (4th attempt - instant execution)
      // Skip all price resolution tiers to make order placement super instant
      let executionPrice = input.price ?? input.ltp ?? input.close ?? 0
      
      if (!executionPrice || executionPrice <= 0) {
        console.error("❌ [ORDER-EXECUTION-SERVICE] No valid price provided from dialog")
        throw new Error(`Invalid price provided for ${input.symbol}. Please try again.`)
      }

      console.log("💰 [ORDER-EXECUTION-SERVICE] Using dialog price directly:", executionPrice)

      // Step 3: Calculate margin and charges
      const marginCalc = await this.marginCalculator.calculateMargin(
        normalizedSegment,
        normalizedProductType,
        input.quantity,
        executionPrice,
        normalizedLotSize
      )

      console.log("📊 [ORDER-EXECUTION-SERVICE] Margin calculation:", marginCalc)

      await this.logger.logOrder("MARGIN_CALCULATED", "Margin and charges calculated", {
        requiredMargin: marginCalc.requiredMargin,
        brokerage: marginCalc.brokerage,
        totalCharges: marginCalc.totalCharges,
        totalRequired: marginCalc.totalRequired,
        priceSource: 'DIALOG',
        executionPrice: executionPrice
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
        // Resolve stock first to validate lot multiples for derivatives
        const stockRecord = await this.ensureStockForOrder(tx, {
          ...input,
          segment: normalizedSegment,
          productType: normalizedProductType,
          lotSize: normalizedLotSize
        })

        // Enforce lot multiple validation for derivatives (NFO/FNO/MCX)
        const segForValidation = (stockRecord.segment || normalizedSegment || '').toUpperCase()
        if (segForValidation === 'NFO' || segForValidation === 'FNO' || segForValidation === 'MCX') {
          const lot = Number(stockRecord.lot_size || normalizedLotSize || 1)
          if (lot > 1) {
            if (input.quantity % lot !== 0) {
              throw new Error(`Quantity must be a multiple of lot size (${lot}) for ${segForValidation}`)
            }
          }
        }

        // Block margin
        console.log("🔒 [ORDER-EXECUTION-SERVICE] Blocking margin:", marginCalc.requiredMargin)
        const blockResult = await this.fundService.blockMargin(
          input.tradingAccountId,
          marginCalc.requiredMargin,
          `Margin blocked for ${input.orderSide} ${input.symbol}`
        )

        // Deduct charges
        console.log("💸 [ORDER-EXECUTION-SERVICE] Deducting charges:", marginCalc.totalCharges)
        const chargesResult = await this.fundService.debit(
          input.tradingAccountId,
          marginCalc.totalCharges,
          `Brokerage and charges for ${input.orderSide} ${input.symbol}`
        )

        // Create order
        console.log("📝 [ORDER-EXECUTION-SERVICE] Creating order record")

        const order = await this.orderRepo.create(
          {
            tradingAccountId: input.tradingAccountId,
            stockId: stockRecord.id,
            symbol: input.symbol,
            quantity: input.quantity,
            price: executionPrice,
            orderType: input.orderType,
            orderSide: input.orderSide,
            productType: input.productType,
            status: 'PENDING'
          },
          tx
        )

        console.log("✅ [ORDER-EXECUTION-SERVICE] Order created:", order.id)

        // Attach orderId to related fund transactions for full traceability
        try {
          if (blockResult?.transactionId) {
            await this.transactionRepo.update(blockResult.transactionId, { orderId: order.id }, tx)
          }
          if (chargesResult?.transactionId) {
            await this.transactionRepo.update(chargesResult.transactionId, { orderId: order.id }, tx)
          }
        } catch (linkError) {
          console.warn("⚠️ [ORDER-EXECUTION-SERVICE] Failed to link transactions to order:", linkError)
        }

        return {
          orderId: order.id,
          marginBlocked: marginCalc.requiredMargin,
          chargesDeducted: marginCalc.totalCharges,
          executionPrice,
          stockId: stockRecord.id
        }
      })

      await this.logger.logOrder("ORDER_PLACED", `Order placed successfully: ${result.orderId}`, {
        orderId: result.orderId,
        marginBlocked: result.marginBlocked,
        chargesDeducted: result.chargesDeducted,
        stockId: result.stockId
      })

      // Step 6: Execute synchronously and return executed status to client
      console.log("⚡ [ORDER-EXECUTION-SERVICE] Executing order synchronously (no background)")
      try {
        const enrichedInput: PlaceOrderInput = {
          ...input,
          stockId: result.stockId,
          segment: normalizedSegment,
          productType: normalizedProductType,
          lotSize: normalizedLotSize,
          price: executionPrice,
          instrumentId: input.instrumentId || `${input.exchange || normalizedSegment}-${input.token ?? input.symbol}`
        }
        await this.executeOrder(input.symbol, enrichedInput, result.executionPrice, result.orderId)
      } catch (execError: any) {
        console.error("❌ [ORDER-EXECUTION-SERVICE] Synchronous execution failed:", execError)
        // Best-effort cleanup: mark rejected and release margin
        try {
          await executeInTransaction(async (tx) => {
            await this.orderRepo.update(result.orderId, { status: OrderStatus.CANCELLED }, tx)
            const marginCalc = await this.marginCalculator.calculateMargin(
              normalizedSegment,
              normalizedProductType,
              input.quantity,
              result.executionPrice,
              normalizedLotSize
            )
            await this.fundService.releaseMargin(
              input.tradingAccountId,
              marginCalc.requiredMargin,
              `Margin released for failed order ${result.orderId}`,
              { orderId: result.orderId }
            )
          })
        } catch (cleanupError) {
          console.error("❌ [ORDER-EXECUTION-SERVICE] Cleanup after execution failure failed:", cleanupError)
        }
        throw execError
      }

      const response: OrderExecutionResult = {
        success: true,
        orderId: result.orderId,
        message: "Order placed and executed",
        executionScheduled: false,
        marginBlocked: result.marginBlocked,
        chargesDeducted: result.chargesDeducted
      }

      console.log("🎉 [ORDER-EXECUTION-SERVICE] Order placement completed (INSTANT):", response)
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
   * Execute order with timeout (INSTANT MODE)
   * No delay - executes immediately in background with 10-second timeout
   */
  private async executeOrderWithTimeout(
    orderId: string, 
    input: PlaceOrderInput, 
    executionPrice: number
  ): Promise<void> {
    console.log("⚡ [ORDER-EXECUTION-SERVICE] Executing order with timeout:", orderId)

    if (!input.stockId) {
      throw new Error(`Stock reference missing while executing order ${orderId}`)
    }

    const normalizedSegment = (input.segment || input.exchange || 'NSE').toUpperCase()
    const normalizedProductType = (() => {
      const raw = (input.productType || 'MIS').toUpperCase()
      if (raw === 'INTRADAY') return 'MIS'
      if (raw === 'DELIVERY' || raw === 'CNC') return 'DELIVERY'
      return raw
    })()
    const normalizedLotSize = input.lotSize && input.lotSize > 0 ? input.lotSize : 1
    const enrichedInput: PlaceOrderInput = {
      ...input,
      segment: normalizedSegment,
      productType: normalizedProductType,
      lotSize: normalizedLotSize
    }

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Order execution timeout after 10 seconds`))
      }, 10000) // 10 seconds timeout
    })

    try {
      // Race between execution and timeout
      await Promise.race([
        this.executeOrder(orderId, enrichedInput, executionPrice),
        timeoutPromise
      ])
      
      console.log("✅ [ORDER-EXECUTION-SERVICE] Order executed successfully:", orderId)
    } catch (error: any) {
      console.error("❌ [ORDER-EXECUTION-SERVICE] Order execution failed or timed out:", error)
      
      // Mark order as rejected and release margin
      try {
        await executeInTransaction(async (tx) => {
          // Mark as rejected
          await this.orderRepo.update(orderId, { status: OrderStatus.CANCELLED }, tx)
          
          // Calculate and release margin
          const marginCalc = await this.marginCalculator.calculateMargin(
            normalizedSegment,
            normalizedProductType,
            input.quantity,
            executionPrice,
            normalizedLotSize
          )
          
          await this.fundService.releaseMargin(
            input.tradingAccountId,
            marginCalc.requiredMargin,
            `Margin released for failed order ${orderId}: ${error.message}`
          )
        })
        
        console.log("✅ [ORDER-EXECUTION-SERVICE] Order marked as rejected and margin released")
      } catch (cleanupError) {
        console.error("❌ [ORDER-EXECUTION-SERVICE] Failed to cleanup rejected order:", cleanupError)
      }
      
      await this.logger.error("ORDER_EXECUTION_FAILED", error.message, error, {
        orderId,
        symbol: input.symbol
      })
      
      throw error
    }
  }

  /**
   * @deprecated Old method - replaced by executeOrderWithTimeout
   */
  private scheduleExecution(orderId: string, input: PlaceOrderInput, executionPrice: number): void {
    console.warn("⚠️ [ORDER-EXECUTION-SERVICE] DEPRECATED: scheduleExecution called - use executeOrderWithTimeout instead")
    this.executeOrderWithTimeout(orderId, input, executionPrice).catch(console.error)
  }

  /**
   * Execute order (called after 3-second delay)
   * - Updates position
   * - Marks order as executed
   * - Logs everything
   */
  private async executeOrder(
    symbolForLog: string,
    input: PlaceOrderInput,
    executionPrice: number,
    existingOrderId?: string
  ): Promise<void> {
    const orderId = existingOrderId || 'new-order'
    console.log("🎯 [ORDER-EXECUTION-SERVICE] Executing order:", orderId)

    if (!input.stockId) {
      throw new Error(`Stock reference missing while executing order ${orderId}`)
    }

    const runtimeSegment = (input.segment || input.exchange || 'NSE').toUpperCase()
    const runtimeProductType = (() => {
      const raw = (input.productType || 'MIS').toUpperCase()
      if (raw === 'INTRADAY') return 'MIS'
      if (raw === 'DELIVERY' || raw === 'CNC') return 'DELIVERY'
      return raw
    })()
    const runtimeLotSize = input.lotSize && input.lotSize > 0 ? input.lotSize : 1

    await this.logger.logOrder("ORDER_EXECUTION_START", `Executing order: ${orderId}`, {
      orderId,
      symbol: input.symbol,
      executionPrice,
      segment: runtimeSegment,
      productType: runtimeProductType
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
        // Link order to position and mark executed
        await this.orderRepo.update(orderId, { positionId: position.id }, tx)
        await this.orderRepo.markExecuted(orderId, input.quantity, executionPrice, tx)

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

  private parseInstrumentIdentifier(identifier?: string | null): { exchange: string | null; token: number | null } {
    if (!identifier) {
      return { exchange: null, token: null }
    }

    const trimmed = identifier.trim()
    if (!trimmed) {
      return { exchange: null, token: null }
    }

    const lastHyphenIndex = trimmed.lastIndexOf("-")
    if (lastHyphenIndex === -1) {
      return { exchange: trimmed || null, token: null }
    }

    const tokenCandidate = Number(trimmed.substring(lastHyphenIndex + 1))
    const exchangeCandidate = trimmed.substring(0, lastHyphenIndex) || null

    return {
      exchange: exchangeCandidate,
      token: Number.isFinite(tokenCandidate) ? tokenCandidate : null
    }
  }

  private async ensureStockForOrder(
    tx: Prisma.TransactionClient,
    input: PlaceOrderInput
  ): Promise<Stock> {
    if (input.stockId) {
      const existingStock = await tx.stock.findUnique({ where: { id: input.stockId } })
      if (existingStock) {
        return existingStock
      }

      await this.logger.warn("ORDER_STOCK_RECOVERY", "Provided stockId missing, attempting recovery", {
        requestedStockId: input.stockId,
        symbol: input.symbol
      })
    }

    const parsedIdentifier = this.parseInstrumentIdentifier(input.instrumentId ?? undefined)
    const token = input.token ?? parsedIdentifier.token ?? null
    const exchange = (input.exchange || parsedIdentifier.exchange || input.segment || 'NSE').toUpperCase()
    const normalizedSymbol = input.symbol?.toUpperCase() || 'UNKNOWN'
    const segment = (input.segment || exchange).toUpperCase()

    let instrumentId = input.instrumentId?.trim() || null
    if (!instrumentId) {
      if (token != null) {
        instrumentId = `${exchange}-${token}`
      } else {
        instrumentId = `${exchange}-${normalizedSymbol}`
      }
    }

    const finalInstrumentId = instrumentId || `${exchange}-${normalizedSymbol}`

    const lookupClauses: Prisma.StockWhereInput[] = []
    if (token != null) {
      lookupClauses.push({ token })
    }
    if (finalInstrumentId) {
      lookupClauses.push({ instrumentId: finalInstrumentId })
    }

    if (lookupClauses.length > 0) {
      const recoveredByIdentifiers = await tx.stock.findFirst({
        where: {
          OR: lookupClauses
        }
      })

      if (recoveredByIdentifiers) {
        await this.logger.logSystemEvent("ORDER_STOCK_RECOVERED", "Recovered stock via identifiers", {
          recoveredStockId: recoveredByIdentifiers.id,
          token,
          instrumentId: finalInstrumentId
        })
        return recoveredByIdentifiers
      }
    }

    const recoveredBySymbol = await tx.stock.findFirst({
      where: {
        AND: [
          { symbol: normalizedSymbol },
          { exchange }
        ]
      }
    })

    if (recoveredBySymbol) {
      await this.logger.logSystemEvent("ORDER_STOCK_RECOVERED", "Recovered stock via symbol + exchange", {
        recoveredStockId: recoveredBySymbol.id,
        token,
        instrumentId: finalInstrumentId
      })
      return recoveredBySymbol
    }

    const parseExpiry = (value?: string | null): Date | undefined => {
      if (!value) return undefined
      try {
        if (/^\d{8}$/.test(value)) {
          const year = parseInt(value.substring(0, 4), 10)
          const month = parseInt(value.substring(4, 6), 10) - 1
          const day = parseInt(value.substring(6, 8), 10)
          const date = new Date(year, month, day)
          return Number.isNaN(date.getTime()) ? undefined : date
        }

        const date = new Date(value)
        return Number.isNaN(date.getTime()) ? undefined : date
      } catch {
        return undefined
      }
    }

    const ltpValue = input.ltp ?? input.price ?? input.close ?? 0
    const closeValue = input.close ?? ltpValue
    const strikePriceDecimal = input.strikePrice != null ? new Prisma.Decimal(input.strikePrice) : undefined
    const expiryDate = parseExpiry(input.expiry)

    const stockPayload: Prisma.StockUncheckedCreateInput = {
      instrumentId: finalInstrumentId,
      symbol: normalizedSymbol,
      exchange,
      ticker: normalizedSymbol,
      name: input.name || input.symbol,
      segment,
      token: token ?? undefined,
      ltp: ltpValue,
      close: closeValue,
      open: ltpValue,
      high: ltpValue,
      low: ltpValue,
      volume: 0,
      change: 0,
      changePercent: 0,
      isActive: true,
      strikePrice: strikePriceDecimal,
      optionType: input.optionType as any,
      expiry: expiryDate,
      lot_size: input.lotSize ?? undefined
    }

    try {
      const created = await tx.stock.create({ data: stockPayload })
      await this.logger.logSystemEvent("ORDER_STOCK_CREATED", "Created synthetic stock for order", {
        stockId: created.id,
        token,
        instrumentId: finalInstrumentId,
        source: 'order-metadata'
      })
      return created
    } catch (error: any) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const conflictLookup: Prisma.StockWhereInput[] = []
        if (token != null) {
          conflictLookup.push({ token })
        }
        if (finalInstrumentId) {
          conflictLookup.push({ instrumentId: finalInstrumentId })
        }

        const recovered = await tx.stock.findFirst({
          where: {
            OR: conflictLookup
          }
        })

        if (recovered) {
          await this.logger.logSystemEvent("ORDER_STOCK_RECOVERED", "Recovered stock after unique constraint", {
            recoveredStockId: recovered.id,
            token,
            instrumentId: finalInstrumentId
          })
          return recovered
        }
      }

      const recoveryError = error instanceof Error ? error : new Error(String(error))
      await this.logger.error("ORDER_STOCK_CREATE_FAILED", "Failed to create fallback stock", recoveryError, {
        token,
        instrumentId: finalInstrumentId,
        exchange,
        symbol: input.symbol
      })

      throw new Error(`Unable to prepare stock record for ${input.symbol}. Please retry.`)
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

        // Update order - convert to UpdateOrderData format
        const updateData: any = {}
        if (updates.price !== undefined) updateData.price = updates.price
        if (updates.quantity !== undefined) updateData.quantity = updates.quantity
        
        await this.orderRepo.update(orderId, updateData, tx)

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