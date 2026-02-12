/**
 * @file position-pnl-worker.ts
 * @module scripts
 * @description Long-running positions PnL worker for EC2/Docker/ECS.
 * Run with: `npm run worker:pnl`.
 * @author BharatERP
 * @created 2026-02-04
 */

import { positionPnLWorker } from "../lib/services/position/PositionPnLWorker"

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  const n = raw != null ? Number(raw) : NaN
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

function floatEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  const n = raw != null ? Number(raw) : NaN
  return Number.isFinite(n) ? n : fallback
}

async function main() {
  const intervalMs = intEnv("POSITION_PNL_WORKER_INTERVAL_MS", 3000)
  const limit = intEnv("POSITION_PNL_WORKER_BATCH_LIMIT", 500)
  const updateThreshold = floatEnv("POSITION_PNL_UPDATE_THRESHOLD", 1)

  console.log("🧮 [POSITION-PNL-WORKER-SCRIPT] Starting worker loop", { intervalMs, limit, updateThreshold })

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await positionPnLWorker.processPositionPnL({ limit, updateThreshold })
    } catch (e: any) {
      console.error("❌ [POSITION-PNL-WORKER-SCRIPT] Worker loop error", {
        message: e?.message || String(e)
      })
    }
    await sleep(intervalMs)
  }
}

main().catch((e) => {
  console.error("❌ [POSITION-PNL-WORKER-SCRIPT] Fatal error", e)
  process.exitCode = 1
})

