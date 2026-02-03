/**
 * @file route.ts
 * @module admin-console
 * @description API endpoint for super admins to update trading account funds
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from "next/server"
import { handleAdminApi } from "@/lib/rbac/admin-api"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { AppError } from "@/src/common/errors"

export async function PUT(
  req: Request,
  { params }: { params: { userId: string } }
) {
  return handleAdminApi(
    req,
    {
      route: `/api/admin/users/${params.userId}/trading-account`,
      required: "admin.funds.override",
      fallbackMessage: "Failed to update trading account funds",
    },
    async (ctx) => {
      const userId = params.userId
      const body = await req.json()
      const { balance, availableMargin, usedMargin, reason } = body

      ctx.logger.debug(
        { userId, balance, availableMargin, usedMargin, hasReason: !!reason },
        "PUT /api/admin/users/[userId]/trading-account - request"
      )

      if (balance === undefined && availableMargin === undefined && usedMargin === undefined) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "At least one field (balance, availableMargin, or usedMargin) must be provided",
          statusCode: 400,
        })
      }

      const adminService = createAdminUserService()
      const updatedAccount = await adminService.updateTradingAccountFunds(
        userId,
        {
          ...(balance !== undefined && { balance: Number(balance) }),
          ...(availableMargin !== undefined && { availableMargin: Number(availableMargin) }),
          ...(usedMargin !== undefined && { usedMargin: Number(usedMargin) }),
        },
        reason
      )

      ctx.logger.info({ userId }, "PUT /api/admin/users/[userId]/trading-account - success")

      return NextResponse.json(
        {
          success: true,
          tradingAccount: {
            id: updatedAccount.id,
            balance: Number(updatedAccount.balance),
            availableMargin: Number(updatedAccount.availableMargin),
            usedMargin: Number(updatedAccount.usedMargin),
          },
        },
        { status: 200 }
      )
    }
  )
}
