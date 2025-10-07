import { NextResponse } from "next/server"
import { createAdminFundService } from "@/lib/services/admin/AdminFundService"
import { createTradingLogger } from "@/lib/services/logging/TradingLogger"
import { getServerSession } from "next-auth"

export async function POST(req: Request) {
  console.log("🌐 [API-ADMIN-WITHDRAW-FUNDS] POST request received")
  
  try {
    const session = await getServerSession()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    console.log("📝 [API-ADMIN-WITHDRAW-FUNDS] Request body:", body)

    const { userId, amount, description } = body

    if (!userId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid input. userId and positive amount required" },
        { status: 400 }
      )
    }

    const logger = createTradingLogger({
      clientId: 'ADMIN',
      userId: session.user.id
    })

    const adminFundService = createAdminFundService(logger)
    const result = await adminFundService.withdrawFundsFromUser({
      userId,
      amount,
      description: description || 'Manual fund withdrawal by admin',
      adminId: session.user.id!,
      adminName: session.user.name || 'Admin'
    })

    console.log("🎉 [API-ADMIN-WITHDRAW-FUNDS] Funds withdrawn successfully:", result)

    return NextResponse.json(result, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-WITHDRAW-FUNDS] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to withdraw funds" },
      { status: 500 }
    )
  }
}