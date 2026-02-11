/**
 * File: app/terms/page.tsx
 * Module: app/terms
 * Purpose: Public terms & conditions placeholder page.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 */

import React from "react"
import { MarketingPageShell } from "@/components/marketing/vtrade-home/marketing-page-shell"

export default function TermsPage(): React.JSX.Element {
  return (
    <MarketingPageShell title="Terms & Conditions">
      <div className="max-w-3xl space-y-3 text-sm text-slate-700">
        <p>Terms & conditions content will be maintained here.</p>
      </div>
    </MarketingPageShell>
  )
}

