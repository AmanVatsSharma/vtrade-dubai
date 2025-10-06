import { NextRequest, NextResponse } from 'next/server';
import { vortexAPI } from '@/lib/vortex/vortex-enhanced';
import { logger, LogCategory } from '@/lib/vortex/vortexLogger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const qs = searchParams.getAll('q');
    const mode = searchParams.get('mode') || 'ltp';

    if (qs.length === 0) {
      return NextResponse.json({ success: false, error: 'Provide one or more q parameters' }, { status: 400 });
    }

    await vortexAPI.isSessionValid();
    const quotes = await vortexAPI.getQuotes(qs, mode);
    await logger.info(LogCategory.VORTEX_QUOTES, 'Fetched Vortex quotes', { count: Object.keys(quotes || {}).length, mode });
    return NextResponse.json({ success: true, data: quotes });
  } catch (error: any) {
    await logger.error(LogCategory.VORTEX_QUOTES, 'Failed to fetch Vortex quotes', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
