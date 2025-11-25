/**
 * @file route.ts
 * @module admin-console
 * @description API route for resolving risk alerts
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  console.log("🌐 [API-ADMIN-RISK-ALERTS-RESOLVE] POST request received")

  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = params
    const userId = (session.user as any).id

    const alert = await prisma.riskAlert.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId
      }
    })

    console.log("✅ [API-ADMIN-RISK-ALERTS-RESOLVE] Alert resolved")

    return NextResponse.json({
      success: true,
      alert: {
        id: alert.id,
        resolved: alert.resolved,
        resolvedAt: alert.resolvedAt
      }
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RISK-ALERTS-RESOLVE] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to resolve alert" },
      { status: 500 }
    )
  }
}
