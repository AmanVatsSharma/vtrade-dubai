/**
 * @file header.tsx
 * @module admin-console
 * @description Admin Console Header component with user profile, search, and notifications
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { motion } from "framer-motion"
import { Bell, Search, Settings, User, Moon, Sun, Menu, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect, useState } from "react"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"
import { AdminNotificationBell } from "./admin-notification-bell"
import { useAdminSession } from "@/components/admin-console/admin-session-provider"

interface HeaderProps {
  onQRScannerOpen: () => void
  onMobileMenuToggle: () => void
}

export function Header({ onQRScannerOpen, onMobileMenuToggle }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(true)
  const { user: adminUser, loading, error } = useAdminSession()

  // Surface session load errors in a user-friendly way.
  useEffect(() => {
    if (!error) return
    toast({
      title: "⚠️ Warning",
      description: error,
      variant: "destructive",
    })
  }, [error])

  return (
    <motion.header
      className="glass-surface border-b border-border p-2 sm:p-3 md:p-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
          {/* Mobile Menu Button */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden flex-shrink-0 touch-manipulation" 
            onClick={onMobileMenuToggle}
            aria-label="Toggle mobile menu"
          >
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>

          {/* Search - Hidden on small screens, shown on medium+ */}
          <div className="relative flex-1 max-w-md hidden sm:block min-w-0">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users, transactions, logs..."
              className="pl-8 sm:pl-10 bg-muted/50 border-border focus:border-primary text-sm"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <Button 
            variant="ghost" 
            size="sm" 
            className="hidden md:flex touch-manipulation" 
            onClick={onQRScannerOpen}
            aria-label="Open QR Scanner"
          >
            <QrCode className="w-4 h-4" />
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className="sm:hidden touch-manipulation"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </Button>

          <AdminNotificationBell />

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDarkMode(!darkMode)}
            className="touch-manipulation"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button 
            variant="ghost" 
            size="sm" 
            className="hidden sm:flex touch-manipulation"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>

          {/* Admin User Profile */}
          <div className="flex items-center space-x-1 sm:space-x-2 pl-1 sm:pl-2 border-l border-border">
            {loading ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/50 rounded-full animate-pulse flex-shrink-0"></div>
            ) : adminUser?.image ? (
              <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border-2 border-primary/50 flex-shrink-0">
                <Image 
                  src={adminUser.image} 
                  alt={adminUser.name || 'Admin'} 
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-3 h-3 sm:w-4 sm:h-4 text-primary-foreground" />
              </div>
            )}
            <div className="text-xs sm:text-sm hidden sm:block min-w-0">
              <p className="font-medium truncate max-w-[120px] lg:max-w-none">
                {loading ? 'Loading...' : adminUser?.name || adminUser?.email || 'Admin User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {loading
                  ? '...'
                  : adminUser?.role === 'SUPER_ADMIN'
                    ? 'Super Admin'
                    : adminUser?.role === 'ADMIN'
                      ? 'Admin'
                      : 'Moderator'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
