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
import { Sidebar, MobileSidebar, DesktopSidebar, useSidebar } from "@/components/ui/sidebar"

interface ConsoleLayoutProps {
  children: React.ReactNode
  activeSection?: string
  onNavigateSection?: (section: string) => void
  statementsEnabled?: boolean
}

function ConsoleLayoutInner({ children, activeSection, onNavigateSection, statementsEnabled }: ConsoleLayoutProps) {
  const { open, setOpen } = useSidebar()
  
  console.log('🎨 [CONSOLE-LAYOUT] Rendering with:', { activeSection, sidebarOpen: open })

  // Body scroll lock
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

  // Ensure mobile overlay never stays open on large screens
  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024 // lg breakpoint
      if (isDesktop && open) {
        console.log('🧹 [CONSOLE-LAYOUT] Auto-closing mobile sidebar on desktop')
        setOpen(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [open, setOpen])

  const handleSectionChange = (section: string) => {
    console.log('📍 [CONSOLE-LAYOUT] Section changed to:', section)
    onNavigateSection?.(section)
    // Auto-close mobile sidebar after selection
    if (open) {
      console.log('📲 [CONSOLE-LAYOUT] Closing mobile sidebar after section change')
      setOpen(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background w-full overflow-hidden">
      {/* Mobile Sidebar using shared component (trigger handled by Topbar) */}
      <MobileSidebar showTriggerBar={false}>
        <SidebarMenu
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          statementsEnabled={statementsEnabled}
        />
      </MobileSidebar>

      {/* Desktop Sidebar - fixed left rail on large screens */}
      <aside className="hidden lg:flex">
        <div className="sticky top-0 h-screen overflow-hidden">
          <DesktopSidebar>
            <SidebarMenu
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              statementsEnabled={statementsEnabled}
            />
          </DesktopSidebar>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar - sticky on mobile for easy access */}
        <Topbar />

        {/* Main Content - optimized scrolling for mobile */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden bg-background scroll-smooth"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="container mx-auto p-4 sm:p-6 md:p-8 lg:p-10">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full"
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}

export function ConsoleLayout(props: ConsoleLayoutProps) {
  return (
    <Sidebar>
      <ConsoleLayoutInner {...props} />
    </Sidebar>
  )
}
