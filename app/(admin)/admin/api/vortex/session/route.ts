import { NextResponse } from 'next/server';
import { vortexAPI } from '@/lib/vortex/vortex-enhanced';
import { logger, LogCategory } from '@/lib/vortex/vortexLogger';

export async function GET() {
  try {
    const info = await vortexAPI.getSessionInfo();
    return NextResponse.json({ success: true, data: info });
  } catch (error: any) {
    await logger.error(LogCategory.VORTEX_AUTH, 'Failed to get Vortex session info', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    vortexAPI.clearSession();
    await logger.info(LogCategory.VORTEX_AUTH, 'Cleared Vortex session');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await logger.error(LogCategory.VORTEX_AUTH, 'Failed to clear Vortex session', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
