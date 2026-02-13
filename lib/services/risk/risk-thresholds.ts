/**
 * File: lib/services/risk/risk-thresholds.ts
 * Module: risk
 * Purpose: Read/write loss-utilization risk thresholds from SystemSettings with env fallback and caching.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-13
 * Notes:
 * - Values are ratios in range 0..1 (accepts 0..100 as percent input).
 * - SystemSettings(ownerId=null) is the canonical source; env vars are fallback.
 * - Cached in-memory to avoid frequent DB reads in workers.
 */

import { baseLogger } from "@/lib/observability/logger"
import { getLatestActiveGlobalSettings, upsertGlobalSetting } from "@/lib/server/workers/system-settings"

export const RISK_WARNING_THRESHOLD_KEY = "risk_warning_threshold" as const
export const RISK_AUTO_CLOSE_THRESHOLD_KEY = "risk_auto_close_threshold" as const

export type RiskThresholds = {
  warningThreshold: number
  autoCloseThreshold: number
  source: "system_settings" | "env" | "default"
}

type CacheState = {
  fetchedAtMs: number
  value: RiskThresholds
}

const log = baseLogger.child({ module: "risk-thresholds" })

const DEFAULT_THRESHOLDS: Omit<RiskThresholds, "source"> = {
  warningThreshold: 0.8,
  autoCloseThreshold: 0.9,
}

function toFiniteNumber(value: unknown): number | null {
  if (value == null) return null
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return null
  return n
}

function normalizeRatio01(value: unknown): number | null {
  const n = toFiniteNumber(value)
  if (n == null) return null

  // Accept 0..100 as percent
  const ratio = n > 1 && n <= 100 ? n / 100 : n
  if (!Number.isFinite(ratio)) return null

  // Clamp into 0..1
  return Math.max(0, Math.min(1, ratio))
}

function envRatio01(key: string): number | null {
  const raw = process.env[key]
  if (raw == null) return null
  return normalizeRatio01(raw)
}

function reconcileThresholds(input: {
  warningThreshold: number
  autoCloseThreshold: number
}): { warningThreshold: number; autoCloseThreshold: number } {
  const warning = Math.max(0, Math.min(1, input.warningThreshold))
  const autoClose = Math.max(warning, Math.min(1, input.autoCloseThreshold))
  return { warningThreshold: warning, autoCloseThreshold: autoClose }
}

function getGlobalCache(): CacheState | null {
  const g = globalThis as unknown as { __riskThresholdsCache?: CacheState }
  return g.__riskThresholdsCache || null
}

function setGlobalCache(value: CacheState): void {
  const g = globalThis as unknown as { __riskThresholdsCache?: CacheState }
  g.__riskThresholdsCache = value
}

export async function getRiskThresholds(input?: { maxAgeMs?: number }): Promise<RiskThresholds> {
  const maxAgeMs = Math.max(0, input?.maxAgeMs ?? 60_000)
  const cached = getGlobalCache()
  if (cached && Date.now() - cached.fetchedAtMs <= maxAgeMs) return cached.value

  // SystemSettings is canonical
  try {
    const rows = await getLatestActiveGlobalSettings([RISK_WARNING_THRESHOLD_KEY, RISK_AUTO_CLOSE_THRESHOLD_KEY])
    const warningRaw = rows.get(RISK_WARNING_THRESHOLD_KEY)?.value ?? null
    const autoCloseRaw = rows.get(RISK_AUTO_CLOSE_THRESHOLD_KEY)?.value ?? null

    const warningParsed = normalizeRatio01(warningRaw)
    const autoCloseParsed = normalizeRatio01(autoCloseRaw)

    if (warningParsed != null && autoCloseParsed != null) {
      const reconciled = reconcileThresholds({ warningThreshold: warningParsed, autoCloseThreshold: autoCloseParsed })
      const value: RiskThresholds = { ...reconciled, source: "system_settings" }
      setGlobalCache({ fetchedAtMs: Date.now(), value })
      return value
    }
  } catch (e) {
    log.warn({ message: (e as any)?.message || String(e) }, "failed to read SystemSettings; falling back to env/default")
  }

  // Env fallback
  const envWarning = envRatio01("RISK_WARNING_THRESHOLD")
  const envAutoClose = envRatio01("RISK_AUTO_CLOSE_THRESHOLD")
  if (envWarning != null || envAutoClose != null) {
    const reconciled = reconcileThresholds({
      warningThreshold: envWarning ?? DEFAULT_THRESHOLDS.warningThreshold,
      autoCloseThreshold: envAutoClose ?? DEFAULT_THRESHOLDS.autoCloseThreshold,
    })
    const value: RiskThresholds = { ...reconciled, source: "env" }
    setGlobalCache({ fetchedAtMs: Date.now(), value })
    return value
  }

  const value: RiskThresholds = { ...DEFAULT_THRESHOLDS, source: "default" }
  setGlobalCache({ fetchedAtMs: Date.now(), value })
  return value
}

export async function upsertRiskThresholds(input: {
  warningThreshold: number
  autoCloseThreshold: number
}): Promise<RiskThresholds> {
  const warning = normalizeRatio01(input.warningThreshold)
  const autoClose = normalizeRatio01(input.autoCloseThreshold)
  if (warning == null || autoClose == null) {
    throw new Error("Invalid thresholds (must be numeric ratio 0..1 or percent 0..100)")
  }

  const reconciled = reconcileThresholds({ warningThreshold: warning, autoCloseThreshold: autoClose })

  await upsertGlobalSetting({
    key: RISK_WARNING_THRESHOLD_KEY,
    value: String(reconciled.warningThreshold),
    category: "RISK",
    description: "Risk warning threshold (loss utilization ratio 0..1).",
  })

  await upsertGlobalSetting({
    key: RISK_AUTO_CLOSE_THRESHOLD_KEY,
    value: String(reconciled.autoCloseThreshold),
    category: "RISK",
    description: "Risk auto-close threshold (loss utilization ratio 0..1).",
  })

  const value: RiskThresholds = { ...reconciled, source: "system_settings" }
  setGlobalCache({ fetchedAtMs: Date.now(), value })
  return value
}

