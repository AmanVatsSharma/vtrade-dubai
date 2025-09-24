"use client"

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

const menuItems = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "My Account", icon: CreditCard },
  { id: "statements", label: "Statements", icon: FileText },
  { id: "deposits", label: "Deposits", icon: ArrowDownToLine },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { id: "banks", label: "Bank Accounts", icon: Building2 },
]

interface SidebarMenuProps {
  activeSection?: string
  onSectionChange?: (section: string) => void
}

export function SidebarMenu({ activeSection = "account", onSectionChange }: SidebarMenuProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full">
      {/* Logo/Brand */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">Trading Console</h1>
            <p className="text-xs text-muted-foreground">Professional Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <motion.div key={item.id} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-11 text-left font-medium",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                  onClick={() => onSectionChange?.(item.id)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {hoveredItem === item.id && (
                    <motion.div
                      layoutId="sidebar-hover"
                      className="absolute inset-0 bg-sidebar-accent/10 rounded-md -z-10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                  )}
                </Button>
              </motion.div>
            )
          })}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </Button>
      </div>
    </div>
  )
}
