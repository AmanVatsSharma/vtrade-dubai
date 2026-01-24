/**
 * @file route.ts
 * @module admin-console
 * @description API endpoint for super admins to update trading account funds
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function PUT(
  req: Request,
  { params }: { params: { userId: string } }
) {
  console.log("🌐 [API-ADMIN-USER-TRADING-ACCOUNT] PUT request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.funds.override")
    if (!authResult.ok) return authResult.response

    const userId = params.userId
    const body = await req.json()
    const { balance, availableMargin, usedMargin, reason } = body

    console.log("📝 [API-ADMIN-USER-TRADING-ACCOUNT] Updating trading account funds:", {
      userId,
      balance,
      availableMargin,
      usedMargin,
      hasReason: !!reason
    })

    // Validate that at least one field is provided
    if (balance === undefined && availableMargin === undefined && usedMargin === undefined) {
      return NextResponse.json(
        { error: "At least one field (balance, availableMargin, or usedMargin) must be provided" },
        { status: 400 }
      )
    }

    const adminService = createAdminUserService()
    const updatedAccount = await adminService.updateTradingAccountFunds(
      userId,
      {
        ...(balance !== undefined && { balance: Number(balance) }),
        ...(availableMargin !== undefined && { availableMargin: Number(availableMargin) }),
        ...(usedMargin !== undefined && { usedMargin: Number(usedMargin) })
      },
      reason
    )

    console.log("✅ [API-ADMIN-USER-TRADING-ACCOUNT] Trading account funds updated successfully")

    return NextResponse.json({
      success: true,
      tradingAccount: {
        id: updatedAccount.id,
        balance: Number(updatedAccount.balance),
        availableMargin: Number(updatedAccount.availableMargin),
        usedMargin: Number(updatedAccount.usedMargin)
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-USER-TRADING-ACCOUNT] PUT error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update trading account funds" },
      { status: 500 }
    )
  }
}
