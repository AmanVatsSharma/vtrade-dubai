/**
 * @file route.ts
 * @module admin-console
 * @description API route for updating risk limits
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { handleAdminApi } from "@/lib/rbac/admin-api"

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/risk/limits/[id]",
      required: "admin.risk.manage",
      fallbackMessage: "Failed to update risk limit",
    },
    async (ctx) => {
      const { id } = params
      const body = await req.json()
      const { maxDailyLoss, maxPositionSize, maxLeverage, maxDailyTrades, status } = body

      ctx.logger.debug({ limitId: id }, "PUT /api/admin/risk/limits/[id] - request")

      const riskLimit = await prisma.riskLimit.update({
        where: { id },
        data: {
          ...(maxDailyLoss !== undefined && { maxDailyLoss: new Prisma.Decimal(maxDailyLoss) }),
          ...(maxPositionSize !== undefined && { maxPositionSize: new Prisma.Decimal(maxPositionSize) }),
          ...(maxLeverage !== undefined && { maxLeverage: new Prisma.Decimal(maxLeverage) }),
          ...(maxDailyTrades !== undefined && { maxDailyTrades }),
          ...(status !== undefined && { status }),
          updatedAt: new Date(),
        },
      })

      ctx.logger.info({ limitId: riskLimit.id }, "PUT /api/admin/risk/limits/[id] - success")

      return NextResponse.json(
        {
          success: true,
          limit: {
            id: riskLimit.id,
            userId: riskLimit.userId,
            maxDailyLoss: Number(riskLimit.maxDailyLoss),
            maxPositionSize: Number(riskLimit.maxPositionSize),
            maxLeverage: Number(riskLimit.maxLeverage),
            maxDailyTrades: riskLimit.maxDailyTrades,
            status: riskLimit.status,
          },
        },
        { status: 200 }
      )
    }
  )
}
