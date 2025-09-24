import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/supabase-server'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    const category = searchParams.get('category')
    const level = searchParams.get('level')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    let query = supabaseServer
      .from('trading_logs')
      .select('*')
      .eq('client_id', clientId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1)

    if (category) {
      query = query.eq('category', category)
    }

    if (level) {
      query = query.eq('level', level)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Parse JSON fields
    const parsedData = data?.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null
    })) || []

    return NextResponse.json({ 
      logs: parsedData,
      total: parsedData.length,
      hasMore: parsedData.length === limit
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
