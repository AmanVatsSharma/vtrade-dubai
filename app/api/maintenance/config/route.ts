/**
 * @file route.ts
 * @module maintenance-config-api
 * @description API route to get maintenance mode configuration (for edge runtime compatibility)
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceConfigFromDB } from '@/lib/server/maintenance';

export const runtime = 'nodejs';

/**
 * GET /api/maintenance/config
 * Returns current maintenance mode configuration
 * Used by middleware (edge runtime) to check maintenance status
 * 
 * @param request - Next.js request object
 * @returns NextResponse - JSON response with maintenance config
 */
export async function GET(request: NextRequest) {
  console.log('[MaintenanceAPI-Config] Config request received');
  
  try {
    const config = await getMaintenanceConfigFromDB();
    
    console.log('[MaintenanceAPI-Config] Returning config:', {
      isEnabled: config.isEnabled,
      allowAdminBypass: config.allowAdminBypass
    });
    
    return NextResponse.json({
      success: true,
      config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[MaintenanceAPI-Config] Error getting config:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get maintenance config',
      config: {
        isEnabled: false,
        message: "We're performing scheduled maintenance to improve your experience. We'll be back shortly!",
        endTime: '24Hrs',
        allowAdminBypass: true
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

