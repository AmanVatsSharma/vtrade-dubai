/**
 * @file route.ts
 * @module app/api/milli-search
 * @description Proxy for external milli-search: /api/milli-search (search)
 * @author BharatERP
 * @created 2025-10-31
 */

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

const BASE = (process.env.MARKETDATA_BASE_URL || 'https://marketdata.vedpragya.com').replace(/\/$/, '')

export async function GET(request: NextRequest) {
  try {
    const src = request.nextUrl
    const target = new URL(`${BASE}/api/search`)
    // forward all query params, default ltp_only=true if absent
    src.searchParams.forEach((v, k) => target.searchParams.set(k, v))
    if (!target.searchParams.has('ltp_only')) target.searchParams.set('ltp_only', 'true')

    const res = await fetch(target.toString(), {
      method: 'GET',
      // no custom headers to avoid CORS complications upstream
      // server-side fetch isn't subject to browser CORS
      cache: 'no-store'
    })

    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Proxy error' }, { status: 500 })
  }
}


