<!--
MODULE_DOC.md
Module: components/trading/realtime
Purpose: Document the dashboard realtime sync model (orders/positions/account) and PnL mode behavior.
Last-updated: 2026-02-04
-->

## Overview

This module powers a flicker-free trading UX on `/dashboard`:

- Single SSE subscription + coalesced refreshes (orders/positions/account).
- SWR cache patching on SSE events for instant UI.
- Polling convergence fallback for serverless.

Key file:

- `components/trading/realtime/trading-realtime-provider.tsx`

## Trading Sync Coordinator

The provider establishes **one** shared SSE subscription and coalesces lifecycle events to refresh dependent slices together:

- `order_placed` → orders + account
- `order_executed/order_cancelled` → orders + positions + account
- `position_*` → positions + orders + account
- `balance_updated/margin_*` → account

This prevents partial refresh flicker (e.g., order executed but position not yet refreshed).

## PnL modes (client vs server)

PnL mode comes from `/api/trading/positions/list` response meta:

- `meta.pnlMode`: `client | server`
- `meta.workerHealthy`: boolean

### Client mode (default; Vercel safe)

- UI computes PnL from live quotes for **real-time** feel.\n+- Falls back to API-provided values when quotes are missing.

### Server mode (EC2/cron worker)

- A worker computes and persists `Position.unrealizedPnL` and `Position.dayPnL` in DB.\n+- When `pnlMode=server` **and** `workerHealthy=true`, UI **does not override** PnL using live quotes (prevents mismatch/flicker).\n+- If worker is not healthy, UI safely falls back to client calculations.

Admin toggle:

- `SystemSettings.key = position_pnl_mode` (`client` or `server`)

Worker heartbeat:

- `SystemSettings.key = positions_pnl_worker_heartbeat`

## Changelog

- **2026-02-04**: Added PnL mode support and worker health gating for client-side PnL overrides.

