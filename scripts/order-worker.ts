/**
 * @file order-worker.ts
 * @module scripts
 * @description Long-running order execution worker for EC2/Docker/ECS.
 * Run with: `npm run worker:order`.
 * @author BharatERP
 * @created 2026-02-03
 */

import { orderExecutionWorker } from "../lib/services/order/OrderExecutionWorker"

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  const n = raw != null ? Number(raw) : NaN
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

async function main() {
  const intervalMs = intEnv("ORDER_WORKER_INTERVAL_MS", 750)
  const limit = intEnv("ORDER_WORKER_BATCH_LIMIT", 50)
  const maxAgeMs = intEnv("ORDER_WORKER_MAX_AGE_MS", 0)

  console.log("🧵 [ORDER-WORKER-SCRIPT] Starting worker loop", { intervalMs, limit, maxAgeMs })

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await orderExecutionWorker.processPendingOrders({ limit, maxAgeMs })
    } catch (e: any) {
      console.error("❌ [ORDER-WORKER-SCRIPT] Worker loop error", {
        message: e?.message || String(e)
      })
    }
    await sleep(intervalMs)
  }
}

main().catch((e) => {
  console.error("❌ [ORDER-WORKER-SCRIPT] Fatal error", e)
  process.exitCode = 1
})

