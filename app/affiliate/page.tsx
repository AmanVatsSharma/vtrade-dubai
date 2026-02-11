/**
 * File: app/affiliate/page.tsx
 * Module: app/affiliate
 * Purpose: Public affiliate placeholder page linked from marketing nav.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 */

import React from "react"
import Link from "next/link"
import { MarketingPageShell } from "@/components/marketing/vtrade-home/marketing-page-shell"

export default function AffiliatePage(): React.JSX.Element {
  return (
    <MarketingPageShell title="Become an Affiliate">
      <div className="max-w-3xl space-y-3 text-sm text-slate-700">
        <p>Affiliate program details will be published here.</p>
        <p>
          For now, please reach out via{" "}
          <Link href="/contact" className="font-semibold text-emerald-700 hover:underline">
            Contact
          </Link>
          .
        </p>
      </div>
    </MarketingPageShell>
  )
}

