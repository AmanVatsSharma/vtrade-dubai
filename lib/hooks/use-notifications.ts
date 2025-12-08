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
  console.log("🔔 [USE-NOTIFICATIONS] Fetching notifications from:", url, {
    timestamp: new Date().toISOString()
  })
  
  let lastError: Error | null = null
  
  // Retry mechanism - try up to 3 times
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      
      console.log("🔔 [USE-NOTIFICATIONS] Response status:", response.status, response.statusText, {
        attempt,
        url
      })
      
      if (!response.ok) {
        // For 401/403, don't retry - it's an auth issue
        if (response.status === 401 || response.status === 403) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error("🔔 [USE-NOTIFICATIONS] Auth error (no retry):", errorText)
          throw new Error(`Authentication failed: ${response.status} ${response.statusText}`)
        }
        
        // For other errors, retry
        const errorText = await response.text().catch(() => 'Unknown error')
        lastError = new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`)
        console.warn(`🔔 [USE-NOTIFICATIONS] Attempt ${attempt} failed:`, errorText)
        
        if (attempt < 3) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000))
          continue
        }
        
        throw lastError
      }
      
      const data = await response.json()
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format')
      }
      
      // Ensure notifications is an array
      const notifications = Array.isArray(data.notifications) ? data.notifications : []
      const unreadCount = typeof data.unreadCount === 'number' ? data.unreadCount : 0
      
      console.log("🔔 [USE-NOTIFICATIONS] Fetched data successfully:", {
        notificationsCount: notifications.length,
        unreadCount,
        hasNotifications: notifications.length > 0,
        attempt,
        hasError: !!data.error
      })
      
      // Return normalized data
      return {
        notifications,
        unreadCount,
        pagination: data.pagination || {
          total: notifications.length,
          limit: 50,
          offset: 0,
          hasMore: false
        },
        error: data.error || null
      }
    } catch (error: any) {
      lastError = error
      
      // Don't retry on abort (timeout) or auth errors
      if (error.name === 'AbortError' || error.message?.includes('Authentication failed')) {
        console.error("🔔 [USE-NOTIFICATIONS] Non-retryable error:", error.message)
        throw error
      }
      
      console.warn(`🔔 [USE-NOTIFICATIONS] Attempt ${attempt} error:`, {
        error: error.message,
        name: error.name,
        willRetry: attempt < 3
      })
      
      // If last attempt, throw the error
      if (attempt === 3) {
        console.error("🔔 [USE-NOTIFICATIONS] All retry attempts failed")
        throw lastError
      }
      
      // Exponential backoff before retry
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000))
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Failed to fetch notifications after retries')
}

export function useNotifications(userId: string | undefined | null): UseNotificationsReturn {
  console.log("🔔 [USE-NOTIFICATIONS] Hook called with userId:", userId, {
    hasUserId: !!userId,
    userIdType: typeof userId,
    userIdLength: userId?.length
  })
  const [isPolling, setIsPolling] = useState(true)

  // Validate userId
  if (!userId || userId.trim() === '') {
    console.warn("🔔 [USE-NOTIFICATIONS] Invalid userId provided:", userId)
    console.warn("🔔 [USE-NOTIFICATIONS] Hook will not fetch notifications without valid userId")
  }

  // Follow the same pattern as orders/positions - pass userId as query param for proper SWR caching
  const { data, error, isLoading, mutate } = useSWR(
    userId && userId.trim() !== '' ? `/api/notifications?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: isPolling ? 30000 : 0, // Poll every 30 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      onError: (error) => {
        console.error("🔔 [USE-NOTIFICATIONS] SWR error:", {
          error: error.message,
          stack: error.stack,
          userId
        })
      },
      onSuccess: (data) => {
        console.log("🔔 [USE-NOTIFICATIONS] SWR success:", {
          notificationsCount: data?.notifications?.length || 0,
          unreadCount: data?.unreadCount || 0,
          userId,
          hasNotifications: !!data?.notifications,
          notifications: data?.notifications?.map((n: Notification) => ({
            id: n.id,
            title: n.title,
            target: n.target,
            read: n.read
          }))
        })
      }
    }
  )

  const refresh = useCallback(async () => {
    await mutate()
  }, [mutate])

  const markAsRead = useCallback(async (notificationIds: string[]) => {
    console.log("🔔 [USE-NOTIFICATIONS] Marking notifications as read:", notificationIds)
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
    console.log("🔔 [USE-NOTIFICATIONS] Marking notifications as unread:", notificationIds)
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

  // Normalize return values - ensure arrays and numbers are always valid
  const notifications = Array.isArray(data?.notifications) ? data.notifications : []
  const unreadCount = typeof data?.unreadCount === 'number' ? data.unreadCount : 0
  
  // Log final state for debugging
  useEffect(() => {
    if (!isLoading && data) {
      console.log("🔔 [USE-NOTIFICATIONS] Final state:", {
        notificationsCount: notifications.length,
        unreadCount,
        hasError: !!error,
        errorMessage: error?.message,
        userId
      })
    }
  }, [isLoading, data, notifications.length, unreadCount, error, userId])

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAsUnread,
  }
}
