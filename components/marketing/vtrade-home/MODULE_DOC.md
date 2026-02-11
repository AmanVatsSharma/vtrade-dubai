# Module: marketing/vtrade-home

**Short:** VTrade public marketing homepage (pixel-close replica of `vtrade.live`).

**Purpose:** Provide a public landing page for the VTrade brand with sections, CTAs, and widgets aligned to the reference homepage.

**Files:**
- `vtrade-homepage.tsx` — page composition (sections in reference order)
- `vtrade-header.tsx` — top navigation + login/signup actions
- `scheduled-upgrade-banner.tsx` — scheduled upgrade banner (env-toggled)
- `joinchat-widget.tsx` — Joinchat-like floating chat widget (env-toggled)
- `marketing-page-shell.tsx` — shared shell for public marketing pages
- `vtrade-sections.tsx` — hero/stats/highlights/platforms/benefits/blog/footer sections
- `index.ts` — barrel exports
- `MODULE_DOC.md` — this document

**Flow diagram:** N/A (static marketing UI).

**Dependencies:**
- Internal: `components/ui/*`, `app/globals.css`
- External: none (assets served from `public/`)

**APIs:** none.

**Env vars:**
- `SITE_BANNER_ENABLED` (default `true`)
- `SITE_BANNER_TITLE` (default: scheduled upgrade title)
- `SITE_BANNER_MESSAGE` (default: scheduled upgrade message)
- `CHAT_WIDGET_ENABLED` (default `true`)
- `CHAT_WIDGET_TITLE` (default: VTrade chat greeting)
- `CHAT_WIDGET_MESSAGE` (default: “Can we help you?”)
- `CHAT_WIDGET_CTA_LABEL` (default: “Open Chat”)
- `CHAT_WIDGET_CTA_HREF` (default: `/contact`)

**Tests:** `tests/marketing/vtrade-homepage-content.test.ts` validates content config shape and internal link policy.

**Change-log:** (auto-updated by Cursor on edits)
- 2026-02-11: Initial module doc created (homepage replication work started).
- 2026-02-11: Added VTrade homepage composition, header, sections, scheduled-upgrade banner, and Joinchat-like widget.
- 2026-02-11: Added marketing page shell and public placeholder pages (blog/news/downloads/contact/products/payment-method).
- 2026-02-11: Exposed marketing env vars and switched chat widget to Radix Popover client component.
- 2026-02-11: Added local marketing assets under `public/vtrade/` and updated auth branding to VTrade.
- 2026-02-11: Centralized homepage copy/links into `lib/marketing/vtrade-homepage-content.ts` and added Zod-based Jest validation.
- 2026-02-11: Fixed Vercel asset redirects by bypassing middleware for static assets (prevents 307 to `/auth/login` for `/vtrade/*` and other files).
- 2026-02-11: Premium branding pass — added VTrade marketing tokens/utilities, upgraded header + CTAs + card depth/hover, added platform SVG icons, and added sticky platform quick-access bar.
- 2026-02-11: Polished footer to premium dark VTrade style, fixed mobile header menu toggle behavior, and made floating platform buttons more prominent.
- 2026-02-11: Switched marketing pages to a shared orange gradient background (consistent across sections) and moved download/platform buttons to compact vertical right-side stack across all marketing pages.
- 2026-02-11: Switched floating platform downloads to compact vertical stack (right side) and applied a shared gradient backdrop behind all non-hero sections for consistent section styling.
- 2026-02-11: Switched floating platform buttons to compact vertical right-side stack (tooltip labels on hover).

