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
  userId: string
  className?: string
}

export function NotificationBell({ userId, className }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { unreadCount, isLoading } = useNotifications(userId)

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const handleClose = useCallback(() => {
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
