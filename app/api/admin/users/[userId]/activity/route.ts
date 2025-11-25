/**
 * @file route.ts
 * @module admin-console
 * @description API route for fetching user activity logs
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { auth } from "@/auth"

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  console.log("🌐 [API-ADMIN-USER-ACTIVITY] GET request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
