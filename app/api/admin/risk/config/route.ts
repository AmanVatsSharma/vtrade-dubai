/**
 * @file route.ts
 * @module admin-console
 * @description API route for platform-wide risk configuration management (RiskConfig)
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

/**
 * GET /api/admin/risk/config
 * Fetch all platform-wide risk configurations
 */
export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-RISK-CONFIG] GET request received")

  try {
    const authResult = await requireAdminPermissions(req, "admin.risk.read")
    if (!authResult.ok) return authResult.response

    // Fetch all risk configs from database
    const configs = await prisma.riskConfig.findMany({
      orderBy: [
        { segment: 'asc' },
        { productType: 'asc' }
      ]
    })

    const formattedConfigs = configs.map(config => ({
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
      updatedAt: config.updatedAt
    }))

    console.log("✅ [API-ADMIN-RISK-CONFIG] Risk configs fetched:", formattedConfigs.length)

    return NextResponse.json({ success: true, configs: formattedConfigs }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RISK-CONFIG] GET error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch risk configs" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/risk/config
 * Create a new platform-wide risk configuration
 */
export async function POST(req: Request) {
  console.log("🌐 [API-ADMIN-RISK-CONFIG] POST request received")

  try {
    const authResult = await requireAdminPermissions(req, "admin.risk.manage")
    if (!authResult.ok) return authResult.response

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
      active = true
    } = body

    // Validate required fields
    if (!segment || !productType || leverage === undefined) {
      return NextResponse.json(
        { success: false, error: "segment, productType, and leverage are required" },
        { status: 400 }
      )
    }

    // Check if config already exists
    const existing = await prisma.riskConfig.findUnique({
      where: {
        segment_productType: {
          segment: segment.toUpperCase(),
          productType: productType.toUpperCase()
        }
      }
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Risk config already exists for this segment and product type" },
        { status: 409 }
      )
    }

    // Create risk config
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
        active
      }
    })

    console.log("✅ [API-ADMIN-RISK-CONFIG] Risk config created:", riskConfig.id)

    return NextResponse.json({
      success: true,
      message: "Risk config created successfully",
      config: {
        id: riskConfig.id,
        segment: riskConfig.segment,
        productType: riskConfig.productType,
        leverage: Number(riskConfig.leverage),
        active: riskConfig.active
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RISK-CONFIG] POST error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create risk config" },
      { status: 500 }
    )
  }
}
