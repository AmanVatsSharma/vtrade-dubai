/**
 * @file route.ts
 * @module admin-console
 * @description API route for system health monitoring
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-SYSTEM-HEALTH] GET request received")

  try {
    const authResult = await requireAdminPermissions(req, "admin.system.read")
    if (!authResult.ok) return authResult.response

    // Check database connectivity
    let dbStatus = 'ONLINE'
    let dbResponseTime = 0
    try {
      const start = Date.now()
      await prisma.$queryRaw`SELECT 1`
      dbResponseTime = Date.now() - start
    } catch (error) {
      dbStatus = 'OFFLINE'
      console.error("❌ [API-ADMIN-SYSTEM-HEALTH] Database check failed:", error)
    }

    // Mock metrics (in production, these would come from monitoring tools)
    const metrics = [
      { name: 'CPU Usage', value: 45, max: 100, unit: '%', status: 'HEALTHY' as const, trend: 'down' as const },
      { name: 'Memory Usage', value: 68, max: 100, unit: '%', status: 'HEALTHY' as const, trend: 'up' as const },
      { name: 'Disk Usage', value: 52, max: 100, unit: '%', status: 'HEALTHY' as const, trend: 'down' as const },
      { name: 'Network I/O', value: 23, max: 100, unit: '%', status: 'HEALTHY' as const, trend: 'up' as const },
    ]

    const services = [
      {
        name: 'API Server',
        status: 'ONLINE' as const,
        uptime: 99.9,
        lastCheck: new Date(),
        responseTime: 45
      },
      {
        name: 'Database',
        status: dbStatus as 'ONLINE' | 'OFFLINE',
        uptime: dbStatus === 'ONLINE' ? 99.8 : 0,
        lastCheck: new Date(),
        responseTime: dbResponseTime
      },
      {
        name: 'WebSocket',
        status: 'ONLINE' as const,
        uptime: 99.7,
        lastCheck: new Date(),
        responseTime: 8
      },
      {
        name: 'Cache',
        status: 'DEGRADED' as const,
        uptime: 98.5,
        lastCheck: new Date(),
        responseTime: 5
      },
    ]

    console.log("✅ [API-ADMIN-SYSTEM-HEALTH] Health data prepared")

    return NextResponse.json({ metrics, services }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-SYSTEM-HEALTH] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch system health" },
      { status: 500 }
    )
  }
}
