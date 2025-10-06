import { NextRequest, NextResponse } from 'next/server';
import { vortexAPI } from '@/lib/vortex/vortex-enhanced';
import { logger, LogCategory } from '@/lib/vortex/vortexLogger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const exchange = searchParams.get('exchange') || undefined;

    if (!q) {
      return NextResponse.json({ success: false, error: 'Missing q parameter' }, { status: 400 });
    }

    await vortexAPI.isSessionValid();
    const results = await vortexAPI.searchInstruments(q, exchange);
    await logger.info(LogCategory.VORTEX_API, 'Searched Vortex instruments', { q, exchange });
    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    await logger.error(LogCategory.VORTEX_API, 'Failed to search Vortex instruments', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
