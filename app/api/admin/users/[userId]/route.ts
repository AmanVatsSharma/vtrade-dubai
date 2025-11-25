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
    const currentUserRole = (session?.user as any)?.role
    if (!session?.user || (currentUserRole !== 'ADMIN' && currentUserRole !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.userId
    const body = await req.json()
    console.log("📝 [API-ADMIN-USER-UPDATE] Updating user:", { userId, data: body })

    // 🔐 SECURITY: Prevent privilege escalation
    // Get the target user's current role first
    const adminService = createAdminUserService()
    const targetUser = await adminService.getUserDetails(userId)
    
    // Check 1: Regular admins cannot modify admin/super-admin users at all
    if (targetUser && (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN')) {
      if (currentUserRole !== 'SUPER_ADMIN') {
        console.error("🚨 [API-ADMIN-USER-UPDATE] Security violation: Non-super-admin attempting to modify admin user")
        return NextResponse.json(
          { error: "Security restriction: Only Super Admins can modify Admin or Super Admin users" },
          { status: 403 }
        )
      }
    }

    // Check 2: Only SUPER_ADMIN can assign ADMIN or SUPER_ADMIN roles
    if (body.role && (body.role === 'ADMIN' || body.role === 'SUPER_ADMIN')) {
      if (currentUserRole !== 'SUPER_ADMIN') {
        console.error("🚨 [API-ADMIN-USER-UPDATE] Security violation: Non-super-admin attempting to assign admin role")
        return NextResponse.json(
          { error: "Security restriction: Only Super Admins can assign Admin or Super Admin roles" },
          { status: 403 }
        )
      }
    }

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