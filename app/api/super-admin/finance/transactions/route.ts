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
