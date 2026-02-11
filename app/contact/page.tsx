/**
 * File: app/contact/page.tsx
 * Module: app/contact
 * Purpose: Public contact page linked from VTrade marketing header and chat widget.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Lightweight placeholder; can be expanded with forms/CRM integration later.
 */

import React from "react"
import Link from "next/link"
import { MarketingPageShell } from "@/components/marketing/vtrade-home/marketing-page-shell"

export default function ContactPage(): React.JSX.Element {
  return (
    <MarketingPageShell title="Contact">
      <div className="max-w-2xl space-y-4 text-sm text-slate-700">
        <p>We’re here to help with onboarding, platform setup, and payments.</p>
        <p>
          Email:{" "}
          <Link href="mailto:support@vtrade.live" className="font-semibold text-emerald-700 hover:underline">
            support@vtrade.live
          </Link>
        </p>
      </div>
    </MarketingPageShell>
  )
}

