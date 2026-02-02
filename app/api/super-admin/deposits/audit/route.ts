/**
 * File: app/api/super-admin/deposits/audit/route.ts
 * Module: admin-console
 * Purpose: Serve super-admin deposit approval and rejection audit trail.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-01-15
 * Notes:
 * - Uses RBAC permission checks for super-admin financial read.
 * - Emits structured logs with IST timestamps.
 */

import { NextResponse } from "next/server"
import { DepositAuditService } from "@/lib/services/admin/DepositAuditService"
import { handleAdminApi } from "@/lib/rbac/admin-api"

export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/super-admin/deposits/audit",
      required: "admin.super.financial.read",
      fallbackMessage: "Failed to fetch deposit audit",
    },
    async (ctx) => {
      const { searchParams } = new URL(ctx.req.url)
      const statusParam = searchParams.get("status") || undefined
      const normalizedStatus = statusParam ? statusParam.toUpperCase() : undefined
      const adminId = searchParams.get("adminId") || undefined
      const adminName = searchParams.get("adminName") || undefined
      const search = searchParams.get("search") || undefined
      const fromParam = searchParams.get("from")
      const toParam = searchParams.get("to")
      const pageParam = Number(searchParams.get("page") || "1")
      const pageSizeParam = Number(searchParams.get("pageSize") || "20")

      const from = fromParam ? new Date(fromParam) : undefined
      const to = toParam ? new Date(toParam) : undefined

      const data = await DepositAuditService.list({
        status: normalizedStatus as any,
        adminId,
        adminName,
        search,
        from,
        to,
        page: Number.isNaN(pageParam) ? 1 : pageParam,
        pageSize: Number.isNaN(pageSizeParam) ? 20 : pageSizeParam,
      })

      ctx.logger.info(
        { count: data.records.length, total: data.total, status: normalizedStatus },
        "GET /api/super-admin/deposits/audit - success"
      )

      return NextResponse.json({ success: true, data })
    }
  )
}
