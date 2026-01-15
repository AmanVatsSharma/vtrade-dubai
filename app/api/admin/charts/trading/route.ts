/**
 * @file route.ts
 * @module admin-console
 * @description API route for trading chart data
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-CHARTS-TRADING] GET request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.charts.read")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    console.log("✅ [API-ADMIN-CHARTS-TRADING] Admin authenticated:", session.user.email)

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')

    console.log("📈 [API-ADMIN-CHARTS-TRADING] Fetching trading chart data:", { days })

    const adminService = createAdminUserService()
    const chartData = await adminService.getTradingChartData(days)

    console.log(`✅ [API-ADMIN-CHARTS-TRADING] Generated ${chartData.length} data points`)

    return NextResponse.json({ success: true, chartData }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-CHARTS-TRADING] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch trading chart data" },
      { status: 500 }
    )
  }
}
