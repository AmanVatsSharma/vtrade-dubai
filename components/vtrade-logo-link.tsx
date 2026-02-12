/**
* File: components/vtrade-logo-link.tsx
* Module: components
* Purpose: Reusable VTrade logo link that switches by theme (light/dark assets).
* Author: Cursor / BharatERP
* Last-updated: 2026-02-12
* Notes:
* - Uses Tailwind `dark:` classes to swap logo assets without JS/theme hooks.
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
        "inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Image
        src="/vtrade/logo_light.png"
        alt="VTrade logo"
        width={140}
        height={40}
        className={["h-7 w-auto sm:h-8 dark:hidden", imageClassName].filter(Boolean).join(" ")}
        priority={priority}
      />
      <Image
        src="/vtrade/logo_dark.png"
        alt="VTrade logo"
        width={140}
        height={40}
        className={["hidden h-7 w-auto sm:h-8 dark:block", imageClassName].filter(Boolean).join(" ")}
        priority={priority}
      />
    </Link>
  )
}

