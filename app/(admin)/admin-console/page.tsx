"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { QrCode } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { UserManagement } from "@/components/admin-console/user-management"
import { Dashboard } from "@/components/admin-console/dashboard"
import { FundManagement } from "@/components/admin-console/fund-management"
import { LogsTerminal } from "@/components/admin-console/logs-terminal"
import { QRScanner } from "@/components/admin-console/qr-scanner"
import { Sidebar } from "@/components/admin-console/sidebar"
import { Header } from "@/components/admin-console/header"
import { Settings } from "@/components/admin-console/settings"

export default function AdminConsole() {
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleQRScanComplete = (data: { clientId: string; amount: number; utr: string }) => {
    toast({
      title: "Funds Added Successfully",
      description: `₹${data.amount.toLocaleString()} added to ${data.clientId}`,
    })
    // Here you would typically make an API call to process the fund addition
    console.log("Processing fund addition:", data)
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />
      case "users":
        return <UserManagement />
      case "funds":
        return <FundManagement />
      case "settings":
        return <Settings />
      case "logs":
        return <LogsTerminal />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? "ml-0 md:ml-16" : "ml-0 md:ml-64"}`}>
          <Header
            onQRScannerOpen={() => setQrScannerOpen(true)}
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          />
          <main className="p-3 md:p-6">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="max-w-7xl mx-auto">
                {renderContent()}
              </div>
            </motion.div>
          </main>
        </div>
      </div>

      <QRScanner isOpen={qrScannerOpen} onClose={() => setQrScannerOpen(false)} onScanComplete={handleQRScanComplete} />

      <Button
        onClick={() => setQrScannerOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg md:hidden z-40"
        size="icon"
      >
        <QrCode className="w-6 h-6" />
      </Button>
    </div>
  )
}
