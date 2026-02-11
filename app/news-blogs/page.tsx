/**
 * File: app/news-blogs/page.tsx
 * Module: app/news-blogs
 * Purpose: Public news & blogs landing route matching VTrade marketing navigation.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 */

import React from "react"
import Link from "next/link"
import { MarketingPageShell } from "@/components/marketing/vtrade-home/marketing-page-shell"
import { VTRADE_HOMEPAGE_CONTENT } from "@/lib/marketing/vtrade-homepage-content"

export default function NewsBlogsPage(): React.JSX.Element {
  return (
    <MarketingPageShell title="News & Blogs">
      <div className="grid gap-3 sm:grid-cols-2">
        {VTRADE_HOMEPAGE_CONTENT.blogTitles.map((t) => (
          <Link
            key={t}
            href="/blog"
            className="rounded-xl border bg-white p-4 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50"
          >
            {t}
          </Link>
        ))}
      </div>
    </MarketingPageShell>
  )
}

