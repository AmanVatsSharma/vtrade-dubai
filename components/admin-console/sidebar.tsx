/**
 * @file sidebar.tsx
 * @module admin-console
 * @description Sidebar navigation component for admin console
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { motion } from "framer-motion"
import { LayoutDashboard, Users, Wallet, Terminal, ChevronLeft, ChevronRight, Activity, Database, Settings, BarChart3, Eraser, Boxes, ListOrdered, Shield, TrendingUp, FileText, Bell, DollarSign, UserCheck, KeyRound, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAdminSession } from "@/components/admin-console/admin-session-provider"

interface SidebarProps {
  activeTab: string
  setActiveTab?: (tab: string) => void // Optional now since we use Link
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "User Management", icon: Users },
  { id: "kyc", label: "KYC Queue", icon: ShieldCheck },
  { id: "rms", label: "RM & Team", icon: UserCheck },
  { id: "funds", label: "Fund Management", icon: Wallet },
  { id: "analytics", label: "Analytics", icon: TrendingUp },
  { id: "audit", label: "Audit Trail", icon: FileText },
  { id: "risk", label: "Risk Management", icon: Shield },
  { id: "system-health", label: "System Health", icon: Activity },
  { id: "financial-reports", label: "Financial Reports", icon: DollarSign },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "advanced", label: "Advanced (Trades)", icon: BarChart3 },
  { id: "positions", label: "Positions", icon: Boxes },
  { id: "orders", label: "Orders", icon: ListOrdered },
  { id: "cleanup", label: "Cleanup", icon: Eraser },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "logs", label: "Logs & Terminal", icon: Terminal },
  // Super Admin items will be conditionally appended in component based on role
]

export function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileMenuOpen,
  setMobileMenuOpen,
}: SidebarProps) {
  const pathname = usePathname()
  const { user, permissions } = useAdminSession()
  const role = user?.role ?? null

  // Map menu item IDs to routes
  const getRoute = (id: string) => {
    if (id === 'dashboard') return '/admin-console'
    return `/admin-console/${id}`
  }

  const computedMenu = [...menuItems]
  if (role === 'SUPER_ADMIN') {
    computedMenu.splice(3, 0, { id: 'financial-overview', label: 'Financial Overview', icon: Wallet })
  }
  const canViewAccessControl =
    permissions.includes("admin.access-control.view") || permissions.includes("admin.all")
  if (canViewAccessControl) {
    const settingsIndex = computedMenu.findIndex((item) => item.id === "settings")
    const accessControlItem = { id: "access-control", label: "Access Control", icon: KeyRound }
    if (settingsIndex >= 0) {
      computedMenu.splice(settingsIndex, 0, accessControlItem)
    } else {
      computedMenu.push(accessControlItem)
    }
  }
  return (
    <>
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <motion.div
        className={`fixed left-0 top-0 h-full glass-surface border-r border-border z-50 transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        } ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
        initial={false}
        animate={{
          width: collapsed ? 64 : 256,
        }}
      >
        {/* Header */}
        <div className="p-2 sm:p-3 md:p-4 border-b border-border">
          <div className="flex items-center justify-between gap-2">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center space-x-2 min-w-0 flex-1"
              >
                <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base md:text-lg font-bold text-primary truncate">TradePro</h1>
                  <p className="text-xs text-muted-foreground truncate">Admin Console</p>
                </div>
              </motion.div>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCollapsed(!collapsed)} 
              className="p-1 h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 touch-manipulation"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" /> : <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-1 sm:p-2 space-y-1 overflow-y-auto flex-1">
          {computedMenu.map((item) => {
            const Icon = item.icon
            const route = getRoute(item.id)
            const isActive = pathname === route || (item.id === 'dashboard' && pathname === '/admin-console')

            return (
              <Link
                key={item.id}
                href={route}
                onClick={() => {
                  setMobileMenuOpen(false)
                }}
              >
                <motion.div
                  className={`w-full flex items-center space-x-2 sm:space-x-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-left transition-all duration-200 touch-manipulation cursor-pointer ${
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20 neon-border"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label={item.label}
                >
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="font-medium text-xs sm:text-sm truncate flex-1"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </motion.div>
              </Link>
            )
          })}
        </nav>

        {/* System Status */}
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4">
            <div className="bg-muted/50 rounded-lg p-2 sm:p-3 space-y-1.5 sm:space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate pr-2">System Status</span>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <div className="w-2 h-2 bg-primary rounded-full pulse-glow"></div>
                  <span className="text-primary whitespace-nowrap">Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate pr-2">Database</span>
                <div className="flex items-center space-x-1 flex-shrink-0">
                  <Database className="w-3 h-3 text-primary" />
                  <span className="text-primary whitespace-nowrap">Connected</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </>
  )
}
