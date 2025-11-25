/**
 * @file route.ts
 * @module admin-console
 * @description API route for bulk user operations
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { auth } from "@/auth"

export async function POST(req: Request) {
  console.log("🌐 [API-ADMIN-BULK-USERS] POST request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { userIds, action, isActive } = body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds must be a non-empty array" },
        { status: 400 }
      )
    }

    if (action === 'updateStatus' && typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: "isActive must be a boolean for updateStatus action" },
        { status: 400 }
      )
    }

    console.log("📝 [API-ADMIN-BULK-USERS] Bulk operation:", { action, userIds: userIds.length, isActive })

    const adminService = createAdminUserService()
    let result

    switch (action) {
      case 'updateStatus':
        result = await adminService.bulkUpdateStatus(userIds, isActive)
        break
      default:
        return NextResponse.json(
          { error: "Invalid action. Supported: updateStatus" },
          { status: 400 }
        )
    }

    console.log(`✅ [API-ADMIN-BULK-USERS] Bulk operation completed: ${result.count} users affected`)

    return NextResponse.json({ success: true, affected: result.count }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-BULK-USERS] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to perform bulk operation" },
      { status: 500 }
    )
  }
}
