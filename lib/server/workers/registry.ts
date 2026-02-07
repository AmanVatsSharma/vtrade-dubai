/**
 * File: lib/server/workers/registry.ts
 * Module: workers
 * Purpose: Central registry for background workers (status, enable flags, heartbeats) used by Admin Console.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-04
 * Notes:
 * - Treats SystemSettings(ownerId=null) keys as non-unique; picks latest active row by updatedAt.
 * - Enable/disable here is a soft-toggle; OS process control is out-of-scope.
 */

import { getLatestActiveGlobalSettings, parseBooleanSetting } from "@/lib/server/workers/system-settings"
import type { WorkerHealth, WorkerHeartbeat, WorkerId, WorkerSnapshot } from "@/lib/server/workers/types"

export const WORKER_SETTINGS_CATEGORY = "SYSTEM" as const
export const WORKER_TRADING_CATEGORY = "TRADING" as const

export const ORDER_WORKER_ENABLED_KEY = "worker_order_execution_enabled" as const
export const ORDER_WORKER_HEARTBEAT_KEY = "order_worker_heartbeat" as const

export const POSITION_PNL_MODE_KEY = "position_pnl_mode" as const
export const POSITION_PNL_HEARTBEAT_KEY = "positions_pnl_worker_heartbeat" as const

export const RISK_MONITORING_ENABLED_KEY = "worker_risk_monitoring_enabled" as const
export const RISK_MONITORING_HEARTBEAT_KEY = "risk_monitoring_heartbeat" as const

export type PositionPnLMode = "client" | "server"

export function parsePositionPnLMode(value: string | null | undefined): PositionPnLMode {
  return value === "server" ? "server" : "client"
}

function parseHeartbeat(value: string | null | undefined): WorkerHeartbeat | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== "object") return null
    const lastRunAtIso = (parsed as any).lastRunAtIso
    if (typeof lastRunAtIso !== "string" || lastRunAtIso.length === 0) return null
    return parsed as WorkerHeartbeat
  } catch {
    return null
  }
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
    },
    cronEndpoint: "/api/cron/risk-monitoring",
  }

  return [orderWorker, positionPnLWorker, riskWorker]
}

export function isKnownWorkerId(id: string): id is WorkerId {
  return id === "order_execution" || id === "position_pnl" || id === "risk_monitoring"
}

