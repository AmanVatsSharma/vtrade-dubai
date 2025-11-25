/**
 * @file route.ts
 * @module admin-console
 * @description API route for manually verifying user email or phone
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
  console.log("🌐 [API-ADMIN-VERIFY-CONTACT] POST request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.userId
    const body = await req.json()
    const { type } = body

    if (!type || !['email', 'phone'].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'email' or 'phone'" },
        { status: 400 }
      )
    }

    console.log("📝 [API-ADMIN-VERIFY-CONTACT] Verifying contact:", { userId, type })

    const adminService = createAdminUserService()
    const user = await adminService.verifyContact(userId, type as 'email' | 'phone')

    console.log(`✅ [API-ADMIN-VERIFY-CONTACT] ${type} verified successfully`)

    return NextResponse.json({ success: true, user }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-VERIFY-CONTACT] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to verify contact" },
      { status: 500 }
    )
  }
}
