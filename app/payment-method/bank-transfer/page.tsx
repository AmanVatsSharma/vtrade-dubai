/**
 * File: app/payment-method/bank-transfer/page.tsx
 * Module: app/payment-method
 * Purpose: Public payment method placeholder for Bank Transfer.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 */

import React from "react"
import { MarketingPageShell } from "@/components/marketing/vtrade-home/marketing-page-shell"

export default function BankTransferPage(): React.JSX.Element {
  return (
    <MarketingPageShell title="Bank Transfer">
      <p className="text-sm text-slate-700">Bank transfer instructions will be published here.</p>
    </MarketingPageShell>
  )
}

