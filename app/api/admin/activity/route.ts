import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-ACTIVITY] GET request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.activity.read")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    console.log("✅ [API-ADMIN-ACTIVITY] Admin authenticated:", session.user.email)

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')

    console.log("📋 [API-ADMIN-ACTIVITY] Fetching recent activity:", { limit })

    const adminService = createAdminUserService()
    const activities = await adminService.getRecentActivity(limit)

    console.log(`✅ [API-ADMIN-ACTIVITY] Found ${activities.length} activities`)

    return NextResponse.json({ success: true, activities }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-ACTIVITY] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch activity" },
      { status: 500 }
    )
  }
}