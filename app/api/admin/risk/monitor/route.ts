/**
 * @file route.ts
 * @module admin-console
 * @description API route for server-side risk monitoring and automatic position closure
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { RiskMonitoringService, RiskThresholds } from "@/lib/services/risk/RiskMonitoringService"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function POST(req: Request) {
  console.log("🛡️ [API-ADMIN-RISK-MONITOR] POST request received")

  try {
    const authResult = await requireAdminPermissions(req, "admin.risk.manage")
    if (!authResult.ok) return authResult.response

    // Parse request body for custom thresholds (optional)
    let thresholds: RiskThresholds | undefined
    try {
      const body = await req.json().catch(() => ({}))
      if (body.warningThreshold !== undefined || body.autoCloseThreshold !== undefined) {
        thresholds = {
          warningThreshold: body.warningThreshold ?? 0.80,
          autoCloseThreshold: body.autoCloseThreshold ?? 0.90
        }
        console.log("⚙️ [API-ADMIN-RISK-MONITOR] Using custom thresholds:", thresholds)
      }
    } catch (e) {
      // Body parsing failed, use defaults
    }

    // Run risk monitoring
    const monitoringService = new RiskMonitoringService()
    const result = await monitoringService.monitorAllAccounts(thresholds)

    console.log("✅ [API-ADMIN-RISK-MONITOR] Risk monitoring completed:", {
      checkedAccounts: result.checkedAccounts,
      positionsClosed: result.positionsClosed,
      alertsCreated: result.alertsCreated
    })

    return NextResponse.json({
      success: true,
      result
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RISK-MONITOR] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to run risk monitoring" },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  console.log("🛡️ [API-ADMIN-RISK-MONITOR] GET request received")

  try {
    const authResult = await requireAdminPermissions(req, "admin.risk.read")
    if (!authResult.ok) return authResult.response

    // Return current risk monitoring status/config
    return NextResponse.json({
      success: true,
      message: "Risk monitoring endpoint is active",
      defaultThresholds: {
        warningThreshold: 0.80,
        autoCloseThreshold: 0.90
      },
      usage: {
        POST: "Run risk monitoring for all accounts",
        body: {
          warningThreshold: "Optional: Warning threshold (0-1, default 0.80)",
          autoCloseThreshold: "Optional: Auto-close threshold (0-1, default 0.90)"
        }
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RISK-MONITOR] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get risk monitoring info" },
      { status: 500 }
    )
  }
}
