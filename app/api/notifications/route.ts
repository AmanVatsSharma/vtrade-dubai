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
    const { searchParams } = new URL(req.url)
    const queryUserId = searchParams.get('userId')
    
    // Get session for security (following orders/positions pattern)
    const session = await auth()
    if (!session?.user) {
      console.warn("⚠️ [API-NOTIFICATIONS] Unauthorized request - no session or user")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const sessionUserId = (session.user as any).id
    
    // Enhanced logging for debugging
    console.log("🔔 [API-NOTIFICATIONS] Session details:", {
      sessionUserId,
      queryUserId,
      userEmail: (session.user as any).email,
      userName: (session.user as any).name,
      hasSessionUserId: !!sessionUserId
    })

    if (!sessionUserId) {
      console.error("❌ [API-NOTIFICATIONS] userId is missing from session")
      return NextResponse.json({ error: "User ID not found in session" }, { status: 401 })
    }

    // Ensure user can only fetch their own notifications (security check - following orders pattern)
    if (queryUserId && queryUserId !== sessionUserId) {
      console.error("❌ [API-NOTIFICATIONS] Query userId doesn't match session userId", {
        queryUserId,
        sessionUserId
      })
      return NextResponse.json({ error: "Forbidden: Cannot access other user's notifications" }, { status: 403 })
    }

    // Use session userId for all queries (security first)
    const userId = sessionUserId
    
    // Query parameters
    const type = searchParams.get('type') // INFO, WARNING, ERROR, SUCCESS
    const priority = searchParams.get('priority') // LOW, MEDIUM, HIGH, URGENT
    const read = searchParams.get('read') // true, false, or null for all
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log("📋 [API-NOTIFICATIONS] Query params:", { type, priority, read, limit, offset, userId })

    // Build where clause - match admin route structure for consistency
    const where: any = {
      AND: [
        {
          OR: [
            { target: 'ALL' },
            { target: 'USERS' },
            { 
              AND: [
                { target: 'SPECIFIC' },
                { targetUserIds: { has: userId } }
              ]
            }
          ]
        },
        {
          OR: [
            { expiresAt: { gt: new Date() } },
            { expiresAt: null }
          ]
        }
      ]
    }

    // Add filters - append to AND array
    if (type) {
      where.AND.push({ type })
    }
    if (priority) {
      where.AND.push({ priority })
    }
    if (read !== null) {
      if (read === 'true') {
        where.AND.push({ readBy: { has: userId } })
      } else {
        where.AND.push({ readBy: { not: { has: userId } } })
      }
    }

    // Log the where clause for debugging
    console.log("🔍 [API-NOTIFICATIONS] Prisma where clause:", JSON.stringify(where, null, 2))

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

    console.log("📊 [API-NOTIFICATIONS] Raw notifications from DB:", {
      count: notifications.length,
      totalCount,
      notificationTargets: notifications.map(n => ({ id: n.id, target: n.target, targetUserIds: n.targetUserIds }))
    })

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
      read: Array.isArray(notif.readBy) ? notif.readBy.includes(userId) : false,
      createdBy: notif.createdByUser ? {
        id: notif.createdByUser.id,
        name: notif.createdByUser.name,
        email: notif.createdByUser.email
      } : null
    }))

    // Count unread - build separate where clause for unread count
    const unreadWhere = {
      ...where,
      AND: [
        ...where.AND,
        { readBy: { not: { has: userId } } }
      ]
    }

    const unreadCount = await prisma.notification.count({
      where: unreadWhere
    })

    console.log(`✅ [API-NOTIFICATIONS] Fetched ${formattedNotifications.length} notifications (${unreadCount} unread) for user ${userId}`)
    console.log("📋 [API-NOTIFICATIONS] Formatted notifications:", formattedNotifications.map(n => ({
      id: n.id,
      title: n.title,
      target: n.target,
      read: n.read
    })))

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
