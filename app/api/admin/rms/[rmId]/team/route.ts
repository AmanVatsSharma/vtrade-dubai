/**
 * @file route.ts
 * @module admin-console
 * @description API route for fetching team members of a specific RM
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

/**
 * Helper function to determine which roles a user can manage based on their role
 * ADMINs and MODERATORs can be RMs (can have users managed by them)
 */
function getManageableRoles(userRole: string): string[] {
  switch (userRole) {
    case 'SUPER_ADMIN':
      return ['ADMIN', 'MODERATOR', 'USER']
    case 'ADMIN':
      return ['MODERATOR', 'USER'] // ADMINs can manage MODERATORs and USERs
    case 'MODERATOR':
      return ['USER'] // MODERATORs can only manage USERs
    default:
      return []
  }
}

/**
 * GET /api/admin/rms/[rmId]/team
 * Get all users managed by a specific RM/Admin/Moderator (hierarchical)
 * - Shows users based on role hierarchy
 * - SUPER_ADMIN can see teams of ADMIN/MODERATOR/USER
 * - ADMIN can see teams of MODERATOR/USER they manage
 * - MODERATOR can see their own USER team
 */
export async function GET(
  req: Request,
  { params }: { params: { rmId: string } }
) {
  console.log(`🌐 [API-ADMIN-RMS-TEAM] GET request for RM: ${params.rmId}`)
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.users.rm")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    const role = authResult.role

    const rmId = params.rmId

    // Verify the target user exists
    const rm = await prisma.user.findUnique({
      where: { id: rmId },
      select: { id: true, role: true, name: true, managedById: true }
    })

    if (!rm) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Authorization checks based on role hierarchy
    if (role === 'MODERATOR') {
      // Moderators can only see their own team
      if (session.user.id !== rmId) {
        console.error("❌ [API-ADMIN-RMS-TEAM] Moderator trying to access another user's team")
        return NextResponse.json({ error: "Unauthorized: You can only view your own team" }, { status: 403 })
      }
    } else if (role === 'ADMIN') {
      // Admins can see teams of:
      // 1. Themselves
      // 2. MODERATORs they manage
      // 3. Other ADMINs (if they manage them, but typically only SUPER_ADMIN manages ADMINs)
      if (session.user.id !== rmId) {
        // Check if this user is managed by the admin
        if (rm.managedById !== session.user.id) {
          // Check if managed by a moderator that this admin manages
          if (rm.managedById) {
            const managedByUser = await prisma.user.findUnique({
              where: { id: rm.managedById },
              select: { id: true, role: true, managedById: true }
            })
            
            if (!managedByUser || managedByUser.managedById !== session.user.id) {
              console.error("❌ [API-ADMIN-RMS-TEAM] Admin trying to access team they don't manage")
              return NextResponse.json({ error: "Unauthorized: You can only view teams you manage" }, { status: 403 })
            }
          } else {
            // User is not managed by anyone, admin cannot see their team
            console.error("❌ [API-ADMIN-RMS-TEAM] Admin trying to access unmanaged user's team")
            return NextResponse.json({ error: "Unauthorized: You can only view teams you manage" }, { status: 403 })
          }
        }
      }
    }
    // SUPER_ADMIN can see any team (no additional check needed)

    // Get roles that the target user can manage
    const manageableRoles = getManageableRoles(rm.role)
    console.log(`📊 [API-ADMIN-RMS-TEAM] Target user role: ${rm.role}, Can manage roles:`, manageableRoles)

    // Fetch all users managed by this user (based on their role hierarchy)
    const members = await prisma.user.findMany({
      where: {
        managedById: rmId,
        role: {
          in: manageableRoles // Show users with roles the target user can manage
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        clientId: true,
        isActive: true,
        role: true,
        createdAt: true
      },
      orderBy: [
        { role: 'asc' }, // Order by role hierarchy
        { createdAt: 'desc' }
      ]
    })

    console.log(`✅ [API-ADMIN-RMS-TEAM] Found ${members.length} team members for ${rm.role} ${rmId}`)

    return NextResponse.json({
      rmId,
      rmName: rm.name,
      rmRole: rm.role,
      members,
      count: members.length
    })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RMS-TEAM] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch team members" },
      { status: 500 }
    )
  }
}
