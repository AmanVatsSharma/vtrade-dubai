/**
 * @file route.ts
 * @module admin-console
 * @description API route for fetching and updating user risk limit with leverage override
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { handleAdminApi } from "@/lib/rbac/admin-api"
import { AppError } from "@/src/common/errors"

/**
 * GET /api/admin/users/[userId]/risk-limit
 * Fetch user risk limit with base leverage information
 */
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  return handleAdminApi(
    req,
    {
      route: `/api/admin/users/${params.userId}/risk-limit`,
      required: "admin.users.risk",
      fallbackMessage: "Failed to fetch risk limit",
    },
    async (ctx) => {
      const userId = params.userId

      ctx.logger.debug({ userId }, "GET /api/admin/users/[userId]/risk-limit - request")

      const riskLimit = await prisma.riskLimit.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      const baseConfigs = await prisma.riskConfig.findMany({
        where: { active: true },
        select: {
          segment: true,
          productType: true,
          leverage: true,
        },
      })

      ctx.logger.info({ userId, hasRiskLimit: !!riskLimit }, "GET /api/admin/users/[userId]/risk-limit - success")

      return NextResponse.json(
        {
          success: true,
          riskLimit: riskLimit
            ? {
                id: riskLimit.id,
                userId: riskLimit.userId,
                maxDailyLoss: Number(riskLimit.maxDailyLoss),
                maxPositionSize: Number(riskLimit.maxPositionSize),
                maxLeverage: Number(riskLimit.maxLeverage),
                maxDailyTrades: riskLimit.maxDailyTrades,
                status: riskLimit.status,
              }
            : null,
          baseConfigs: baseConfigs.map((c) => ({
            segment: c.segment,
            productType: c.productType,
            leverage: Number(c.leverage),
          })),
        },
        { status: 200 }
      )
    }
  )
}

/**
 * PUT /api/admin/users/[userId]/risk-limit
 * Update user risk limit with leverage override
 */
export async function PUT(
  req: Request,
  { params }: { params: { userId: string } }
) {
  return handleAdminApi(
    req,
    {
      route: `/api/admin/users/${params.userId}/risk-limit`,
      required: "admin.users.risk",
      fallbackMessage: "Failed to update risk limit",
    },
    async (ctx) => {
      const userId = params.userId
      const body = await req.json()
      const { maxDailyLoss, maxPositionSize, maxLeverage, maxDailyTrades, leverageMultiplier } = body

      ctx.logger.debug({ userId }, "PUT /api/admin/users/[userId]/risk-limit - request")

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        throw new AppError({
          code: "USER_NOT_FOUND",
          message: "User not found",
          statusCode: 404,
        })
      }

      let finalMaxLeverage = maxLeverage
      if (leverageMultiplier !== undefined && leverageMultiplier !== null) {
        const baseConfigs = await prisma.riskConfig.findMany({
          where: { active: true },
          select: { leverage: true },
        })

        if (baseConfigs.length > 0) {
          const avgBaseLeverage =
            baseConfigs.reduce((sum: number, c: any) => sum + Number(c.leverage), 0) / baseConfigs.length
          finalMaxLeverage = avgBaseLeverage * leverageMultiplier
          ctx.logger.debug(
            { avgBaseLeverage, leverageMultiplier, finalMaxLeverage },
            "PUT /api/admin/users/[userId]/risk-limit - leverage calculated"
          )
        }
      }

      const riskLimit = await prisma.riskLimit.upsert({
        where: { userId },
        update: {
          maxDailyLoss: maxDailyLoss !== undefined ? new Prisma.Decimal(maxDailyLoss) : undefined,
          maxPositionSize: maxPositionSize !== undefined ? new Prisma.Decimal(maxPositionSize) : undefined,
          maxLeverage: finalMaxLeverage !== undefined ? new Prisma.Decimal(finalMaxLeverage) : undefined,
          maxDailyTrades: maxDailyTrades !== undefined ? maxDailyTrades : undefined,
          updatedAt: new Date(),
        },
        create: {
          userId,
          maxDailyLoss: new Prisma.Decimal(maxDailyLoss || 0),
          maxPositionSize: new Prisma.Decimal(maxPositionSize || 0),
          maxLeverage: new Prisma.Decimal(finalMaxLeverage || 1),
          maxDailyTrades: maxDailyTrades || 0,
          status: "ACTIVE",
        },
      })

      ctx.logger.info({ userId, riskLimitId: riskLimit.id }, "PUT /api/admin/users/[userId]/risk-limit - success")

      return NextResponse.json(
        {
          success: true,
          message: "Risk limit updated successfully",
          riskLimit: {
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
