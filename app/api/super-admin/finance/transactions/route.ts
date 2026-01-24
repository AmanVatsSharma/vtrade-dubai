import { NextRequest, NextResponse } from 'next/server'
import { SuperAdminFinanceService } from '@/lib/services/admin/SuperAdminFinanceService'
import { requireAdminPermissions } from '@/lib/rbac/admin-guard'

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAdminPermissions(req, 'admin.super.financial.read')
    if (!authResult.ok) return authResult.response

    const { searchParams } = new URL(req.url)
    const type = (searchParams.get('type') || 'DEPOSIT') as 'DEPOSIT' | 'WITHDRAWAL'
    const status = searchParams.get('status') || undefined
    const method = searchParams.get('method') || undefined
    const userId = searchParams.get('userId') || undefined
    const bankAccountId = searchParams.get('bankAccountId') || undefined
    const from = searchParams.get('from') ? new Date(searchParams.get('from') as string) : undefined
    const to = searchParams.get('to') ? new Date(searchParams.get('to') as string) : undefined
    const page = Number(searchParams.get('page') || '1')
    const pageSize = Number(searchParams.get('pageSize') || '20')

    const data = await SuperAdminFinanceService.listTransactions(type, { status, method, userId, bankAccountId, from, to, page, pageSize })
    return NextResponse.json({ success: true, data })
  } catch (e: any) {
    console.error('[/api/super-admin/finance/transactions] error', e)
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 })
  }
}
