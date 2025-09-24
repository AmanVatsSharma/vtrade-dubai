"use client"

import type React from "react"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SidebarMenu } from "./sidebar-menu"
import { Topbar } from "./topbar"

interface ConsoleLayoutProps {
  children: React.ReactNode
  activeSection?: string
  onNavigateSection?: (section: string) => void
}

export function ConsoleLayout({ children, activeSection, onNavigateSection }: ConsoleLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Drawer (inner sidebar) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <button
              aria-label="Close navigation"
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 bg-black/40"
            />
            {/* Drawer panel */}
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              role="dialog"
              aria-modal="true"
              className="relative z-50 h-full w-72 bg-sidebar border-r border-sidebar-border"
            >
              <SidebarMenu
                activeSection={activeSection}
                onSectionChange={(section) => {
                  onNavigateSection?.(section)
                  setSidebarOpen(false)
                }}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-background p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
