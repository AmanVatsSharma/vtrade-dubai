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

const posts = [
  "What is a Forward Market? Meaning, Functions, and Real-World Insights",
  "Cryptocurrency Market Cap Reaches Record $4 Trillion: Causes and Impact",
  "What Is Algorithm Trading? Definition, How It Works, Pros & Cons",
  "Multi-Commodity Exchange of India (NSE: MCX) Sheds 6.3% – Analysing the Recent Decline and What Lies Ahead",
]

export default function NewsBlogsPage(): React.JSX.Element {
  return (
    <MarketingPageShell title="News & Blogs">
      <div className="grid gap-3 sm:grid-cols-2">
        {posts.map((t) => (
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

