/**
 * @file route.ts
 * @module admin-console
 * @description API route for platform-wide risk configuration management (RiskConfig)
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { handleAdminApi } from "@/lib/rbac/admin-api"
import { AppError } from "@/src/common/errors"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/risk/config
 * Fetch all platform-wide risk configurations
 */
export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/risk/config",
      required: "admin.risk.read",
      fallbackMessage: "Failed to fetch risk configs",
    },
    async (ctx) => {
      ctx.logger.debug({}, "GET /api/admin/risk/config - start")

      const configs = await prisma.riskConfig.findMany({
        orderBy: [{ segment: "asc" }, { productType: "asc" }],
      })

      const formattedConfigs = configs.map((config) => ({
        id: config.id,
        segment: config.segment,
        productType: config.productType,
        leverage: Number(config.leverage),
        brokerageFlat: config.brokerageFlat ? Number(config.brokerageFlat) : null,
        brokerageRate: config.brokerageRate ? Number(config.brokerageRate) : null,
        brokerageCap: config.brokerageCap ? Number(config.brokerageCap) : null,
        marginRate: config.marginRate ? Number(config.marginRate) : null,
        maxOrderValue: config.maxOrderValue ? Number(config.maxOrderValue) : null,
        maxPositions: config.maxPositions,
        active: config.active,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      }))

      ctx.logger.info({ count: formattedConfigs.length }, "GET /api/admin/risk/config - success")

      return NextResponse.json({ success: true, configs: formattedConfigs }, { status: 200 })
    }
  )
}

/**
 * POST /api/admin/risk/config
 * Create a new platform-wide risk configuration
 */
export async function POST(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/risk/config",
      required: "admin.risk.manage",
      fallbackMessage: "Failed to create risk config",
    },
    async (ctx) => {
      const body = await req.json()
      const {
        segment,
        productType,
        leverage,
        brokerageFlat,
        brokerageRate,
        brokerageCap,
        marginRate,
        maxOrderValue,
        maxPositions,
        active = true,
      } = body

      ctx.logger.debug({ segment, productType, leverage }, "POST /api/admin/risk/config - request")

      // Validate required fields
      if (!segment || !productType || leverage === undefined) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "segment, productType, and leverage are required",
          statusCode: 400,
        })
      }

      // Check if config already exists
      const existing = await prisma.riskConfig.findUnique({
        where: {
          segment_productType: {
            segment: segment.toUpperCase(),
            productType: productType.toUpperCase(),
          },
        },
      })

      if (existing) {
        throw new AppError({
          code: "CONFLICT_ERROR",
          message: "Risk config already exists for this segment and product type",
          statusCode: 409,
        })
      }

      const riskConfig = await prisma.riskConfig.create({
        data: {
          segment: segment.toUpperCase(),
          productType: productType.toUpperCase(),
          leverage: new Prisma.Decimal(leverage),
          brokerageFlat: brokerageFlat ? new Prisma.Decimal(brokerageFlat) : null,
          brokerageRate: brokerageRate ? new Prisma.Decimal(brokerageRate) : null,
          brokerageCap: brokerageCap ? new Prisma.Decimal(brokerageCap) : null,
          marginRate: marginRate ? new Prisma.Decimal(marginRate) : null,
          maxOrderValue: maxOrderValue ? new Prisma.Decimal(maxOrderValue) : null,
          maxPositions: maxPositions || null,
          active,
        },
      })

      ctx.logger.info({ configId: riskConfig.id }, "POST /api/admin/risk/config - success")

      return NextResponse.json(
        {
          success: true,
          message: "Risk config created successfully",
          config: {
            id: riskConfig.id,
            segment: riskConfig.segment,
            productType: riskConfig.productType,
            leverage: Number(riskConfig.leverage),
            active: riskConfig.active,
          },
        },
        { status: 201 }
      )
    }
  )
}
