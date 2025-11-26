/**
 * @file route.ts
 * @module admin-console
 * @description API route for user activity chart data
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { auth } from "@/auth"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-CHARTS-ACTIVITY] GET request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      console.error("❌ [API-ADMIN-CHARTS-ACTIVITY] Unauthorized role attempting GET:", role)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    console.log("✅ [API-ADMIN-CHARTS-ACTIVITY] Admin/SuperAdmin authenticated:", session.user.email)

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '7')

    console.log("👥 [API-ADMIN-CHARTS-ACTIVITY] Fetching user activity chart data:", { days })

    const adminService = createAdminUserService()
    const chartData = await adminService.getUserActivityChartData(days)

    console.log(`✅ [API-ADMIN-CHARTS-ACTIVITY] Generated ${chartData.length} data points`)

    return NextResponse.json({ success: true, chartData }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-CHARTS-ACTIVITY] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch activity chart data" },
      { status: 500 }
    )
  }
}
