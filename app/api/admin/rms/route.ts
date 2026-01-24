/**
 * @file route.ts
 * @module admin-console
 * @description API route for Relationship Manager (RM) management
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

/**
 * Helper function to determine which roles a user can manage based on their role
 * Hierarchy: SUPER_ADMIN > ADMIN > MODERATOR > USER
 */
function getManageableRoles(userRole: Role): Role[] {
  switch (userRole) {
    case 'SUPER_ADMIN':
      return ['ADMIN', 'MODERATOR', 'USER'] // Can manage all roles below
    case 'ADMIN':
      return ['MODERATOR', 'USER'] // Can manage moderators and users
    case 'MODERATOR':
      return ['USER'] // Can only manage users
    default:
      return [] // USER role cannot manage anyone
  }
}

/**
 * GET /api/admin/rms
 * List all Relationship Managers (and teams) with hierarchical access
 * - SUPER_ADMIN sees: ADMIN, MODERATOR, USER (all roles below)
 * - ADMIN sees: MODERATOR, USER (roles below)
 * - MODERATOR sees: USER (roles below)
 */
export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-RMS] GET request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.users.rm")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    const role = authResult.role as Role

    // Get roles that the current user can manage
    const manageableRoles = getManageableRoles(role)
    console.log(`📊 [API-ADMIN-RMS] User role: ${role}, Can manage roles:`, manageableRoles)

    // If MODERATOR, only return their own data and their managed users
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
            where: {
              role: 'USER' // Moderators can only manage users
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
            take: 10 // Limit for preview
          },
          managedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
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
          role: rm.role,
          assignedUsersCount: rm._count.managedUsers,
          managedBy: rm.managedBy ? {
            id: rm.managedBy.id,
            name: rm.managedBy.name,
            email: rm.managedBy.email,
            role: rm.managedBy.role
          } : null,
          createdAt: rm.createdAt
        }],
        total: 1
      })
    }

    // For ADMIN/SUPER_ADMIN, return all users who can be RMs (ADMIN or MODERATOR)
    // Also include users they manage directly (for viewing their teams)
    
    // Build where clause to show:
    // 1. Users who can be RMs (ADMIN or MODERATOR) - all for SUPER_ADMIN, filtered for ADMIN
    // 2. Users they manage directly (MODERATOR or USER) - to see their teams
    const whereClause: any = {
      OR: [
        // Users who can be RMs (ADMIN or MODERATOR)
        {
          role: {
            in: ['ADMIN', 'MODERATOR'] // ADMINs and MODERATORs can be RMs
          },
          ...(role === 'ADMIN' ? {
            // ADMIN can see: themselves or MODERATORs they manage
            OR: [
              { id: session.user.id }, // Themselves
              { managedById: session.user.id }, // MODERATORs they manage
            ]
          } : {})
        },
        // Users they manage directly (MODERATOR or USER) - to see their teams
        {
          role: {
            in: manageableRoles
          },
          ...(role === 'SUPER_ADMIN' ? {} : {
            managedById: session.user.id // Only show users they manage
          })
        },
        // For ADMIN: also show users managed by MODERATORs they manage (indirect)
        ...(role === 'ADMIN' ? [{
          role: 'USER',
          managedBy: {
            managedById: session.user.id,
            role: 'MODERATOR'
          }
        }] : [])
      ]
    }

    const rms = await prisma.user.findMany({
      where: whereClause,
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
      orderBy: [
        { role: 'asc' }, // Order by role hierarchy
        { createdAt: 'desc' }
      ]
    })

    console.log(`✅ [API-ADMIN-RMS] Found ${rms.length} users/teams for role ${role}`)

    return NextResponse.json({
      rms: rms.map(rm => ({
        id: rm.id,
        name: rm.name,
        email: rm.email,
        phone: rm.phone,
        clientId: rm.clientId,
        isActive: rm.isActive,
        role: rm.role,
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
    const authResult = await requireAdminPermissions(req, "admin.users.rm")
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    const role = authResult.role

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

    // Determine which role to assign based on current user's role
    // SUPER_ADMIN can create ADMIN or MODERATOR
    // ADMIN can create MODERATOR
    const bodyRole = body.role as Role | undefined
    let targetRole: Role = 'MODERATOR' // Default
    
    if (bodyRole) {
      const manageableRoles = getManageableRoles(role)
      if (manageableRoles.includes(bodyRole)) {
        targetRole = bodyRole
      } else {
        return NextResponse.json(
          { error: `You cannot create users with role ${bodyRole}. You can only create: ${manageableRoles.join(', ')}` },
          { status: 403 }
        )
      }
    } else {
      // Default: ADMIN creates MODERATOR, SUPER_ADMIN creates MODERATOR
      targetRole = role === 'SUPER_ADMIN' ? 'MODERATOR' : 'MODERATOR'
    }

    // Create user with appropriate role
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)

    const rm = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: targetRole,
        isActive: true,
        emailVerified: new Date(),
        phoneVerified: new Date(),
        managedById: session.user.id // Assign to current user
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
