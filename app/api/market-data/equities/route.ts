/**
 * @file route.ts
 * @module market-data-equities
 * @description Server-side Equities proxy (NSE_EQ) forwarding to Vedpragya equities endpoint
 * @author BharatERP
 * @created 2025-11-12
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

// Base API URL and key (server-side only - never exposed to client)
const BASE_URL = process.env.MARKET_DATA_API_URL || 'https://marketdata.vedpragya.com';
const API_KEY = process.env.MARKET_DATA_API_KEY || 'marketpulse-key-1';

/**
 * GET /api/market-data/equities
 * Fetch NSE_EQ equities for a given query from external API via server proxy.
 * Defaults: exchange=NSE_EQ, limit=20, ltp_only=true
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Accept dynamic query from 'q'
    const q = (searchParams.get('q') || '').trim();
    if (!q) {
      return NextResponse.json({ error: 'q is required' }, { status: 400 });
    }
    const exchange = searchParams.get('exchange') || 'NSE_EQ';
    const limit = searchParams.get('limit') || '20';
    const ltpOnly = searchParams.get('ltp_only') || 'true';

    // Build target URL
    const params = new URLSearchParams();
    params.set('q', q);
    params.set('exchange', exchange);
    params.set('limit', String(limit));
    params.set('ltp_only', String(ltpOnly));

    const url = `${BASE_URL}/api/stock/vayu/equities?${params.toString()}`;

    try {
      console.log('🔹 [EQUITIES-PROXY] Forwarding request', {
        url,
        q,
        exchange,
        limit,
        ltpOnly,
      });
    } catch {}

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      try {
        console.error('❌ [EQUITIES-PROXY] External API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
      } catch {}
      return NextResponse.json(
        {
          error: errorData?.error || 'Equities fetch failed',
          statusCode: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalize exchange/segment on instruments (best-effort)
    if (data?.data?.instruments && Array.isArray(data.data.instruments)) {
      data.data.instruments = data.data.instruments.map((inst: any) => {
        return {
          ...inst,
          exchange: 'NSE_EQ',
          segment: inst?.segment || 'NSE',
        };
      });
    }

    try {
      console.log('✅ [EQUITIES-PROXY] Equities fetched', {
        count: data?.data?.instruments?.length || 0,
      });
    } catch {}

    return NextResponse.json(data);
  } catch (error) {
    try {
      console.error('❌ [EQUITIES-PROXY] Request failed', error);
    } catch {}
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout - please try again' },
        { status: 504 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}


