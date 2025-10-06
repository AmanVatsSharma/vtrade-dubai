import { NextResponse } from 'next/server';
import { vortexAPI } from '@/lib/vortex/vortex-enhanced';
import { logger, LogCategory } from '@/lib/vortex/vortexLogger';

export async function GET() {
  try {
    await vortexAPI.isSessionValid();
    const funds = await vortexAPI.getFunds();
    await logger.info(LogCategory.VORTEX_API, 'Fetched Vortex funds');
    return NextResponse.json({ success: true, data: funds });
  } catch (error: any) {
    await logger.error(LogCategory.VORTEX_API, 'Failed to fetch Vortex funds', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
