/**
 * @file route.ts
 * @module admin-console
 * @description API route for system alerts
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-ALERTS] GET request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.risk.read")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    console.log("✅ [API-ADMIN-ALERTS] Admin authenticated:", session.user.email)

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log("🚨 [API-ADMIN-ALERTS] Fetching system alerts:", { limit })

    const adminService = createAdminUserService()
    const alerts = await adminService.getSystemAlerts(limit)

    console.log(`✅ [API-ADMIN-ALERTS] Found ${alerts.length} alerts`)

    return NextResponse.json({ success: true, alerts }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-ALERTS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch alerts" },
      { status: 500 }
    )
  }
}
