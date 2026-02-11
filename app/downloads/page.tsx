/**
 * File: app/downloads/page.tsx
 * Module: app/downloads
 * Purpose: Public downloads page for VTrade platforms (Android/iOS/Desktop/Web).
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Download links can be wired to real binaries later.
 */

import React from "react"
import Link from "next/link"
import { MarketingPageShell } from "@/components/marketing/vtrade-home/marketing-page-shell"

const items = [
  { id: "android", label: "Android", hint: "APK will be published here." },
  { id: "ios", label: "IOS", hint: "App Store link will be published here." },
  { id: "desktop", label: "Desktop", hint: "Installer will be published here." },
  { id: "web", label: "Web", hint: "Web terminal link will be published here." },
]

export default function DownloadsPage(): React.JSX.Element {
  return (
    <MarketingPageShell title="Downloads">
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <section key={it.id} id={it.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{it.label}</p>
            <p className="mt-2 text-xs text-slate-600">{it.hint}</p>
            <div className="mt-4">
              <Link href="/contact" className="text-sm font-semibold text-emerald-700 hover:underline">
                Contact to get access
              </Link>
            </div>
          </section>
        ))}
      </div>
    </MarketingPageShell>
  )
}

