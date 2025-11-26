/**
 * @file route.ts
 * @module admin-console
 * @description API route for system alerts
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { auth } from "@/auth"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-ALERTS] GET request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      console.error("❌ [API-ADMIN-ALERTS] Unauthorized role attempting GET:", role)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    console.log("✅ [API-ADMIN-ALERTS] Admin/SuperAdmin authenticated:", session.user.email)

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
