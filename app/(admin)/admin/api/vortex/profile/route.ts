import { NextResponse } from 'next/server';
import { vortexAPI } from '@/lib/vortex/vortex-enhanced';
import { logger, LogCategory } from '@/lib/vortex/vortexLogger';

export async function GET() {
  try {
    const valid = await vortexAPI.isSessionValid();
    if (!valid) {
      return NextResponse.json(
        { success: false, error: 'No active Vortex session. Please login via /admin/auth/login' },
        { status: 401 }
      );
    }
    const profile = await vortexAPI.getUserProfile();
    await logger.info(LogCategory.VORTEX_API, 'Fetched Vortex user profile');
    return NextResponse.json({ success: true, data: profile });
  } catch (error: any) {
    await logger.error(LogCategory.VORTEX_API, 'Failed to fetch Vortex profile', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
