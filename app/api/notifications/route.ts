/**
 * File: app/api/notifications/route.ts
 * Module: notifications
 * Purpose: API endpoint for user notifications - fetch, mark as read/unread
 * Author: BharatERP
 * Last-updated: 2025-01-27
 * Notes:
 * - Handles user-specific notifications (not admin notifications)
 * - Supports filtering by type, priority, read status
 * - Real-time updates via polling
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/notifications
 * Fetch user notifications with filters
 */
export async function GET(req: Request) {
  console.log("🔔 [API-NOTIFICATIONS] GET request received")

  try {
    const session = await auth()
    if (!session?.user) {
      console.warn("⚠️ [API-NOTIFICATIONS] Unauthorized request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const { searchParams } = new URL(req.url)
    
    // Query parameters
    const type = searchParams.get('type') // INFO, WARNING, ERROR, SUCCESS
    const priority = searchParams.get('priority') // LOW, MEDIUM, HIGH, URGENT
    const read = searchParams.get('read') // true, false, or null for all
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log("📋 [API-NOTIFICATIONS] Query params:", { type, priority, read, limit, offset })

    // Build where clause
    const where: any = {
      OR: [
        { target: 'ALL' },
        { target: 'USERS' },
        { target: 'SPECIFIC', targetUserIds: { has: userId } }
      ],
      expiresAt: {
        OR: [
          { gt: new Date() },
          { equals: null }
        ]
      }
    }

    // Add filters
    if (type) where.type = type
    if (priority) where.priority = priority
    if (read !== null) {
      if (read === 'true') {
        where.readBy = { has: userId }
      } else {
        where.readBy = { not: { has: userId } }
      }
    }

    // Fetch notifications
    const [notifications, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where,
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
        take: limit,
        skip: offset
      }),
      prisma.notification.count({ where })
    ])

    // Format notifications
    const formattedNotifications = notifications.map(notif => ({
      id: notif.id,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      priority: notif.priority,
      target: notif.target,
      createdAt: notif.createdAt.toISOString(),
      expiresAt: notif.expiresAt?.toISOString() || null,
      read: notif.readBy.includes(userId),
      createdBy: notif.createdByUser ? {
        id: notif.createdByUser.id,
        name: notif.createdByUser.name,
        email: notif.createdByUser.email
      } : null
    }))

    // Count unread
    const unreadCount = await prisma.notification.count({
      where: {
        ...where,
        readBy: { not: { has: userId } }
      }
    })

    console.log(`✅ [API-NOTIFICATIONS] Fetched ${formattedNotifications.length} notifications (${unreadCount} unread)`)

    return NextResponse.json({
      notifications: formattedNotifications,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      },
      unreadCount
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-NOTIFICATIONS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/notifications
 * Mark notifications as read/unread
 */
export async function PATCH(req: Request) {
  console.log("🔔 [API-NOTIFICATIONS] PATCH request received")

  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await req.json()
    const { notificationIds, read } = body

    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: "notificationIds array is required" },
        { status: 400 }
      )
    }

    if (typeof read !== 'boolean') {
      return NextResponse.json(
        { error: "read boolean is required" },
        { status: 400 }
      )
    }

    console.log(`📝 [API-NOTIFICATIONS] Marking ${notificationIds.length} notifications as ${read ? 'read' : 'unread'}`)

    // Update each notification
    const updates = await Promise.all(
      notificationIds.map(async (notificationId: string) => {
        // Get current notification
        const notification = await prisma.notification.findUnique({
          where: { id: notificationId }
        })

        if (!notification) {
          return null
        }

        // Check if user should have access to this notification
        const hasAccess = 
          notification.target === 'ALL' ||
          notification.target === 'USERS' ||
          (notification.target === 'SPECIFIC' && notification.targetUserIds.includes(userId))

        if (!hasAccess) {
          return null
        }

        // Update readBy array
        let updatedReadBy = [...notification.readBy]
        
        if (read) {
          // Mark as read - add userId if not present
          if (!updatedReadBy.includes(userId)) {
            updatedReadBy.push(userId)
          }
        } else {
          // Mark as unread - remove userId
          updatedReadBy = updatedReadBy.filter(id => id !== userId)
        }

        // Update notification
        return await prisma.notification.update({
          where: { id: notificationId },
          data: { readBy: updatedReadBy }
        })
      })
    )

    const successfulUpdates = updates.filter(Boolean).length

    console.log(`✅ [API-NOTIFICATIONS] Updated ${successfulUpdates} notifications`)

    return NextResponse.json({
      success: true,
      updated: successfulUpdates,
      message: `Marked ${successfulUpdates} notification(s) as ${read ? 'read' : 'unread'}`
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-NOTIFICATIONS] PATCH error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update notifications" },
      { status: 500 }
    )
  }
}
