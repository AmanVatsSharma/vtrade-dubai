/**
 * @file route.ts
 * @module admin-console
 * @description API route for updating individual platform-wide risk configurations
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * PUT /api/admin/risk/config/[id]
 * Update a platform-wide risk configuration
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log("🌐 [API-ADMIN-RISK-CONFIG-UPDATE] PUT request received")

  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const configId = params.id
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
      active
    } = body

    console.log("📝 [API-ADMIN-RISK-CONFIG-UPDATE] Updating config:", { configId, data: body })

    // Check if config exists
    const existing = await prisma.riskConfig.findUnique({
      where: { id: configId }
    })

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Risk config not found" },
        { status: 404 }
      )
    }

    // If segment or productType is being changed, check for conflicts
    if ((segment && segment.toUpperCase() !== existing.segment) ||
        (productType && productType.toUpperCase() !== existing.productType)) {
      const newSegment = segment ? segment.toUpperCase() : existing.segment
      const newProductType = productType ? productType.toUpperCase() : existing.productType

      const conflict = await prisma.riskConfig.findUnique({
        where: {
          segment_productType: {
            segment: newSegment,
            productType: newProductType
          }
        }
      })

      if (conflict && conflict.id !== configId) {
        return NextResponse.json(
          { success: false, error: "Risk config already exists for this segment and product type" },
          { status: 409 }
        )
      }
    }

    // Build update data
    const updateData: any = {}
    if (segment !== undefined) updateData.segment = segment.toUpperCase()
    if (productType !== undefined) updateData.productType = productType.toUpperCase()
    if (leverage !== undefined) updateData.leverage = new Prisma.Decimal(leverage)
    if (brokerageFlat !== undefined) updateData.brokerageFlat = brokerageFlat ? new Prisma.Decimal(brokerageFlat) : null
    if (brokerageRate !== undefined) updateData.brokerageRate = brokerageRate ? new Prisma.Decimal(brokerageRate) : null
    if (brokerageCap !== undefined) updateData.brokerageCap = brokerageCap ? new Prisma.Decimal(brokerageCap) : null
    if (marginRate !== undefined) updateData.marginRate = marginRate ? new Prisma.Decimal(marginRate) : null
    if (maxOrderValue !== undefined) updateData.maxOrderValue = maxOrderValue ? new Prisma.Decimal(maxOrderValue) : null
    if (maxPositions !== undefined) updateData.maxPositions = maxPositions || null
    if (active !== undefined) updateData.active = active

    // Update risk config
    const updated = await prisma.riskConfig.update({
      where: { id: configId },
      data: updateData
    })

    console.log("✅ [API-ADMIN-RISK-CONFIG-UPDATE] Risk config updated:", updated.id)

    return NextResponse.json({
      success: true,
      message: "Risk config updated successfully",
      config: {
        id: updated.id,
        segment: updated.segment,
        productType: updated.productType,
        leverage: Number(updated.leverage),
        brokerageFlat: updated.brokerageFlat ? Number(updated.brokerageFlat) : null,
        brokerageRate: updated.brokerageRate ? Number(updated.brokerageRate) : null,
        brokerageCap: updated.brokerageCap ? Number(updated.brokerageCap) : null,
        marginRate: updated.marginRate ? Number(updated.marginRate) : null,
        maxOrderValue: updated.maxOrderValue ? Number(updated.maxOrderValue) : null,
        maxPositions: updated.maxPositions,
        active: updated.active,
        updatedAt: updated.updatedAt
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RISK-CONFIG-UPDATE] PUT error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update risk config" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/risk/config/[id]
 * Get a specific risk configuration
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log("🌐 [API-ADMIN-RISK-CONFIG-DETAIL] GET request received")

  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const configId = params.id
    const config = await prisma.riskConfig.findUnique({
      where: { id: configId }
    })

    if (!config) {
      return NextResponse.json(
        { success: false, error: "Risk config not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      config: {
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
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RISK-CONFIG-DETAIL] GET error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch risk config" },
      { status: 500 }
    )
  }
}
