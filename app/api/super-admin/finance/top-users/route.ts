import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { SuperAdminFinanceService } from '@/lib/services/admin/SuperAdminFinanceService'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const by = (searchParams.get('by') || 'deposits') as any
    const limit = Number(searchParams.get('limit') || '10')
    const from = searchParams.get('from') ? new Date(searchParams.get('from') as string) : undefined
    const to = searchParams.get('to') ? new Date(searchParams.get('to') as string) : undefined

    const data = await SuperAdminFinanceService.getTopUsers(by, limit, from, to)
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('[/api/super-admin/finance/top-users] error', e)
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 })
  }
}
