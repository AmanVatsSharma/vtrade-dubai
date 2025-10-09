# Console Mobile Fix + Deposits Configuration

## Summary
- Fixed mobile scroll freeze on `/console` by:
  - Replacing `h-screen` with `min-h-[100dvh]` to handle iOS/Android dynamic viewport.
  - Ensuring the scrollable content uses `overflow-y-auto`, `overscroll-y-contain`, `scroll-smooth`, and `touchAction: 'pan-y'` with `-webkit-overflow-scrolling: touch`.
  - Keeping sidebar drawer body scroll lock only when open.
- Wired deposits UPI modal to admin-configurable settings:
  - Admin uploads QR image and sets UPI ID in `/admin-console` → Settings.
  - User `/console` deposits section reads `payment_qr_code` and `payment_upi_id` via `/api/admin/settings`.
  - `UPIPaymentModal` accepts `upiId` and `qrCodeUrl` props with safe fallbacks.

## Flow
1. Admin
   - Go to `/admin-console` → Settings → Payment Settings
   - Upload QR image (stored via `/api/admin/upload` to S3)
   - Enter UPI ID → Save
   - API persists into `SystemSettings` with keys `payment_qr_code`, `payment_upi_id`
2. User
   - Go to `/console` → Deposits → select UPI → Proceed
   - `DepositsSection` fetches settings and passes to `UPIPaymentModal`
   - Modal shows QR and UPI, supports copy and screenshot upload, returns UTR

## Key Files
- `components/console/console-layout.tsx`
  - root: `min-h-[100dvh]`
  - main: `overflow-y-auto overscroll-y-contain scroll-smooth`, style: `WebkitOverflowScrolling: 'touch', touchAction: 'pan-y'`
- `components/console/console-loading-state.tsx` → `min-h-[100dvh]`
- `components/console/console-error-boundary.tsx` → `min-h-[100dvh]`
- `components/console/sections/deposits-section.tsx`
  - Loads `payment_qr_code` + `payment_upi_id` and passes to modal
- `components/console/deposits/upi-payment-modal.tsx`
  - New props: `upiId?`, `qrCodeUrl?`; fallbacks retained
- `components/admin-console/settings.tsx`
  - Uploads QR, saves UPI via `/api/admin/settings`
  - Uses `/api/admin/upload` for S3
- `app/api/admin/settings/route.ts` and `prisma/schema.prisma (SystemSettings)`

## Testing Checklist
- Mobile Safari/Chrome: open `/console`, scroll all sections, open/close sidebar.
- `/console` → Deposits → UPI modal shows admin QR and UPI ID.
- Copy UPI ID works, timer counts down, submit UTR flows.
- Admin: change QR/UPI, user modal reflects changes after refresh.

## Notes
- We intentionally still lock body scroll only while the mobile sidebar drawer is open.
- If any other page uses `h-screen`, consider similar `min-h-[100dvh]` swap.
