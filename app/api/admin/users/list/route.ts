/**
 * File: app/api/admin/users/list/route.ts
 * Module: admin-console
 * Purpose: API endpoint to get list of users for admin notification targeting
 * Author: BharatERP
 * Last-updated: 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(req: Request) {
  try {
    const authResult = await requireAdminPermissions(req, "admin.users.read")
    if (!authResult.ok) return authResult.response

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const limit = parseInt(searchParams.get('limit') || '50')

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { clientId: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ],
        role: 'USER' // Only regular users, not admins
      },
      select: {
        id: true,
        name: true,
        email: true,
        clientId: true,
        phone: true,
        image: true
      },
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ users }, { status: 200 })
  } catch (error: any) {
    console.error("❌ [API-ADMIN-USERS-LIST] Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    )
  }
}
