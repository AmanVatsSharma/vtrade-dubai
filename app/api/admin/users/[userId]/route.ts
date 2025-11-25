/**
 * @file route.ts
 * @module admin-console
 * @description API route for individual user management operations (GET, PUT)
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
  console.log("🌐 [API-ADMIN-USER-DETAILS] GET request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
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

export async function PUT(
  req: Request,
  { params }: { params: { userId: string } }
) {
  console.log("🌐 [API-ADMIN-USER-UPDATE] PUT request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.userId
    const body = await req.json()
    console.log("📝 [API-ADMIN-USER-UPDATE] Updating user:", { userId, data: body })

    const adminService = createAdminUserService()
    const user = await adminService.updateUser(userId, body)

    console.log("✅ [API-ADMIN-USER-UPDATE] User updated successfully")

    return NextResponse.json({ success: true, user }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-USER-UPDATE] PUT error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    )
  }
}