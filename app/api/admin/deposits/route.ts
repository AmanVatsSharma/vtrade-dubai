import { NextResponse } from "next/server"
import { createAdminFundService } from "@/lib/services/admin/AdminFundService"
import { NotificationService } from "@/lib/services/notifications/NotificationService"
import { prisma } from "@/lib/prisma"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-DEPOSITS] GET request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.deposits.manage")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    const role = authResult.role

    console.log("📋 [API-ADMIN-DEPOSITS] Fetching pending deposits")

    const adminFundService = createAdminFundService()
    // Scope by RM for admins and moderators; super admin sees all
    const managedByIdFilter = role === 'SUPER_ADMIN' ? undefined
      : role === 'ADMIN' ? session.user.id!
      : (session.user as any).managedById || undefined
    const deposits = await adminFundService.getPendingDeposits(managedByIdFilter)

    console.log(`✅ [API-ADMIN-DEPOSITS] Found ${deposits.length} pending deposits`)

    return NextResponse.json({ success: true, deposits }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-DEPOSITS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch deposits" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  console.log("🌐 [API-ADMIN-DEPOSITS] POST request received (approve/reject)")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.deposits.manage")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    const role = authResult.role

    const body = await req.json()
    console.log("📝 [API-ADMIN-DEPOSITS] Request body:", body)

    const { depositId, action, reason, transactionId } = body

    if (!depositId || !action) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const adminFundService = createAdminFundService()

    if (action === 'approve') {
      const result = await adminFundService.approveDeposit({
        depositId,
        adminId: session.user.id!,
        adminName: session.user.name || 'Admin',
        actorRole: role as any,
      })

      // Create notification for user (non-blocking)
      try {
        const deposit = await prisma.deposit.findUnique({
          where: { id: depositId },
          select: { userId: true, amount: true }
        })
        if (deposit) {
          await NotificationService.notifyDeposit(
            deposit.userId,
            'APPROVED',
            Number(deposit.amount)
          )
        }
      } catch (notifError) {
        console.warn("⚠️ [API-ADMIN-DEPOSITS] Failed to create notification:", notifError)
      }

      console.log("✅ [API-ADMIN-DEPOSITS] Deposit approved:", depositId)
      return NextResponse.json(result, { status: 200 })
    }

    if (action === 'reject') {
      if (!reason) {
        return NextResponse.json(
          { error: "Rejection reason required" },
          { status: 400 }
        )
      }

      const result = await adminFundService.rejectDeposit({
        depositId,
        reason,
        adminId: session.user.id!,
        adminName: session.user.name || 'Admin'
      })

      // Create notification for user (non-blocking)
      try {
        const deposit = await prisma.deposit.findUnique({
          where: { id: depositId },
          select: { userId: true, amount: true }
        })
        if (deposit) {
          await NotificationService.notifyDeposit(
            deposit.userId,
            'REJECTED',
            Number(deposit.amount),
            reason
          )
        }
      } catch (notifError) {
        console.warn("⚠️ [API-ADMIN-DEPOSITS] Failed to create notification:", notifError)
      }

      console.log("✅ [API-ADMIN-DEPOSITS] Deposit rejected:", depositId)
      return NextResponse.json(result, { status: 200 })
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'approve' or 'reject'" },
      { status: 400 }
    )

  } catch (error: any) {
    console.error("❌ [API-ADMIN-DEPOSITS] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to process deposit" },
      { status: 500 }
    )
  }
}