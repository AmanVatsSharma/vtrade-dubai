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

      <main>
        <VTradeHeroSection />
        <VTradeStatsSection />
        <VTradeHighlightsSection />
        <VTradeCashSettlementSection />
        <VTradePlatformsSection />
        <VTradeBenefitsAndMarginSection />
        <VTradeOpenAccountSection />
        <VTradePaymentsUpdateSection />
        <VTradeBlogPreviewSection />
        <ScheduledUpgradeBanner />
      </main>

      <VTradeFooter />
      <JoinchatWidget />
    </div>
  )
}

