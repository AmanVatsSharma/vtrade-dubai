/**
 * File: tests/marketing/vtrade-homepage-content.test.ts
 * Module: tests/marketing
 * Purpose: Validate VTrade marketing homepage content config shape and link policy.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Uses Zod to enforce DTO-like structure for frontend config.
 */

import { z } from "zod"
import { VTRADE_HOMEPAGE_CONTENT } from "@/lib/marketing/vtrade-homepage-content"

const internalHref = z.string().refine((v) => v.startsWith("/") || v.startsWith("#"), {
  message: "href must start with '/' or '#'",
})

const schema = z.object({
  hero: z.object({
    headline: z.string().min(1),
    productTabs: z.array(z.string().min(1)).min(1),
    subheadline: z.string().min(1),
    ctas: z.object({
      primaryLabel: z.string().min(1),
      primaryHref: internalHref,
      secondaryLabel: z.string().min(1),
      secondaryHref: internalHref,
    }),
  }),
  stats: z.object({
    value: z.string().min(1),
    label: z.string().min(1),
    ctas: z.object({
      leftLabel: z.string().min(1),
      leftHref: internalHref,
      rightLabel: z.string().min(1),
      rightHref: internalHref,
    }),
  }),
  highlights: z.array(z.string().min(1)),
  platforms: z.array(z.object({ label: z.string().min(1), href: internalHref })),
  blogTitles: z.array(z.string().min(1)),
})

describe("VTRADE_HOMEPAGE_CONTENT", () => {
  it("matches expected shape", () => {
    const parsed = schema.parse(VTRADE_HOMEPAGE_CONTENT)
    expect(parsed.hero.productTabs.length).toBeGreaterThanOrEqual(4)
  })

  it("keeps the vtrade.live reference counts (high-signal)", () => {
    expect(VTRADE_HOMEPAGE_CONTENT.highlights).toHaveLength(4)
    expect(VTRADE_HOMEPAGE_CONTENT.platforms).toHaveLength(4)
    expect(VTRADE_HOMEPAGE_CONTENT.blogTitles).toHaveLength(4)
  })
})

