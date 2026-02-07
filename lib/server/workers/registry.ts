/**
 * File: lib/server/workers/registry.ts
 * Module: workers
 * Purpose: Defines worker IDs, setting keys, and health check logic.
 */

import { getLatestActiveGlobalSettings, upsertGlobalSetting } from "./system-settings"

export const WORKER_IDS = {
  ORDER_EXECUTION: "order_execution",
  POSITION_PNL: "position_pnl",
  RISK_MONITORING: "risk_monitoring",
} as const

export type WorkerId = (typeof WORKER_IDS)[keyof typeof WORKER_IDS]

export const WORKER_SETTING_KEYS = {
  [WORKER_IDS.ORDER_EXECUTION]: {
    ENABLED: "worker_order_execution_enabled",
    HEARTBEAT: "order_worker_heartbeat",
  },
  [WORKER_IDS.POSITION_PNL]: {
    ENABLED: "worker_position_pnl_enabled",
    HEARTBEAT: "positions_pnl_worker_heartbeat",
    MODE: "position_pnl_mode", // "client" or "server"
  },
  [WORKER_IDS.RISK_MONITORING]: {
    ENABLED: "worker_risk_monitoring_enabled",
    HEARTBEAT: "risk_monitoring_heartbeat",
  },
} as const

// Default TTLs for workers (in milliseconds)
export const WORKER_HEARTBEAT_TTL = {
  [WORKER_IDS.ORDER_EXECUTION]: 30 * 1000, // 30s (runs frequently)
  [WORKER_IDS.POSITION_PNL]: 60 * 1000,    // 60s
  [WORKER_IDS.RISK_MONITORING]: 5 * 60 * 1000, // 5m (runs less frequently)
}

export interface WorkerStatus {
  id: WorkerId
  name: string
  isEnabled: boolean
  lastHeartbeatAt: Date | null
  isHealthy: boolean
  metadata?: Record<string, any>
}

export async function getWorkerStatuses(): Promise<WorkerStatus[]> {
  const keys = [
    WORKER_SETTING_KEYS.ORDER_EXECUTION.ENABLED,
    WORKER_SETTING_KEYS.ORDER_EXECUTION.HEARTBEAT,
    WORKER_SETTING_KEYS.POSITION_PNL.ENABLED,
    WORKER_SETTING_KEYS.POSITION_PNL.HEARTBEAT,
    WORKER_SETTING_KEYS.POSITION_PNL.MODE,
    WORKER_SETTING_KEYS.RISK_MONITORING.ENABLED,
    WORKER_SETTING_KEYS.RISK_MONITORING.HEARTBEAT,
  ]

  const settings = await getLatestActiveGlobalSettings(keys)

  const getBool = (key: string, def: boolean) => {
    const val = settings.get(key)?.value
    return val === "true" ? true : val === "false" ? false : def
  }

  const getDate = (key: string) => {
    const val = settings.get(key)?.value
    return val ? new Date(val) : null
  }

  const checkHealth = (id: WorkerId, lastHeartbeat: Date | null) => {
    if (!lastHeartbeat) return false
    const ttl = WORKER_HEARTBEAT_TTL[id]
    return Date.now() - lastHeartbeat.getTime() < ttl
  }

  return [
    {
      id: WORKER_IDS.ORDER_EXECUTION,
      name: "Order Execution Worker",
      isEnabled: getBool(WORKER_SETTING_KEYS.ORDER_EXECUTION.ENABLED, true),
      lastHeartbeatAt: getDate(WORKER_SETTING_KEYS.ORDER_EXECUTION.HEARTBEAT),
      isHealthy: checkHealth(WORKER_IDS.ORDER_EXECUTION, getDate(WORKER_SETTING_KEYS.ORDER_EXECUTION.HEARTBEAT)),
    },
    {
      id: WORKER_IDS.POSITION_PNL,
      name: "Position PnL Worker",
      isEnabled: getBool(WORKER_SETTING_KEYS.POSITION_PNL.ENABLED, true),
      lastHeartbeatAt: getDate(WORKER_SETTING_KEYS.POSITION_PNL.HEARTBEAT),
      isHealthy: checkHealth(WORKER_IDS.POSITION_PNL, getDate(WORKER_SETTING_KEYS.POSITION_PNL.HEARTBEAT)),
      metadata: {
        mode: settings.get(WORKER_SETTING_KEYS.POSITION_PNL.MODE)?.value || "client",
      },
    },
    {
      id: WORKER_IDS.RISK_MONITORING,
      name: "Risk Monitoring Worker",
      isEnabled: getBool(WORKER_SETTING_KEYS.RISK_MONITORING.ENABLED, true),
      lastHeartbeatAt: getDate(WORKER_SETTING_KEYS.RISK_MONITORING.HEARTBEAT),
      isHealthy: checkHealth(WORKER_IDS.RISK_MONITORING, getDate(WORKER_SETTING_KEYS.RISK_MONITORING.HEARTBEAT)),
    },
  ]
}

export async function setWorkerEnabled(id: WorkerId, enabled: boolean) {
  const key = WORKER_SETTING_KEYS[id].ENABLED
  await upsertGlobalSetting({
    key,
    value: String(enabled),
    category: "WORKER",
    description: `Enable/disable ${id} worker`,
  })
}

export async function updateWorkerHeartbeat(id: WorkerId, customValue?: string) {
  const key = WORKER_SETTING_KEYS[id].HEARTBEAT
  await upsertGlobalSetting({
    key,
    value: customValue || new Date().toISOString(),
    category: "WORKER_HEARTBEAT",
    description: `Last heartbeat for ${id} worker`,
  })
}
