import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { getServerSession } from "next-auth"

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  console.log("🌐 [API-ADMIN-USER-DETAILS] GET request received")
  
  try {
    const session = await getServerSession()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.userId
    console.log("📝 [API-ADMIN-USER-DETAILS] Fetching details for:", userId)

    const adminService = createAdminUserService()
    const user = await adminService.getUserDetails(userId)

    console.log("✅ [API-ADMIN-USER-DETAILS] User details retrieved")

    return NextResponse.json({ success: true, user }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-USER-DETAILS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch user details" },
      { status: 500 }
    )
  }
}