/**
 * @file route.ts
 * @module admin-console
 * @description API route for freezing/unfreezing user accounts
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
  console.log("🌐 [API-ADMIN-FREEZE] POST request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.users.manage")
    if (!authResult.ok) return authResult.response

    const userId = params.userId
    const body = await req.json()
    const { freeze, reason } = body

    if (typeof freeze !== 'boolean') {
      return NextResponse.json(
        { error: "Freeze must be a boolean value" },
        { status: 400 }
      )
    }

    console.log("📝 [API-ADMIN-FREEZE] Freezing/unfreezing account:", { userId, freeze, reason })

    const adminService = createAdminUserService()
    const user = await adminService.freezeAccount(userId, freeze, reason)

    console.log(`✅ [API-ADMIN-FREEZE] Account ${freeze ? 'frozen' : 'unfrozen'} successfully`)

    return NextResponse.json({ success: true, user }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-FREEZE] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to freeze/unfreeze account" },
      { status: 500 }
    )
  }
}
