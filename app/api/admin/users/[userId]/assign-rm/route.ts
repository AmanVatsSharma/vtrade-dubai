/**
 * @file route.ts
 * @module admin-console
 * @description API route for assigning/unassigning Relationship Manager to users
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

/**
 * PATCH /api/admin/users/[userId]/assign-rm
 * Assign or unassign a Relationship Manager to a user
 */
export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  console.log("🌐 [API-ADMIN-ASSIGN-RM] PATCH request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.users.rm")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    const role = authResult.role

    const { userId } = params
    const body = await req.json()
    const { rmId } = body // null to unassign, or RM user ID to assign

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // If MODERATOR, verify they can only assign themselves
    if (role === 'MODERATOR') {
      if (rmId && rmId !== session.user.id) {
        return NextResponse.json(
          { error: "You can only assign yourself as RM" },
          { status: 403 }
        )
      }
    }

    // If rmId provided, validate RM exists and has appropriate role (ADMIN or MODERATOR can be RMs)
    if (rmId) {
      const rm = await prisma.user.findUnique({
        where: { id: rmId }
      })

      if (!rm) {
        return NextResponse.json(
          { error: "Relationship Manager not found" },
          { status: 404 }
        )
      }

      // ADMIN and MODERATOR can be RMs (can have users managed by them)
      if (rm.role !== 'MODERATOR' && rm.role !== 'ADMIN') {
        return NextResponse.json(
          { error: "Only Admin or Moderator can be a Relationship Manager" },
          { status: 400 }
        )
      }

      // Authorization: Check if current user can assign this RM
      // SUPER_ADMIN can assign any ADMIN/MODERATOR as RM
      // ADMIN can assign MODERATORs they manage as RM
      // MODERATOR can only assign themselves
      if (role === 'ADMIN' && rm.role === 'ADMIN') {
        // Admin cannot assign another Admin as RM (only SUPER_ADMIN can)
        if (rmId !== session.user.id) {
          return NextResponse.json(
            { error: "You can only assign Moderators or yourself as RM" },
            { status: 403 }
          )
        }
      } else if (role === 'ADMIN' && rm.role === 'MODERATOR') {
        // Admin can assign Moderators they manage
        if (rm.managedById !== session.user.id) {
          return NextResponse.json(
            { error: "You can only assign Moderators you manage as RM" },
            { status: 403 }
          )
        }
      }
    }

    // Update user's managedById
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        managedById: rmId || null
      },
      include: {
        managedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            clientId: true
          }
        }
      }
    })

    console.log(`✅ [API-ADMIN-ASSIGN-RM] Updated user ${userId} RM assignment`)

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        managedById: updatedUser.managedById,
        managedBy: updatedUser.managedBy
      }
    })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-ASSIGN-RM] PATCH error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to assign RM" },
      { status: 500 }
    )
  }
}
