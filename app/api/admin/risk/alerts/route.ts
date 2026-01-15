/**
 * @file route.ts
 * @module admin-console
 * @description API route for risk alerts
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-RISK-ALERTS] GET request received")

  try {
    const authResult = await requireAdminPermissions(req, "admin.risk.read")
    if (!authResult.ok) return authResult.response

    // Fetch risk alerts from database
    const alerts = await prisma.riskAlert.findMany({
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
        createdAt: 'desc'
      },
      take: 100
    })

    const formattedAlerts = alerts.map(alert => ({
      id: alert.id,
      userId: alert.userId,
      userName: alert.user?.name || alert.user?.email || 'Unknown',
      type: alert.type,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.createdAt,
      resolved: alert.resolved
    }))

    console.log("✅ [API-ADMIN-RISK-ALERTS] Risk alerts fetched:", formattedAlerts.length)

    return NextResponse.json({ alerts: formattedAlerts }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-RISK-ALERTS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch risk alerts" },
      { status: 500 }
    )
  }
}
