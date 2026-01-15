/**
 * @file route.ts
 * @module admin-console
 * @description API route for top traders data
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-TOP-TRADERS] GET request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.top-traders.read")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    console.log("✅ [API-ADMIN-TOP-TRADERS] Admin authenticated:", session.user.email)

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log("🏆 [API-ADMIN-TOP-TRADERS] Fetching top traders:", { limit })

    const adminService = createAdminUserService()
    const traders = await adminService.getTopTraders(limit)

    console.log(`✅ [API-ADMIN-TOP-TRADERS] Found ${traders.length} top traders`)

    return NextResponse.json({ success: true, traders }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-TOP-TRADERS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch top traders" },
      { status: 500 }
    )
  }
}
