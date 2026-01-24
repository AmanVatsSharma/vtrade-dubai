import { NextRequest, NextResponse } from 'next/server'
import { SuperAdminFinanceService } from '@/lib/services/admin/SuperAdminFinanceService'
import { requireAdminPermissions } from '@/lib/rbac/admin-guard'

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminPermissions(req, 'admin.super.financial.read')
    if (!authResult.ok) return authResult.response

    const { searchParams } = new URL(req.url)
    const granularity = (searchParams.get('granularity') || 'day') as any
    const from = new Date(searchParams.get('from') || '')
    const to = new Date(searchParams.get('to') || '')

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return NextResponse.json({ error: 'Invalid from/to' }, { status: 400 })
    }

    const data = await SuperAdminFinanceService.getTimeSeries(granularity, from, to)
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('[/api/super-admin/finance/timeseries] error', e)
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 })
  }
}
