/**
 * @file route.ts
 * @module admin-console
 * @description API route for risk limit management
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { handleAdminApi } from "@/lib/rbac/admin-api"
import { AppError } from "@/src/common/errors"

export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/risk/limits",
      required: "admin.risk.read",
      fallbackMessage: "Failed to fetch risk limits",
    },
    async (ctx) => {
      ctx.logger.debug({}, "GET /api/admin/risk/limits - start")

      const limits = await prisma.riskLimit.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              clientId: true,
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      })

      const formattedLimits = limits.map((limit) => ({
        id: limit.id,
        userId: limit.userId,
        userName: limit.user.name || limit.user.email || "Unknown",
        maxDailyLoss: Number(limit.maxDailyLoss),
        maxPositionSize: Number(limit.maxPositionSize),
        maxLeverage: Number(limit.maxLeverage),
        maxDailyTrades: limit.maxDailyTrades,
        status: limit.status,
        lastUpdated: limit.updatedAt,
      }))

      ctx.logger.info({ count: formattedLimits.length }, "GET /api/admin/risk/limits - success")

      return NextResponse.json({ limits: formattedLimits }, { status: 200 })
    }
  )
}

export async function POST(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/risk/limits",
      required: "admin.risk.manage",
      fallbackMessage: "Failed to create risk limit",
    },
    async (ctx) => {
      const body = await req.json()
      const { userId, maxDailyLoss, maxPositionSize, maxLeverage, maxDailyTrades } = body

      ctx.logger.debug({ userId, maxDailyLoss, maxPositionSize, maxLeverage }, "POST /api/admin/risk/limits - request")

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "User not found",
          statusCode: 404,
        })
      }

      const riskLimit = await prisma.riskLimit.upsert({
        where: { userId },
        update: {
          maxDailyLoss: new Prisma.Decimal(maxDailyLoss),
          maxPositionSize: new Prisma.Decimal(maxPositionSize),
          maxLeverage: new Prisma.Decimal(maxLeverage),
          maxDailyTrades,
          updatedAt: new Date(),
        },
        create: {
          userId,
          maxDailyLoss: new Prisma.Decimal(maxDailyLoss),
          maxPositionSize: new Prisma.Decimal(maxPositionSize),
          maxLeverage: new Prisma.Decimal(maxLeverage),
          maxDailyTrades,
          status: "ACTIVE",
        },
      })

      ctx.logger.info({ limitId: riskLimit.id, userId }, "POST /api/admin/risk/limits - success")

      return NextResponse.json(
        {
          success: true,
          message: "Risk limit created successfully",
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
        { status: 201 }
      )
    }
  )
}
