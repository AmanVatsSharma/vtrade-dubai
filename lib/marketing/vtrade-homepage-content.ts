/**
 * File: lib/marketing/vtrade-homepage-content.ts
 * Module: lib/marketing
 * Purpose: Central content config for VTrade marketing homepage sections.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Keeps section copy and internal routing consistent across pages/components.
 * - Used by Jest tests to enforce content shape and link policy.
 */

export interface VTradeHomepageContent {
  hero: {
    headline: string
    productTabs: string[]
    subheadline: string
    ctas: { primaryLabel: string; primaryHref: string; secondaryLabel: string; secondaryHref: string }
  }
  stats: { value: string; label: string; ctas: { leftLabel: string; leftHref: string; rightLabel: string; rightHref: string } }
  highlights: string[]
  platforms: { label: string; href: string }[]
  blogTitles: string[]
}

export const VTRADE_HOMEPAGE_CONTENT: VTradeHomepageContent = {
  hero: {
    headline: "Trade With Zero Brokerage & 500X Margin",
    productTabs: ["Indian Stocks (F&O)", "Indian Commodities", "COMEX", "US Stocks"],
    subheadline: "Trade Smart With VTrade.live",
    ctas: {
      primaryLabel: "Get started",
      primaryHref: "/auth/register",
      secondaryLabel: "Why V Trade",
      secondaryHref: "/why-vtrade",
    },
  },
  stats: {
    value: "₹ 98.2 Crore",
    label: "BROKERAGE SAVED",
    ctas: {
      leftLabel: "Know More",
      leftHref: "/why-vtrade",
      rightLabel: "Trade Now",
      rightHref: "/auth/register",
    },
  },
  highlights: ["Zero Brokerage", "24/7 Deposit And Withdrawal", "Upto 500x Margin", "Indian + US Stocks & Commodities"],
  platforms: [
    { label: "Android", href: "/downloads#android" },
    { label: "IOS", href: "/downloads#ios" },
    { label: "Desktop", href: "/downloads#desktop" },
    { label: "Web", href: "/downloads#web" },
  ],
  blogTitles: [
    "What is a Forward Market? Meaning, Functions, and Real-World Insights",
    "Cryptocurrency Market Cap Reaches Record $4 Trillion: Causes and Impact",
    "What Is Algorithm Trading? Definition, How It Works, Pros & Cons",
    "Multi-Commodity Exchange of India (NSE: MCX) Sheds 6.3% – Analysing the Recent Decline and What Lies Ahead",
  ],
}

