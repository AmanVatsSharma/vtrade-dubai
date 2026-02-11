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
    <div className="fixed bottom-24 right-5 z-40 flex flex-col gap-2">
      {PLATFORM_LINKS.map((p) => (
        <Link
          key={p.id}
          href={p.href}
          className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-xl shadow-black/20 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label={`Open ${p.label} downloads`}
        >
          <Image
            src={p.iconSrc}
            alt=""
            width={18}
            height={18}
            className="h-[18px] w-[18px] brightness-0 invert"
            aria-hidden="true"
          />
          <span className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap rounded-lg bg-[#070727]/95 px-2 py-1 text-xs font-semibold text-white shadow-lg shadow-black/25 backdrop-blur group-hover:block">
            {p.label}
          </span>
        </Link>
      ))}
    </div>
  )
}

