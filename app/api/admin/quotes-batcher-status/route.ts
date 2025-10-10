// app/api/admin/quotes-batcher-status/route.ts
import { NextResponse } from 'next/server';
import { getQuotesBatcherState, manualFlush } from '@/lib/vortex/quotes-batcher';
import { getQuotesBatcherConfig, setQuotesBatcherConfig } from '@/lib/vortex/quotes-batcher-config';
import { logger, LogCategory } from '@/lib/vortex/vortexLogger';

export async function GET() {
  try {
    const state = getQuotesBatcherState();
    const config = getQuotesBatcherConfig();
    logger.info(LogCategory.VORTEX_QUOTES, 'Quotes batcher status requested');
    return NextResponse.json({ success: true, data: { ...state, config, timestamp: new Date().toISOString() } });
  } catch (error) {
    logger.error(LogCategory.VORTEX_QUOTES, 'Failed to get quotes batcher status', error as Error);
    return NextResponse.json({ success: false, error: (error as Error)?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.action === 'flush') {
      const mode = body?.mode || 'ltp';
      await manualFlush(mode);
      logger.info(LogCategory.VORTEX_QUOTES, 'Manual flush executed for quotes batcher', { mode });
      return NextResponse.json({ success: true, data: getQuotesBatcherState() });
    }
    if (body?.action === 'setConfig') {
      const updated = setQuotesBatcherConfig(body?.config || {});
      logger.info(LogCategory.VORTEX_QUOTES, 'Quotes batcher config updated', updated as any);
      return NextResponse.json({ success: true, data: { config: updated } });
    }
    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    logger.error(LogCategory.VORTEX_QUOTES, 'Failed manual flush for quotes batcher', error as Error);
    return NextResponse.json({ success: false, error: (error as Error)?.message || 'Unknown error' }, { status: 500 });
  }
}
