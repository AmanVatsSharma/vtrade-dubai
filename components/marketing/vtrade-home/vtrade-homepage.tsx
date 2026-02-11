/**
 * File: components/marketing/vtrade-home/vtrade-homepage.tsx
 * Module: marketing/vtrade-home
 * Purpose: Compose VTrade public homepage sections in vtrade.live order.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Keep composition here so `app/page.tsx` stays minimal.
 */

import React from "react"
import { JoinchatWidget } from "./joinchat-widget"
import { PlatformStickyButtons } from "./platform-sticky-buttons"
import { ScheduledUpgradeBanner } from "./scheduled-upgrade-banner"
import { VTradeHeader } from "./vtrade-header"
import {
  VTradeBenefitsAndMarginSection,
  VTradeBlogPreviewSection,
  VTradeCashSettlementSection,
  VTradeFooter,
  VTradeHeroSection,
  VTradeHighlightsSection,
  VTradeOpenAccountSection,
  VTradePaymentsUpdateSection,
  VTradePlatformsSection,
  VTradeStatsSection,
} from "./vtrade-sections"

export function VTradeHomepage(): React.JSX.Element {
  return (
    <div
      className="min-h-screen text-slate-900"
      style={{
        backgroundImage: "url(/vtrade/bg-website.jpg)",
        backgroundPosition: "left top",
        backgroundRepeat: "repeat",
        backgroundSize: "auto",
      }}
    >
      <VTradeHeader />

      <main className="pb-32">
        <VTradeHeroSection />
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-white/90 to-white" />
          <div className="relative">
            <VTradeStatsSection />
            <VTradeHighlightsSection />
            <VTradeCashSettlementSection />
            <VTradePlatformsSection />
            <VTradeBenefitsAndMarginSection />
            <VTradeOpenAccountSection />
            <VTradePaymentsUpdateSection />
            <VTradeBlogPreviewSection />
            <ScheduledUpgradeBanner />
          </div>
        </div>
      </main>

      <VTradeFooter />
      <PlatformStickyButtons />
      <JoinchatWidget />
    </div>
  )
}

