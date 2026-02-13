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
import os from "os"
import { createTradingLogger } from "@/lib/services/logging/TradingLogger"
import { NotificationService } from "@/lib/services/notifications/NotificationService"
import { OrderRepository } from "@/lib/repositories/OrderRepository"
import { PositionRepository } from "@/lib/repositories/PositionRepository"
import { TransactionRepository } from "@/lib/repositories/TransactionRepository"
import { FundManagementService } from "@/lib/services/funds/FundManagementService"
import { MarginCalculator } from "@/lib/services/risk/MarginCalculator"
import { OrderSide, OrderStatus, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { ORDER_WORKER_ENABLED_KEY, updateWorkerHeartbeat, WORKER_IDS } from "@/lib/server/workers/registry"
import { getLatestActiveGlobalSettings, parseBooleanSetting } from "@/lib/server/workers/system-settings"
import { parseInstrumentId } from "@/lib/market-data/utils/instrumentMapper"
import { getServerMarketDataService } from "@/lib/market-data/server-market-data.service"
import { baseLogger } from "@/lib/observability/logger"
import { isRedisEnabled } from "@/lib/redis/redis-client"

const ORDER_EXECUTION_ADVISORY_LOCK_NS = 910_001
const ORDER_WORKER_ENABLED_CACHE_TTL_MS = 5_000

let cachedOrderWorkerEnabled: { value: boolean; expiresAtMs: number } | null = null
const workerLog = baseLogger.child({ worker: "order-execution-worker", host: os.hostname(), pid: process.pid })

function parseTokenBestEffort(instrumentId: string | null | undefined): number | null {
  if (!instrumentId) return null

  const direct = parseInstrumentId(instrumentId)
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) return direct

  const parts = instrumentId.split("-")
  for (let i = parts.length - 1; i >= 0; i--) {
    const maybe = Number(parts[i])
    if (Number.isFinite(maybe) && maybe > 0) return maybe
  }
  return null
}

