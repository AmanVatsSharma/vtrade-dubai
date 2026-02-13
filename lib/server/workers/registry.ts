/**
 * @file registry.ts
 * @module workers
 * @description Central registry for background workers (status, enable flags, heartbeats) used by Admin Console.
 * @author BharatERP
 * @created 2026-02-04
 *
 * Notes:
 * - Treats SystemSettings(ownerId=null) keys as non-unique; picks latest active row by updatedAt.
 * - Enable/disable here is a soft-toggle; OS process control is out-of-scope.
 */

import { getLatestActiveGlobalSettings, parseBooleanSetting, upsertGlobalSetting } from "@/lib/server/workers/system-settings"
import type { WorkerHealth, WorkerHeartbeat, WorkerId, WorkerSnapshot } from "@/lib/server/workers/types"
import { isRedisEnabled } from "@/lib/redis/redis-client"

export const WORKER_SETTINGS_CATEGORY = "SYSTEM" as const
export const WORKER_TRADING_CATEGORY = "TRADING" as const

export const ORDER_WORKER_ENABLED_KEY = "worker_order_execution_enabled" as const
export const ORDER_WORKER_HEARTBEAT_KEY = "order_worker_heartbeat" as const

export const POSITION_PNL_MODE_KEY = "position_pnl_mode" as const
export const POSITION_PNL_HEARTBEAT_KEY = "positions_pnl_worker_heartbeat" as const

export const RISK_MONITORING_ENABLED_KEY = "worker_risk_monitoring_enabled" as const
export const RISK_MONITORING_HEARTBEAT_KEY = "risk_monitoring_heartbeat" as const

export const WORKER_IDS = {
  ORDER_EXECUTION: "order_execution",
  POSITION_PNL: "position_pnl",
  RISK_MONITORING: "risk_monitoring",
} as const

export type PositionPnLMode = "client" | "server"

export function parsePositionPnLMode(value: string | null | undefined): PositionPnLMode {
  return value === "server" ? "server" : "client"
}

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key]
  const n = raw == null ? Number.NaN : Number(raw)
  return Number.isFinite(n) ? n : fallback
}

function parseHeartbeat(value: string | null | undefined): WorkerHeartbeat | null {
  if (!value) return null
  // Backward-compatible: accept either JSON heartbeat {lastRunAtIso,...} OR plain ISO string.
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === "object") {
      const lastRunAtIso = (parsed as any).lastRunAtIso
      if (typeof lastRunAtIso === "string" && lastRunAtIso.length > 0) {
        return parsed as WorkerHeartbeat
      }
    }
  } catch {
    // ignore
  }

  const t = Date.parse(value)
  if (Number.isFinite(t) && t > 0) {
    return { lastRunAtIso: value }
  }

  return null
}

function computeHealth(input: { enabled: boolean; lastRunAtIso: string | null; ttlMs: number }): WorkerHealth {
  if (!input.enabled) return "disabled"
  if (!input.lastRunAtIso) return "unknown"
  const t = Date.parse(input.lastRunAtIso)
  if (!Number.isFinite(t) || t <= 0) return "unknown"
  return Date.now() - t < input.ttlMs ? "healthy" : "stale"
}

export type WorkersSnapshotOptions = {
  orderTtlMs?: number
  positionPnlTtlMs?: number
  riskTtlMs?: number
}

