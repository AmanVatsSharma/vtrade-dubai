import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-CLEANUP] PREVIEW request received")
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const beforeParam = searchParams.get('before')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const before = beforeParam ? new Date(beforeParam) : today

    console.log("🧹 [API-ADMIN-CLEANUP] Preview before:", before.toISOString())

    const [oldOrders, oldClosedPositions, sampleOrders, samplePositions, earliestOrder, latestPre] = await Promise.all([
      prisma.order.count({ where: { createdAt: { lt: before } } }),
      prisma.position.count({
        where: {
          quantity: 0,
          createdAt: { lt: before }
        }
      }),
      prisma.order.findMany({
        where: { createdAt: { lt: before } },
        take: 5,
        orderBy: { createdAt: 'asc' },
        select: { id: true, createdAt: true, symbol: true, status: true }
      }),
      prisma.position.findMany({
        where: {
          quantity: 0,
          createdAt: { lt: before }
        },
        take: 5,
        orderBy: { createdAt: 'asc' },
        select: { id: true, createdAt: true, symbol: true }
      }),
      prisma.order.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      prisma.order.findFirst({ where: { createdAt: { lt: before } }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } })
    ])

    const samples = [
      ...sampleOrders.map(o => ({ type: 'ORDER' as const, id: o.id, date: o.createdAt.toISOString(), meta: `${o.symbol} • ${o.status}` })),
      ...samplePositions.map(p => ({ type: 'POSITION' as const, id: p.id, date: p.createdAt.toISOString(), meta: p.symbol }))
    ]

    return NextResponse.json({
      counts: {
        oldOrders,
        oldClosedPositions,
        earliest: earliestOrder?.createdAt?.toISOString() || null,
        latest: latestPre?.createdAt?.toISOString() || null
      },
      samples
    }, { status: 200 })
  } catch (error: any) {
    console.error('❌ [API-ADMIN-CLEANUP] PREVIEW error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
