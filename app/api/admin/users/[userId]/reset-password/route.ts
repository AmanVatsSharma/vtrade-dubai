/**
 * @file route.ts
 * @module admin-console
 * @description API route for resetting user password
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  console.log("🌐 [API-ADMIN-RESET-PASSWORD] POST request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.users.credentials")
    if (!authResult.ok) return authResult.response

    const userId = params.userId
    const body = await req.json()
    const { password } = body

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    console.log("📝 [API-ADMIN-RESET-PASSWORD] Resetting password for:", userId)

    const adminService = createAdminUserService()
    const user = await adminService.resetPassword(userId, password)

    console.log("✅ [API-ADMIN-RESET-PASSWORD] Password reset successfully")

    return NextResponse.json({ success: true, user }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RESET-PASSWORD] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reset password" },
      { status: 500 }
    )
  }
}
