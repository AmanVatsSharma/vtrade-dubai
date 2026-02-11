/**
 * File: app/products/page.tsx
 * Module: app/products
 * Purpose: Public products landing page (marketing navigation target).
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 */

import React from "react"
import Link from "next/link"
import { MarketingPageShell } from "@/components/marketing/vtrade-home/marketing-page-shell"

const items = [
  { label: "CFD instrument", href: "/products/cfd-instrument" },
  { label: "Indexes", href: "/products/indexes" },
  { label: "Stocks", href: "/products/stocks" },
  { label: "Commodity", href: "/products/commodity" },
]

export default function ProductsPage(): React.JSX.Element {
  return (
    <MarketingPageShell title="Products">
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

