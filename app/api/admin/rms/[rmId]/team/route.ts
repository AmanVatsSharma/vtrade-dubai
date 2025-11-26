/**
 * @file route.ts
 * @module admin-console
 * @description API route for fetching team members of a specific RM
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

/**
 * GET /api/admin/rms/[rmId]/team
 * Get all users managed by a specific RM
 */
export async function GET(
  req: Request,
  { params }: { params: { rmId: string } }
) {
  console.log(`🌐 [API-ADMIN-RMS-TEAM] GET request for RM: ${params.rmId}`)
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    
    // Allow ADMIN, SUPER_ADMIN, and MODERATOR (RMs can see their own team)
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      console.error("❌ [API-ADMIN-RMS-TEAM] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rmId = params.rmId

    // If MODERATOR, they can only see their own team
    if (role === 'MODERATOR' && session.user.id !== rmId) {
      console.error("❌ [API-ADMIN-RMS-TEAM] Moderator trying to access another RM's team")
      return NextResponse.json({ error: "Unauthorized: You can only view your own team" }, { status: 403 })
    }

    // Verify RM exists and is a MODERATOR
    const rm = await prisma.user.findUnique({
      where: { id: rmId },
      select: { id: true, role: true, name: true }
    })

    if (!rm) {
      return NextResponse.json({ error: "RM not found" }, { status: 404 })
    }

    if (rm.role !== 'MODERATOR') {
      return NextResponse.json({ error: "User is not an RM (MODERATOR)" }, { status: 400 })
    }

    // Fetch all users managed by this RM
    const members = await prisma.user.findMany({
      where: {
        managedById: rmId,
        role: 'USER' // Only show regular users, not other RMs
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        clientId: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ [API-ADMIN-RMS-TEAM] Found ${members.length} team members for RM ${rmId}`)

    return NextResponse.json({
      rmId,
      rmName: rm.name,
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
