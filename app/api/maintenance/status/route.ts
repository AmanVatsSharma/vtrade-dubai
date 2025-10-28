import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceStatus } from '@/lib/maintenance';

/**
 * Maintenance Status API Endpoint
 * 
 * GET /api/maintenance/status
 * 
 * Returns current maintenance mode status
 * Used by frontend to check maintenance state
 * 
 * @param request - Next.js request object
 * @returns NextResponse - JSON response with maintenance status
 */
export async function GET(request: NextRequest) {
  console.log('[MaintenanceAPI] Status check requested');
  
  try {
    const status = getMaintenanceStatus();
    
    console.log('[MaintenanceAPI] Returning status:', status);
    
    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MaintenanceAPI] Error getting status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get maintenance status',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}