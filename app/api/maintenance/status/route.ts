/**
 * @file route.ts
 * @module maintenance-status-api
 * @description API route to get maintenance mode status
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceStatusAsync } from '@/lib/maintenance';

export const runtime = 'nodejs';

/**
 * Maintenance Status API Endpoint
 * 
 * GET /api/maintenance/status
 * 
 * Returns current maintenance mode status from database
 * Used by frontend to check maintenance state
 * 
 * @param request - Next.js request object
 * @returns NextResponse - JSON response with maintenance status
 */
export async function GET(request: NextRequest) {
  console.log('[MaintenanceAPI] Status check requested');
  
  try {
    const status = await getMaintenanceStatusAsync();
    
    console.log('[MaintenanceAPI] Returning status:', {
      isMaintenanceMode: status.isMaintenanceMode,
      hasMessage: !!status.message
    });
    
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