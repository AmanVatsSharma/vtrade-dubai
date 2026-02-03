/**
 * @file route.ts
 * @module admin-console
 * @description API route for server-side risk monitoring and automatic position closure
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from "next/server"
import { RiskMonitoringService, RiskThresholds } from "@/lib/services/risk/RiskMonitoringService"
import { handleAdminApi } from "@/lib/rbac/admin-api"

export async function POST(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/risk/monitor",
      required: "admin.risk.manage",
      fallbackMessage: "Failed to run risk monitoring",
    },
    async (ctx) => {
      // Parse request body for custom thresholds (optional)
      let thresholds: RiskThresholds | undefined
      try {
        const body = await req.json().catch(() => ({}))
        if (body.warningThreshold !== undefined || body.autoCloseThreshold !== undefined) {
          thresholds = {
            warningThreshold: body.warningThreshold ?? 0.8,
            autoCloseThreshold: body.autoCloseThreshold ?? 0.9,
          }
          ctx.logger.debug({ thresholds }, "POST /api/admin/risk/monitor - custom thresholds")
        }
      } catch {
        // Body parsing failed, use defaults
      }

      const monitoringService = new RiskMonitoringService()
      const result = await monitoringService.monitorAllAccounts(thresholds)

      ctx.logger.info(
        {
          checkedAccounts: result.checkedAccounts,
          positionsClosed: result.positionsClosed,
          alertsCreated: result.alertsCreated,
        },
        "POST /api/admin/risk/monitor - success"
      )

      return NextResponse.json({ success: true, result }, { status: 200 })
    }
  )
}

export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/risk/monitor",
      required: "admin.risk.read",
      fallbackMessage: "Failed to get risk monitoring info",
    },
    async () => {
      // Return current risk monitoring status/config
      return NextResponse.json(
        {
          success: true,
          message: "Risk monitoring endpoint is active",
          defaultThresholds: {
            warningThreshold: 0.8,
            autoCloseThreshold: 0.9,
          },
          usage: {
            POST: "Run risk monitoring for all accounts",
            body: {
              warningThreshold: "Optional: Warning threshold (0-1, default 0.80)",
              autoCloseThreshold: "Optional: Auto-close threshold (0-1, default 0.90)",
            },
          },
        },
        { status: 200 }
      )
    }
  )
}
