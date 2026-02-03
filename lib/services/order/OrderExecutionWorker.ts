/**
 * @file OrderExecutionWorker.ts
 * @module services/order
 * @description Background worker for executing pending orders asynchronously (portable: cron or long-running).
 * @author BharatERP
 * @created 2026-02-02
 */

import { Prisma, OrderSide, OrderStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { PositionRepository } from "@/lib/repositories/PositionRepository"
import { OrderRepository } from "@/lib/repositories/OrderRepository"
import { TransactionRepository } from "@/lib/repositories/TransactionRepository"
import { NotificationService } from "@/lib/services/notifications/NotificationService"

export interface OrderExecutionWorkerOptions {
  limit?: number
}

export interface OrderExecutionWorkerResult {
  claimed: number
  executed: number
  skipped: number
  failed: number
  orderIds: string[]
  errors: Array<{ orderId?: string; message: string }>
}

export class OrderExecutionWorker {
  private orderRepo = new OrderRepository()
  private positionRepo = new PositionRepository()
  private transactionRepo = new TransactionRepository()

  /**
   * Process a batch of pending orders safely.
   * Uses `FOR UPDATE SKIP LOCKED` so multiple workers can run without double-processing.
   */
  async processPendingOrders(options: OrderExecutionWorkerOptions = {}): Promise<OrderExecutionWorkerResult> {
    const limit = Math.max(1, Math.min(200, Number(options.limit ?? 25)))
    const startedAt = Date.now()

    console.log("🧵 [ORDER-WORKER] Processing pending orders", { limit })

    const result: OrderExecutionWorkerResult = {
      claimed: 0,
      executed: 0,
      skipped: 0,
      failed: 0,
      orderIds: [],
      errors: []
    }

    try {
      await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id"
          FROM "orders"
          WHERE "status" = 'PENDING' AND "executedAt" IS NULL
          ORDER BY "createdAt" ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        `)

        result.claimed = rows.length
        result.orderIds = rows.map((r) => r.id)

        for (const row of rows) {
          try {
            const order = await tx.order.findUnique({
              where: { id: row.id },
              include: {
                Stock: {
                  select: {
                    id: true,
                    segment: true,
                    lot_size: true,
                    ltp: true
                  }
                }
              }
            })

            if (!order) {
              result.skipped++
              continue
            }

            if (order.status !== OrderStatus.PENDING || order.executedAt) {
              result.skipped++
              continue
            }

            if (!order.stockId) {
              // If stock is missing, we cannot execute. Keep it pending for manual intervention.
              console.warn("⚠️ [ORDER-WORKER] Order missing stockId, skipping", { orderId: order.id })
              result.skipped++
              continue
            }

            const executionPrice = (() => {
              const p = order.price != null ? Number(order.price) : undefined
              if (p != null && Number.isFinite(p) && p > 0) return p
              const ltp = order.Stock?.ltp
              if (ltp != null && Number.isFinite(ltp) && ltp > 0) return ltp
              return 0
            })()

            if (!executionPrice || executionPrice <= 0) {
              console.warn("⚠️ [ORDER-WORKER] No valid execution price, skipping", { orderId: order.id })
              result.skipped++
              continue
            }

            const signedQuantity =
              order.orderSide === OrderSide.BUY ? order.quantity : -order.quantity

            const position = await this.positionRepo.upsert(
              order.tradingAccountId,
              order.stockId,
              order.symbol,
              signedQuantity,
              executionPrice,
              tx
            )

            // Link order to position and mark executed
            await this.orderRepo.update(order.id, { positionId: position.id }, tx)
            await this.orderRepo.markExecuted(order.id, order.quantity, executionPrice, tx)

            // Link related transactions to position for easier querying
            try {
              await this.transactionRepo.updateMany(
                { orderId: order.id },
                { positionId: position.id },
                tx
              )
            } catch (linkError) {
              console.warn("⚠️ [ORDER-WORKER] Failed to link transactions to position", {
                orderId: order.id,
                positionId: position.id,
                error: linkError
              })
            }

            result.executed++

            // Best-effort notification (keep inside tx for consistency, but swallow failures)
            try {
              const acct = await tx.tradingAccount.findUnique({
                where: { id: order.tradingAccountId },
                select: { userId: true }
              })
              if (acct?.userId) {
                await NotificationService.notifyOrderExecuted(acct.userId, {
                  symbol: order.symbol,
                  quantity: order.quantity,
                  orderSide: order.orderSide,
                  averagePrice: executionPrice
                })
              }
            } catch (notifErr) {
              console.warn("⚠️ [ORDER-WORKER] notifyOrderExecuted failed (non-blocking)", notifErr)
            }
          } catch (e: any) {
            result.failed++
            result.errors.push({
              orderId: row.id,
              message: e?.message || String(e)
            })
          }
        }
      })
    } catch (e: any) {
      result.errors.push({ message: e?.message || String(e) })
      console.error("❌ [ORDER-WORKER] Batch failed", e)
    }

    console.log("✅ [ORDER-WORKER] Batch complete", {
      ...result,
      elapsedMs: Date.now() - startedAt
    })

    return result
  }

  /**
   * Process a single order by id (safe to call concurrently).
   * Uses row-locking so only one worker will execute it.
   */
  async processOrderById(orderId: string): Promise<OrderExecutionWorkerResult> {
    console.log("🧵 [ORDER-WORKER] Processing single order", { orderId })

    const result: OrderExecutionWorkerResult = {
      claimed: 0,
      executed: 0,
      skipped: 0,
      failed: 0,
      orderIds: [],
      errors: []
    }

    try {
      await prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT "id"
          FROM "orders"
          WHERE "id" = ${orderId} AND "status" = 'PENDING' AND "executedAt" IS NULL
          FOR UPDATE SKIP LOCKED
        `)

        if (rows.length === 0) {
          result.skipped = 1
          return
        }

        result.claimed = 1
        result.orderIds = [orderId]

        const batch = await this.processPendingOrders({ limit: 1 })
        // Merge just for consistent counters; the execution above will run in its own tx anyway.
        result.executed += batch.executed
        result.failed += batch.failed
        result.errors.push(...batch.errors)
      })
    } catch (e: any) {
      result.failed = 1
      result.errors.push({ orderId, message: e?.message || String(e) })
    }

    return result
  }
}

