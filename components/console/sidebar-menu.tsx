"use client"

/**
 * Sidebar Menu Component
 * 
 * Optimized for mobile with:
 * - Touch-friendly buttons (larger hit areas)
 * - Smooth animations
 * - Visual feedback on interaction
 * - Proper spacing for mobile screens
 */

import { useState } from "react"
import { motion } from "framer-motion"
import {
  User,
  CreditCard,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  LogOut,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { signOut } from "next-auth/react"

const menuItems = [
  { id: "profile", label: "Profile", icon: User, description: "Personal info" },
  { id: "account", label: "My Account", icon: CreditCard, description: "View balance" },
  { id: "statements", label: "Statements", icon: FileText, description: "Transaction history" },
  { id: "deposits", label: "Deposits", icon: ArrowDownToLine, description: "Add funds" },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpFromLine, description: "Withdraw funds" },
  { id: "banks", label: "Bank Accounts", icon: Building2, description: "Manage banks" },
]

interface SidebarMenuProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function SidebarMenu({ activeSection = "account", onSectionChange }: SidebarMenuProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  console.log('📱 [SIDEBAR-MENU] Rendering with activeSection:', activeSection)

  const handleLogout = async () => {
    console.log('🚪 [SIDEBAR-MENU] User logging out')
    await signOut({ callbackUrl: '/' })
  }

  const handleSectionChange = (sectionId: string) => {
    console.log('📍 [SIDEBAR-MENU] Section changing to:', sectionId)
    onSectionChange?.(sectionId)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Logo/Brand */}
      <div className="p-4 sm:p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-foreground text-sm sm:text-base truncate">
              Trading Console
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Professional Dashboard
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 sm:p-4 overflow-y-auto">
        <div className="space-y-1.5 sm:space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <motion.div 
                key={item.id} 
                whileHover={{ x: 4 }} 
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-12 sm:h-11 text-left font-medium transition-all",
                    "touch-manipulation", // Better touch response on mobile
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  onClick={() => handleSectionChange(item.id)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <div className="flex flex-col items-start min-w-0 flex-1">
                    <span className="text-sm sm:text-base truncate w-full">{item.label}</span>
                    <span className="text-xs text-muted-foreground truncate w-full hidden sm:block">
                      {item.description}
                    </span>
                  </div>
                  {hoveredItem === item.id && !isActive && (
                    <motion.div
                      layoutId="sidebar-hover"
                      className="absolute inset-0 bg-accent/50 rounded-md -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    />
                  )}
                </Button>
              </motion.div>
            )
          })}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-3 sm:p-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 h-12 sm:h-11 text-destructive hover:bg-destructive/10 hover:text-destructive transition-all touch-manipulation"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm sm:text-base">Logout</span>
        </Button>
      </div>
    </div>
  )
}
