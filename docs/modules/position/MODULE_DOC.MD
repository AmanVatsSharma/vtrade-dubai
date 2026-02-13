# Module: position

**Short:** Position lifecycle operations + optional server-side PnL worker.

**Purpose:** Maintain correct position state, and (optionally) persist server-computed PnL for reporting/admin views.

**Key files:**
- `lib/services/position/PositionManagementService.ts` — close/update SL/Target operations
- `lib/services/position/PositionPnLWorker.ts` — computes `unrealizedPnL` and `dayPnL` and persists into DB
- `lib/services/position/quote-normalizer.ts` — normalizes quote shapes into `currentPrice` + `prevClose`
- `scripts/position-pnl-worker.ts` — long-running loop runner
- `app/api/cron/position-pnl-worker/route.ts` — cron backstop trigger

**PnL formulas:**
- `unrealizedPnL = (currentPrice - averagePrice) * quantity`
- `dayPnL = (currentPrice - prevClose) * quantity`

**Quote source of truth:**
- Prefer **server WS quote cache** (same marketdata feed as `/dashboard`): `lib/market-data/server-market-data.service.ts`
- Fallback to DB `Stock.ltp` when quote is missing/stale

**Mode toggle + heartbeat:**
- `SystemSettings.key = position_pnl_mode` (`client` or `server`)
- `SystemSettings.key = positions_pnl_worker_heartbeat` (JSON heartbeat for admin visibility)

**Env vars:**
- `CRON_SECRET` (cron auth)
- `LIVE_MARKET_WS_URL`, `LIVE_MARKET_WS_API_KEY` (server quote cache; fallback to `NEXT_PUBLIC_*`)
- `MARKETDATA_QUOTE_MAX_AGE_MS` (default `7500`)
- `REDIS_URL` (optional; enables cross-process realtime + PnL cache)
- `REDIS_POSITIONS_PNL_TTL_SECONDS` (default `120`)
- `REDIS_POSITIONS_PNL_MAX_AGE_MS` (default `15000`)
- `POSITION_PNL_UPDATE_THRESHOLD` (default `1`)
- `RISK_WARNING_THRESHOLD` (default `0.80`)
- `RISK_AUTO_CLOSE_THRESHOLD` (default `0.90`)

**Tests:**
- `tests/position/quote-normalizer.test.ts`
- `tests/position/position-pnl-worker.test.ts`

**Change-log:**
- 2026-02-04: Added `PositionPnLWorker` + cron endpoint + EC2 script + heartbeat + admin toggle support.
- 2026-02-12: PnL worker now uses server WS quote cache instead of Vortex HTTP quote batching.
- 2026-02-12: Added Redis-backed PnL cache + batched `positions_pnl_updated` realtime event to avoid frequent refetches.
- 2026-02-13: PnL worker heartbeat now includes Redis cache write + emit counters for improved Admin Console visibility.
- 2026-02-13: PnL worker now enforces StopLoss/Target + account risk thresholds and can auto square-off server-side.
- 2026-02-13: Position close path now uses Postgres advisory xact lock for idempotency across UI + workers.

