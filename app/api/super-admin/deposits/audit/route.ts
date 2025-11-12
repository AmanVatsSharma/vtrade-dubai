/**
 * File: app/api/super-admin/deposits/audit/route.ts
 * Module: admin-console
 * Purpose: Super admin endpoint exposing deposit approval & rejection audit trail
 * Author: Cursor / GPT-5 Codex
 * Last-updated: 2025-11-12
 * Notes:
 * - Delegates to DepositAuditService with query parameter filters
 * - Restricts access to SUPER_ADMIN role
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { DepositAuditService } from "@/lib/services/admin/DepositAuditService"

export async function GET(req: NextRequest) {
  console.log("🌐 [/api/super-admin/deposits/audit] GET request received")
  try {
    const session = await auth()
    const role = (session?.user as any)?.role

    if (!session?.user || role !== "SUPER_ADMIN") {
      console.warn("🚫 [/api/super-admin/deposits/audit] Unauthorized access attempt")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

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

    console.log("📝 [/api/super-admin/deposits/audit] Parsed filters:", {
      statusParam: normalizedStatus,
      adminId,
      adminName,
      search,
      from,
      to,
      pageParam,
      pageSizeParam,
    })

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

    console.log("✅ [/api/super-admin/deposits/audit] Returning audit payload:", {
      count: data.records.length,
      total: data.total,
    })

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error("❌ [/api/super-admin/deposits/audit] Error:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}
