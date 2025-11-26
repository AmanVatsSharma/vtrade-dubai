/**
 * @file route.ts
 * @module cron
 * @description Cron endpoint for automated risk monitoring
 * Can be called by Vercel Cron, external cron services, or scheduled tasks
 * Protected by CRON_SECRET environment variable
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { RiskMonitoringService } from "@/lib/services/risk/RiskMonitoringService"

export async function GET(req: Request) {
  console.log("⏰ [CRON-RISK-MONITORING] Cron request received")

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

    // Run risk monitoring
    const monitoringService = new RiskMonitoringService()
    const result = await monitoringService.monitorAllAccounts()

    console.log("✅ [CRON-RISK-MONITORING] Risk monitoring completed:", {
      checkedAccounts: result.checkedAccounts,
      positionsClosed: result.positionsClosed,
      alertsCreated: result.alertsCreated
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: {
        checkedAccounts: result.checkedAccounts,
        positionsClosed: result.positionsClosed,
        alertsCreated: result.alertsCreated,
        errors: result.errors
      }
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
