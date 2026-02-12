/**
* File: components/vtrade-logo-link.tsx
* Module: components
* Purpose: Reusable VTrade logo link with contrast-safe backdrop for light logo assets.
* Author: Cursor / BharatERP
* Last-updated: 2026-02-12
* Notes:
* - Uses a dark pill background so the white logo remains legible on light/glass headers.
* - Prefer using this component instead of re-implementing the logo in multiple headers.
*/

import Image from "next/image"
import Link from "next/link"
import React from "react"

export type VtradeLogoLinkProps = {
  href: string
  className?: string
  imageClassName?: string
  priority?: boolean
}

export function VtradeLogoLink({
  href,
  className,
  imageClassName,
  priority = false,
}: VtradeLogoLinkProps): React.JSX.Element {
  return (
    <Link
      href={href}
      aria-label="Go to VTrade home"
      className={[
        "inline-flex items-center rounded-lg border border-white/10 bg-[#070727]/90 px-2 py-1 shadow-sm",
        "hover:bg-[#070727] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#070727]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Image
        src="/vtrade/logo.png"
        alt="VTrade"
        width={140}
        height={40}
        className={["h-7 w-auto sm:h-8", imageClassName].filter(Boolean).join(" ")}
        priority={priority}
      />
    </Link>
  )
}

