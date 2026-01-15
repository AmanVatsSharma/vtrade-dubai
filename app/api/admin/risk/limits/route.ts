/**
 * @file route.ts
 * @module admin-console
 * @description API route for risk limit management
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-RISK-LIMITS] GET request received")

  try {
    const authResult = await requireAdminPermissions(req, "admin.risk.read")
    if (!authResult.ok) return authResult.response

    // Fetch risk limits from database
    const limits = await prisma.riskLimit.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            clientId: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    const formattedLimits = limits.map(limit => ({
      id: limit.id,
      userId: limit.userId,
      userName: limit.user.name || limit.user.email || 'Unknown',
      maxDailyLoss: Number(limit.maxDailyLoss),
      maxPositionSize: Number(limit.maxPositionSize),
      maxLeverage: Number(limit.maxLeverage),
      maxDailyTrades: limit.maxDailyTrades,
      status: limit.status,
      lastUpdated: limit.updatedAt
    }))

    console.log("✅ [API-ADMIN-RISK-LIMITS] Risk limits fetched:", formattedLimits.length)

    return NextResponse.json({ limits: formattedLimits }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RISK-LIMITS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch risk limits" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  console.log("🌐 [API-ADMIN-RISK-LIMITS] POST request received")

  try {
    const authResult = await requireAdminPermissions(req, "admin.risk.manage")
    if (!authResult.ok) return authResult.response

    const body = await req.json()
    const { userId, maxDailyLoss, maxPositionSize, maxLeverage, maxDailyTrades } = body

    // Validate user exists
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Create or update risk limit
    const riskLimit = await prisma.riskLimit.upsert({
      where: { userId },
      update: {
        maxDailyLoss: new Prisma.Decimal(maxDailyLoss),
        maxPositionSize: new Prisma.Decimal(maxPositionSize),
        maxLeverage: new Prisma.Decimal(maxLeverage),
        maxDailyTrades,
        updatedAt: new Date()
      },
      create: {
        userId,
        maxDailyLoss: new Prisma.Decimal(maxDailyLoss),
        maxPositionSize: new Prisma.Decimal(maxPositionSize),
        maxLeverage: new Prisma.Decimal(maxLeverage),
        maxDailyTrades,
        status: 'ACTIVE'
      }
    })

    console.log("✅ [API-ADMIN-RISK-LIMITS] Risk limit created/updated:", riskLimit.id)

    return NextResponse.json({
      success: true,
      message: "Risk limit created successfully",
      limit: {
        id: riskLimit.id,
        userId: riskLimit.userId,
        maxDailyLoss: Number(riskLimit.maxDailyLoss),
        maxPositionSize: Number(riskLimit.maxPositionSize),
        maxLeverage: Number(riskLimit.maxLeverage),
        maxDailyTrades: riskLimit.maxDailyTrades,
        status: riskLimit.status
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RISK-LIMITS] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create risk limit" },
      { status: 500 }
    )
  }
}
