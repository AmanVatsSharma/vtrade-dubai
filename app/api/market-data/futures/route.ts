/**
 * @file route.ts
 * @module market-data-futures
 * @description Server-side Futures proxy (NSE_FO FUTSTK) forwarding to Vedpragya instruments endpoint
 * @author BharatERP
 * @created 2025-11-12
 */

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

// Base API URL and key (server-side only - never exposed to client)
const BASE_URL = process.env.MARKET_DATA_API_URL || 'https://marketdata.vedpragya.com';
const API_KEY = process.env.MARKET_DATA_API_KEY || 'marketpulse-key-1';

/**
 * GET /api/market-data/futures
 * Fetch NSE_FO FUTSTK instruments for a given symbol from external API via server proxy.
 * Fixed: exchange=NSE_FO & instrument_name=FUTSTK & is_active=true
 * Defaults: limit=20, offset=0, ltp_only=true, include_ltp=true
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Accept dynamic symbol (search query) from 'symbol' or fallback to 'q'
    const symbolParam = (searchParams.get('symbol') || searchParams.get('q') || '').trim();
    if (!symbolParam) {
      return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';
    const ltpOnly = searchParams.get('ltp_only') || 'true';
    const includeLtp = searchParams.get('include_ltp') || 'true';

    // Build target URL
    const params = new URLSearchParams();
    params.set('exchange', 'NSE_FO');
    params.set('instrument_name', 'FUTSTK');
    params.set('symbol', symbolParam);
    params.set('is_active', 'true');
    params.set('limit', String(limit));
    params.set('offset', String(offset));
    params.set('ltp_only', String(ltpOnly));
    params.set('include_ltp', String(includeLtp));

    const url = `${BASE_URL}/api/stock/vayu/instruments?${params.toString()}`;

    try {
      console.log('🔷 [FUTURES-PROXY] Forwarding request', {
        url,
        symbol: symbolParam,
        limit,
        offset,
        ltpOnly,
        includeLtp,
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
        console.error('❌ [FUTURES-PROXY] External API error', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
      } catch {}
      return NextResponse.json(
        {
          error: errorData?.error || 'Futures fetch failed',
          statusCode: response.status,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Normalize exchange/segment to NSE_FO in instruments (best-effort)
    if (data?.data?.instruments && Array.isArray(data.data.instruments)) {
      data.data.instruments = data.data.instruments.map((inst: any) => {
        const normalizedExchange = 'NSE_FO';
        return {
          ...inst,
          exchange: normalizedExchange,
          segment: inst?.segment || normalizedExchange,
        };
      });
    }

    try {
      console.log('✅ [FUTURES-PROXY] Futures instruments fetched', {
        count: data?.data?.instruments?.length || 0,
      });
    } catch {}

    return NextResponse.json(data);
  } catch (error) {
    try {
      console.error('❌ [FUTURES-PROXY] Request failed', error);
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


