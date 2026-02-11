/**
 * File: components/marketing/vtrade-home/scheduled-upgrade-banner.tsx
 * Module: marketing/vtrade-home
 * Purpose: Render vtrade.live-like scheduled upgrade banner (env-toggled).
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - This is NOT tied to MAINTENANCE_MODE (that redirects to /maintenance via middleware).
 * - Controlled via SITE_BANNER_* env vars exposed from next.config.mjs.
 */

import React from "react"

function isEnabled(value: string | undefined, fallback = true): boolean {
  if (value === undefined) return fallback
  return value === "true"
}

export function ScheduledUpgradeBanner(): React.JSX.Element | null {
  const enabled = isEnabled(process.env.SITE_BANNER_ENABLED, true)
  if (!enabled) return null

  const title = process.env.SITE_BANNER_TITLE || "🚧 Scheduled Server Upgrade in Progress"
  const message =
    process.env.SITE_BANNER_MESSAGE ||
    "To provide you with enhanced performance, strengthened security, and an overall improved trading experience, we are currently upgrading our servers. During this period, some services may be temporarily unavailable. We appreciate your patience and understanding as we work to deliver a faster, more secure, and more reliable platform. Thank you for choosing VTrade. Your experience and security remain our top priority."

  return (
    <section
      aria-label="Scheduled upgrade notice"
      className="w-full border-t border-b border-amber-200/70 bg-amber-50"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-sm font-semibold text-amber-900">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-amber-900/90">{message}</p>
      </div>
    </section>
  )
}

