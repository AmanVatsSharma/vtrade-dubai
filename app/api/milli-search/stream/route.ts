/**
 * @file route.ts
 * @module app/api/milli-search/stream
 * @description SSE proxy for external milli-search stream: /api/milli-search/stream
 * @author BharatERP
 * @created 2025-10-31
 */

export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

const BASE = (process.env.MARKETDATA_BASE_URL || 'https://marketdata.vedpragya.com').replace(/\/$/, '')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const target = new URL(`${BASE}/api/search/stream`)
  searchParams.forEach((v, k) => target.searchParams.set(k, v))
  if (!target.searchParams.has('ltp_only')) target.searchParams.set('ltp_only', 'true')

  const upstream = await fetch(target.toString(), { method: 'GET' })
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: 'Upstream unavailable' }, { status: 502 })
  }

  const stream = new ReadableStream({
    start(controller) {
      const reader = upstream.body!.getReader()
      const pump = () => reader.read().then(({ done, value }) => {
        if (done) {
          controller.close()
          return
        }
        controller.enqueue(value!)
        return pump()
      }).catch(() => controller.close())
      pump()
    }
  })

  return new NextResponse(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  })
}


