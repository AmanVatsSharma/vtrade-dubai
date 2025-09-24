import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/supabase-server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const tradingAccountId = searchParams.get('tradingAccountId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!tradingAccountId) {
      return NextResponse.json({ error: 'tradingAccountId is required' }, { status: 400 })
    }

    let query = supabaseServer
      .from('transactions')
      .select('*')
      .eq('tradingAccountId', tradingAccountId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary
    const summary = data?.reduce((acc, tx) => {
      if (tx.type === 'CREDIT') {
        acc.totalCredits += Number(tx.amount)
      } else if (tx.type === 'DEBIT') {
        acc.totalDebits += Number(tx.amount)
      }
      acc.totalTransactions++
      return acc
    }, { totalCredits: 0, totalDebits: 0, totalTransactions: 0 }) || { totalCredits: 0, totalDebits: 0, totalTransactions: 0 }

    return NextResponse.json({ 
      transactions: data || [],
      summary,
      hasMore: (data?.length || 0) === limit
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
