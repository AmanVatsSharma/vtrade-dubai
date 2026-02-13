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
import { isRedisEnabled, redisSet } from "@/lib/redis/redis-client"
import { getRealtimeEventEmitter } from "@/lib/services/realtime/RealtimeEventEmitter"
import type { PositionsPnLUpdatedEventData } from "@/types/realtime"
import { createPositionManagementService } from "@/lib/services/position/PositionManagementService"
import { getRiskThresholds } from "@/lib/services/risk/risk-thresholds"
import {
  isStopLossHit,
  isTargetHit,
  pickRiskAutoClosePositions,
  type RiskPositionSnapshot,
  type RiskThresholds,
} from "@/lib/services/position/position-risk-evaluator"

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
  redisEnabled?: boolean
  redisPnlCacheWrites?: number
  pnlUpdatesEmitted?: number
  pnlEventsEmitted?: number
  stopLossAutoClosed?: number
  targetAutoClosed?: number
  riskAutoClosed?: number
  riskAlertsCreated?: number
  riskWarningThreshold?: number
  riskAutoCloseThreshold?: number
  riskThresholdSource?: string
}

export type ProcessPositionPnLInput = {
  limit?: number
  /**
   * Skip DB update if both |Δunrealized| and |Δday| are below this value.
   * Default: 1 (₹1).
   */
  updateThreshold?: number
  dryRun?: boolean
  /**
   * Force worker run even if `position_pnl_mode !== server` (used by backstop/ops tooling).
   */
  forceRun?: boolean
  /**
   * Maximum number of SL/Target auto-closes to execute per tick (guardrail).
   */
  sltpMaxAutoClosesPerTick?: number
  /**
   * Maximum number of risk-driven auto-closes per account per tick (guardrail).
   */
  riskMaxAutoClosesPerAccount?: number
  /**
   * Cooldown for creating RiskAlert rows per account (ms).
   */
  riskAlertCooldownMs?: number
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

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key]
  const n = raw == null ? Number.NaN : Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const n = value == null ? Number.NaN : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.trunc(n)))
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
    const forceRun = input.forceRun === true

    let scanned = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    const log = baseLogger.child({ worker: "position-pnl-worker", host: os.hostname(), pid: process.pid })
    log.info({ limit, updateThreshold, dryRun }, "start")

    try {
      // Soft-toggle support: only run when server PnL mode is enabled.
      if (!forceRun) {
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
          log.warn(
            {
              message: (e as any)?.message || String(e),
            },
            "failed to read position_pnl_mode; defaulting to run",
          )
        }
      }

      const positions = await prisma.position.findMany({
        where: { quantity: { not: 0 } },
        include: {
          tradingAccount: { select: { userId: true, balance: true, availableMargin: true } },
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
      const redisTtlSeconds = Math.max(5, Math.floor(envNumber("REDIS_POSITIONS_PNL_TTL_SECONDS", 120)))
      let redisPnlCacheWrites = 0

      const configuredRisk = await getRiskThresholds().catch(() => ({
        warningThreshold: 0.8,
        autoCloseThreshold: 0.9,
        source: "default" as const,
      }))
      const riskThresholds: RiskThresholds = {
        warningThreshold: configuredRisk.warningThreshold,
        autoCloseThreshold: configuredRisk.autoCloseThreshold,
      }

      const accountPositions = new Map<
        string,
        { userId: string; totalFunds: number; positions: RiskPositionSnapshot[] }
      >()
      const currentPriceByPositionId = new Map<string, number>()
      const slTpCloseCandidates: Array<{
        positionId: string
        tradingAccountId: string
        userId: string
        symbol: string
        exitPrice: number
        reason: "stop_loss" | "target"
      }> = []

      // Update sequentially; small batches to reduce DB pressure.
      for (const p of positions) {
        try {
          const userId = (p as any)?.tradingAccount?.userId as string | undefined
          const tradingAccountId = String((p as any)?.tradingAccountId || "")
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

          currentPriceByPositionId.set(p.id, currentPrice)

          // Keep a per-account snapshot for risk evaluation.
          if (userId && tradingAccountId) {
            const balance = toNumber((p as any)?.tradingAccount?.balance)
            const availableMargin = toNumber((p as any)?.tradingAccount?.availableMargin)
            const totalFunds = balance + availableMargin
            const entry = accountPositions.get(tradingAccountId) || { userId, totalFunds, positions: [] }
            entry.userId = userId
            entry.totalFunds = totalFunds
            entry.positions.push({
              positionId: p.id,
              symbol: String((p as any)?.symbol || ""),
              quantity,
              unrealizedPnL: Number(unrealizedPnL.toFixed(2)),
            })
            accountPositions.set(tradingAccountId, entry)
          }

          // StopLoss/Target enforcement (server-side).
          // We skip in dryRun mode and let idempotency in PositionManagementService guard double closes.
          if (!dryRun && userId && tradingAccountId) {
            const stopLoss = (p as any)?.stopLoss != null ? toNumber((p as any)?.stopLoss) : null
            const target = (p as any)?.target != null ? toNumber((p as any)?.target) : null
            const symbol = String((p as any)?.symbol || "")

            if (isStopLossHit(quantity, currentPrice, stopLoss)) {
              slTpCloseCandidates.push({
                positionId: p.id,
                tradingAccountId,
                userId,
                symbol,
                exitPrice: currentPrice,
                reason: "stop_loss",
              })
            } else if (isTargetHit(quantity, currentPrice, target)) {
              slTpCloseCandidates.push({
                positionId: p.id,
                tradingAccountId,
                userId,
                symbol,
                exitPrice: currentPrice,
                reason: "target",
              })
            }
          }

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
            redisPnlCacheWrites += 1
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

      // Auto square-off after computing the tick snapshot.
      // Bound work per tick to avoid runaway close loops in a single run.
      let stopLossAutoClosed = 0
      let targetAutoClosed = 0
      let riskAutoClosed = 0
      let riskAlertsCreated = 0

      const MAX_SLTP_CLOSES_PER_TICK = clampInt(input.sltpMaxAutoClosesPerTick, 200, 0, 1000)
      const MAX_RISK_CLOSES_PER_ACCOUNT_PER_TICK = clampInt(input.riskMaxAutoClosesPerAccount, 1, 0, 25)
      const RISK_ALERT_COOLDOWN_MS = clampInt(input.riskAlertCooldownMs, 10 * 60 * 1000, 0, 60 * 60 * 1000)
      const closedPositionIdsThisTick = new Set<string>()
      const lastRiskAlertAtByAccount = (globalThis as any).__riskAlertThrottleByAccount as
        | Map<string, number>
        | undefined
      const riskAlertThrottle: Map<string, number> =
        lastRiskAlertAtByAccount || new Map<string, number>()
      ;(globalThis as any).__riskAlertThrottleByAccount = riskAlertThrottle

      if (!dryRun && slTpCloseCandidates.length > 0) {
        const positionService = createPositionManagementService()
        const seen = new Set<string>()

        for (const c of slTpCloseCandidates.slice(0, MAX_SLTP_CLOSES_PER_TICK)) {
          if (seen.has(c.positionId)) continue
          seen.add(c.positionId)
          closedPositionIdsThisTick.add(c.positionId)

          try {
            const res = await positionService.closePosition(c.positionId, c.tradingAccountId, c.exitPrice)
            const didClose = Boolean((res as any)?.exitOrderId)
            if (didClose) {
              if (c.reason === "stop_loss") stopLossAutoClosed += 1
              if (c.reason === "target") targetAutoClosed += 1
            }
            log.info(
              {
                positionId: c.positionId,
                symbol: c.symbol,
                reason: c.reason,
                exitPrice: c.exitPrice,
                didClose,
              },
              "auto square-off (sl/tp)",
            )
          } catch (e) {
            errors += 1
            log.warn(
              { positionId: c.positionId, symbol: c.symbol, reason: c.reason, message: (e as any)?.message || String(e) },
              "auto square-off (sl/tp) failed",
            )
          }
        }
      }

      // Account-level risk monitoring (loss utilization thresholds).
      if (!dryRun && accountPositions.size > 0) {
        const positionService = createPositionManagementService()
        for (const [tradingAccountId, snap] of Array.from(accountPositions.entries())) {
          const totalFunds = snap.totalFunds
          const selection = pickRiskAutoClosePositions({
            positions: snap.positions,
            totalFunds,
            thresholds: riskThresholds,
            maxToClose: MAX_RISK_CLOSES_PER_ACCOUNT_PER_TICK,
          })

          const severity = selection.shouldAutoClose ? "CRITICAL" : selection.shouldWarn ? "HIGH" : null
          if (severity) {
            const lastAt = riskAlertThrottle.get(tradingAccountId) || 0
            const now = Date.now()
            if (now - lastAt >= RISK_ALERT_COOLDOWN_MS) {
              try {
                await prisma.riskAlert.create({
                  data: {
                    userId: snap.userId,
                    type: selection.shouldAutoClose ? "MARGIN_CALL" : "LARGE_LOSS",
                    severity,
                    message: selection.shouldAutoClose
                      ? `Risk auto-close active. Loss utilization ${(selection.marginUtilizationPercent * 100).toFixed(
                          2,
                        )}% (threshold ${(riskThresholds.autoCloseThreshold * 100).toFixed(0)}%).`
                      : `Risk warning. Loss utilization ${(selection.marginUtilizationPercent * 100).toFixed(2)}% (threshold ${(
                          riskThresholds.warningThreshold * 100
                        ).toFixed(0)}%).`,
                  },
                })
                riskAlertsCreated += 1
                riskAlertThrottle.set(tradingAccountId, now)
              } catch (e) {
                errors += 1
                log.warn(
                  { tradingAccountId, userId: snap.userId, message: (e as any)?.message || String(e) },
                  "failed to create risk alert",
                )
              }
            }
          }

          if (!selection.shouldAutoClose) continue

          for (const candidate of selection.positionsToClose) {
            if (closedPositionIdsThisTick.has(candidate.positionId)) continue
            const exitPrice = currentPriceByPositionId.get(candidate.positionId)
            if (exitPrice == null || !Number.isFinite(exitPrice) || exitPrice <= 0) {
              log.warn({ positionId: candidate.positionId }, "missing exitPrice for risk auto-close; skipping")
              continue
            }

            try {
              const res = await positionService.closePosition(candidate.positionId, tradingAccountId, exitPrice)
              const didClose = Boolean((res as any)?.exitOrderId)
              if (didClose) riskAutoClosed += 1
              log.info(
                {
                  tradingAccountId,
                  positionId: candidate.positionId,
                  symbol: candidate.symbol,
                  exitPrice,
                  marginUtilizationPercent: selection.marginUtilizationPercent,
                  didClose,
                },
                "auto square-off (risk)",
              )
            } catch (e) {
              errors += 1
              log.warn(
                {
                  tradingAccountId,
                  positionId: candidate.positionId,
                  symbol: candidate.symbol,
                  message: (e as any)?.message || String(e),
                },
                "auto square-off (risk) failed",
              )
            }
          }
        }
      }

      // Emit batched PnL updates via realtime bus (Redis-backed) so UI can patch without refetch.
      // Keep payload bounded to avoid huge SSE frames.
      const MAX_UPDATES_PER_EVENT = 250
      let pnlUpdatesEmitted = 0
      let pnlEventsEmitted = 0
      for (const [userId, updates] of Array.from(updatesByUser.entries())) {
        if (!updates.length) continue
        pnlUpdatesEmitted += updates.length
        for (let i = 0; i < updates.length; i += MAX_UPDATES_PER_EVENT) {
          const chunk = updates.slice(i, i + MAX_UPDATES_PER_EVENT)
          emitter.emit(userId, "positions_pnl_updated", { updates: chunk } as PositionsPnLUpdatedEventData)
          pnlEventsEmitted += 1
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
        redisEnabled: isRedisEnabled(),
        redisPnlCacheWrites: dryRun ? 0 : redisPnlCacheWrites,
        pnlUpdatesEmitted,
        pnlEventsEmitted,
        stopLossAutoClosed,
        targetAutoClosed,
        riskAutoClosed,
        riskAlertsCreated,
        riskWarningThreshold: configuredRisk.warningThreshold,
        riskAutoCloseThreshold: configuredRisk.autoCloseThreshold,
        riskThresholdSource: configuredRisk.source,
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

