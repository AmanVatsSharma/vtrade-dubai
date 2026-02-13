/**
 * File: lib/services/position/PositionPnLWorker.ts
 * Module: position
 * Purpose: Background worker to compute and persist server-side position PnL (unrealized/day) using batched quotes.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-04
 * Notes:
 * - Intended for EC2/Docker long-running worker OR cron-triggered execution.
 * - Uses `SystemSettings` heartbeat key `positions_pnl_worker_heartbeat` for admin visibility.
 * - Avoids spamming DB/SSE by skipping updates below a configurable threshold.
 */

import os from "os"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { normalizeQuotePrices } from "@/lib/services/position/quote-normalizer"
import { parsePositionPnLMode, POSITION_PNL_MODE_KEY } from "@/lib/server/workers/registry"
import { getLatestActiveGlobalSettings } from "@/lib/server/workers/system-settings"
import { parseInstrumentId } from "@/lib/market-data/utils/instrumentMapper"
import { getServerMarketDataService } from "@/lib/market-data/server-market-data.service"
import { baseLogger } from "@/lib/observability/logger"
import { redisSet } from "@/lib/redis/redis-client"
import { getRealtimeEventEmitter } from "@/lib/services/realtime/RealtimeEventEmitter"
import type { PositionsPnLUpdatedEventData } from "@/types/realtime"

export const POSITIONS_PNL_WORKER_HEARTBEAT_KEY = "positions_pnl_worker_heartbeat" as const

export type PositionPnLWorkerHeartbeat = {
  lastRunAtIso: string
  host: string
  pid: number
  scanned: number
  updated: number
  skipped: number
  errors: number
  elapsedMs: number
  mode?: "client" | "server"
  reason?: string
}

export type ProcessPositionPnLInput = {
  limit?: number
  /**
   * Skip DB update if both |Δunrealized| and |Δday| are below this value.
   * Default: 1 (₹1).
   */
  updateThreshold?: number
  dryRun?: boolean
}

export type ProcessPositionPnLResult = {
  success: boolean
  scanned: number
  updated: number
  skipped: number
  errors: number
  elapsedMs: number
  heartbeat: PositionPnLWorkerHeartbeat
}

function asDecimal(v: number): Prisma.Decimal {
  // Store at 2 dp to match Decimal(18,2)
  return new Prisma.Decimal(v.toFixed(2))
}

