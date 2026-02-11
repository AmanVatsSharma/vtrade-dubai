/**
 * File: app/page.tsx
 * Module: app
 * Purpose: Public marketing homepage for VTrade (pixel-close replica of vtrade.live).
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Route `/` is public via `middleware.ts` so logged-out visitors can access it.
 */

import React from "react"
import { VTradeHomepage } from "@/components/marketing/vtrade-home/vtrade-homepage"

export default function HomePage(): React.JSX.Element {
  return <VTradeHomepage />
}
