/**
 * Admin Logs API - Get trading logs for admin console
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminPermissions } from '@/lib/rbac/admin-guard'

export async function GET(req: Request) {
  try {
    const authResult = await requireAdminPermissions(req, 'admin.logs.read')
    if (!authResult.ok) return authResult.response

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