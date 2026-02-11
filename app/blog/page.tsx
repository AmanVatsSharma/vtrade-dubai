/**
 * File: app/blog/page.tsx
 * Module: app/blog
 * Purpose: Public blog placeholder route for VTrade marketing cards.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - This is a placeholder; integrate CMS later.
 */

import React from "react"
import { MarketingPageShell } from "@/components/marketing/vtrade-home/marketing-page-shell"

const posts = [
  "What is a Forward Market? Meaning, Functions, and Real-World Insights",
  "Cryptocurrency Market Cap Reaches Record $4 Trillion: Causes and Impact",
  "What Is Algorithm Trading? Definition, How It Works, Pros & Cons",
  "Multi-Commodity Exchange of India (NSE: MCX) Sheds 6.3% – Analysing the Recent Decline and What Lies Ahead",
]

export default function BlogPage(): React.JSX.Element {
  return (
    <MarketingPageShell title="Blog">
      <p className="text-sm text-slate-600">Blog articles will be published here.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {posts.map((t) => (
          <div key={t} className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">{t}</p>
            <p className="mt-2 text-xs text-slate-600">Coming soon</p>
          </div>
        ))}
      </div>
    </MarketingPageShell>
  )
}

