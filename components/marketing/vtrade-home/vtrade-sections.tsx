/**
 * File: components/marketing/vtrade-home/vtrade-sections.tsx
 * Module: marketing/vtrade-home
 * Purpose: Homepage sections matching vtrade.live structure and copy.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Keep sections stateless and SSR-friendly.
 * - Copy is intentionally aligned with the reference site (pixel-close intent).
 */

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { VTRADE_HOMEPAGE_CONTENT } from "@/lib/marketing/vtrade-homepage-content"

function getPlatformIconSrc(platformLabel: string): string {
  switch (platformLabel.toLowerCase()) {
    case "android":
      return "/vtrade/icons/android.svg"
    case "ios":
      return "/vtrade/icons/ios.svg"
    case "desktop":
      return "/vtrade/icons/desktop.svg"
    case "web":
      return "/vtrade/icons/web.svg"
    default:
      return "/vtrade/icons/web.svg"
  }
}

function PrimaryCta({ href, children }: { href: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Link
      href={href}
      className="vtrade-cta-primary inline-flex items-center justify-center px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  )
}

function SecondaryCta({ href, children }: { href: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  )
}

export function VTradeHeroSection(): React.JSX.Element {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        backgroundImage: "url(/vtrade/vtrade-banner.png)",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="text-white">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              {VTRADE_HOMEPAGE_CONTENT.hero.headline}
            </h1>

            <div className="mt-6 flex flex-wrap gap-2">
              {VTRADE_HOMEPAGE_CONTENT.hero.productTabs.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-semibold text-white backdrop-blur"
                >
                  {t}
                </span>
              ))}
            </div>

            <p className="mt-6 text-lg font-medium text-white/90">{VTRADE_HOMEPAGE_CONTENT.hero.subheadline}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryCta href={VTRADE_HOMEPAGE_CONTENT.hero.ctas.primaryHref}>
                {VTRADE_HOMEPAGE_CONTENT.hero.ctas.primaryLabel}
              </PrimaryCta>
              <Link
                href={VTRADE_HOMEPAGE_CONTENT.hero.ctas.secondaryHref}
                className="vtrade-cta-secondary inline-flex items-center justify-center px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070727]"
              >
                {VTRADE_HOMEPAGE_CONTENT.hero.ctas.secondaryLabel}
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/5 shadow-lg shadow-black/15 backdrop-blur">
              <Image
                src="/vtrade/benefits.jpg"
                alt="VTrade trading platform"
                width={1200}
                height={900}
                className="h-auto w-full object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function VTradeStatsSection(): React.JSX.Element {
  return (
    <section className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-2xl border bg-white p-6 shadow-md lg:grid-cols-3 lg:items-center">
          <div>
            <p className="text-3xl font-extrabold text-primary">{VTRADE_HOMEPAGE_CONTENT.stats.value}</p>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-600">{VTRADE_HOMEPAGE_CONTENT.stats.label}</p>
          </div>
          <div className="lg:col-span-2">
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <SecondaryCta href={VTRADE_HOMEPAGE_CONTENT.stats.ctas.leftHref}>
                {VTRADE_HOMEPAGE_CONTENT.stats.ctas.leftLabel}
              </SecondaryCta>
              <PrimaryCta href={VTRADE_HOMEPAGE_CONTENT.stats.ctas.rightHref}>
                {VTRADE_HOMEPAGE_CONTENT.stats.ctas.rightLabel}
              </PrimaryCta>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export function VTradeHighlightsSection(): React.JSX.Element {
  return (
    <section className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VTRADE_HOMEPAGE_CONTENT.highlights.map((label) => (
            <div key={label} className="vtrade-card-premium rounded-xl border bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function VTradeCashSettlementSection(): React.JSX.Element {
  return (
    <section className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Cash Settlement</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Deposit & withdrawal options available to support your trading workflow.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border bg-white shadow-md">
            <Image
              src="/vtrade/payment-mode.png"
              alt="Payment methods"
              width={1200}
              height={800}
              className="h-auto w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

export function VTradePlatformsSection(): React.JSX.Element {
  return (
    <section className="bg-transparent" id="platforms">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-900">Platforms We Are Available On</h2>
          <p className="mt-2 text-sm text-slate-600">Initiate Smart Trading Across Multiple Platforms</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VTRADE_HOMEPAGE_CONTENT.platforms.map((p) => (
            <Link
              key={p.label}
              href={p.href}
              className="group vtrade-card-premium rounded-xl border bg-white p-6 text-center hover:bg-slate-50"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Image
                  src={getPlatformIconSrc(p.label)}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">{p.label}</p>
              <p className="mt-1 text-xs text-slate-500">Open</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function VTradeBenefitsAndMarginSection(): React.JSX.Element {
  const cards = [
    { title: "Secure Investment", body: "At V Trade, we safeguard your interests and ensure your investment journey is as secure as it is prosperous." },
    { title: "Zero Brokerage", body: "Say goodbye to brokerage blues! V Trade brings you a trading revolution with zero brokerage – because we believe in maximising your gains, not cutting into them." },
    { title: "500x Margin Facilities", body: "At V Trade, we’ve got your back, ready to fuel your financial ambitions. Let’s turn your ideas into profits with huge margins!" },
    { title: "24x7 Deposit & Withdrawal", body: "Our platform allows you to deposit & withdrawal around the clock, ensuring your financial freedom." },
    { title: "Round-The-Clock Customer Support", body: "Round-The-Clock Customer Support" },
    { title: "Round-The-Clock Customer Support", body: "Round-The-Clock Customer Support" },
  ]

  return (
    <section className="bg-transparent" id="why-vtrade">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Enjoy Maximum Profits with ZERO BROKERAGE</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Is money-making your passion? Our platform makes trading easy and fun. Trade anytime, anywhere, on any device with absolute ZERO BROKERAGE costs
            </p>

            <h3 className="mt-8 text-xl font-extrabold text-slate-900">500x Margin For Maximum Returns</h3>
            <p className="mt-2 text-sm text-slate-600">
              Make Big Moves with Lesser Capital as We Offer Upto 500x Margin.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryCta href="/auth/register">Trade Now</PrimaryCta>
              <SecondaryCta href="/contact">Contact</SecondaryCta>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((c, idx) => (
              <div key={`${c.title}-${idx}`} className="vtrade-card-premium rounded-xl border bg-white p-5">
                <p className="text-sm font-semibold text-slate-900">{c.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function VTradeOpenAccountSection(): React.JSX.Element {
  return (
    <section className="bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-2xl bg-slate-800/60 p-8 shadow-xl shadow-black/25 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-white">Open Live Account</h2>
            <p className="mt-2 text-sm text-slate-200">
              Is money-making your passion? Our platform makes trading easy and fun. Trade anytime, anywhere, on any device with absolute ZERO BROKERAGE costs
            </p>
          </div>
          <div className="flex gap-3 lg:justify-end">
            <PrimaryCta href="/auth/register">Open Live Account</PrimaryCta>
          </div>
        </div>
      </div>
    </section>
  )
}

export function VTradePaymentsUpdateSection(): React.JSX.Element {
  return (
    <section className="bg-transparent">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-2xl border bg-white p-8 shadow-md lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payments Update</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">24X7 Instant Deposit & Withdrawal</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Is money-making your passion? Our platform makes trading easy and fun. Trade anytime, anywhere, on any device with absolute ZERO BROKERAGE costs
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <SecondaryCta href="/why-vtrade">Why Vtrade</SecondaryCta>
            <PrimaryCta href="/auth/register">Trade Now</PrimaryCta>
          </div>
        </div>
      </div>
    </section>
  )
}

export function VTradeBlogPreviewSection(): React.JSX.Element {
  return (
    <section className="bg-transparent" id="news">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-slate-900">Stay Updated with Zero Brokerage Trading Platform</h2>
          <p className="mt-2 text-sm text-slate-600">Initiate Smart Trading Across Multiple Platforms</p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VTRADE_HOMEPAGE_CONTENT.blogTitles.map((title, idx) => (
            <Link
              key={`${idx}-${title}`}
              href="/blog"
              className="group vtrade-card-premium overflow-hidden rounded-xl border bg-white hover:bg-slate-50"
            >
              <div className="aspect-[4/3] w-full bg-slate-100">
                <Image
                  src={`/vtrade/blog-${idx + 1}.jpg`}
                  alt={title}
                  width={800}
                  height={600}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
              </div>
              <div className="p-4">
                <p className="text-sm font-semibold leading-snug text-slate-900 group-hover:underline">{title}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

export function VTradeFooter(): React.JSX.Element {
  return (
    <footer className="border-t border-white/10 bg-[#070727] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/vtrade/logo_dark.png" alt="VTrade" width={140} height={40} className="h-9 w-auto" />
            </div>
            <p className="mt-3 text-sm text-white/75">Trade Live. Trade Sharp.</p>

            <div className="mt-5 flex items-center gap-3">
              <a
                href="#"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/15"
                aria-label="VTrade on Facebook"
              >
                <span className="text-sm font-extrabold" aria-hidden="true">
                  f
                </span>
              </a>
              <a
                href="#"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/15"
                aria-label="VTrade on Instagram"
              >
                <span className="text-sm font-extrabold" aria-hidden="true">
                  ig
                </span>
              </a>
              <a
                href="#"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/15"
                aria-label="VTrade on YouTube"
              >
                <span className="text-sm font-extrabold" aria-hidden="true">
                  yt
                </span>
              </a>
              <a
                href="#"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/15"
                aria-label="VTrade on WhatsApp"
              >
                <span className="text-sm font-extrabold" aria-hidden="true">
                  wa
                </span>
              </a>
              <a
                href="mailto:support@vtrade.live"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/90 transition-colors hover:bg-white/15"
                aria-label="Email VTrade support"
              >
                <span className="text-sm font-extrabold" aria-hidden="true">
                  @
                </span>
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">About us</p>
            <div className="mt-4 space-y-2">
              <Link href="/why-vtrade" className="block text-sm text-white/80 hover:text-white hover:underline">
                Why VTrade
              </Link>
              <Link href="/affiliate" className="block text-sm text-white/80 hover:text-white hover:underline">
                Become an Affiliate
              </Link>
              <Link href="/privacy-policy" className="block text-sm text-white/80 hover:text-white hover:underline">
                Privacy Policy
              </Link>
              <Link href="/terms" className="block text-sm text-white/80 hover:text-white hover:underline">
                Terms & Conditions
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Products</p>
            <div className="mt-4 space-y-2">
              <Link href="/products/cfd-instrument" className="block text-sm text-white/80 hover:text-white hover:underline">
                CFD Instrument
              </Link>
              <Link href="/products/indexes" className="block text-sm text-white/80 hover:text-white hover:underline">
                Indexes
              </Link>
              <Link href="/products/stocks" className="block text-sm text-white/80 hover:text-white hover:underline">
                Stocks
              </Link>
              <Link href="/products/commodity" className="block text-sm text-white/80 hover:text-white hover:underline">
                Commodity
              </Link>
              <Link href="/news-blogs" className="block text-sm text-white/80 hover:text-white hover:underline">
                News & Blogs
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Platforms</p>
            <div className="mt-4 space-y-2">
              <Link href="/downloads#android" className="block text-sm text-white/80 hover:text-white hover:underline">
                Android
              </Link>
              <Link href="/downloads#ios" className="block text-sm text-white/80 hover:text-white hover:underline">
                IOS
              </Link>
              <Link href="/downloads#desktop" className="block text-sm text-white/80 hover:text-white hover:underline">
                Desktop App
              </Link>
              <Link href="/downloads#web" className="block text-sm text-white/80 hover:text-white hover:underline">
                Web Trader
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
          <span>©opyright 2025 - VTrade | All rights reserved.</span>
          <span className="text-white/50">Trade Live. Trade Sharp.</span>
        </div>
      </div>
    </footer>
  )
}

