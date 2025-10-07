import { NextResponse } from "next/server"
import { createAdminFundService } from "@/lib/services/admin/AdminFundService"
import { createTradingLogger } from "@/lib/services/logging/TradingLogger"
import { auth } from "@/auth"

export async function POST(req: Request) {
  console.log("🌐 [API-ADMIN-ADD-FUNDS] POST request received")
  
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    console.log("📝 [API-ADMIN-ADD-FUNDS] Request body:", body)

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
    const result = await adminFundService.addFundsToUser({
      userId,
      amount,
      description: description || 'Manual fund addition by admin',
      adminId: session.user.id!,
      adminName: session.user.name || 'Admin'
    })

    console.log("🎉 [API-ADMIN-ADD-FUNDS] Funds added successfully:", result)

    return NextResponse.json(result, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-ADD-FUNDS] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to add funds" },
      { status: 500 }
    )
  }
}