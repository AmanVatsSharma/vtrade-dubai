import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-STATS] GET request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.stats.read")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    console.log("✅ [API-ADMIN-STATS] Admin authenticated:", session.user.email)

    console.log("📊 [API-ADMIN-STATS] Fetching platform statistics")

    const adminService = createAdminUserService()
    const stats = await adminService.getPlatformStats()

    console.log("✅ [API-ADMIN-STATS] Statistics retrieved")

    return NextResponse.json({ success: true, stats }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-STATS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}