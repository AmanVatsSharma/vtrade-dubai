/**
 * @file route.ts
 * @module admin-console
 * @description API route for super-admin financial transactions listing
 * @author BharatERP
 * @created 2026-02-02
 */

import { NextResponse } from "next/server"
import { handleAdminApi } from "@/lib/rbac/admin-api"
import { SuperAdminFinanceService } from "@/lib/services/admin/SuperAdminFinanceService"

export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/super-admin/finance/transactions",
      required: "admin.super.financial.read",
      fallbackMessage: "Failed to fetch transactions",
    },
    async (ctx) => {
      const { searchParams } = new URL(ctx.req.url)
      const type = (searchParams.get("type") || "DEPOSIT") as "DEPOSIT" | "WITHDRAWAL"
      const status = searchParams.get("status") || undefined
      const method = searchParams.get("method") || undefined
      const userId = searchParams.get("userId") || undefined
      const bankAccountId = searchParams.get("bankAccountId") || undefined
      const from = searchParams.get("from") ? new Date(searchParams.get("from") as string) : undefined
      const to = searchParams.get("to") ? new Date(searchParams.get("to") as string) : undefined
      const page = Number(searchParams.get("page") || "1")
      const pageSize = Number(searchParams.get("pageSize") || "20")

      const data = await SuperAdminFinanceService.listTransactions(type, {
        status,
        method,
        userId,
        bankAccountId,
        from,
        to,
        page,
        pageSize,
      })
      return NextResponse.json({ success: true, data })
    }
  )
}
