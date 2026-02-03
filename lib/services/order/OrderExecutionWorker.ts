/**
 * @file OrderExecutionWorker.ts
 * @module order-execution
 * @description Background worker that executes PENDING orders asynchronously (portable across EC2 and serverless).
 * @author BharatERP
 * @created 2026-02-03
 *
 * Notes:
 * - This worker intentionally does NOT introduce new DB schema fields (no migrations).
 * - Because `OrderStatus` only supports PENDING/EXECUTED/CANCELLED, we rely on a single active worker
 *   (or external queue partitioning) to avoid double-processing.
 * - All writes happen inside a single Prisma transaction to preserve consistency.
 */

import { executeInTransaction } from "@/lib/services/utils/prisma-transaction"
import { createTradingLogger } from "@/lib/services/logging/TradingLogger"
import { NotificationService } from "@/lib/services/notifications/NotificationService"
import { OrderRepository } from "@/lib/repositories/OrderRepository"
import { PositionRepository } from "@/lib/repositories/PositionRepository"
import { TransactionRepository } from "@/lib/repositories/TransactionRepository"
import { FundManagementService } from "@/lib/services/funds/FundManagementService"
import { MarginCalculator } from "@/lib/services/risk/MarginCalculator"
import { OrderSide, OrderStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export interface ProcessPendingOrdersInput {
  limit?: number
  maxAgeMs?: number
}

export interface ProcessPendingOrdersResult {
  scanned: number
  executed: number
  cancelled: number
  errors: Array<{ orderId: string; message: string }>
}

export class OrderExecutionWorker {
  private orderRepo = new OrderRepository()
  private positionRepo = new PositionRepository()
  private transactionRepo = new TransactionRepository()

  /**
   * Process the oldest PENDING orders.
   * Designed for: EC2 loop worker OR Lambda/EventBridge scheduled trigger.
   */
  async processPendingOrders(input: ProcessPendingOrdersInput = {}): Promise<ProcessPendingOrdersResult> {
    const limit = Math.min(Math.max(1, input.limit ?? 25), 200)
    const maxAgeMs = input.maxAgeMs ?? 0

    console.log("🧵 [ORDER-WORKER] Processing pending orders", { limit, maxAgeMs })

    const cutoff = maxAgeMs > 0 ? new Date(Date.now() - maxAgeMs) : null

    const pending = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        ...(cutoff ? { createdAt: { lte: cutoff } } : {})
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        Stock: { select: { id: true, ltp: true, segment: true, lot_size: true } },
        tradingAccount: { select: { id: true, userId: true } }
      }
    })

    const result: ProcessPendingOrdersResult = { scanned: pending.length, executed: 0, cancelled: 0, errors: [] }

    for (const order of pending) {
      try {
        const r = await this.processOrderById(order.id)
        if (r === "executed") result.executed++
        if (r === "cancelled") result.cancelled++
      } catch (e: any) {
        const message = e?.message || String(e)
        console.error("❌ [ORDER-WORKER] Failed processing order", { orderId: order.id, message })
        result.errors.push({ orderId: order.id, message })
      }
    }

    console.log("✅ [ORDER-WORKER] Batch completed", result)
    return result
  }

  /**
   * Execute a single PENDING order.
   * Returns a stable string outcome so callers can aggregate metrics.
   */
  async processOrderById(orderId: string): Promise<"skipped" | "executed" | "cancelled"> {
    console.log("🎯 [ORDER-WORKER] Processing order", { orderId })

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        Stock: { select: { id: true, ltp: true, segment: true, lot_size: true } },
        tradingAccount: { select: { id: true, userId: true } }
      }
    })

    if (!order) {
      console.warn("⚠️ [ORDER-WORKER] Order not found; skipping", { orderId })
      return "skipped"
    }

    if (order.status !== OrderStatus.PENDING) {
      console.log("ℹ️ [ORDER-WORKER] Order not pending; skipping", { orderId, status: order.status })
      return "skipped"
    }

    // Determine execution price
    const executionPrice = (() => {
      const p = order.averagePrice ?? order.price
      const numeric = p != null ? Number(p) : null
      if (numeric != null && Number.isFinite(numeric) && numeric > 0) return numeric
      const ltp = order.Stock?.ltp
      if (typeof ltp === "number" && Number.isFinite(ltp) && ltp > 0) return ltp
      return 0
    })()

    if (!executionPrice || executionPrice <= 0) {
      console.error("❌ [ORDER-WORKER] Invalid execution price; cancelling", { orderId, executionPrice })
      await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } })
      return "cancelled"
    }

    if (!order.stockId || !order.Stock?.id) {
      console.error("❌ [ORDER-WORKER] Missing stock reference; cancelling", { orderId, stockId: order.stockId })
      await prisma.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } })
      return "cancelled"
    }

    // Execute core DB updates in one transaction
    try {
      await executeInTransaction(async (tx) => {
        const signedQuantity = order.orderSide === OrderSide.BUY ? order.quantity : -order.quantity

        const position = await this.positionRepo.upsert(
          order.tradingAccountId,
          order.Stock!.id,
          order.symbol,
          signedQuantity,
          executionPrice,
          tx
        )

        // Link order -> position + mark executed
        await this.orderRepo.update(orderId, { positionId: position.id }, tx)
        await this.orderRepo.markExecuted(orderId, order.quantity, executionPrice, tx)

        // Link related fund transactions to position for easier querying
        await this.transactionRepo.updateMany({ orderId }, { positionId: position.id }, tx)
      })
    } catch (error: any) {
      console.error("❌ [ORDER-WORKER] Execution transaction failed; cancelling + releasing margin best-effort", {
        orderId,
        message: error?.message
      })

      // Best-effort compensation (mirrors previous in-request cleanup style)
      await executeInTransaction(async (tx) => {
        await this.orderRepo.update(orderId, { status: OrderStatus.CANCELLED }, tx)

        // Release margin using current margin rules and executionPrice
        // (Charges refund is not handled here; consistent with prior cleanup semantics.)
        const logger = createTradingLogger({ tradingAccountId: order.tradingAccountId, userId: order.tradingAccount?.userId, symbol: order.symbol })
        const fundService = new FundManagementService(logger)
        const marginCalc = new MarginCalculator()

        const segment = (order.Stock?.segment || "NSE").toUpperCase()
        const productType = (order.productType || "MIS").toUpperCase()
        const lotSize = order.Stock?.lot_size ? Number(order.Stock.lot_size) : 1

        const calc = await marginCalc.calculateMargin(segment, productType, order.quantity, executionPrice, lotSize)
        await fundService.releaseMarginTx(tx, order.tradingAccountId, calc.requiredMargin, `Margin released for failed order ${orderId}`, { orderId })
      })

      return "cancelled"
    }

    // Notifications can be safely attempted after commit
    try {
      if (order.tradingAccount?.userId) {
        await NotificationService.notifyOrderExecuted(order.tradingAccount.userId, {
          symbol: order.symbol,
          quantity: order.quantity,
          orderSide: order.orderSide,
          averagePrice: executionPrice
        })
      }
    } catch (notifError) {
      console.warn("⚠️ [ORDER-WORKER] Failed to create order executed notification", {
        orderId,
        message: notifError instanceof Error ? notifError.message : String(notifError)
      })
    }

    console.log("🎉 [ORDER-WORKER] Order executed", { orderId, executionPrice })
    return "executed"
  }
}

/**
 * Convenience singleton for simple cron triggers.
 */
export const orderExecutionWorker = new OrderExecutionWorker()
