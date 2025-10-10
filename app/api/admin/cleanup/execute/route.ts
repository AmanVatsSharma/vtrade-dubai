import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  console.log("🌐 [API-ADMIN-CLEANUP] EXECUTE request received")
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as any
    const beforeParam = body.before as string | undefined
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const before = beforeParam ? new Date(beforeParam) : today

    // Safety: never allow after today
    const cutoff = new Date(before)
    cutoff.setHours(0, 0, 0, 0)
    const maxAllowed = new Date()
    maxAllowed.setHours(0, 0, 0, 0)
    if (cutoff >= maxAllowed) {
      return NextResponse.json({ error: 'Cannot cleanup today or future data' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const deletedOrders = await tx.order.deleteMany({ where: { createdAt: { lt: cutoff } } })
      const deletedPositions = await tx.position.deleteMany({ where: { quantity: 0, createdAt: { lt: cutoff } } })
      return { deletedOrders: deletedOrders.count, deletedPositions: deletedPositions.count }
    })

    console.log("✅ [API-ADMIN-CLEANUP] EXECUTE result:", result)
    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('❌ [API-ADMIN-CLEANUP] EXECUTE error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
