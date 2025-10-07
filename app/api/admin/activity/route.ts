import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { getServerSession } from "next-auth"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-ACTIVITY] GET request received")
  
  try {
    const session = await getServerSession()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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