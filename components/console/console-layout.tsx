"use client"

/**
 * Console Layout Component
 * 
 * Optimized for both mobile and desktop with:
 * - Mobile-first responsive design
 * - Touch-friendly interactions
 * - Smooth animations
 * - Proper z-index management
 */

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { SidebarMenu } from "./sidebar-menu"
import { Topbar } from "./topbar"

interface ConsoleLayoutProps {
  children: React.ReactNode
  activeSection?: string
  onNavigateSection?: (section: string) => void
}

export function ConsoleLayout({ children, activeSection, onNavigateSection }: ConsoleLayoutProps) {
  // Sidebar is closed by default on mobile for better UX
  const [sidebarOpen, setSidebarOpen] = useState(false)

  console.log('🎨 [CONSOLE-LAYOUT] Rendering with:', { activeSection, sidebarOpen })

  // Close sidebar on mobile when section changes
  useEffect(() => {
    console.log('📱 [CONSOLE-LAYOUT] Section changed, closing mobile sidebar')
    setSidebarOpen(false)
  }, [activeSection])

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      console.log('🔒 [CONSOLE-LAYOUT] Locking body scroll')
      document.body.style.overflow = 'hidden'
    } else {
      console.log('🔓 [CONSOLE-LAYOUT] Unlocking body scroll')
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [sidebarOpen])

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile Drawer Sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop - closes sidebar on click */}
            <motion.button
              aria-label="Close navigation"
              onClick={() => {
                console.log('👆 [CONSOLE-LAYOUT] Backdrop clicked, closing sidebar')
                setSidebarOpen(false)
              }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            
            {/* Drawer Panel */}
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ 
                type: "spring",
                damping: 25,
                stiffness: 300
              }}
              role="dialog"
              aria-modal="true"
              className="relative z-50 h-full w-80 max-w-[85vw] bg-card border-r border-border shadow-2xl"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
              <SidebarMenu
                activeSection={activeSection}
                onSectionChange={(section) => {
                  console.log('📍 [CONSOLE-LAYOUT] Section changed to:', section)
                  onNavigateSection?.(section)
                  setSidebarOpen(false)
                }}
              />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden w-full">
        {/* Topbar - sticky on mobile for easy access */}
        <Topbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Main Content - optimized scrolling for mobile */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto w-full"
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}
