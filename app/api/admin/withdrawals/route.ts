import { NextResponse } from "next/server"
import { createAdminFundService } from "@/lib/services/admin/AdminFundService"
import { NotificationService } from "@/lib/services/notifications/NotificationService"
import { prisma } from "@/lib/prisma"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-WITHDRAWALS] GET request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.withdrawals.manage")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    const role = authResult.role

    console.log("📋 [API-ADMIN-WITHDRAWALS] Fetching pending withdrawals")

    const adminFundService = createAdminFundService()
    // Scope by RM for admins and moderators; super admin sees all
    const managedByIdFilter = role === 'SUPER_ADMIN' ? undefined
      : role === 'ADMIN' ? session.user.id!
      : (session.user as any).managedById || undefined
    const withdrawals = await adminFundService.getPendingWithdrawals(managedByIdFilter)

    console.log(`✅ [API-ADMIN-WITHDRAWALS] Found ${withdrawals.length} pending withdrawals`)

    return NextResponse.json({ success: true, withdrawals }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-WITHDRAWALS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch withdrawals" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  console.log("🌐 [API-ADMIN-WITHDRAWALS] POST request received (approve/reject)")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.withdrawals.manage")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    const role = authResult.role

    const body = await req.json()
    console.log("📝 [API-ADMIN-WITHDRAWALS] Request body:", body)

    const { withdrawalId, action, reason, transactionId } = body

    if (!withdrawalId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const adminFundService = createAdminFundService()

    if (action === 'approve') {
      if (!transactionId) {
        return NextResponse.json(
          { error: "Transaction ID required for approval" },
          { status: 400 }
        )
      }

      const result = await adminFundService.approveWithdrawal({
        withdrawalId,
        transactionId,
        adminId: session.user.id!,
        adminName: session.user.name || 'Admin',
        actorRole: role as any,
      })

      // Create notification for user (non-blocking)
      try {
        const withdrawal = await prisma.withdrawal.findUnique({
          where: { id: withdrawalId },
          select: { userId: true, amount: true }
        })
        if (withdrawal) {
          await NotificationService.notifyWithdrawal(
            withdrawal.userId,
            'APPROVED',
            Number(withdrawal.amount)
          )
        }
      } catch (notifError) {
        console.warn("⚠️ [API-ADMIN-WITHDRAWALS] Failed to create notification:", notifError)
      }

      console.log("✅ [API-ADMIN-WITHDRAWALS] Withdrawal approved:", withdrawalId)
      return NextResponse.json(result, { status: 200 })
    }

    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json(
          { error: "Rejection reason required" },
          { status: 400 }
        )
      }

      const result = await adminFundService.rejectWithdrawal({
        withdrawalId,
        reason,
        adminId: session.user.id!,
        adminName: session.user.name || 'Admin'
      })

      // Create notification for user (non-blocking)
      try {
        const withdrawal = await prisma.withdrawal.findUnique({
          where: { id: withdrawalId },
          select: { userId: true, amount: true }
        })
        if (withdrawal) {
          await NotificationService.notifyWithdrawal(
            withdrawal.userId,
            'REJECTED',
            Number(withdrawal.amount),
            reason
          )
        }
      } catch (notifError) {
        console.warn("⚠️ [API-ADMIN-WITHDRAWALS] Failed to create notification:", notifError)
      }

      console.log("✅ [API-ADMIN-WITHDRAWALS] Withdrawal rejected:", withdrawalId)
      return NextResponse.json(result, { status: 200 })
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'approve' or 'reject'" },
      { status: 400 }
    )

  } catch (error: any) {
    console.error("❌ [API-ADMIN-WITHDRAWALS] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process withdrawal" },
      { status: 500 }
    )
  }
}