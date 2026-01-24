/**
 * File: components/notifications/NotificationBell.tsx
 * Module: notifications
 * Purpose: Notification bell component with badge and dropdown panel
 * Author: BharatERP
 * Last-updated: 2025-01-27
 * Notes:
 * - Shows unread count badge
 * - Opens notification center on click
 * - Real-time updates via polling
 */

"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { NotificationCenter } from "./NotificationCenter"
import { useNotifications } from "@/lib/hooks/use-notifications"

interface NotificationBellProps {
  userId?: string | null
  className?: string
}

export function NotificationBell({ userId, className }: NotificationBellProps) {
  console.log("🔔 [NOTIFICATION-BELL] Component rendered with userId:", userId, {
    hasUserId: !!userId,
    userIdType: typeof userId,
    userIdValue: userId,
    timestamp: new Date().toISOString()
  })
  
  const [isOpen, setIsOpen] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  
  // Use hook with userId (will be undefined/null if not provided)
  const { unreadCount, isLoading, error, notifications, refresh } = useNotifications(userId)

  // Log bell state for debugging
  useEffect(() => {
    console.log("🔔 [NOTIFICATION-BELL] State updated:", {
      userId,
      hasUserId: !!userId,
      unreadCount,
      isLoading,
      isOpen,
      error: error?.message,
      errorDetails: error,
      notificationsCount: notifications.length,
      hasError: !!error,
      retryCount
    })
    
    // Log error details if present
    if (error) {
      console.error("🔔 [NOTIFICATION-BELL] Error fetching notifications:", {
        message: error.message,
        stack: error.stack,
        userId,
        retryCount
      })
      
      // Auto-retry on error (up to 3 times)
      if (retryCount < 3 && !isLoading) {
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 10000) // Exponential backoff, max 10s
        console.log(`🔔 [NOTIFICATION-BELL] Scheduling retry ${retryCount + 1} in ${retryDelay}ms`)
        
        const timeoutId = setTimeout(() => {
          console.log(`🔔 [NOTIFICATION-BELL] Executing retry ${retryCount + 1}`)
          setRetryCount(prev => prev + 1)
          refresh().catch(err => {
            console.error("🔔 [NOTIFICATION-BELL] Retry failed:", err)
          })
        }, retryDelay)
        
        return () => clearTimeout(timeoutId)
      }
    } else if (retryCount > 0) {
      // Reset retry count on success
      console.log("🔔 [NOTIFICATION-BELL] Error resolved, resetting retry count")
      setRetryCount(0)
    }
  }, [userId, unreadCount, isLoading, isOpen, error, notifications, retryCount, refresh])

  const handleToggle = useCallback(() => {
    console.log("🔔 [NOTIFICATION-BELL] Toggle clicked, current state:", isOpen)
    setIsOpen(prev => !prev)
  }, [isOpen])

  const handleClose = useCallback(() => {
    console.log("🔔 [NOTIFICATION-BELL] Close clicked")
    setIsOpen(false)
  }, [])

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className={cn(
          "relative h-9 w-9 transition-all duration-200",
          "hover:bg-muted/50",
          isOpen && "bg-muted"
        )}
        aria-label="Notifications"
      >
        <Bell className={cn(
          "h-5 w-5 transition-all duration-200",
          isOpen && "text-primary"
        )} />
        
        {/* Unread Badge */}
        {!isLoading && unreadCount > 0 && (
          <span className={cn(
            "absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full",
            "bg-red-500 text-white text-[10px] font-bold",
            "flex items-center justify-center px-1",
            "animate-pulse shadow-lg shadow-red-500/50",
            "border-2 border-background"
          )}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* Error indicator - show only if persistent error after retries */}
        {error && !isLoading && retryCount >= 3 && (
          <span 
            className={cn(
              "absolute -top-1 -right-1 min-w-[8px] h-[8px] rounded-full",
              "bg-yellow-500 border-2 border-background animate-pulse"
            )} 
            title={`Error: ${error.message}. Click to retry.`}
            onClick={(e) => {
              e.stopPropagation()
              setRetryCount(0)
              refresh()
            }}
          />
        )}
        
        {/* Retrying indicator */}
        {error && isLoading && retryCount > 0 && retryCount < 3 && (
          <span className={cn(
            "absolute -top-1 -right-1 min-w-[8px] h-[8px] rounded-full",
            "bg-blue-500 border-2 border-background animate-pulse"
          )} title="Retrying..." />
        )}
      </Button>

      {/* Notification Center Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50">
          <NotificationCenter 
            userId={userId}
            onClose={handleClose}
          />
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}
    </div>
  )
}
