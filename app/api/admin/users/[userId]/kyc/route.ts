/**
 * @file route.ts
 * @module admin-console
 * @description API route for managing user KYC status
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { KycStatus } from "@prisma/client"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function POST(
  req: Request,
  { params }: { params: { userId: string } }
) {
  console.log("🌐 [API-ADMIN-KYC] POST request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.users.kyc")
    if (!authResult.ok) return authResult.response

    const userId = params.userId
    const body = await req.json()
    const { status, reason } = body

    if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
      return NextResponse.json(
        { error: "Invalid KYC status. Must be APPROVED, REJECTED, or PENDING" },
        { status: 400 }
      )
    }

    console.log("📝 [API-ADMIN-KYC] Updating KYC status:", { userId, status, reason })

    const adminService = createAdminUserService()
    const kyc = await adminService.updateKYCStatus(userId, status as KycStatus, reason)

    console.log("✅ [API-ADMIN-KYC] KYC status updated successfully")

    return NextResponse.json({ success: true, kyc }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-KYC] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update KYC status" },
      { status: 500 }
    )
  }
}
