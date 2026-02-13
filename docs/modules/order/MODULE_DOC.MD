# Module: order

**Short:** Order placement + async execution worker.

**Purpose:** Accept orders quickly, execute asynchronously, and keep `/dashboard` consistent via realtime events.

**Key files:**
- `lib/services/order/OrderExecutionService.ts` — validates + places orders (creates `PENDING`)
- `lib/services/order/OrderExecutionWorker.ts` — executes `PENDING` orders (advisory lock, transactional updates)
- `app/api/trading/orders/route.ts` — HTTP API contract (202 Accepted + `executionScheduled`)
- `app/api/cron/order-worker/route.ts` — cron backstop trigger

**Live-data integration:**
- Order/position/account DB updates emit realtime SSE events via Prisma middleware
- Client coalesces refreshes (orders/positions/account) to avoid partial-state flicker

**Execution price source of truth:**
- Prefer `order.averagePrice`/`order.price`
- Fallback to **server WS quote cache** (same marketdata feed as `/dashboard`)
- Last fallback to DB `Stock.ltp`

**Deployment patterns:**
- EC2/Docker: run app + `scripts/order-worker.ts` loop
- Serverless: use cron endpoint as a backstop

**Env vars:**
- `CRON_SECRET` (cron auth)
- `LIVE_MARKET_WS_URL`, `LIVE_MARKET_WS_API_KEY` (server quote cache; fallback to `NEXT_PUBLIC_*`)

**Tests:**
- `tests/order/order-execution-worker.test.ts`
- `tests/order/order-execution.service.test.ts`

**Change-log:**
- 2026-02-03: Added async execution worker + cron trigger; avoided nested transactions.
- 2026-02-04: Added advisory lock + serverless `waitUntil()` best-effort execution.
- 2026-02-12: Execution price fallback prefers server WS quote cache before DB `Stock.ltp`.
- 2026-02-13: Order worker heartbeat includes `redisEnabled` so Admin Console can confirm Redis realtime readiness for cross-process updates.

