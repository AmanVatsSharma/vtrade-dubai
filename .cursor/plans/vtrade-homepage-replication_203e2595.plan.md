---
name: vtrade-homepage-replication
overview: Replicate the public-facing vtrade.live homepage (pixel-close) inside this Next.js app and rebrand UI text/assets from MarketPulse360 to VTrade, including the homepage maintenance banner and a Joinchat-like chat widget, while routing CTAs to internal app pages.
todos:
  - id: public-homepage-route
    content: Make `/` a public route in `middleware.ts` so logged-out users can access marketing homepage.
    status: completed
  - id: vtrade-homepage-components
    content: Create `components/marketing/vtrade-home/` components and rebuild `app/page.tsx` to match vtrade.live section structure and copy.
    status: completed
  - id: banner-chat-widgets
    content: Add scheduled-upgrade banner (env-toggled) and Joinchat-like floating widget as a client component.
    status: in_progress
  - id: rebrand-metadata-assets
    content: Update `app/layout.tsx` metadata and `components/auth/AuthHeader.tsx` logo/alt text to VTrade; add `public/vtrade/` assets.
    status: pending
  - id: docs-tests
    content: Add `MODULE_DOC.md` + content-schema test (`tests/marketing/vtrade-homepage-content.test.ts`) validating homepage content config.
    status: pending
isProject: false
---

### Goal

- Replace the current root homepage with a **pixel-close** replica of the marketing homepage from `[vtrade.live](https://vtrade.live/)` and **rebrand the app to VTrade** (titles/logos/copy where user-facing).
- Keep CTAs **internal** (e.g. `/auth/login`, `/auth/register`) while preserving the same section structure and text.
- Include the **Scheduled Server Upgrade** banner and a **Joinchat-like** floating chat widget.

### Key constraints / repo realities

- This is a **Next.js 14 App Router** repo (see `app/`, `next.config.mjs`, Tailwind v4 in `app/globals.css`).
- `**/` is currently not public** because `middleware.ts` has `"/"` commented out in `publicRoutes`. To serve a marketing homepage to logged-out users, we must make `/` public.
- Direct HTML fetch of `vtrade.live` times out, but the section structure/text/links were extracted via a live browser run.

### Target homepage structure (match `vtrade.live`)

- **Header**: Logo “VTrade” + nav (Home, About us, Products, News & Blogs, Contact, Payment Method) + right actions (Login/Signup).
- **Hero**: “Trade With Zero Brokerage & 500X Margin” + product tabs (Indian Stocks (F&O), Indian Commodities, COMEX, US Stocks) + “Trade Smart With VTrade.live” + CTAs (“Get started”, “Why V Trade”).
- **Stats**: “₹98.2 Crore” + “BROKERAGE SAVED” + CTAs (“Know More”, “Trade Now”).
- **Highlights**: 4 items (Zero Brokerage, 24/7 Deposit And Withdrawal, Upto 500x Margin, Indian + US Stocks & Commodities).
- **Payments/Settlement**: “Cash Settlement” + payment image.
- **Platforms**: Android / IOS / Desktop / Web cards.
- **Benefits**: “Enjoy Maximum Profits with ZERO BROKERAGE” + supporting copy.
- **Margin**: “500x Margin For Maximum Returns” section.
- **Feature cards**: Secure Investment, Zero Brokerage, 500x Margin Facilities, 24x7 Deposit & Withdrawal, Round-The-Clock Customer Support.
- **Open Live Account** CTA section.
- **Payments Update** section.
- **Blog preview**: 4 blog cards with titles.
- **Maintenance banner**: “🚧 Scheduled Server Upgrade in Progress” block.
- **Chat widget**: bottom-right joinchat-like widget.

### Implementation approach (what I’ll change)

- **Public homepage access**
  - Update `[middleware.ts](middleware.ts)` to include `"/"` in `publicRoutes` so logged-out users can see the marketing homepage.
- **Rebuild the homepage (clean componentization)**
  - Replace `[app/page.tsx](app/page.tsx)` with a server-first page that composes small, reusable marketing components.
  - Add a new component folder `components/marketing/vtrade-home/` with:
    - `vtrade-header.tsx` (nav + Login/Signup)
    - `vtrade-hero.tsx`
    - `vtrade-stats.tsx`
    - `vtrade-highlights.tsx`
    - `vtrade-platforms.tsx`
    - `vtrade-benefits.tsx`
    - `vtrade-blog-preview.tsx`
    - `scheduled-upgrade-banner.tsx`
    - `joinchat-widget.tsx` (client component using Radix/your existing UI primitives)
    - `MODULE_DOC.md` (purpose, section map, changelog)
  - Use `next/image` and ship required assets into `public/vtrade/` (logo + the key section images) to avoid external hotlinking.
- **Internal link mapping (keep text, change targets)**
  - Map homepage buttons/links to internal routes:
    - Login → `/auth/login`
    - Signup → `/auth/register`
    - Get started / Trade Now / Open Live Account → `/auth/register` (or `/dashboard` if you prefer; we’ll implement a single consistent target)
    - Why V Trade / Know More → internal section anchor like `/#why-vtrade` (and we’ll render that section)
    - Platform downloads → `/downloads` (new page) or `/#platforms` (depending on how you want to distribute binaries later)
    - Blog cards → internal `/blog` route placeholder (or keep as external later)
- **Maintenance banner and chat widget**
  - Implement `scheduled-upgrade-banner.tsx` as a **site banner** independent of `MAINTENANCE_MODE` (because `MAINTENANCE_MODE=true` currently redirects to `/maintenance`).
  - Add env-controlled copy for the banner via `next.config.mjs` (e.g. `SITE_BANNER_ENABLED`, `SITE_BANNER_MESSAGE`) so you can toggle without code changes.
  - Implement `joinchat-widget.tsx` as a local UI replica (no external Joinchat script), with configurable contact target (WhatsApp URL / support email) via env.
- **Rebrand (user-facing surfaces)**
  - Update `[app/layout.tsx](app/layout.tsx)` metadata title/description from MarketPulse360 → **VTrade**.
  - Update `[components/auth/AuthHeader.tsx](components/auth/AuthHeader.tsx)` to use the new VTrade logo asset + alt text.
  - Search/replace key visible “MarketPulse360” strings in UI entrypoints (homepage, auth header, any global nav) while leaving internal docs/history alone unless they’re rendered to users.
- **Docs + tests (fits existing Jest setup)**
  - Add `lib/marketing/vtrade-homepage-content.ts` containing the homepage text/link config.
  - Add `tests/marketing/vtrade-homepage-content.test.ts` using **Zod** (already a dependency) to validate:
    - required section text exists
    - all internal links start with `/` or `#`
    - blog card titles count is 4
  - Update `components/marketing/vtrade-home/MODULE_DOC.md` changelog entry for the change.

### Test plan

- `npm run type-check`
- `npm test`
- Manual:
  - logged-out visit `/` shows marketing homepage (no redirect)
  - Login/Signup links go to `/auth/login` and `/auth/register`
  - Mobile: header collapses cleanly; chat widget usable; banner readable

