/**
 * File: app/payment-method/page.tsx
 * Module: app/payment-method
 * Purpose: Public payment method landing page matching marketing navigation.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 */

import React from "react"
import Link from "next/link"
import { MarketingPageShell } from "@/components/marketing/vtrade-home/marketing-page-shell"

const items = [
  { label: "Bank Transfer", href: "/payment-method/bank-transfer" },
  { label: "UPI Transfer", href: "/payment-method/upi-transfer" },
  { label: "Cash Payment", href: "/payment-method/cash-payment" },
  { label: "Crypto USDT TRC20", href: "/payment-method/crypto-usdt-trc20" },
]

export default function PaymentMethodPage(): React.JSX.Element {
  return (
    <MarketingPageShell title="Payment Method">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="rounded-xl border bg-white p-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            {it.label}
          </Link>
        ))}
      </div>
    </MarketingPageShell>
  )
}

