/**
 * @file route.ts
 * @module cron
 * @description Cron endpoint to compute/persist position PnL via `PositionPnLWorker`.
 * Can be called by EC2 cron, external cron services, Vercel Cron, or AWS Lambda/EventBridge (serverless-friendly).
 * Protected by CRON_SECRET environment variable.
 * @author BharatERP
 * @created 2026-02-04
 */

export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { positionPnLWorker } from "@/lib/services/position/PositionPnLWorker"

function parseIntSafe(v: string | null, fallback: number): number {
  const n = v != null ? Number(v) : NaN
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

function parseFloatSafe(v: string | null, fallback: number): number {
  const n = v != null ? Number(v) : NaN
  return Number.isFinite(n) ? n : fallback
}

export async function GET(req: Request) {
  console.log("⏰ [CRON-POSITION-PNL] Cron request received")

  try {
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || process.env.POSITION_PNL_WORKER_SECRET

    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn("⚠️ [CRON-POSITION-PNL] Invalid authorization header")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else {
      console.warn("⚠️ [CRON-POSITION-PNL] No CRON_SECRET set, allowing request (development mode)")
    }

    const url = new URL(req.url)
    const limit = parseIntSafe(url.searchParams.get("limit"), 500)
    const updateThreshold = parseFloatSafe(url.searchParams.get("updateThreshold"), 1)
    const dryRun = url.searchParams.get("dryRun") === "true"

    const result = await positionPnLWorker.processPositionPnL({ limit, updateThreshold, dryRun })

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        result,
      },
      { status: 200 },
    )
  } catch (error: any) {
    console.error("❌ [CRON-POSITION-PNL] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to run position PnL worker",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  return GET(req)
}

