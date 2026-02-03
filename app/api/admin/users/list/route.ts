/**
 * File: app/api/admin/users/list/route.ts
 * Module: admin-console
 * Purpose: API endpoint to get list of users for admin notification targeting
 * Author: BharatERP
 * Last-updated: 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleAdminApi } from "@/lib/rbac/admin-api"

export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/users/list",
      required: "admin.users.read",
      fallbackMessage: "Failed to fetch users",
    },
    async ({ logger }) => {
      const { searchParams } = new URL(req.url)
      const search = searchParams.get("search") || ""
      const limit = parseInt(searchParams.get("limit") || "50")

      logger.debug({ search, limit }, "GET /api/admin/users/list - request")

      const users = await prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { clientId: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
          role: "USER", // Only regular users, not admins
        },
        select: {
          id: true,
          name: true,
          email: true,
          clientId: true,
          phone: true,
          image: true,
        },
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      })

      logger.info({ count: users.length }, "GET /api/admin/users/list - success")
      return NextResponse.json({ users }, { status: 200 })
    }
  )
}
