/**
 * File: components/marketing/vtrade-home/vtrade-header.tsx
 * Module: marketing/vtrade-home
 * Purpose: Public marketing header matching vtrade.live navigation and actions.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Uses native <details> dropdowns for SSR-friendly menus.
 * - Mobile menu uses <details> as well (no extra dependencies).
 */

import React from "react"
import Image from "next/image"
import Link from "next/link"

type NavLink = { label: string; href: string }

const aboutLinks: NavLink[] = [
  { label: "Why VTrade", href: "/why-vtrade" },
  { label: "Become an Affiliate", href: "/affiliate" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Conditions", href: "/terms" },
]

const productLinks: NavLink[] = [
  { label: "CFD instrument", href: "/products/cfd-instrument" },
  { label: "Indexes", href: "/products/indexes" },
  { label: "Stocks", href: "/products/stocks" },
  { label: "Commodity", href: "/products/commodity" },
]

const paymentLinks: NavLink[] = [
  { label: "Bank Transfer", href: "/payment-method/bank-transfer" },
  { label: "UPI Transfer", href: "/payment-method/upi-transfer" },
  { label: "Cash Payment", href: "/payment-method/cash-payment" },
  { label: "Crypto USDT TRC20", href: "/payment-method/crypto-usdt-trc20" },
]

function Dropdown({
  label,
  items,
}: {
  label: string
  items: NavLink[]
}): React.JSX.Element {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap px-2 py-1 text-sm font-medium text-slate-700 hover:text-slate-900">
        <span>{label}</span>
        <span className="text-slate-400 group-open:rotate-180">▾</span>
      </summary>
      <div className="absolute left-0 top-full z-50 mt-2 min-w-56 overflow-hidden rounded-lg border bg-white shadow-xl">
        <div className="p-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </details>
  )
}

export function VTradeHeader(): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/vtrade/logo.png"
              alt="VTrade"
              width={140}
              height={40}
              className="h-9 w-auto"
              priority
            />
          </Link>

          <nav className="hidden items-center gap-3 lg:flex" aria-label="Primary">
            <Link href="/" className="px-2 py-1 text-sm font-medium text-slate-900">
              Home
            </Link>
            <Dropdown label="About us" items={aboutLinks} />
            <Dropdown label="Products" items={productLinks} />
            <Link
              href="/news-blogs"
              className="whitespace-nowrap px-2 py-1 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              News & Blogs
            </Link>
            <Link
              href="/contact"
              className="whitespace-nowrap px-2 py-1 text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              Contact
            </Link>
            <Dropdown label="Payment Method" items={paymentLinks} />
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/auth/login"
              className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Signup
            </Link>
          </div>

          {/* Mobile menu */}
          <details className="relative lg:hidden">
            <summary className="list-none">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                aria-label="Open menu"
              >
                Menu
              </button>
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-xl border bg-white shadow-2xl">
              <div className="p-3">
                <div className="space-y-1">
                  <Link href="/" className="block rounded-md px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50">
                    Home
                  </Link>

                  <details className="rounded-md px-1 py-1">
                    <summary className="cursor-pointer list-none rounded-md px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      About us
                    </summary>
                    <div className="mt-1 space-y-1 pl-2">
                      {aboutLinks.map((l) => (
                        <Link key={l.href} href={l.href} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </details>

                  <details className="rounded-md px-1 py-1">
                    <summary className="cursor-pointer list-none rounded-md px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Products
                    </summary>
                    <div className="mt-1 space-y-1 pl-2">
                      {productLinks.map((l) => (
                        <Link key={l.href} href={l.href} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </details>

                  <Link href="/news-blogs" className="block rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    News & Blogs
                  </Link>
                  <Link href="/contact" className="block rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Contact
                  </Link>

                  <details className="rounded-md px-1 py-1">
                    <summary className="cursor-pointer list-none rounded-md px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Payment Method
                    </summary>
                    <div className="mt-1 space-y-1 pl-2">
                      {paymentLinks.map((l) => (
                        <Link key={l.href} href={l.href} className="block rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </details>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link href="/auth/login" className="rounded-md border px-3 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Login
                  </Link>
                  <Link href="/auth/register" className="rounded-md bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-700">
                    Signup
                  </Link>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  )
}

