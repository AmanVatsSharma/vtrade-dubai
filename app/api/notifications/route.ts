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
 * 
 * @description Robust notification fetching with comprehensive error handling
 * - Validates session and userId
 * - Handles edge cases gracefully
 * - Returns empty array on errors (non-blocking)
 * - Comprehensive logging for debugging
 */
export async function GET(req: Request) {
  console.log("🔔 [API-NOTIFICATIONS] GET request received", {
    timestamp: new Date().toISOString(),
    url: req.url
  })

  try {
    const { searchParams } = new URL(req.url)
    const queryUserId = searchParams.get('userId')
    
    // Get session for security (following orders/positions pattern)
    let session
    try {
      session = await auth()
    } catch (authError: any) {
      console.error("❌ [API-NOTIFICATIONS] Auth error:", {
        error: authError?.message,
        stack: authError?.stack
      })
      return NextResponse.json({ 
        error: "Authentication failed",
        notifications: [],
        unreadCount: 0
      }, { status: 401 })
    }

    if (!session?.user) {
      console.warn("⚠️ [API-NOTIFICATIONS] Unauthorized request - no session or user")
      return NextResponse.json({ 
        error: "Unauthorized",
        notifications: [],
        unreadCount: 0
      }, { status: 401 })
    }

    const sessionUserId = (session.user as any)?.id
    
    // Get user role for proper filtering
    const userRole = (session.user as any)?.role || 'USER'
    
    // Enhanced logging for debugging
    console.log("🔔 [API-NOTIFICATIONS] Session details:", {
      sessionUserId,
      queryUserId,
      userEmail: (session.user as any)?.email,
      userName: (session.user as any)?.name,
      userRole,
      hasSessionUserId: !!sessionUserId,
      sessionKeys: Object.keys(session.user || {})
    })

    if (!sessionUserId || typeof sessionUserId !== 'string' || sessionUserId.trim() === '') {
      console.error("❌ [API-NOTIFICATIONS] userId is missing or invalid from session", {
        sessionUserId,
        type: typeof sessionUserId,
        sessionUser: session.user
      })
      return NextResponse.json({ 
        error: "User ID not found in session",
        notifications: [],
        unreadCount: 0
      }, { status: 401 })
    }

    // Ensure user can only fetch their own notifications (security check - following orders pattern)
    if (queryUserId && queryUserId !== sessionUserId) {
      console.error("❌ [API-NOTIFICATIONS] Query userId doesn't match session userId", {
        queryUserId,
        sessionUserId
      })
      return NextResponse.json({ 
        error: "Forbidden: Cannot access other user's notifications",
        notifications: [],
        unreadCount: 0
      }, { status: 403 })
    }

    // Use session userId for all queries (security first)
    const userId = sessionUserId.trim()
    
    // Query parameters
    const type = searchParams.get('type') // INFO, WARNING, ERROR, SUCCESS
    const priority = searchParams.get('priority') // LOW, MEDIUM, HIGH, URGENT
    const read = searchParams.get('read') // true, false, or null for all
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log("📋 [API-NOTIFICATIONS] Query params:", { type, priority, read, limit, offset, userId, userRole })

    // Build where clause based on user role
    // Regular users see: ALL, USERS, SPECIFIC (where they're included)
    // Admins should use /api/admin/notifications, but if they use this endpoint, they also see ADMINS
    const targetConditions: any[] = [
      { target: 'ALL' },
      { target: 'USERS' },
      { 
        AND: [
          { target: 'SPECIFIC' },
          { targetUserIds: { has: userId } }
        ]
      }
    ]
    
    // If user is admin/moderator, also include ADMINS target
    // (though they should ideally use /api/admin/notifications)
    if (userRole === 'ADMIN' || userRole === 'MODERATOR' || userRole === 'SUPER_ADMIN') {
      targetConditions.push({ target: 'ADMINS' })
      console.log("🔔 [API-NOTIFICATIONS] User is admin, including ADMINS target")
    }

    // Build where clause - match admin route structure for consistency
    const where: any = {
      AND: [
        {
          OR: targetConditions
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

    // Fetch notifications with error handling
    let notifications = []
    let totalCount = 0
    
    try {
      const [notificationsResult, totalCountResult] = await Promise.all([
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
      
      notifications = notificationsResult || []
      totalCount = totalCountResult || 0
    } catch (dbError: any) {
      console.error("❌ [API-NOTIFICATIONS] Database error:", {
        error: dbError?.message,
        code: dbError?.code,
        meta: dbError?.meta,
        stack: dbError?.stack
      })
      
      // Return empty array instead of failing - non-blocking approach
      return NextResponse.json({
        notifications: [],
        pagination: {
          total: 0,
          limit,
          offset,
          hasMore: false
        },
        unreadCount: 0,
        error: "Failed to fetch notifications from database"
      }, { status: 200 }) // Return 200 with empty data to not break UI
    }

    console.log("📊 [API-NOTIFICATIONS] Raw notifications from DB:", {
      count: notifications.length,
      totalCount,
      userRole,
      userId,
      notificationTargets: notifications.map(n => ({ 
        id: n.id, 
        target: n.target, 
        targetUserIds: n.targetUserIds,
        isForUser: n.target === 'ALL' || 
                   n.target === 'USERS' || 
                   (n.target === 'ADMINS' && (userRole === 'ADMIN' || userRole === 'MODERATOR' || userRole === 'SUPER_ADMIN')) ||
                   (n.target === 'SPECIFIC' && n.targetUserIds.includes(userId))
      }))
    })

    // Format notifications and verify they're meant for this user
    const formattedNotifications = notifications
      .map(notif => {
        // Double-check that notification is meant for this user (security)
        const isForUser = 
          notif.target === 'ALL' ||
          notif.target === 'USERS' ||
          (notif.target === 'ADMINS' && (userRole === 'ADMIN' || userRole === 'MODERATOR' || userRole === 'SUPER_ADMIN')) ||
          (notif.target === 'SPECIFIC' && Array.isArray(notif.targetUserIds) && notif.targetUserIds.includes(userId))
        
        if (!isForUser) {
          console.warn("⚠️ [API-NOTIFICATIONS] Notification not meant for user, filtering out:", {
            notificationId: notif.id,
            target: notif.target,
            userRole,
            userId,
            targetUserIds: notif.targetUserIds
          })
          return null
        }
        
        return {
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
        }
      })
      .filter((n): n is NonNullable<typeof n> => n !== null) // Remove null entries

    // Count unread - build separate where clause for unread count
    let unreadCount = 0
    try {
      const unreadWhere = {
        ...where,
        AND: [
          ...where.AND,
          { readBy: { not: { has: userId } } }
        ]
      }

      unreadCount = await prisma.notification.count({
        where: unreadWhere
      })
    } catch (countError: any) {
      console.error("❌ [API-NOTIFICATIONS] Error counting unread:", {
        error: countError?.message,
        stack: countError?.stack
      })
      // Fallback: calculate from fetched notifications
      unreadCount = notifications.filter((n: any) => 
        !Array.isArray(n.readBy) || !n.readBy.includes(userId)
      ).length
    }

    console.log(`✅ [API-NOTIFICATIONS] Fetched ${formattedNotifications.length} notifications (${unreadCount} unread) for user ${userId} (role: ${userRole})`)
    console.log("📋 [API-NOTIFICATIONS] Formatted notifications:", formattedNotifications.map(n => ({
      id: n.id,
      title: n.title,
      target: n.target,
      read: n.read,
      isForUser: true // All filtered notifications are verified for this user
    })))
    
    // Security verification log
    const targetBreakdown = {
      ALL: formattedNotifications.filter(n => n.target === 'ALL').length,
      USERS: formattedNotifications.filter(n => n.target === 'USERS').length,
      ADMINS: formattedNotifications.filter(n => n.target === 'ADMINS').length,
      SPECIFIC: formattedNotifications.filter(n => n.target === 'SPECIFIC').length
    }
    console.log("🔒 [API-NOTIFICATIONS] Security verification - notification breakdown:", {
      userRole,
      userId,
      targetBreakdown,
      total: formattedNotifications.length
    })

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
    console.error("❌ [API-NOTIFICATIONS] GET error:", {
      error: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    })
    
    // Return non-blocking response - empty notifications instead of error
    return NextResponse.json({
      notifications: [],
      pagination: {
        total: 0,
        limit: 50,
        offset: 0,
        hasMore: false
      },
      unreadCount: 0,
      error: error?.message || "Failed to fetch notifications"
    }, { status: 200 }) // Return 200 to not break UI, but include error in response
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
