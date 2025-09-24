"use client"

import { ConsoleLayout } from "@/components/console/console-layout"
import { AccountSection } from "@/components/console/sections/account-section"
import { BankAccountsSection } from "@/components/console/sections/bank-accounts-section"
import { DepositsSection } from "@/components/console/sections/deposits-section"
import { ProfileSection } from "@/components/console/sections/profile-section"
import { StatementsSection } from "@/components/console/sections/statements-section"
import { WithdrawalsSection } from "@/components/console/sections/withdrawals-section"
import { SidebarMenu } from "@/components/console/sidebar-menu"
import { useState } from "react"

export default function ConsolePage() {
  const [activeSection, setActiveSection] = useState("account")

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

  return (
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
  )
}
