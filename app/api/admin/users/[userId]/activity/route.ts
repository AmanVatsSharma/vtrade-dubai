/**
 * @file route.ts
 * @module admin-console
 * @description API route for fetching user activity logs
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  console.log("🌐 [API-ADMIN-USER-ACTIVITY] GET request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.activity.read")
    if (!authResult.ok) return authResult.response

    const userId = params.userId
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '100')

    console.log("📝 [API-ADMIN-USER-ACTIVITY] Fetching activity for:", { userId, limit })

    const adminService = createAdminUserService()
    const activities = await adminService.getUserActivity(userId, limit)

    console.log(`✅ [API-ADMIN-USER-ACTIVITY] Found ${activities.length} activities`)

    return NextResponse.json({ success: true, activities }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-USER-ACTIVITY] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch user activity" },
      { status: 500 }
    )
  }
}
