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
    const rules = await SuperAdminFinanceService.getCommissionRules()
    return NextResponse.json({ success: true, data: rules })
  } catch (e: any) {
    console.error('[/api/super-admin/finance/commission-rules] GET error', e)
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const body = await req.json()
    await SuperAdminFinanceService.updateCommissionRules(body)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('[/api/super-admin/finance/commission-rules] POST error', e)
    return NextResponse.json({ error: e?.message || 'Internal Server Error' }, { status: 500 })
  }
}
