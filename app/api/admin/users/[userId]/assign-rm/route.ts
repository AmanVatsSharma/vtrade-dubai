/**
 * @file route.ts
 * @module admin-console
 * @description API route for assigning/unassigning Relationship Manager to users
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

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
    const session = await auth()
    const role = (session?.user as any)?.role
    
    // Allow ADMIN, SUPER_ADMIN, and MODERATOR (RMs can assign themselves)
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      console.error("❌ [API-ADMIN-ASSIGN-RM] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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

    // If rmId provided, validate RM exists and is a MODERATOR
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

      if (rm.role !== 'MODERATOR') {
        return NextResponse.json(
          { error: "User is not a Relationship Manager" },
          { status: 400 }
        )
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
