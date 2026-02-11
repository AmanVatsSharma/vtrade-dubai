/**
 * File: components/marketing/vtrade-home/joinchat-widget.tsx
 * Module: marketing/vtrade-home
 * Purpose: Joinchat-like floating chat widget (no external script).
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Client component using Radix Popover to match “floating chat” behavior.
 * - CTA defaults to internal `/contact` per project decision.
 */

"use client"

import React from "react"
import Link from "next/link"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

function isEnabled(value: string | undefined, fallback = true): boolean {
  if (value === undefined) return fallback
  return value === "true"
}

export function JoinchatWidget(): React.JSX.Element | null {
  const enabled = isEnabled(process.env.CHAT_WIDGET_ENABLED, true)
  if (!enabled) return null

  const title = process.env.CHAT_WIDGET_TITLE || "Hi Hello 👋, welcome to VTrade"
  const message = process.env.CHAT_WIDGET_MESSAGE || "Can we help you?"
  const ctaLabel = process.env.CHAT_WIDGET_CTA_LABEL || "Open Chat"
  const ctaHref = process.env.CHAT_WIDGET_CTA_HREF || "/contact"

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            aria-label="Open chat widget"
          >
            <span className="h-2 w-2 rounded-full bg-white/90" />
            <span>Open Chat</span>
          </button>
        </PopoverTrigger>

        <PopoverContent align="end" side="top" sideOffset={12} className="w-[340px] p-0">
          <div className="overflow-hidden rounded-xl border bg-white shadow-2xl">
            <div className="bg-emerald-600 px-4 py-3">
              <p className="text-sm font-semibold text-white">{title}</p>
            </div>
            <div className="px-4 py-4">
              <p className="text-sm text-slate-700">{message}</p>
              <div className="mt-4 flex items-center justify-between">
                <Link
                  href={ctaHref}
                  className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  {ctaLabel}
                </Link>
                <span className="text-xs text-slate-400">Powered by Joinchat</span>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

