/**
 * @file route.ts
 * @module cron
 * @description Cron endpoint to execute pending orders asynchronously via `OrderExecutionWorker`.
 * Can be called by EC2 cron, external cron services, or AWS Lambda/EventBridge (Amplify-friendly).
 * Protected by CRON_SECRET environment variable.
 * @author BharatERP
 * @created 2026-02-03
 */

import { NextResponse } from "next/server"
import { orderExecutionWorker } from "@/lib/services/order/OrderExecutionWorker"

function parseIntSafe(v: string | null, fallback: number): number {
  const n = v != null ? Number(v) : NaN
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

export async function GET(req: Request) {
  console.log("⏰ [CRON-ORDER-WORKER] Cron request received")

  try {
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || process.env.ORDER_WORKER_SECRET

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn("⚠️ [CRON-ORDER-WORKER] Invalid authorization header")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else {
      console.warn("⚠️ [CRON-ORDER-WORKER] No CRON_SECRET set, allowing request (development mode)")
    }

    const url = new URL(req.url)
    const limit = parseIntSafe(url.searchParams.get("limit"), 25)
    const maxAgeMs = parseIntSafe(url.searchParams.get("maxAgeMs"), 0)

    const result = await orderExecutionWorker.processPendingOrders({ limit, maxAgeMs })

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        result
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("❌ [CRON-ORDER-WORKER] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to run order worker",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  return GET(req)
}

