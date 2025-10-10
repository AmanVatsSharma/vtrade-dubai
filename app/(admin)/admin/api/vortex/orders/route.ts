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
    const orders = await vortexAPI.getOrders();
    await logger.info(LogCategory.VORTEX_ORDERS, 'Fetched Vortex orders', { count: Array.isArray(orders) ? orders.length : undefined });
    return NextResponse.json({ success: true, data: orders });
  } catch (error: any) {
    await logger.error(LogCategory.VORTEX_ORDERS, 'Failed to fetch Vortex orders', error);
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
