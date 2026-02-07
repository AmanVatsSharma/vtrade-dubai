/**
 * File: lib/server/workers/types.ts
 * Module: workers
 * Purpose: Shared worker types for Admin Console worker management (status, heartbeat, actions).
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-04
 * Notes:
 * - This is a lightweight typing layer; actual execution happens in worker services and admin APIs.
 */

export const WORKER_IDS = ["order_execution", "position_pnl", "risk_monitoring"] as const
export type WorkerId = (typeof WORKER_IDS)[number]

export type WorkerHealth = "healthy" | "stale" | "unknown" | "disabled"

export type WorkerHeartbeat = {
  lastRunAtIso: string
  [k: string]: unknown
}

export type WorkerSnapshot = {
  id: WorkerId
  label: string
  description: string

  enabled: boolean
  enabledSource: "setting" | "default_enabled" | "derived_from_mode" | "default_disabled"

  healthTtlMs: number
  health: WorkerHealth
  lastRunAtIso: string | null
  heartbeat: WorkerHeartbeat | null

  // Worker-specific config surfaced to UI (safe, non-secret)
  config: Record<string, unknown>

  // Operational hints
  ec2Command?: string
  cronEndpoint?: string
}

export type WorkersApiGetResponse = {
  success: true
  timestamp: string
  workers: WorkerSnapshot[]
}

export type WorkersApiPostAction = "toggle" | "run_once" | "set_mode"

