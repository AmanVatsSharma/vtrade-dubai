import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { createTradingLogger } from "@/lib/services/logging/TradingLogger"
import { getServerSession } from "next-auth"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-USERS] GET request received")
  
  try {
    // Get session and verify admin role
    const session = await getServerSession()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      console.error("❌ [API-ADMIN-USERS] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || undefined

    console.log("📝 [API-ADMIN-USERS] Request params:", { page, limit, search })

    const logger = createTradingLogger({
      clientId: 'ADMIN',
      userId: session.user.id
    })

    const adminService = createAdminUserService(logger)
    const result = await adminService.getAllUsers(page, limit, search)

    console.log("🎉 [API-ADMIN-USERS] Users retrieved:", {
      count: result.users.length,
      total: result.total,
      pages: result.pages
    })

    return NextResponse.json(result, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-USERS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  console.log("🌐 [API-ADMIN-USERS] PATCH request received")
  
  try {
    const session = await getServerSession()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    console.log("📝 [API-ADMIN-USERS] Update request:", body)

    const { userId, isActive } = body

    if (!userId || isActive === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const adminService = createAdminUserService()
    const user = await adminService.updateUserStatus(userId, isActive)

    console.log("✅ [API-ADMIN-USERS] User status updated:", user.id)

    return NextResponse.json({ success: true, user }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-USERS] PATCH error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    )
  }
}