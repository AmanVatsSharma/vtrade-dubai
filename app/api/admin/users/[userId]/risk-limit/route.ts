/**
 * @file route.ts
 * @module admin-console
 * @description API route for fetching and updating user risk limit with leverage override
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/**
 * GET /api/admin/users/[userId]/risk-limit
 * Fetch user risk limit with base leverage information
 */
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  console.log("🌐 [API-ADMIN-USER-RISK-LIMIT] GET request received")

  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.userId

    // Fetch user risk limit
    const riskLimit = await prisma.riskLimit.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Fetch platform-wide base leverage configs for reference
    const baseConfigs = await prisma.riskConfig.findMany({
      where: { active: true },
      select: {
        segment: true,
        productType: true,
        leverage: true
      }
    })

    console.log("✅ [API-ADMIN-USER-RISK-LIMIT] Risk limit fetched:", riskLimit?.id)

    return NextResponse.json({
      success: true,
      riskLimit: riskLimit ? {
        id: riskLimit.id,
        userId: riskLimit.userId,
        maxDailyLoss: Number(riskLimit.maxDailyLoss),
        maxPositionSize: Number(riskLimit.maxPositionSize),
        maxLeverage: Number(riskLimit.maxLeverage),
        maxDailyTrades: riskLimit.maxDailyTrades,
        status: riskLimit.status
      } : null,
      baseConfigs: baseConfigs.map(c => ({
        segment: c.segment,
        productType: c.productType,
        leverage: Number(c.leverage)
      }))
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-USER-RISK-LIMIT] GET error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch risk limit" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/users/[userId]/risk-limit
 * Update user risk limit with leverage override
 */
export async function PUT(
  req: Request,
  { params }: { params: { userId: string } }
) {
  console.log("🌐 [API-ADMIN-USER-RISK-LIMIT] PUT request received")

  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = params.userId
    const body = await req.json()
    const {
      maxDailyLoss,
      maxPositionSize,
      maxLeverage,
      maxDailyTrades,
      leverageMultiplier
    } = body

    console.log("📝 [API-ADMIN-USER-RISK-LIMIT] Updating risk limit:", { userId, data: body })

    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      )
    }

    // If leverageMultiplier is provided, calculate maxLeverage from base
    let finalMaxLeverage = maxLeverage
    if (leverageMultiplier !== undefined && leverageMultiplier !== null) {
      // Get average base leverage from platform configs as reference
      const baseConfigs = await prisma.riskConfig.findMany({
        where: { active: true },
        select: { leverage: true }
      })
      
      if (baseConfigs.length > 0) {
        const avgBaseLeverage = baseConfigs.reduce((sum, c) => sum + Number(c.leverage), 0) / baseConfigs.length
        finalMaxLeverage = avgBaseLeverage * leverageMultiplier
        console.log("📊 [API-ADMIN-USER-RISK-LIMIT] Calculated leverage:", { avgBaseLeverage, leverageMultiplier, finalMaxLeverage })
      }
    }

    // Create or update risk limit
    const riskLimit = await prisma.riskLimit.upsert({
      where: { userId },
      update: {
        maxDailyLoss: maxDailyLoss !== undefined ? new Prisma.Decimal(maxDailyLoss) : undefined,
        maxPositionSize: maxPositionSize !== undefined ? new Prisma.Decimal(maxPositionSize) : undefined,
        maxLeverage: finalMaxLeverage !== undefined ? new Prisma.Decimal(finalMaxLeverage) : undefined,
        maxDailyTrades: maxDailyTrades !== undefined ? maxDailyTrades : undefined,
        updatedAt: new Date()
      },
      create: {
        userId,
        maxDailyLoss: new Prisma.Decimal(maxDailyLoss || 0),
        maxPositionSize: new Prisma.Decimal(maxPositionSize || 0),
        maxLeverage: new Prisma.Decimal(finalMaxLeverage || 1),
        maxDailyTrades: maxDailyTrades || 0,
        status: 'ACTIVE'
      }
    })

    console.log("✅ [API-ADMIN-USER-RISK-LIMIT] Risk limit updated:", riskLimit.id)

    return NextResponse.json({
      success: true,
      message: "Risk limit updated successfully",
      riskLimit: {
        id: riskLimit.id,
        userId: riskLimit.userId,
        maxDailyLoss: Number(riskLimit.maxDailyLoss),
        maxPositionSize: Number(riskLimit.maxPositionSize),
        maxLeverage: Number(riskLimit.maxLeverage),
        maxDailyTrades: riskLimit.maxDailyTrades,
        status: riskLimit.status
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-USER-RISK-LIMIT] PUT error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update risk limit" },
      { status: 500 }
    )
  }
}