function toExecutionPriceNumber(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === "number" ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

function resolveExecutionPrice(input: {
  averagePrice?: unknown
  price?: unknown
  stockLtp?: unknown
  wsLtp?: unknown
}): number {
  return (
    toExecutionPriceNumber(input.averagePrice) ??
    toExecutionPriceNumber(input.price) ??
    toExecutionPriceNumber(input.wsLtp) ??
    toExecutionPriceNumber(input.stockLtp) ??
    0
  )
}

async function isOrderWorkerEnabled(): Promise<boolean> {
  const now = Date.now()
  if (cachedOrderWorkerEnabled && cachedOrderWorkerEnabled.expiresAtMs > now) {
    return cachedOrderWorkerEnabled.value
  }

  try {
    const rows = await getLatestActiveGlobalSettings([ORDER_WORKER_ENABLED_KEY])
    const raw = rows.get(ORDER_WORKER_ENABLED_KEY)?.value ?? null
    const parsed = parseBooleanSetting(raw)
    const resolved = parsed ?? true // default enabled
    cachedOrderWorkerEnabled = { value: resolved, expiresAtMs: now + ORDER_WORKER_ENABLED_CACHE_TTL_MS }
    return resolved
  } catch (e) {
    workerLog.warn({
      message: (e as any)?.message || String(e),
    }, "failed to resolve enabled flag; defaulting to enabled")
    cachedOrderWorkerEnabled = { value: true, expiresAtMs: now + ORDER_WORKER_ENABLED_CACHE_TTL_MS }
    return true
  }
}

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
   * Compute a deterministic 64-bit advisory lock key for an order.
   *
   * We intentionally use the single-argument overload `pg_try_advisory_xact_lock(bigint)`
   * to avoid Postgres overload mismatch issues that can happen with `(bigint, integer)`.
   *
   * Layout:
   * - High 32 bits: ORDER_EXECUTION_ADVISORY_LOCK_NS
   * - Low  32 bits: hashtext(orderId::text) (masked to unsigned 32-bit)
   */
  private buildOrderExecutionAdvisoryLockSql(orderId: string): Prisma.Sql {
    return Prisma.sql`
      SELECT pg_try_advisory_xact_lock(
        ((${ORDER_EXECUTION_ADVISORY_LOCK_NS}::bigint << 32) | (hashtext(${orderId}::text)::bigint & 4294967295))
      ) AS locked
    `
  }

  /**
   * Process the oldest PENDING orders.
   * Designed for: EC2 loop worker OR Lambda/EventBridge scheduled trigger.
   */
  async processPendingOrders(input: ProcessPendingOrdersInput = {}): Promise<ProcessPendingOrdersResult> {
    const startedAt = Date.now()
    const limit = Math.min(Math.max(1, input.limit ?? 25), 200)
    const maxAgeMs = input.maxAgeMs ?? 0

    workerLog.info({ limit, maxAgeMs }, "processing pending orders")

    const enabled = await isOrderWorkerEnabled()
    if (!enabled) {
      workerLog.info({ limit, maxAgeMs }, "disabled via SystemSettings; skipping batch")
      return { scanned: 0, executed: 0, cancelled: 0, errors: [] }
    }

    const serverMarketData = getServerMarketDataService()
    await serverMarketData.ensureInitialized().catch((e) => {
      workerLog.warn({
        message: (e as any)?.message || String(e),
      }, "server marketdata init failed; will fallback to Stock.ltp")
    })

    const cutoff = maxAgeMs > 0 ? new Date(Date.now() - maxAgeMs) : null

    const pending = await prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        ...(cutoff ? { createdAt: { lte: cutoff } } : {})
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      include: {
        Stock: { select: { id: true, ltp: true, segment: true, lot_size: true, instrumentId: true } },
        tradingAccount: { select: { id: true, userId: true } }
      }
    })

    try {
      const tokens = Array.from(
        new Set(
          pending
            .map((o) => parseTokenBestEffort(o.Stock?.instrumentId))
            .filter((t): t is number => typeof t === "number" && Number.isFinite(t) && t > 0),
        ),
      )
      if (tokens.length > 0) serverMarketData.ensureSubscribed(tokens)
    } catch (e) {
      workerLog.warn({
        message: (e as any)?.message || String(e),
      }, "ensureSubscribed failed; continuing")
    }

    const result: ProcessPendingOrdersResult = { scanned: pending.length, executed: 0, cancelled: 0, errors: [] }

    for (const order of pending) {
      try {
        const r = await this.processOrderById(order.id)
        if (r === "executed") result.executed++
        if (r === "cancelled") result.cancelled++
      } catch (e: any) {
        const message = e?.message || String(e)
        workerLog.error({ orderId: order.id, message }, "failed processing order")
        result.errors.push({ orderId: order.id, message })
      }
    }

    workerLog.info(result, "batch completed")

    // Heartbeat (for Admin Console visibility)
    try {
      const heartbeat = {
        lastRunAtIso: new Date().toISOString(),
        host: os.hostname(),
        pid: process.pid,
        redisEnabled: isRedisEnabled(),
        limit,
        maxAgeMs,
        scanned: result.scanned,
        executed: result.executed,
        cancelled: result.cancelled,
        errorCount: result.errors.length,
        elapsedMs: Date.now() - startedAt,
      }
      await updateWorkerHeartbeat(WORKER_IDS.ORDER_EXECUTION, JSON.stringify(heartbeat))
    } catch (err) {
      workerLog.warn({ message: (err as any)?.message || String(err) }, "failed to update heartbeat")
    }

    return result
  }

  /**
   * Execute a single PENDING order.
   * Returns a stable string outcome so callers can aggregate metrics.
   */
  async processOrderById(orderId: string): Promise<"skipped" | "executed" | "cancelled"> {
    const enabled = await isOrderWorkerEnabled()
    if (!enabled) {
      workerLog.info({ orderId }, "disabled via SystemSettings; skipping order")
      return "skipped"
    }

    const serverMarketData = getServerMarketDataService()
    await serverMarketData.ensureInitialized().catch(() => {})

    workerLog.info({ orderId }, "processing order")

    type TxResult =
      | { outcome: "skipped" }
      | { outcome: "cancelled" }
      | { outcome: "executed"; executionPrice: number; userId?: string; symbol: string; quantity: number; orderSide: OrderSide }

    // Execute core DB updates in one transaction, guarded by an advisory xact lock to prevent double-processing
    try {
      const txResult = await executeInTransaction<TxResult>(async (tx) => {
        // Advisory lock (per-order) to keep execution idempotent across cron + serverless + EC2 workers.
        const lockRows = await tx.$queryRaw<{ locked: boolean }[]>(
          this.buildOrderExecutionAdvisoryLockSql(orderId)
        )
        const locked = lockRows?.[0]?.locked === true
        if (!locked) {
          workerLog.info({ orderId }, "advisory lock not acquired; skipping")
          return { outcome: "skipped" }
        }

        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            Stock: { select: { id: true, ltp: true, segment: true, lot_size: true, instrumentId: true } },
            tradingAccount: { select: { id: true, userId: true } }
          }
        })

        if (!order) {
          workerLog.warn({ orderId }, "order not found; skipping")
          return { outcome: "skipped" }
        }

        if (order.status !== OrderStatus.PENDING) {
          workerLog.info({ orderId, status: order.status }, "order not pending; skipping")
          return { outcome: "skipped" }
        }

        // Determine execution price (prefer WS quote cache, then DB Stock.ltp).
        const token = parseTokenBestEffort(order.Stock?.instrumentId)
        if (token) {
          try {
            serverMarketData.ensureSubscribed([token])
          } catch {
            // best-effort only
          }
        }
        const wsQuote = token ? serverMarketData.getQuote(token) : null
        const executionPrice = resolveExecutionPrice({
          averagePrice: order.averagePrice,
          price: order.price,
          wsLtp: wsQuote?.last_trade_price,
          stockLtp: order.Stock?.ltp,
        })

        if (!executionPrice || executionPrice <= 0) {
          workerLog.error({ orderId, executionPrice }, "invalid execution price; cancelling")
          await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } })
          return { outcome: "cancelled" }
        }

        if (!order.stockId || !order.Stock?.id) {
          workerLog.error({ orderId, stockId: order.stockId }, "missing stock reference; cancelling")
          await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED } })
          return { outcome: "cancelled" }
        }

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

        return {
          outcome: "executed",
          executionPrice,
          userId: order.tradingAccount?.userId,
          symbol: order.symbol,
          quantity: order.quantity,
          orderSide: order.orderSide
        }
      })

      if (txResult.outcome === "skipped") return "skipped"
      if (txResult.outcome === "cancelled") return "cancelled"

      // Notifications can be safely attempted after commit
      try {
        if (txResult.userId) {
          await NotificationService.notifyOrderExecuted(txResult.userId, {
            symbol: txResult.symbol,
            quantity: txResult.quantity,
            orderSide: txResult.orderSide,
            averagePrice: txResult.executionPrice
          })
        }
      } catch (notifError) {
        workerLog.warn({
          orderId,
          message: notifError instanceof Error ? notifError.message : String(notifError)
        }, "failed to create order executed notification")
      }

      workerLog.info({ orderId, executionPrice: txResult.executionPrice }, "order executed")
      return "executed"
    } catch (error: any) {
      workerLog.error({
        orderId,
        message: error?.message
      }, "execution transaction failed; cancelling + releasing margin best-effort")

      // Best-effort compensation (cancel + release margin), guarded by advisory lock.
      let cancelled = false
      try {
        const comp = await executeInTransaction(async (tx) => {
          const lockRows = await tx.$queryRaw<{ locked: boolean }[]>(
            this.buildOrderExecutionAdvisoryLockSql(orderId)
          )
          const locked = lockRows?.[0]?.locked === true
          if (!locked) return { cancelled: false }

          const order = await tx.order.findUnique({
            where: { id: orderId },
            include: {
              Stock: { select: { id: true, ltp: true, segment: true, lot_size: true, instrumentId: true } },
              tradingAccount: { select: { id: true, userId: true } }
            }
          })

          if (!order || order.status !== OrderStatus.PENDING) return { cancelled: false }

          await this.orderRepo.update(orderId, { status: OrderStatus.CANCELLED }, tx)

          // Release margin using current margin rules (charges refund not handled here).
          const token = parseTokenBestEffort(order.Stock?.instrumentId)
          const wsQuote = token ? serverMarketData.getQuote(token) : null
          const executionPrice = resolveExecutionPrice({
            averagePrice: order.averagePrice,
            price: order.price,
            wsLtp: wsQuote?.last_trade_price,
            stockLtp: order.Stock?.ltp,
          })

          if (executionPrice > 0) {
            const logger = createTradingLogger({ tradingAccountId: order.tradingAccountId, userId: order.tradingAccount?.userId, symbol: order.symbol })
            const fundService = new FundManagementService(logger)
            const marginCalc = new MarginCalculator()

            const segment = (order.Stock?.segment || "NSE").toUpperCase()
            const productType = (order.productType || "MIS").toUpperCase()
            const lotSize = order.Stock?.lot_size ? Number(order.Stock.lot_size) : 1

            const calc = await marginCalc.calculateMargin(segment, productType, order.quantity, executionPrice, lotSize)
            await fundService.releaseMarginTx(tx, order.tradingAccountId, calc.requiredMargin, `Margin released for failed order ${orderId}`, { orderId })
          }

          return { cancelled: true }
        })
        cancelled = Boolean((comp as any)?.cancelled)
      } catch (compError) {
        workerLog.warn({ orderId, message: (compError as any)?.message || String(compError) }, "compensation failed")
      }

      return cancelled ? "cancelled" : "skipped"
    }
  }
}

/**
 * Convenience singleton for simple cron triggers.
 */
export const orderExecutionWorker = new OrderExecutionWorker()
