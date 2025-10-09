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

import { useEffect } from "react"
import { motion } from "framer-motion"
import { SidebarMenu } from "./sidebar-menu"
import { Topbar } from "./topbar"
import { Sidebar, MobileSidebar, useSidebar } from "@/components/ui/sidebar"

interface ConsoleLayoutProps {
  children: React.ReactNode
  activeSection?: string
  onNavigateSection?: (section: string) => void
}

export function ConsoleLayout({ children, activeSection, onNavigateSection }: ConsoleLayoutProps) {
  console.log('🎨 [CONSOLE-LAYOUT] Rendering with:', { activeSection })

  // Body scroll lock synced with shared Sidebar context
  const SidebarEffects = () => {
    const { open } = useSidebar()
    useEffect(() => {
      if (open) {
        console.log('🔒 [CONSOLE-LAYOUT] Locking body scroll')
        document.body.style.overflow = 'hidden'
      } else {
        console.log('🔓 [CONSOLE-LAYOUT] Unlocking body scroll')
        document.body.style.overflow = 'unset'
      }
      return () => {
        document.body.style.overflow = 'unset'
      }
    }, [open])
    return null
  }

  return (
    <Sidebar>
      <SidebarEffects />
      <div className="flex min-h-[100dvh] bg-background w-full">
        {/* Mobile Sidebar using shared component (trigger handled by Topbar) */}
        <MobileSidebar showTriggerBar={false}>
          <SidebarMenu
            activeSection={activeSection}
            onSectionChange={(section) => {
              console.log('📍 [CONSOLE-LAYOUT] Section changed to:', section)
              onNavigateSection?.(section)
            }}
          />
        </MobileSidebar>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden w-full">
          {/* Topbar - sticky on mobile for easy access */}
          <Topbar />

          {/* Main Content - optimized scrolling for mobile */}
          <main
            className="flex-1 overflow-y-auto overflow-x-hidden bg-background overscroll-y-contain scroll-smooth"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
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
    </Sidebar>
  )
}
