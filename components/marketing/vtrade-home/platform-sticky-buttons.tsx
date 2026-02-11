/**
 * File: components/marketing/vtrade-home/platform-sticky-buttons.tsx
 * Module: marketing/vtrade-home
 * Purpose: Sticky quick-access platform buttons similar to vtrade.live.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Fixed-position bar (z-40) so Joinchat (z-50) always stays above.
 * - Links route internally to `/downloads#...` anchors.
 */

import React from "react"
import Image from "next/image"
import Link from "next/link"

type PlatformLink = {
  id: "android" | "ios" | "desktop" | "web"
  label: string
  href: string
  iconSrc: string
}

const PLATFORM_LINKS: PlatformLink[] = [
  { id: "android", label: "Android", href: "/downloads#android", iconSrc: "/vtrade/icons/android.svg" },
  { id: "ios", label: "IOS", href: "/downloads#ios", iconSrc: "/vtrade/icons/ios.svg" },
  { id: "desktop", label: "Desktop", href: "/downloads#desktop", iconSrc: "/vtrade/icons/desktop.svg" },
  { id: "web", label: "Web Terminal", href: "/downloads#web", iconSrc: "/vtrade/icons/web.svg" },
]

export function PlatformStickyButtons(): React.JSX.Element {
  return (
    <div className="fixed bottom-4 left-1/2 z-40 w-[min(94vw,980px)] -translate-x-1/2 px-1">
      <div className="rounded-2xl border border-white/10 bg-[#070727]/92 shadow-2xl shadow-black/25 backdrop-blur">
        <div className="flex flex-wrap items-center justify-center gap-2 px-2 py-2 pr-16 sm:flex-nowrap sm:justify-between sm:gap-3 sm:px-3">
          {PLATFORM_LINKS.map((p) => (
            <Link
              key={p.id}
              href={p.href}
              className="group flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-black/20 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#070727] sm:flex-1 sm:text-sm"
              aria-label={`Open ${p.label} downloads`}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <Image src={p.iconSrc} alt="" width={18} height={18} className="h-[18px] w-[18px] text-white" aria-hidden="true" />
              </span>
              <span className="whitespace-nowrap">{p.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

