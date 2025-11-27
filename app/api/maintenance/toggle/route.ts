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

    // Helper function to upsert a setting
    const upsertSetting = async (key: string, value: string, description: string) => {
      const existing = await prisma.systemSettings.findFirst({
        where: {
          key,
          ownerId: null
        }
      });

      if (existing) {
        return prisma.systemSettings.update({
          where: { id: existing.id },
          data: {
            value,
            category: 'MAINTENANCE',
            isActive: true,
            updatedAt: new Date()
          }
        });
      } else {
        return prisma.systemSettings.create({
          data: {
            ownerId: null,
            key,
            value,
            category: 'MAINTENANCE',
            description,
            isActive: true
          }
        });
      }
    };

    // Update settings in database
    const updates: Promise<any>[] = [];

    if (enabled !== undefined) {
      updates.push(
        upsertSetting(
          'maintenance_mode_enabled',
          String(enabled),
          'Enable or disable maintenance mode'
        )
      );
    }

    if (message !== undefined) {
      updates.push(
        upsertSetting(
          'maintenance_message',
          message,
          'Custom maintenance message displayed to users'
        )
      );
    }

    if (endTime !== undefined) {
      updates.push(
        upsertSetting(
          'maintenance_end_time',
          endTime,
          'Expected maintenance end time (ISO string or descriptive text)'
        )
      );
    }

    if (allowAdminBypass !== undefined) {
      updates.push(
        upsertSetting(
          'maintenance_allow_admin_bypass',
          String(allowAdminBypass),
          'Allow ADMIN and SUPER_ADMIN roles to bypass maintenance mode'
        )
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