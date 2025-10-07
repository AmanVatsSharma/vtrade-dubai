import { NextResponse } from "next/server"
import { createAdminFundService } from "@/lib/services/admin/AdminFundService"
import { getServerSession } from "next-auth"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-DEPOSITS] GET request received")
  
  try {
    const session = await getServerSession()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("📋 [API-ADMIN-DEPOSITS] Fetching pending deposits")

    const adminFundService = createAdminFundService()
    const deposits = await adminFundService.getPendingDeposits()

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
    const session = await getServerSession()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
        adminName: session.user.name || 'Admin'
      })

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