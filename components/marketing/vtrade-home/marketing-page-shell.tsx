/**
 * File: components/marketing/vtrade-home/marketing-page-shell.tsx
 * Module: marketing/vtrade-home
 * Purpose: Shared shell (header/footer) for public marketing pages.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Keeps top-level marketing routes consistent with the homepage.
 */

import React from "react"
import { VTradeHeader } from "./vtrade-header"
import { VTradeFooter } from "./vtrade-sections"
import { JoinchatWidget } from "./joinchat-widget"
import { ScheduledUpgradeBanner } from "./scheduled-upgrade-banner"

export function MarketingPageShell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <VTradeHeader />
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <div className="mt-6">{children}</div>
      </main>
      <ScheduledUpgradeBanner />
      <VTradeFooter />
      <JoinchatWidget />
    </div>
  )
}

