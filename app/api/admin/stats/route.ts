import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { getServerSession } from "next-auth"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-STATS] GET request received")
  
  try {
    const session = await getServerSession()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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