"use client"

import { Suspense, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { QrCode } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { UserManagement } from "@/components/admin-console/user-management"
import { RMManagement } from "@/components/admin-console/rm-management"
import { Dashboard } from "@/components/admin-console/dashboard"
import { FundManagement } from "@/components/admin-console/fund-management"
import { LogsTerminal } from "@/components/admin-console/logs-terminal"
import { TradeManagement } from "@/components/admin-console/trade-management"
import { QRScanner } from "@/components/admin-console/qr-scanner"
import { CleanupManagement } from "@/components/admin-console/cleanup-management"
import { PositionsManagement } from "@/components/admin-console/positions-management"
import { OrdersManagement } from "@/components/admin-console/orders-management"
import { Sidebar } from "@/components/admin-console/sidebar"
import { Header } from "@/components/admin-console/header"
import { Settings } from "@/components/admin-console/settings"
import { FinancialOverview } from "@/components/admin-console/financial-overview"
import { AdvancedAnalytics } from "@/components/admin-console/advanced-analytics"
import { AuditTrail } from "@/components/admin-console/audit-trail"
import { RiskManagement } from "@/components/admin-console/risk-management"
import { SystemHealth } from "@/components/admin-console/system-health"
import { FinancialReports } from "@/components/admin-console/financial-reports"
import { NotificationCenter } from "@/components/admin-console/notification-center"
import { useRouter, useSearchParams } from "next/navigation"

function AdminConsoleInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const [activeTab, setActiveTab] = useState("dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  useEffect(() => {
    // Initialize role from localStorage and subscribe to changes
    try {
      const r = window.localStorage.getItem('session_user_role')
      if (r) setRole(r)
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'session_user_role') {
        setRole(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

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
      case "rms":
        return <RMManagement />
      case "funds":
        return <FundManagement />
      case "analytics":
        return <AdvancedAnalytics />
      case "audit":
        return <AuditTrail />
      case "risk":
        return <RiskManagement />
      case "system-health":
        return <SystemHealth />
      case "financial-reports":
        return <FinancialReports />
      case "notifications":
        return <NotificationCenter />
      case "financial-overview":
        return role === 'SUPER_ADMIN' ? <FinancialOverview /> : <Dashboard />
      case "advanced":
        return <TradeManagement />
      case "positions":
        return <PositionsManagement />
      case "orders":
        return <OrdersManagement />
      case "cleanup":
        return <CleanupManagement />
      case "settings":
        return <Settings />
      case "logs":
        return <LogsTerminal />
      default:
        return <Dashboard />
    }
  }

  // Sync active tab with URL (?tab=...)
  useEffect(() => {
    const urlTab = sp.get("tab")
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp])

  useEffect(() => {
    const current = new URLSearchParams(sp.toString())
    current.set("tab", activeTab)
    router.replace(`/admin-console?${current.toString()}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

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

export default function AdminConsole() {
  return (
    <Suspense fallback={null}>
      <AdminConsoleInner />
    </Suspense>
  )
}
