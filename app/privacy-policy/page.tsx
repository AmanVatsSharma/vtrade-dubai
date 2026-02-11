/**
 * File: app/privacy-policy/page.tsx
 * Module: app/privacy-policy
 * Purpose: Public privacy policy placeholder page.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 */

import React from "react"
import { MarketingPageShell } from "@/components/marketing/vtrade-home/marketing-page-shell"

export default function PrivacyPolicyPage(): React.JSX.Element {
  return (
    <MarketingPageShell title="Privacy Policy">
      <div className="max-w-3xl space-y-3 text-sm text-slate-700">
        <p>Privacy policy content will be maintained here.</p>
      </div>
    </MarketingPageShell>
  )
}

