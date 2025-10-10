/**
 * API Route: Current Admin User
 * 
 * Gets current authenticated admin user information
 * 
 * @route GET /api/admin/me - Get current admin user
 * @route PATCH /api/admin/me - Update current admin user
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

console.log("👤 [API-ADMIN-ME] Route loaded")

/**
 * GET - Get current admin user
 */
export async function GET(req: NextRequest) {
  console.log("🌐 [API-ADMIN-ME] GET request received")
  
  try {
    // Authenticate admin
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      console.error("❌ [API-ADMIN-ME] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("✅ [API-ADMIN-ME] Admin authenticated:", session.user.email)

    // Get full user details from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        clientId: true
      }
    })

    if (!user) {
      console.error("❌ [API-ADMIN-ME] User not found")
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    console.log("✅ [API-ADMIN-ME] User details retrieved")

    return NextResponse.json({
      success: true,
      user
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-ME] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch user" },
      { status: 500 }
    )
  }
}

/**
 * PATCH - Update current admin user
 */
export async function PATCH(req: NextRequest) {
  console.log("🌐 [API-ADMIN-ME] PATCH request received")
  
  try {
    // Authenticate admin
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      console.error("❌ [API-ADMIN-ME] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("✅ [API-ADMIN-ME] Admin authenticated:", session.user.email)

    const body = await req.json()
    const { name, phone, image } = body

    console.log("📝 [API-ADMIN-ME] Update data:", { name, phone, hasImage: !!image })

    // Build update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (phone !== undefined) updateData.phone = phone
    if (image !== undefined) updateData.image = image

    // Update user
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        image: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        clientId: true
      }
    })

    console.log("✅ [API-ADMIN-ME] User updated successfully")

    return NextResponse.json({
      success: true,
      user,
      message: "Profile updated successfully"
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-ME] PATCH error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 }
    )
  }
}