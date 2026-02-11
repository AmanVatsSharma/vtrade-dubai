/**
 * File: app/payment-method/cash-payment/page.tsx
 * Module: app/payment-method
 * Purpose: Public payment method placeholder for Cash Payment.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 */

import React from "react"
import { MarketingPageShell } from "@/components/marketing/vtrade-home/marketing-page-shell"

export default function CashPaymentPage(): React.JSX.Element {
  return (
    <MarketingPageShell title="Cash Payment">
      <p className="text-sm text-slate-700">Cash payment instructions will be published here.</p>
    </MarketingPageShell>
  )
}

