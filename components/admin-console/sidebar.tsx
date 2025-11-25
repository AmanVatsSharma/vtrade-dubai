"use client"

import { motion } from "framer-motion"
import { LayoutDashboard, Users, Wallet, Terminal, ChevronLeft, ChevronRight, Activity, Database, Settings, BarChart3, Eraser, Boxes, ListOrdered, Shield, TrendingUp, FileText, Bell, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (open: boolean) => void
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "User Management", icon: Users },
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
  // Read role from localStorage/session via window (client-only sidebar)
  let role: string | null = null
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('session_user_role')
      role = raw || null
    } catch {}
  }

  const computedMenu = [...menuItems]
  if (role === 'SUPER_ADMIN') {
    computedMenu.splice(3, 0, { id: 'financial-overview', label: 'Financial Overview', icon: Wallet })
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
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center space-x-2"
              >
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Activity className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-primary">TradePro</h1>
                  <p className="text-xs text-muted-foreground">Admin Console</p>
                </div>
              </motion.div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="p-1 h-8 w-8">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1">
          {computedMenu.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <motion.button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id)
                  setMobileMenuOpen(false)
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20 neon-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </motion.button>
            )
          })}
        </nav>

        {/* System Status */}
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bottom-4 left-4 right-4">
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">System Status</span>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full pulse-glow"></div>
                  <span className="text-primary">Online</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Database</span>
                <div className="flex items-center space-x-1">
                  <Database className="w-3 h-3 text-primary" />
                  <span className="text-primary">Connected</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </>
  )
}