function toNumber(v: unknown): number {
  if (v == null) return 0
  if (typeof v === "number") return Number.isFinite(v) ? v : 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function abs(n: number): number {
  return Math.abs(n)
}

function parseTokenBestEffort(instrumentId: string | null | undefined): number | null {
  if (!instrumentId) return null

  // Fast-path for our standard format (e.g. "NSE_EQ-26000")
  const direct = parseInstrumentId(instrumentId)
  if (typeof direct === "number" && Number.isFinite(direct) && direct > 0) return direct

  // Fallback: scan from right for last numeric segment
  const parts = instrumentId.split("-")
  for (let i = parts.length - 1; i >= 0; i--) {
    const maybe = Number(parts[i])
    if (Number.isFinite(maybe) && maybe > 0) return maybe
  }
  return null
}

async function setGlobalSystemSetting(input: {
  key: string
  value: string
  category?: string
  description?: string
}): Promise<void> {
  const { key, value, category, description } = input
  await prisma.$transaction(async (tx) => {
    const existing = await tx.systemSettings.findFirst({
      where: { key, ownerId: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    })

    if (existing) {
      await tx.systemSettings.update({
        where: { id: existing.id },
        data: {
          value,
          category: category || "GENERAL",
          description,
          isActive: true,
          updatedAt: new Date(),
        },
      })

      await tx.systemSettings.updateMany({
        where: { key, ownerId: null, id: { not: existing.id } },
        data: { isActive: false, updatedAt: new Date() },
      })

      return
    }

    await tx.systemSettings.create({
      data: {
        key,
        value,
        category: category || "GENERAL",
        description,
        isActive: true,
      },
    })
  })
}

export class PositionPnLWorker {
  async processPositionPnL(input: ProcessPositionPnLInput = {}): Promise<ProcessPositionPnLResult> {
    const startedAt = Date.now()
    const limit = Math.max(1, Math.min(2000, input.limit ?? 500))
    const updateThreshold = Math.max(0, input.updateThreshold ?? 1)
    const dryRun = Boolean(input.dryRun)

    let scanned = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    const log = baseLogger.child({ worker: "position-pnl-worker", host: os.hostname(), pid: process.pid })
    log.info({ limit, updateThreshold, dryRun }, "start")

    try {
      // Soft-toggle support: only run when server PnL mode is enabled.
      try {
        const rows = await getLatestActiveGlobalSettings([POSITION_PNL_MODE_KEY])
        const raw = rows.get(POSITION_PNL_MODE_KEY)?.value ?? null
        const mode = parsePositionPnLMode(raw)
        if (mode !== "server") {
          const elapsedMs = Date.now() - startedAt
          const heartbeat: PositionPnLWorkerHeartbeat = {
            lastRunAtIso: new Date().toISOString(),
            host: os.hostname(),
            pid: process.pid,
            scanned: 0,
            updated: 0,
            skipped: 0,
            errors: 0,
            elapsedMs,
            mode,
            reason: "disabled_mode_client",
          }
          await setGlobalSystemSetting({
            key: POSITIONS_PNL_WORKER_HEARTBEAT_KEY,
            value: JSON.stringify(heartbeat),
            category: "TRADING",
            description: "Heartbeat for server-side position PnL worker (EC2/Docker/cron).",
          }).catch(() => {})

          log.info({ mode }, "skipped: mode=client")
          return { success: true, scanned: 0, updated: 0, skipped: 0, errors: 0, elapsedMs, heartbeat }
        }
      } catch (e) {
        log.warn({
          message: (e as any)?.message || String(e),
        }, "failed to read position_pnl_mode; defaulting to run")
      }

      const positions = await prisma.position.findMany({
        where: { quantity: { not: 0 } },
        include: {
          tradingAccount: { select: { userId: true } },
          Stock: {
            select: {
              instrumentId: true,
              ltp: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      })

      scanned = positions.length

      // Use the SAME marketdata feed as /dashboard (server-side cache).
      // Best-effort: subscribe the current position tokens before reading cache.
      const serverMarketData = getServerMarketDataService()
      await serverMarketData.ensureInitialized().catch((e) => {
        errors += 1
        log.error({
          message: (e as any)?.message || String(e),
        }, "server marketdata init failed; falling back to Stock.ltp")
      })

      const positionTokens = Array.from(
        new Set(
          positions
            .map((p) => parseTokenBestEffort(p.Stock?.instrumentId))
            .filter((t): t is number => typeof t === "number" && Number.isFinite(t) && t > 0),
        ),
      )

      if (positionTokens.length > 0) {
        try {
          serverMarketData.ensureSubscribed(positionTokens)
        } catch (e) {
          errors += 1
          log.error({
            message: (e as any)?.message || String(e),
          }, "ensureSubscribed failed; falling back to Stock.ltp")
        }
      }

      const emitter = getRealtimeEventEmitter()
      const updatesByUser = new Map<string, PositionsPnLUpdatedEventData["updates"]>()
      const redisTtlSeconds = Math.max(5, Math.floor(Number(process.env.REDIS_POSITIONS_PNL_TTL_SECONDS || 120)))

      // Update sequentially; small batches to reduce DB pressure.
      for (const p of positions) {
        try {
          const userId = (p as any)?.tradingAccount?.userId as string | undefined
          const quantity = Number(p.quantity || 0)
          const avg = Number(p.averagePrice)

          const token = parseTokenBestEffort(p.Stock?.instrumentId)
          const quote = token ? serverMarketData.getQuote(token) : null

          const norm = normalizeQuotePrices({
            quote,
            stockLtp: p.Stock?.ltp ?? null,
            averagePrice: avg,
          })

          const currentPrice = norm.currentPrice
          const prevClose = norm.prevClose

          const unrealizedPnL = (currentPrice - avg) * quantity
          const dayPnL = (currentPrice - prevClose) * quantity

          // Always write latest computed PnL into Redis (even if DB update is skipped),
          // so the dashboard can stay smooth without re-fetching on every tick.
          if (!dryRun) {
            const key = `positions:pnl:${p.id}`
            const payload = JSON.stringify({
              positionId: p.id,
              unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
              dayPnL: Number(dayPnL.toFixed(2)),
              currentPrice: Number(currentPrice.toFixed(4)),
              updatedAtMs: Date.now(),
            })
            await redisSet(key, payload, redisTtlSeconds)
          }

          if (userId) {
            const list = updatesByUser.get(userId) || []
            list.push({
              positionId: p.id,
              unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
              dayPnL: Number(dayPnL.toFixed(2)),
              currentPrice: Number(currentPrice.toFixed(4)),
              updatedAtMs: Date.now(),
            })
            updatesByUser.set(userId, list)
          }

          const oldUnrealized = toNumber(p.unrealizedPnL)
          const oldDay = toNumber(p.dayPnL)

          const du = abs(unrealizedPnL - oldUnrealized)
          const dd = abs(dayPnL - oldDay)

          if (du < updateThreshold && dd < updateThreshold) {
            skipped += 1
            continue
          }

          if (!dryRun) {
            await prisma.position.update({
              where: { id: p.id },
              data: {
                unrealizedPnL: asDecimal(unrealizedPnL),
                dayPnL: asDecimal(dayPnL),
              },
            })
          }

          updated += 1
        } catch (e) {
          errors += 1
          log.error({ positionId: p.id, message: (e as any)?.message || String(e) }, "failed to process position")
        }
      }

      // Emit batched PnL updates via realtime bus (Redis-backed) so UI can patch without refetch.
      // Keep payload bounded to avoid huge SSE frames.
      const MAX_UPDATES_PER_EVENT = 250
      for (const [userId, updates] of Array.from(updatesByUser.entries())) {
        if (!updates.length) continue
        for (let i = 0; i < updates.length; i += MAX_UPDATES_PER_EVENT) {
          const chunk = updates.slice(i, i + MAX_UPDATES_PER_EVENT)
          emitter.emit(userId, "positions_pnl_updated", { updates: chunk } as PositionsPnLUpdatedEventData)
        }
      }

      const elapsedMs = Date.now() - startedAt
      const heartbeat: PositionPnLWorkerHeartbeat = {
        lastRunAtIso: new Date().toISOString(),
        host: os.hostname(),
        pid: process.pid,
        scanned,
        updated,
        skipped,
        errors,
        elapsedMs,
      }

      try {
        await setGlobalSystemSetting({
          key: POSITIONS_PNL_WORKER_HEARTBEAT_KEY,
          value: JSON.stringify(heartbeat),
          category: "TRADING",
          description: "Heartbeat for server-side position PnL worker (EC2/Docker/cron).",
        })
      } catch (e) {
        log.error({ message: (e as any)?.message || String(e) }, "failed to write heartbeat setting")
        // Do not fail the worker result on heartbeat write.
      }

      log.info(heartbeat, "done")

      return {
        success: true,
        scanned,
        updated,
        skipped,
        errors,
        elapsedMs,
        heartbeat,
      }
    } catch (e) {
      const elapsedMs = Date.now() - startedAt
      const heartbeat: PositionPnLWorkerHeartbeat = {
        lastRunAtIso: new Date().toISOString(),
        host: os.hostname(),
        pid: process.pid,
        scanned,
        updated,
        skipped,
        errors: errors + 1,
        elapsedMs,
      }
      log.error({ message: (e as any)?.message || String(e) }, "fatal error")
      return {
        success: false,
        scanned,
        updated,
        skipped,
        errors: errors + 1,
        elapsedMs,
        heartbeat,
      }
    }
  }
}

export const positionPnLWorker = new PositionPnLWorker()

