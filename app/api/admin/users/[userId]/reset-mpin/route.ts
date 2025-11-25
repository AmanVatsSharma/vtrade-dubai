/**
 * @file route.ts
 * @module admin-console
 * @description API route for resetting user MPIN
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { auth } from "@/auth"

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  console.log("🌐 [API-ADMIN-RESET-MPIN] POST request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.userId
    const body = await req.json()
    const { mpin } = body

    if (!mpin || mpin.length !== 4 || !/^\d{4}$/.test(mpin)) {
      return NextResponse.json(
        { error: "MPIN must be exactly 4 digits" },
        { status: 400 }
      )
    }

    console.log("📝 [API-ADMIN-RESET-MPIN] Resetting MPIN for:", userId)

    const adminService = createAdminUserService()
    const user = await adminService.resetMPIN(userId, mpin)

    console.log("✅ [API-ADMIN-RESET-MPIN] MPIN reset successfully")

    return NextResponse.json({ success: true, user }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RESET-MPIN] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to reset MPIN" },
      { status: 500 }
    )
  }
}
