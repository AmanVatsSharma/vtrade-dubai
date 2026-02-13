/**
 * @file route.ts
 * @module cron
 * @description Cron endpoint for automated risk monitoring
 * Can be called by Vercel Cron, external cron services, or scheduled tasks
 * Protected by CRON_SECRET environment variable
 * @author BharatERP
 * @created 2025-01-27
 */

export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { runRiskBackstop } from "@/lib/services/risk/risk-backstop-runner"
import { RISK_MONITORING_ENABLED_KEY } from "@/lib/server/workers/registry"
import { getLatestActiveGlobalSettings, parseBooleanSetting } from "@/lib/server/workers/system-settings"

export async function GET(req: Request) {
  console.log("⏰ [CRON-RISK-MONITORING] Cron request received")
  const startedAt = Date.now()

  try {
    // Verify cron secret (for security)
    const authHeader = req.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || process.env.RISK_MONITORING_SECRET
    
    if (cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        console.warn("⚠️ [CRON-RISK-MONITORING] Invalid authorization header")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    } else {
      // Allow if no secret is set (for development)
      console.warn("⚠️ [CRON-RISK-MONITORING] No CRON_SECRET set, allowing request (development mode)")
    }

    // Soft-toggle support (Admin Console → Workers)
    try {
      const rows = await getLatestActiveGlobalSettings([RISK_MONITORING_ENABLED_KEY])
      const raw = rows.get(RISK_MONITORING_ENABLED_KEY)?.value ?? null
      const enabled = parseBooleanSetting(raw) ?? true
      if (!enabled) {
        console.log("⏸️ [CRON-RISK-MONITORING] Disabled via SystemSettings; skipping run")
        return NextResponse.json(
          { success: true, skipped: true, reason: "disabled", timestamp: new Date().toISOString() },
          { status: 200 },
        )
      }
    } catch (e) {
      console.warn("⚠️ [CRON-RISK-MONITORING] Failed to read enabled flag; defaulting to enabled", {
        message: (e as any)?.message || String(e),
      })
    }

    // Backstop runner (runs PositionPnLWorker only when it is stale)
    const backstop = await runRiskBackstop()

    console.log("✅ [CRON-RISK-MONITORING] Backstop completed:", {
      skipped: backstop.skipped,
      skippedReason: backstop.skippedReason,
      pnlWorkerHealth: backstop.pnlWorkerHealth,
      elapsedMs: backstop.elapsedMs,
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: backstop
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [CRON-RISK-MONITORING] Error:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || "Failed to run risk monitoring",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also support POST for cron services that use POST
export async function POST(req: Request) {
  return GET(req)
}
