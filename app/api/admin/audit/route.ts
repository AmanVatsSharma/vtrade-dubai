/**
 * @file route.ts
 * @module admin-console
 * @description API route for audit trail and activity logging
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-AUDIT] GET request received")

  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || undefined
    const severity = searchParams.get('severity') || undefined
    const status = searchParams.get('status') || undefined
    const action = searchParams.get('action') || undefined
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined

    console.log("🔍 [API-ADMIN-AUDIT] Fetching audit logs with filters:", {
      page, limit, search, severity, status, action, dateFrom, dateTo
    })

    const skip = (page - 1) * limit
    const where: any = {}

    // Build where clause
    if (search) {
      where.OR = [
        { metadata: { contains: search, mode: 'insensitive' as const } },
        { eventType: { contains: search, mode: 'insensitive' as const } }
      ]
    }

    if (severity) {
      where.severity = severity
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = dateFrom
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }

    // Fetch auth events as audit logs
    const [authEvents, total] = await Promise.all([
      prisma.authEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              clientId: true
            }
          }
        }
      }),
      prisma.authEvent.count({ where })
    ])

    // Transform to audit log format
    const logs = authEvents.map(event => ({
      id: event.id,
      timestamp: event.createdAt,
      userId: event.userId,
      userName: event.user?.name || event.user?.email || 'Unknown',
      action: event.eventType,
      resource: 'User',
      resourceId: event.userId,
      details: event.metadata || event.eventType,
      ipAddress: 'N/A', // Would need to store IP in AuthEvent
      userAgent: 'N/A', // Would need to store user agent
      severity: event.severity,
      status: event.eventType.includes('SUCCESS') || event.eventType.includes('VERIFIED') ? 'SUCCESS' :
              event.eventType.includes('FAILED') || event.eventType.includes('REJECTED') ? 'FAILED' : 'PENDING'
    }))

    console.log(`✅ [API-ADMIN-AUDIT] Found ${logs.length} audit logs (total: ${total})`)

    return NextResponse.json({
      logs,
      total,
      pages: Math.ceil(total / limit),
      page
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-AUDIT] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch audit logs" },
      { status: 500 }
    )
  }
}
