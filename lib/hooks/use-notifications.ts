/**
 * File: lib/hooks/use-notifications.ts
 * Module: notifications
 * Purpose: React hook for managing user notifications with real-time updates
 * Author: BharatERP
 * Last-updated: 2025-01-27
 * Notes:
 * - Uses SWR for caching and real-time updates
 * - Auto-refreshes every 30 seconds
 * - Provides mark as read/unread functionality
 */

"use client"

import { useState, useCallback, useEffect } from "react"
import useSWR from "swr"
import { toast } from "@/hooks/use-toast"

export interface Notification {
  id: string
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  target: string
  createdAt: string
  expiresAt: string | null
  read: boolean
  createdBy: {
    id: string
    name: string | null
    email: string | null
  } | null
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  error: Error | undefined
  refresh: () => Promise<void>
  markAsRead: (notificationIds: string[]) => Promise<void>
  markAsUnread: (notificationIds: string[]) => Promise<void>
}

const fetcher = async (url: string) => {
  console.log("🔔 [USE-NOTIFICATIONS] Fetching notifications from:", url)
  try {
    const response = await fetch(url)
    console.log("🔔 [USE-NOTIFICATIONS] Response status:", response.status, response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error("🔔 [USE-NOTIFICATIONS] Error response:", errorText)
      throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log("🔔 [USE-NOTIFICATIONS] Fetched data:", {
      notificationsCount: data.notifications?.length || 0,
      unreadCount: data.unreadCount || 0,
      hasNotifications: !!data.notifications
    })
    return data
  } catch (error: any) {
    console.error("🔔 [USE-NOTIFICATIONS] Fetcher error:", error)
    throw error
  }
}

export function useNotifications(userId: string): UseNotificationsReturn {
  console.log("🔔 [USE-NOTIFICATIONS] Hook called with userId:", userId)
  const [isPolling, setIsPolling] = useState(true)

  // Validate userId
  if (!userId || userId.trim() === '') {
    console.warn("🔔 [USE-NOTIFICATIONS] Invalid userId provided:", userId)
  }

  const { data, error, isLoading, mutate } = useSWR(
    userId ? '/api/notifications' : null,
    fetcher,
    {
      refreshInterval: isPolling ? 30000 : 0, // Poll every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      onError: (error) => {
        console.error("🔔 [USE-NOTIFICATIONS] SWR error:", error)
      },
      onSuccess: (data) => {
        console.log("🔔 [USE-NOTIFICATIONS] SWR success:", {
          notificationsCount: data?.notifications?.length || 0,
          unreadCount: data?.unreadCount || 0
        })
      }
    }
  )

  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds,
          read: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read')
      }

      // Optimistically update the cache
      await mutate((current: any) => {
        if (!current) return current

        return {
          ...current,
          notifications: current.notifications.map((n: Notification) =>
            notificationIds.includes(n.id) ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, current.unreadCount - notificationIds.length),
        }
      }, false) // Don't revalidate immediately

      // Revalidate in background
      await mutate()
    } catch (error: any) {
      console.error('Failed to mark as read:', error)
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      })
    }
  }, [mutate])

  const markAsUnread = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notificationIds,
          read: false,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark notifications as unread')
      }

      // Optimistically update the cache
      await mutate((current: any) => {
        if (!current) return current

        return {
          ...current,
          notifications: current.notifications.map((n: Notification) =>
            notificationIds.includes(n.id) ? { ...n, read: false } : n
          ),
          unreadCount: current.unreadCount + notificationIds.length,
        }
      }, false) // Don't revalidate immediately

      // Revalidate in background
      await mutate()
    } catch (error: any) {
      console.error('Failed to mark as unread:', error)
      toast({
        title: "Error",
        description: "Failed to mark notifications as unread",
        variant: "destructive",
      })
    }
  }, [mutate])

  // Pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPolling(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return {
    notifications: data?.notifications || [],
    unreadCount: data?.unreadCount || 0,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAsUnread,
  }
}
