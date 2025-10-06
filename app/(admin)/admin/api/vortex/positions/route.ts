import { NextResponse } from 'next/server';
import { vortexAPI } from '@/lib/vortex/vortex-enhanced';
import { logger, LogCategory } from '@/lib/vortex/vortexLogger';

export async function GET() {
  try {
    await vortexAPI.isSessionValid();
    const positions = await vortexAPI.getPositions();
    await logger.info(LogCategory.VORTEX_POSITIONS, 'Fetched Vortex positions', { count: Array.isArray(positions) ? positions.length : undefined });
    return NextResponse.json({ success: true, data: positions });
  } catch (error: any) {
    await logger.error(LogCategory.VORTEX_POSITIONS, 'Failed to fetch Vortex positions', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
