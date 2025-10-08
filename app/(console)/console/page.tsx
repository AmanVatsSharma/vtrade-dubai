"use client"

import { ConsoleLayout } from "@/components/console/console-layout"
import { AccountSection } from "@/components/console/sections/account-section"
import { BankAccountsSection } from "@/components/console/sections/bank-accounts-section"
import { DepositsSection } from "@/components/console/sections/deposits-section"
import { ProfileSection } from "@/components/console/sections/profile-section"
import { StatementsSection } from "@/components/console/sections/statements-section"
import { WithdrawalsSection } from "@/components/console/sections/withdrawals-section"
import { SidebarMenu } from "@/components/console/sidebar-menu"
import { ConsoleErrorBoundary } from "@/components/console/console-error-boundary"
import { ConsoleLoadingState } from "@/components/console/console-loading-state"
import { useState, Suspense } from "react"
import { useSession } from "next-auth/react"

export default function ConsolePage() {
  const [activeSection, setActiveSection] = useState("account")

  // Session: used to gate access and provide user context across sections
  const { data: session, status } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  console.log("/console: session status", { status, userId, sessionUser: session?.user })

  const renderSection = () => {
    switch (activeSection) {
      case "profile":
        return <ProfileSection />
      case "account":
        return <AccountSection />
      case "statements":
        return <StatementsSection />
      case "deposits":
        return <DepositsSection />
      case "withdrawals":
        return <WithdrawalsSection />
      case "banks":
        return <BankAccountsSection />
      default:
        return <AccountSection />
    }
  }

  // Graceful handling for loading and unauthenticated states
  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading your console...
      </div>
    )
  }

  if (!userId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-xl font-semibold">Please sign in</div>
          <div className="text-sm text-muted-foreground">Your trading console requires an active session.</div>
        </div>
      </div>
    )
  }

  return (
    <ConsoleErrorBoundary>
      <Suspense fallback={<ConsoleLoadingState />}>
        <ConsoleLayout activeSection={activeSection} onNavigateSection={(section) => setActiveSection(section)}>
          <div className="flex gap-6">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block w-70">
              <div className="sticky top-0">
                <SidebarMenu activeSection={activeSection} onSectionChange={setActiveSection} />
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">{renderSection()}</div>
          </div>
        </ConsoleLayout>
      </Suspense>
    </ConsoleErrorBoundary>
  )
}
