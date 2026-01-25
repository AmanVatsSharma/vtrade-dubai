/**
 * @file layout.tsx
 * @module admin-console
 * @description Layout for admin console with sidebar and header
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { Suspense, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { QrCode } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Sidebar } from "@/components/admin-console/sidebar"
import { Header } from "@/components/admin-console/header"
import { QRScanner } from "@/components/admin-console/qr-scanner"
import { AdminSessionProvider } from "@/components/admin-console/admin-session-provider"
import { usePathname } from "next/navigation"

function AdminConsoleLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Extract active tab from pathname (for sidebar highlighting)
  const getActiveTab = () => {
    const path = pathname.replace('/admin-console', '').replace('/', '') || 'dashboard'
    return path
  }

  const handleQRScanComplete = (data: { clientId: string; amount: number; utr: string }) => {
    toast({
      title: "Funds Added Successfully",
      description: `₹${data.amount.toLocaleString()} added to ${data.clientId}`,
    })
    console.log("Processing fund addition:", data)
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <div className="flex flex-col md:flex-row">
        <Sidebar
          activeTab={getActiveTab()}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        <div className={`flex-1 w-full transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
          <Header
            onQRScannerOpen={() => setQrScannerOpen(true)}
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          />
          <main className="p-2 sm:p-3 md:p-4 lg:p-6 overflow-x-hidden">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-full max-w-7xl mx-auto">
                {children}
              </div>
            </motion.div>
          </main>
        </div>
      </div>

      <QRScanner isOpen={qrScannerOpen} onClose={() => setQrScannerOpen(false)} onScanComplete={handleQRScanComplete} />

      <Button
        onClick={() => setQrScannerOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg md:hidden z-40 touch-manipulation"
        size="icon"
        aria-label="Open QR Scanner"
      >
        <QrCode className="w-5 h-5 sm:w-6 sm:h-6" />
      </Button>
    </div>
  )
}

export default function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminSessionProvider>
        <AdminConsoleLayoutInner>{children}</AdminConsoleLayoutInner>
      </AdminSessionProvider>
    </Suspense>
  )
}
