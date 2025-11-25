/**
 * @file route.ts
 * @module admin-console
 * @description API route for notification management
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-NOTIFICATIONS] GET request received")

  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id

    // Fetch notifications - filter by target audience
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { target: 'ALL' },
          { target: 'ADMINS' },
          { target: 'SPECIFIC', targetUserIds: { has: userId } }
        ],
        expiresAt: {
          OR: [
            { gt: new Date() },
            { equals: null }
          ]
        }
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    })

    const formattedNotifications = notifications.map(notif => ({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      priority: notif.priority,
      target: notif.target,
      createdAt: notif.createdAt,
      expiresAt: notif.expiresAt,
      read: notif.readBy.includes(userId)
    }))

    console.log("✅ [API-ADMIN-NOTIFICATIONS] Notifications fetched:", formattedNotifications.length)

    return NextResponse.json({ notifications: formattedNotifications }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-NOTIFICATIONS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  console.log("🌐 [API-ADMIN-NOTIFICATIONS] POST request received")

  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { title, message, type, priority, target, targetUserIds, expiresAt } = body
    const userId = (session.user as any).id

    // Create notification in database
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type: type || 'INFO',
        priority: priority || 'MEDIUM',
        target: target || 'ALL',
        targetUserIds: targetUserIds || [],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: userId
      }
    })

    console.log("✅ [API-ADMIN-NOTIFICATIONS] Notification created:", notification.id)

    return NextResponse.json({
      success: true,
      message: "Notification created successfully",
      notification: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        target: notification.target
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-NOTIFICATIONS] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create notification" },
      { status: 500 }
    )
  }
}
