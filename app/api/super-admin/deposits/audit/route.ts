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

import { NextRequest, NextResponse } from "next/server"
import { DepositAuditService } from "@/lib/services/admin/DepositAuditService"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"
import { withRequest } from "@/lib/observability/logger"

const getIstTimestamp = () =>
  new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  })

export async function GET(req: NextRequest) {
  const logger = withRequest({
    requestId: req.headers.get("x-request-id") || undefined,
    route: "/api/super-admin/deposits/audit",
  })

  logger.debug({ timeIst: getIstTimestamp() }, "GET deposit audit - start")

  try {
    const authResult = await requireAdminPermissions(req, "admin.super.financial.read")
    if (!authResult.ok) return authResult.response

    const { searchParams } = new URL(req.url)
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

    logger.debug(
      {
        timeIst: getIstTimestamp(),
        count: data.records.length,
        total: data.total,
        status: normalizedStatus,
      },
      "GET deposit audit - success"
    )

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    logger.error({ timeIst: getIstTimestamp(), err: error }, "GET deposit audit - error")
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}
