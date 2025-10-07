"use client"

/**
 * Admin Console Header
 * 
 * Shows:
 * - Real admin user data from API
 * - Profile image
 * - Search functionality
 * - Notifications
 * - Quick actions
 */

import { motion } from "framer-motion"
import { Bell, Search, Settings, User, Moon, Sun, Menu, QrCode } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"

interface HeaderProps {
  onQRScannerOpen: () => void
  onMobileMenuToggle: () => void
}

interface AdminUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
  role: string
}

export function Header({ onQRScannerOpen, onMobileMenuToggle }: HeaderProps) {
  const [darkMode, setDarkMode] = useState(true)
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  console.log("🎯 [HEADER] Component rendered")

  /**
   * Fetch current admin user
   */
  const fetchAdminUser = async () => {
    console.log("📥 [HEADER] Fetching admin user data...")
    
    try {
      const response = await fetch('/api/admin/me')
      const data = await response.json()

      if (data.success && data.user) {
        console.log("✅ [HEADER] Admin user loaded:", data.user.email)
        setAdminUser(data.user)
      } else {
        console.error("❌ [HEADER] Failed to load admin user")
      }
    } catch (error: any) {
      console.error("❌ [HEADER] Error fetching admin user:", error)
      toast({
        title: "⚠️ Warning",
        description: "Failed to load user information",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdminUser()
  }, [])

  return (
    <motion.header
      className="glass-surface border-b border-border p-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Mobile Menu Button */}
          <Button variant="ghost" size="sm" className="md:hidden" onClick={onMobileMenuToggle}>
            <Menu className="w-4 h-4" />
          </Button>

          {/* Search - Hidden on small screens, shown on medium+ */}
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users, transactions, logs..."
              className="pl-10 bg-muted/50 border-border focus:border-primary"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="hidden md:flex" onClick={onQRScannerOpen}>
            <QrCode className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" className="sm:hidden">
            <Search className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" className="relative">
            <Bell className="w-4 h-4" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full"></span>
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          <Button variant="ghost" size="sm" className="hidden sm:flex">
            <Settings className="w-4 h-4" />
          </Button>

          {/* Admin User Profile */}
          <div className="flex items-center space-x-2 pl-2 border-l border-border">
            {loading ? (
              <div className="w-8 h-8 bg-primary/50 rounded-full animate-pulse"></div>
            ) : adminUser?.image ? (
              <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-primary/50">
                <Image 
                  src={adminUser.image} 
                  alt={adminUser.name || 'Admin'} 
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            <div className="text-sm hidden sm:block">
              <p className="font-medium">
                {loading ? 'Loading...' : adminUser?.name || adminUser?.email || 'Admin User'}
              </p>
              <p className="text-xs text-muted-foreground">
                {loading ? '...' : adminUser?.role === 'ADMIN' ? 'Super Admin' : 'Moderator'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  )
}
