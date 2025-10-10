import { NextResponse } from "next/server"
import { createAdminFundService } from "@/lib/services/admin/AdminFundService"
import { auth } from "@/auth"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-WITHDRAWALS] GET request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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