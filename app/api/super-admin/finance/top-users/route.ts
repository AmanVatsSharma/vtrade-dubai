import { NextRequest, NextResponse } from 'next/server'
import { SuperAdminFinanceService } from '@/lib/services/admin/SuperAdminFinanceService'
import { requireAdminPermissions } from '@/lib/rbac/admin-guard'

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminPermissions(req, 'admin.super.financial.read')
    if (!authResult.ok) return authResult.response

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
