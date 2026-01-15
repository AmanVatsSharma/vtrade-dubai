/**
 * File: app/api/super-admin/finance/commission-rules/route.ts
 * Module: admin-console
 * Purpose: Read and update super-admin commission rules.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-01-15
 * Notes:
 * - Uses RBAC permissions for read/manage access.
 * - Emits structured logs with IST timestamps.
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"
import { SuperAdminFinanceService } from "@/lib/services/admin/SuperAdminFinanceService"
import { withRequest } from "@/lib/observability/logger"

const getIstTimestamp = () =>
  new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  })

export async function GET(req: NextRequest) {
  const logger = withRequest({
    requestId: req.headers.get("x-request-id") || undefined,
    route: "/api/super-admin/finance/commission-rules",
  })

  logger.debug({ timeIst: getIstTimestamp() }, "GET commission rules - start")

  try {
    const authResult = await requireAdminPermissions(req, "admin.super.financial.read")
    if (!authResult.ok) return authResult.response

    const rules = await SuperAdminFinanceService.getCommissionRules()
    logger.debug(
      { timeIst: getIstTimestamp(), count: Array.isArray(rules) ? rules.length : 0 },
      "GET commission rules - success"
    )
    return NextResponse.json({ success: true, data: rules })
  } catch (e: any) {
    logger.error({ timeIst: getIstTimestamp(), err: e }, "GET commission rules - error")
    return NextResponse.json({ error: e?.message || "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const logger = withRequest({
    requestId: req.headers.get("x-request-id") || undefined,
    route: "/api/super-admin/finance/commission-rules",
  })

  logger.debug({ timeIst: getIstTimestamp() }, "POST commission rules - start")

  try {
    const authResult = await requireAdminPermissions(req, "admin.super.financial.manage")
    if (!authResult.ok) return authResult.response

    const body = await req.json()
    await SuperAdminFinanceService.updateCommissionRules(body)
    logger.debug({ timeIst: getIstTimestamp() }, "POST commission rules - success")
    return NextResponse.json({ success: true })
  } catch (e: any) {
    logger.error({ timeIst: getIstTimestamp(), err: e }, "POST commission rules - error")
    return NextResponse.json({ error: e?.message || "Internal Server Error" }, { status: 500 })
  }
}
