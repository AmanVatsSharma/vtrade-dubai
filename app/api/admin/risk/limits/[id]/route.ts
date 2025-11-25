/**
 * @file route.ts
 * @module admin-console
 * @description API route for updating risk limits
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log("🌐 [API-ADMIN-RISK-LIMITS-UPDATE] PUT request received")

  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const body = await req.json()
    const { maxDailyLoss, maxPositionSize, maxLeverage, maxDailyTrades, status } = body

    const riskLimit = await prisma.riskLimit.update({
      where: { id },
      data: {
        ...(maxDailyLoss !== undefined && { maxDailyLoss: new Prisma.Decimal(maxDailyLoss) }),
        ...(maxPositionSize !== undefined && { maxPositionSize: new Prisma.Decimal(maxPositionSize) }),
        ...(maxLeverage !== undefined && { maxLeverage: new Prisma.Decimal(maxLeverage) }),
        ...(maxDailyTrades !== undefined && { maxDailyTrades }),
        ...(status !== undefined && { status }),
        updatedAt: new Date()
      }
    })

    console.log("✅ [API-ADMIN-RISK-LIMITS-UPDATE] Risk limit updated")

    return NextResponse.json({
      success: true,
      limit: {
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
    console.error("❌ [API-ADMIN-RISK-LIMITS-UPDATE] PUT error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update risk limit" },
      { status: 500 }
    )
  }
}