export async function getWorkersSnapshot(options: WorkersSnapshotOptions = {}): Promise<WorkerSnapshot[]> {
  const orderTtlMs = options.orderTtlMs ?? 2 * 60 * 1000
  const positionTtlMs = options.positionPnlTtlMs ?? 2 * 60 * 1000
  const riskTtlMs = options.riskTtlMs ?? 10 * 60 * 1000
  const redisEnabled = isRedisEnabled()
  const positionsPnlRedisTtlSeconds = Math.max(5, Math.floor(envNumber("REDIS_POSITIONS_PNL_TTL_SECONDS", 120)))
  const positionsPnlRedisMaxAgeMs = Math.max(1000, envNumber("REDIS_POSITIONS_PNL_MAX_AGE_MS", 15_000))

  const keys = [
    ORDER_WORKER_ENABLED_KEY,
    ORDER_WORKER_HEARTBEAT_KEY,
    POSITION_PNL_MODE_KEY,
    POSITION_PNL_HEARTBEAT_KEY,
    RISK_MONITORING_ENABLED_KEY,
    RISK_MONITORING_HEARTBEAT_KEY,
  ]

  const rows = await getLatestActiveGlobalSettings(keys)
  const get = (k: string) => rows.get(k)?.value ?? null

  // Order execution worker
  const orderEnabled = parseBooleanSetting(get(ORDER_WORKER_ENABLED_KEY))
  const orderEnabledResolved = orderEnabled ?? true
  const orderHeartbeat = parseHeartbeat(get(ORDER_WORKER_HEARTBEAT_KEY))
  const orderLast = orderHeartbeat?.lastRunAtIso ?? null

  const orderWorker: WorkerSnapshot = {
    id: "order_execution",
    label: "Order Execution Worker",
    description: "Executes PENDING orders asynchronously and updates positions/account.",
    enabled: orderEnabledResolved,
    enabledSource: orderEnabled == null ? "default_enabled" : "setting",
    healthTtlMs: orderTtlMs,
    lastRunAtIso: orderLast,
    heartbeat: orderHeartbeat,
    health: computeHealth({ enabled: orderEnabledResolved, lastRunAtIso: orderLast, ttlMs: orderTtlMs }),
    config: {
      batchLimitDefault: 50,
      cronLimitDefault: 25,
      cronEndpoint: "/api/cron/order-worker",
      redisEnabled,
      realtimeBus: redisEnabled ? "redis_pubsub" : "in_memory_only",
    },
    ec2Command: "ORDER_WORKER_INTERVAL_MS=750 ORDER_WORKER_BATCH_LIMIT=50 pnpm tsx scripts/order-worker.ts",
    cronEndpoint: "/api/cron/order-worker",
  }

  // Position PnL worker (enabled derived from mode=server)
  const pnlMode = parsePositionPnLMode(get(POSITION_PNL_MODE_KEY))
  const pnlEnabled = pnlMode === "server"
  const pnlHeartbeat = parseHeartbeat(get(POSITION_PNL_HEARTBEAT_KEY))
  const pnlLast = pnlHeartbeat?.lastRunAtIso ?? null

  const positionPnLWorker: WorkerSnapshot = {
    id: "position_pnl",
    label: "Positions PnL Worker",
    description: "Computes and persists server-side Position unrealized/day PnL in DB (optional).",
    enabled: pnlEnabled,
    enabledSource: "derived_from_mode",
    healthTtlMs: positionTtlMs,
    lastRunAtIso: pnlLast,
    heartbeat: pnlHeartbeat,
    health: computeHealth({ enabled: pnlEnabled, lastRunAtIso: pnlLast, ttlMs: positionTtlMs }),
    config: {
      mode: pnlMode,
      updateThresholdDefault: 1,
      cronEndpoint: "/api/cron/position-pnl-worker",
      redisEnabled,
      realtimeBus: redisEnabled ? "redis_pubsub" : "in_memory_only",
      redisPnlCacheKeyPrefix: "positions:pnl:",
      redisPnlCacheTtlSeconds: positionsPnlRedisTtlSeconds,
      redisPnlMaxAgeMs: positionsPnlRedisMaxAgeMs,
      pnlRealtimeEvent: "positions_pnl_updated",
    },
    ec2Command:
      "POSITION_PNL_WORKER_INTERVAL_MS=3000 POSITION_PNL_WORKER_BATCH_LIMIT=500 POSITION_PNL_UPDATE_THRESHOLD=1 pnpm tsx scripts/position-pnl-worker.ts",
    cronEndpoint: "/api/cron/position-pnl-worker",
  }

  // Risk monitoring
  const riskEnabled = parseBooleanSetting(get(RISK_MONITORING_ENABLED_KEY))
  const riskEnabledResolved = riskEnabled ?? true
  const riskHeartbeat = parseHeartbeat(get(RISK_MONITORING_HEARTBEAT_KEY))
  const riskLast = riskHeartbeat?.lastRunAtIso ?? null

  const riskWorker: WorkerSnapshot = {
    id: "risk_monitoring",
    label: "Risk Monitoring",
    description: "Runs platform risk monitoring and can trigger protective actions (alerts/auto-close).",
    enabled: riskEnabledResolved,
    enabledSource: riskEnabled == null ? "default_enabled" : "setting",
    healthTtlMs: riskTtlMs,
    lastRunAtIso: riskLast,
    heartbeat: riskHeartbeat,
    health: computeHealth({ enabled: riskEnabledResolved, lastRunAtIso: riskLast, ttlMs: riskTtlMs }),
    config: {
      cronEndpoint: "/api/cron/risk-monitoring",
      recommendedIntervalSeconds: 60,
      redisEnabled,
      realtimeBus: redisEnabled ? "redis_pubsub" : "in_memory_only",
    },
    cronEndpoint: "/api/cron/risk-monitoring",
  }

  return [orderWorker, positionPnLWorker, riskWorker]
}

export function isKnownWorkerId(id: string): id is WorkerId {
  return id === "order_execution" || id === "position_pnl" || id === "risk_monitoring"
}

function heartbeatKeyFor(workerId: WorkerId): string {
  if (workerId === WORKER_IDS.ORDER_EXECUTION) return ORDER_WORKER_HEARTBEAT_KEY
  if (workerId === WORKER_IDS.POSITION_PNL) return POSITION_PNL_HEARTBEAT_KEY
  return RISK_MONITORING_HEARTBEAT_KEY
}

function heartbeatCategoryFor(workerId: WorkerId): string {
  if (workerId === WORKER_IDS.RISK_MONITORING) return "RISK"
  return WORKER_TRADING_CATEGORY
}

function heartbeatDescriptionFor(workerId: WorkerId): string {
  if (workerId === WORKER_IDS.ORDER_EXECUTION) return "Heartbeat for Order Execution Worker (cron/EC2)."
  if (workerId === WORKER_IDS.POSITION_PNL) return "Heartbeat for Positions PnL Worker (cron/EC2)."
  return "Heartbeat for Risk Monitoring (cron)."
}

export async function updateWorkerHeartbeat(workerId: WorkerId, heartbeatJson?: string): Promise<void> {
  const value = heartbeatJson || JSON.stringify({ lastRunAtIso: new Date().toISOString() })
  await upsertGlobalSetting({
    key: heartbeatKeyFor(workerId),
    value,
    category: heartbeatCategoryFor(workerId),
    description: heartbeatDescriptionFor(workerId),
  })
}

export async function setWorkerEnabled(workerId: WorkerId, enabled: boolean): Promise<void> {
  if (workerId === WORKER_IDS.POSITION_PNL) {
    throw new Error("Position PnL worker enabled flag is derived from position_pnl_mode (use set_mode).")
  }
  const key = workerId === WORKER_IDS.ORDER_EXECUTION ? ORDER_WORKER_ENABLED_KEY : RISK_MONITORING_ENABLED_KEY
  await upsertGlobalSetting({
    key,
    value: String(enabled),
    category: WORKER_SETTINGS_CATEGORY,
    description: `Enable/disable ${workerId} worker`,
  })
}

