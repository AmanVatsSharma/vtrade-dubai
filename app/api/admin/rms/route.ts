/**
 * @file route.ts
 * @module admin-console
 * @description API route for Relationship Manager (RM) management
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { Role } from "@prisma/client"

/**
 * GET /api/admin/rms
 * List all Relationship Managers with their assigned user counts
 */
export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-RMS] GET request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    
    // Allow ADMIN, SUPER_ADMIN, and MODERATOR (RMs can see themselves)
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      console.error("❌ [API-ADMIN-RMS] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // If MODERATOR, only return their own data
    if (role === 'MODERATOR') {
      const rm = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          _count: {
            select: {
              managedUsers: true
            }
          },
          managedUsers: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              clientId: true,
              isActive: true,
              createdAt: true
            },
            take: 10 // Limit for preview
          }
        }
      })

      if (!rm) {
        return NextResponse.json({ error: "RM not found" }, { status: 404 })
      }

      return NextResponse.json({
        rms: [{
          id: rm.id,
          name: rm.name,
          email: rm.email,
          phone: rm.phone,
          clientId: rm.clientId,
          isActive: rm.isActive,
          assignedUsersCount: rm._count.managedUsers,
          createdAt: rm.createdAt
        }],
        total: 1
      })
    }

    // For ADMIN/SUPER_ADMIN, return all RMs with hierarchy info
    const rms = await prisma.user.findMany({
      where: {
        role: 'MODERATOR'
      },
      include: {
        _count: {
          select: {
            managedUsers: true
          }
        },
        managedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`✅ [API-ADMIN-RMS] Found ${rms.length} RMs`)

    return NextResponse.json({
      rms: rms.map(rm => ({
        id: rm.id,
        name: rm.name,
        email: rm.email,
        phone: rm.phone,
        clientId: rm.clientId,
        isActive: rm.isActive,
        assignedUsersCount: rm._count.managedUsers,
        managedBy: rm.managedBy ? {
          id: rm.managedBy.id,
          name: rm.managedBy.name,
          email: rm.managedBy.email,
          role: rm.managedBy.role
        } : null,
        createdAt: rm.createdAt
      })),
      total: rms.length
    })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RMS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch RMs" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/rms
 * Create a new Relationship Manager
 */
export async function POST(req: Request) {
  console.log("🌐 [API-ADMIN-RMS] POST request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    
    // Only ADMIN and SUPER_ADMIN can create RMs
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      console.error("❌ [API-ADMIN-RMS] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { name, email, phone, password } = body

    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, phone, password" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phone }
        ]
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email or phone already exists" },
        { status: 400 }
      )
    }

    // Create RM user with MODERATOR role
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)

    const rm = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: 'MODERATOR',
        isActive: true,
        emailVerified: new Date(),
        phoneVerified: new Date()
      }
    })

    console.log(`✅ [API-ADMIN-RMS] Created RM: ${rm.id}`)

    return NextResponse.json({
      success: true,
      rm: {
        id: rm.id,
        name: rm.name,
        email: rm.email,
        phone: rm.phone,
        clientId: rm.clientId,
        isActive: rm.isActive,
        createdAt: rm.createdAt
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RMS] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create RM" },
      { status: 500 }
    )
  }
}
