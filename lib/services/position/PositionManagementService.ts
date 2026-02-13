/**
 * Position Management Service
 * 
 * Handles all position-related operations:
 * - Position closing
 * - P&L calculations
 * - Margin release
 * - Exit order creation
 * - Position updates (SL/Target)
 * 
 * All operations use Prisma transactions for atomicity
 */

import { executeInTransaction } from "@/lib/services/utils/prisma-transaction"
import { PositionRepository } from "@/lib/repositories/PositionRepository"
import { OrderRepository } from "@/lib/repositories/OrderRepository"
import { FundManagementService } from "@/lib/services/funds/FundManagementService"
import { MarginCalculator } from "@/lib/services/risk/MarginCalculator"
import { TradingLogger } from "@/lib/services/logging/TradingLogger"
import { OrderType, OrderSide, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

console.log("📊 [POSITION-MGMT-SERVICE] Module loaded")

const POSITION_CLOSE_ADVISORY_LOCK_NS = 910_002

export interface ClosePositionResult {
  success: boolean
  positionId: string
  exitOrderId: string
  realizedPnL: number
  exitPrice: number
  marginReleased: number
  message: string
}

export interface UpdatePositionResult {
  success: boolean
  positionId: string
  message: string
}

export class PositionManagementService {
  private positionRepo: PositionRepository
  private orderRepo: OrderRepository
  private fundService: FundManagementService
  private marginCalculator: MarginCalculator
  private logger: TradingLogger

  /**
   * Compute a deterministic advisory lock key for position close.
   * Uses `pg_try_advisory_xact_lock(bigint)` so the lock is held only for the transaction.
   */
  private buildPositionCloseAdvisoryLockSql(positionId: string): Prisma.Sql {
    return Prisma.sql`
      SELECT pg_try_advisory_xact_lock(
        ((${POSITION_CLOSE_ADVISORY_LOCK_NS}::bigint << 32) | (hashtext(${positionId}::text)::bigint & 4294967295))
      ) AS locked
    `
  }

  constructor(logger?: TradingLogger) {
    this.positionRepo = new PositionRepository()
    this.orderRepo = new OrderRepository()
    this.marginCalculator = new MarginCalculator()
    this.logger = logger || new TradingLogger()
    this.fundService = new FundManagementService(this.logger)
    
    console.log("🏗️ [POSITION-MGMT-SERVICE] Service instance created")
  }

  /**
   * Close a position
   * - Fetches current LTP (or uses provided price)
   * - Calculates P&L
   * - Creates exit order
   * - Releases margin
   * - Credits/Debits P&L
   */
  async closePosition(
    positionId: string,
    tradingAccountId: string,
    exitPriceOverride?: number  // Optional: Use this price instead of fetching live data
  ): Promise<ClosePositionResult> {
    console.log("🏁 [POSITION-MGMT-SERVICE] Closing position:", {
      positionId,
      tradingAccountId
    })

    await this.logger.logPosition("POSITION_CLOSE_START", `Closing position: ${positionId}`, {
      positionId,
      tradingAccountId
    })

    try {
      // Step 1: Get position details
      const position = await this.positionRepo.findById(positionId)

      if (!position) {
        console.error("❌ [POSITION-MGMT-SERVICE] Position not found:", positionId)
        throw new Error("Position not found")
      }

      if (position.quantity === 0) {
        console.warn("⚠️ [POSITION-MGMT-SERVICE] Position already closed; skipping")
        return {
          success: true,
          positionId,
          exitOrderId: "",
          realizedPnL: 0,
          exitPrice: exitPriceOverride && exitPriceOverride > 0 ? exitPriceOverride : 0,
          marginReleased: 0,
          message: "Position already closed; skipped",
        }
      }

      console.log("✅ [POSITION-MGMT-SERVICE] Position found:", {
        symbol: position.symbol,
        quantity: position.quantity,
        averagePrice: Number(position.averagePrice)
      })

      // Step 2: Get current LTP (exit price)
      let exitPrice: number
      
      if (exitPriceOverride && exitPriceOverride > 0) {
        console.log("🎯 [POSITION-MGMT-SERVICE] Using provided exit price:", exitPriceOverride)
        exitPrice = exitPriceOverride
      } else {
        try {
          exitPrice = await this.getCurrentPrice(position.Stock?.instrumentId || '')
          console.log("💰 [POSITION-MGMT-SERVICE] Exit price from market data:", exitPrice)
        } catch (error: any) {
          console.warn("⚠️ [POSITION-MGMT-SERVICE] Failed to fetch live price, using fallback")
          
          // Fallback to position's Stock LTP or average price
          exitPrice = position.Stock?.ltp || Number(position.averagePrice)
          
          if (!exitPrice || exitPrice <= 0) {
            throw new Error("Unable to determine exit price. Please try again or specify a price.")
          }
          
          console.log("📌 [POSITION-MGMT-SERVICE] Using fallback exit price:", exitPrice)
        }
      }

      // Step 3: Calculate P&L
      const quantity = position.quantity
      const avgPrice = Number(position.averagePrice)
      const realizedPnL = (exitPrice - avgPrice) * quantity

      console.log("📊 [POSITION-MGMT-SERVICE] P&L calculation:", {
        exitPrice,
        avgPrice,
        quantity,
        realizedPnL
      })

      await this.logger.logPosition("PNL_CALCULATED", "P&L calculated", {
        positionId,
        exitPrice,
        avgPrice,
        realizedPnL
      })

      // Step 4: Calculate margin to release
      const turnover = Math.abs(quantity) * avgPrice
      const segment = position.Stock?.segment || 'NSE'
      
      // Get productType from orders that created this position
      // Look for the most recent BUY order (for long positions) or SELL order (for short positions)
      let productType = 'MIS' // Default fallback
      
      if (position.orders && position.orders.length > 0) {
        // For long positions (quantity > 0), find the BUY order
        // For short positions (quantity < 0), find the SELL order
        const targetSide = quantity > 0 ? 'BUY' : 'SELL'
        const relevantOrder = position.orders.find(
          order => order.orderSide === targetSide && order.status === 'EXECUTED'
        )
        
        if (relevantOrder && relevantOrder.productType) {
          productType = relevantOrder.productType
          console.log("✅ [POSITION-MGMT-SERVICE] Found productType from order:", {
            orderId: relevantOrder.id,
            productType,
            orderSide: relevantOrder.orderSide
          })
        } else {
          // Fallback: use the most recent executed order's productType
          const executedOrder = position.orders.find(order => order.status === 'EXECUTED')
          if (executedOrder && executedOrder.productType) {
            productType = executedOrder.productType
            console.log("✅ [POSITION-MGMT-SERVICE] Using productType from most recent executed order:", productType)
          } else {
            console.warn("⚠️ [POSITION-MGMT-SERVICE] No executed order found, using default productType: MIS")
          }
        }
      } else {
        console.warn("⚠️ [POSITION-MGMT-SERVICE] Position has no orders, using default productType: MIS")
      }
      
      console.log("🔍 [POSITION-MGMT-SERVICE] Calculating margin release with:", {
        segment,
        productType,
        quantity: Math.abs(quantity),
        avgPrice,
        turnover
      })
      
      const marginCalc = await this.marginCalculator.calculateMargin(
        segment,
        productType,
        Math.abs(quantity),
        avgPrice,
        position.Stock?.lot_size || 1
      )

      const marginToRelease = marginCalc.requiredMargin

      console.log("💸 [POSITION-MGMT-SERVICE] Margin to release:", {
        marginToRelease,
        productType,
        leverage: marginCalc.leverage,
        turnover
      })

      // Step 5: Execute in transaction
      type ClosePositionTxResult =
        | { skipped: true; exitOrderId: ""; reason: "lock_not_acquired" | "already_closed" }
        | { skipped: false; exitOrderId: string }

      const result: ClosePositionTxResult = await executeInTransaction(async (tx) => {
        // Advisory lock (per-position) to keep close idempotent across UI + worker + cron.
        const lockRows = await tx.$queryRaw<{ locked: boolean }[]>(
          this.buildPositionCloseAdvisoryLockSql(positionId)
        )
        const locked = lockRows?.[0]?.locked === true
        if (!locked) {
          console.warn("⏸️ [POSITION-MGMT-SERVICE] Close lock not acquired; skipping", { positionId })
          return { exitOrderId: "", skipped: true, reason: "lock_not_acquired" }
        }

        const fresh = await tx.position.findUnique({
          where: { id: positionId },
          select: { quantity: true },
        })
        if (!fresh) {
          throw new Error("Position not found")
        }
        if (fresh.quantity === 0) {
          console.warn("⏸️ [POSITION-MGMT-SERVICE] Position already closed under lock; skipping", { positionId })
          return { exitOrderId: "", skipped: true, reason: "already_closed" }
        }

        // Create exit order (opposite side)
        const exitSide = quantity > 0 ? OrderSide.SELL : OrderSide.BUY
        
        console.log("📝 [POSITION-MGMT-SERVICE] Creating exit order:", exitSide)
        
        // Verify stockId exists to prevent foreign key constraint errors
        if (!position.stockId) {
          console.error("❌ [POSITION-MGMT-SERVICE] Position has no stockId:", positionId)
          throw new Error("Position data incomplete - missing stock reference")
        }
        
        const stockExists = await tx.stock.findUnique({
          where: { id: position.stockId },
          select: { id: true }
        })
        
        if (!stockExists) {
          console.error("❌ [POSITION-MGMT-SERVICE] Stock not found in database:", position.stockId)
          throw new Error(`Stock not found: ${position.symbol}. Cannot close position.`)
        }
        
        const exitOrder = await this.orderRepo.create(
          {
            tradingAccountId,
            stockId: position.stockId, // Now verified to exist
            symbol: position.symbol,
            quantity: Math.abs(quantity),
            price: exitPrice,
            orderType: OrderType.MARKET,
            orderSide: exitSide,
            productType: 'MIS',
            status: 'EXECUTED'
          },
          tx
        )

        // Mark order as executed immediately
        await this.orderRepo.markExecuted(
          exitOrder.id,
          Math.abs(quantity),
          exitPrice,
          tx
        )

        console.log("✅ [POSITION-MGMT-SERVICE] Exit order created:", exitOrder.id)

        // Close position (set quantity to 0)
        await this.positionRepo.close(positionId, realizedPnL, tx)
        
        console.log("✅ [POSITION-MGMT-SERVICE] Position marked as closed")

        // Release margin
        console.log("🔓 [POSITION-MGMT-SERVICE] Releasing margin:", marginToRelease)
        await this.fundService.releaseMargin(
          tradingAccountId,
          marginToRelease,
          `Margin released for closed position ${position.symbol}`
        )

        // Credit or Debit P&L
        if (realizedPnL > 0) {
          console.log("💰 [POSITION-MGMT-SERVICE] Crediting profit:", realizedPnL)
          await this.fundService.credit(
            tradingAccountId,
            Math.abs(realizedPnL),
            `Profit from ${position.symbol} position`
          )
        } else if (realizedPnL < 0) {
          console.log("💸 [POSITION-MGMT-SERVICE] Debiting loss:", realizedPnL)
          await this.fundService.debit(
            tradingAccountId,
            Math.abs(realizedPnL),
            `Loss from ${position.symbol} position`
          )
        }

        return {
          exitOrderId: exitOrder.id,
          skipped: false,
        }
      })

      if (result.skipped) {
        return {
          success: true,
          positionId,
          exitOrderId: "",
          realizedPnL: 0,
          exitPrice,
          marginReleased: 0,
          message: "Position close skipped (already closing/closed).",
        }
      }

      await this.logger.logPosition("POSITION_CLOSED", `Position closed successfully: ${positionId}`, {
        positionId,
        realizedPnL,
        exitPrice,
        marginReleased: marginToRelease
      })

      const response: ClosePositionResult = {
        success: true,
        positionId,
        exitOrderId: result.exitOrderId,
        realizedPnL,
        exitPrice,
        marginReleased: marginToRelease,
        message: `Position closed. P&L: ₹${realizedPnL.toFixed(2)}`
      }

      console.log("🎉 [POSITION-MGMT-SERVICE] Position closing completed:", response)
      return response

    } catch (error: any) {
      console.error("❌ [POSITION-MGMT-SERVICE] Position closing failed:", error)
      await this.logger.error("POSITION_CLOSE_FAILED", error.message, error, {
        positionId,
        tradingAccountId
      })
      throw error
    }
  }

  /**
   * Update position stop-loss and target
   */
  async updatePosition(
    positionId: string,
    updates: {
      stopLoss?: number | null
      target?: number | null
    }
  ): Promise<UpdatePositionResult> {
    console.log("🔧 [POSITION-MGMT-SERVICE] Updating position:", {
      positionId,
      updates
    })

    await this.logger.logPosition("POSITION_UPDATE_START", `Updating position: ${positionId}`, {
      positionId,
      updates
    })

    try {
      await executeInTransaction(async (tx) => {
        const position = await this.positionRepo.findById(positionId, tx)

        if (!position) {
          throw new Error("Position not found")
        }

        if (position.quantity === 0) {
          throw new Error("Cannot update closed position")
        }

        // Update position
        await this.positionRepo.update(positionId, updates, tx)

        console.log("✅ [POSITION-MGMT-SERVICE] Position updated")
      })

      await this.logger.logPosition("POSITION_UPDATED", `Position updated successfully: ${positionId}`, {
        positionId,
        updates
      })

      return {
        success: true,
        positionId,
        message: "Position updated successfully"
      }

    } catch (error: any) {
      console.error("❌ [POSITION-MGMT-SERVICE] Position update failed:", error)
      await this.logger.error("POSITION_UPDATE_FAILED", error.message, error, {
        positionId,
        updates
      })
      throw error
    }
  }

  /**
   * Get current market price for a stock
   */
  private async getCurrentPrice(instrumentId: string): Promise<number> {
    console.log("📊 [POSITION-MGMT-SERVICE] Fetching current price:", instrumentId)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
        || 'https://www.marketpulse360.live'
      const response = await fetch(
        `${baseUrl}/api/quotes?q=${instrumentId}&mode=ltp`,
        { cache: 'no-store' }
      )

      const data = await response.json()
      console.log("📈 [POSITION-MGMT-SERVICE] Price response:", data)

      // Handle different response formats
      const payload = data?.success ? data.data : data
      const ltp = payload?.[instrumentId]?.last_trade_price || 
                  payload?.data?.[instrumentId]?.last_trade_price

      if (ltp) {
        console.log("✅ [POSITION-MGMT-SERVICE] Current price:", ltp)
        return Number(ltp)
      }

      // Fallback to stock's last known price
      console.log("⚠️ [POSITION-MGMT-SERVICE] LTP not found, using fallback")
      const stock = await prisma.stock.findFirst({
        where: { instrumentId },
        select: { ltp: true }
      })

      if (stock && stock.ltp > 0) {
        console.log("📌 [POSITION-MGMT-SERVICE] Using stock LTP:", stock.ltp)
        return stock.ltp
      }

      throw new Error("Unable to determine current price")

    } catch (error: any) {
      console.error("❌ [POSITION-MGMT-SERVICE] Failed to fetch price:", error)
      throw new Error("Failed to fetch current market price")
    }
  }

  /**
   * Calculate unrealized P&L for active positions
   */
  async calculateUnrealizedPnL(
    tradingAccountId: string
  ): Promise<{
    totalUnrealizedPnL: number
    positions: Array<{
      positionId: string
      symbol: string
      unrealizedPnL: number
      currentPrice: number
    }>
  }> {
    console.log("📊 [POSITION-MGMT-SERVICE] Calculating unrealized P&L:", tradingAccountId)

    const positions = await this.positionRepo.findActive(tradingAccountId)
    const results: Array<any> = []
    let totalUnrealizedPnL = 0

    for (const position of positions) {
      try {
        const currentPrice = await this.getCurrentPrice(position.Stock?.instrumentId || '')
        const avgPrice = Number(position.averagePrice)
        const unrealizedPnL = (currentPrice - avgPrice) * position.quantity

        results.push({
          positionId: position.id,
          symbol: position.symbol,
          unrealizedPnL,
          currentPrice
        })

        totalUnrealizedPnL += unrealizedPnL

        // Update position with latest unrealized P&L
        await this.positionRepo.update(position.id, {
          unrealizedPnL,
          dayPnL: unrealizedPnL
        })

      } catch (error) {
        console.error("❌ [POSITION-MGMT-SERVICE] Failed to calculate P&L for:", position.symbol)
      }
    }

    console.log("✅ [POSITION-MGMT-SERVICE] Total unrealized P&L:", totalUnrealizedPnL)

    return {
      totalUnrealizedPnL,
      positions: results
    }
  }

  /**
   * Get position summary for account
   */
  async getPositionSummary(tradingAccountId: string) {
    console.log("📊 [POSITION-MGMT-SERVICE] Getting position summary:", tradingAccountId)

    const [activePositions, stats, pnlData] = await Promise.all([
      this.positionRepo.findActive(tradingAccountId),
      this.positionRepo.getStatistics(tradingAccountId),
      this.calculateUnrealizedPnL(tradingAccountId)
    ])

    const summary = {
      activePositions: activePositions.length,
      totalPositions: stats.total,
      closedPositions: stats.closed,
      totalUnrealizedPnL: pnlData.totalUnrealizedPnL,
      totalRealizedPnL: stats.totalRealizedPnL,
      winRate: stats.winRate,
      profitable: stats.profitable,
      losing: stats.losing
    }

    console.log("✅ [POSITION-MGMT-SERVICE] Position summary:", summary)
    return summary
  }
}

/**
 * Create position management service instance
 */
export function createPositionManagementService(logger?: TradingLogger): PositionManagementService {
  console.log("🏭 [POSITION-MGMT-SERVICE] Creating service instance")
  return new PositionManagementService(logger)
}

console.log("✅ [POSITION-MGMT-SERVICE] Module initialized")