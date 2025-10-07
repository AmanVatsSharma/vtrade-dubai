/**
 * Admin Logs API - Get trading logs for admin console
 */
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get('category') as any
    const level = searchParams.get('level') as any
    const limit = parseInt(searchParams.get('limit') || '100')

    const where: any = {}
    if (category) where.category = category
    if (level) where.level = level

    const logs = await prisma.tradingLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json({ logs, total: logs.length }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}