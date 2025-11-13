/**
 * @file route.ts
 * @module maintenance-toggle-api
 * @description API route to toggle maintenance mode settings in database
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { canBypassMaintenance, invalidateMaintenanceCache, getMaintenanceConfigAsync } from '@/lib/maintenance';

export const runtime = 'nodejs';

/**
 * Maintenance Toggle API Endpoint
 * 
 * POST /api/maintenance/toggle
 * 
 * Allows authorized users to update maintenance mode settings
 * Requires admin privileges (ADMIN or SUPER_ADMIN)
 * 
 * Request body:
 * - enabled: boolean (optional)
 * - message: string (optional)
 * - endTime: string (optional)
 * - allowAdminBypass: boolean (optional)
 * 
 * @param request - Next.js request object
 * @returns NextResponse - JSON response with updated config
 */
export async function POST(request: NextRequest) {
  console.log('[MaintenanceAPI] Toggle request received');
  
  try {
    // Authenticate user
    const session = await auth();
    const role = (session?.user as any)?.role;
    
    if (!session?.user || !canBypassMaintenance(role)) {
      console.log('[MaintenanceAPI] Unauthorized toggle attempt:', { 
        userId: session?.user?.id, 
        role 
      });
      
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions to toggle maintenance mode. ADMIN or SUPER_ADMIN role required.',
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    console.log('[MaintenanceAPI] Authorized user:', { 
      email: session.user.email, 
      role 
    });

    // Parse request body
    const body = await request.json();
    const { enabled, message, endTime, allowAdminBypass } = body;

    console.log('[MaintenanceAPI] Update request:', {
      enabled,
      hasMessage: !!message,
      hasEndTime: !!endTime,
      allowAdminBypass
    });

    // Update settings in database
    const updates: Promise<any>[] = [];

    if (enabled !== undefined) {
      updates.push(
        prisma.systemSettings.upsert({
          where: { key: 'maintenance_mode_enabled' },
          update: {
            value: String(enabled),
            category: 'MAINTENANCE',
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            key: 'maintenance_mode_enabled',
            value: String(enabled),
            category: 'MAINTENANCE',
            description: 'Enable or disable maintenance mode',
            isActive: true
          }
        })
      );
    }

    if (message !== undefined) {
      updates.push(
        prisma.systemSettings.upsert({
          where: { key: 'maintenance_message' },
          update: {
            value: message,
            category: 'MAINTENANCE',
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            key: 'maintenance_message',
            value: message,
            category: 'MAINTENANCE',
            description: 'Custom maintenance message displayed to users',
            isActive: true
          }
        })
      );
    }

    if (endTime !== undefined) {
      updates.push(
        prisma.systemSettings.upsert({
          where: { key: 'maintenance_end_time' },
          update: {
            value: endTime,
            category: 'MAINTENANCE',
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            key: 'maintenance_end_time',
            value: endTime,
            category: 'MAINTENANCE',
            description: 'Expected maintenance end time (ISO string or descriptive text)',
            isActive: true
          }
        })
      );
    }

    if (allowAdminBypass !== undefined) {
      updates.push(
        prisma.systemSettings.upsert({
          where: { key: 'maintenance_allow_admin_bypass' },
          update: {
            value: String(allowAdminBypass),
            category: 'MAINTENANCE',
            isActive: true,
            updatedAt: new Date()
          },
          create: {
            key: 'maintenance_allow_admin_bypass',
            value: String(allowAdminBypass),
            category: 'MAINTENANCE',
            description: 'Allow ADMIN and SUPER_ADMIN roles to bypass maintenance mode',
            isActive: true
          }
        })
      );
    }

    // Execute all updates
    await Promise.all(updates);

    // Invalidate cache to force refresh
    invalidateMaintenanceCache();

    // Get updated configuration
    const updatedConfig = await getMaintenanceConfigAsync();

    console.log('[MaintenanceAPI] Maintenance settings updated successfully:', {
      enabled: updatedConfig.isEnabled
    });
    
    return NextResponse.json({
      success: true,
      message: 'Maintenance mode settings updated successfully',
      config: updatedConfig,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('[MaintenanceAPI] Error toggling maintenance:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to toggle maintenance mode',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}