/**
 * @file route.ts
 * @module app/api/milli-search/filters
 * @description Proxy for external milli-search filters: /api/milli-search/filters
 * @author BharatERP
 * @created 2025-10-31
 */

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

const BASE = (process.env.MARKETDATA_BASE_URL || 'https://marketdata.vedpragya.com').replace(/\/$/, '')

export async function GET(request: NextRequest) {
  try {
    const src = request.nextUrl
    const target = new URL(`${BASE}/api/search/filters`)
    src.searchParams.forEach((v, k) => target.searchParams.set(k, v))

    const res = await fetch(target.toString(), { method: 'GET', cache: 'no-store' })
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


