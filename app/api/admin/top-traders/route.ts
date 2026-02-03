/**
 * @file route.ts
 * @module admin-console
 * @description API route for top traders data
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { handleAdminApi } from "@/lib/rbac/admin-api"

export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/top-traders",
      required: "admin.top-traders.read",
      fallbackMessage: "Failed to fetch top traders",
    },
    async (ctx) => {
      const { searchParams } = new URL(req.url)
      const limit = parseInt(searchParams.get("limit") || "10")

      ctx.logger.debug({ limit }, "GET /api/admin/top-traders - request")

      const adminService = createAdminUserService()
      const traders = await adminService.getTopTraders(limit)

      ctx.logger.info({ count: traders.length }, "GET /api/admin/top-traders - success")
      return NextResponse.json({ success: true, traders }, { status: 200 })
    }
  )
}
