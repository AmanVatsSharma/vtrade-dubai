/**
 * File: app/why-vtrade/page.tsx
 * Module: app/why-vtrade
 * Purpose: Public “Why VTrade” page linked from marketing CTAs.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 */

import React from "react"
import { MarketingPageShell } from "@/components/marketing/vtrade-home/marketing-page-shell"

export default function WhyVTradePage(): React.JSX.Element {
  return (
    <MarketingPageShell title="Why VTrade">
      <div className="max-w-3xl space-y-3 text-sm text-slate-700">
        <p>Zero brokerage trading platform with up to 500x margin and 24/7 deposit & withdrawal.</p>
        <p>This page can be expanded with full brand story, compliance, and product details.</p>
      </div>
    </MarketingPageShell>
  )
}

