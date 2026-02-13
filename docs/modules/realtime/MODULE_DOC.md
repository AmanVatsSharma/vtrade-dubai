# Module: realtime

**Short:** Cross-process realtime delivery for trading events (SSE to browser, Redis bus between processes).

**Purpose:** Ensure `/dashboard` receives order/position/account updates smoothly even when workers run in separate EC2 processes.

## Architecture

- **Browser transport:** SSE (`GET /api/realtime/stream`)
- **In-process fanout:** `lib/services/realtime/RealtimeEventEmitter.ts`
- **Cross-process bus:** Redis Pub/Sub (`realtime:user:<userId>`)

### Event sources

- Prisma middleware on DB writes emits lifecycle events:
  - `order_*`, `position_*`, `balance_updated`, watchlist events
- Position PnL worker emits **high-frequency PnL** event:
  - `positions_pnl_updated` (batched per user)

### Cache

- Redis stores the latest computed PnL per position for fast API overlay:\n  - `positions:pnl:<positionId>` → JSON `{ unrealizedPnL, dayPnL, currentPrice, updatedAtMs }`
- `GET /api/trading/positions/list` overlays Redis PnL when fresh, otherwise falls back to DB.

## Key files

- `app/api/realtime/stream/route.ts` — SSE endpoint
- `lib/services/realtime/RealtimeEventEmitter.ts` — manages SSE controllers + Redis bridge\n- `lib/services/realtime/redis-realtime-bus.ts` — Redis envelope + per-user channels
- `lib/redis/redis-client.ts` — server-only Redis wrapper (pub/sub + cache)\n- `lib/services/position/PositionPnLWorker.ts` — writes Redis PnL + emits batched event

## Env vars

- `REDIS_URL` (e.g. `redis://127.0.0.1:6379`)\n- `REDIS_POSITIONS_PNL_TTL_SECONDS` (default `120`)\n- `REDIS_POSITIONS_PNL_MAX_AGE_MS` (default `15000`)

## Tests

- `tests/realtime/realtime-emitter-redis-bridge.test.ts`

## Change-log

- 2026-02-12: Added Redis-backed realtime bus + PnL cache to avoid polling/refetch jitter.
- 2026-02-13: Removed `server-only` marker imports so `tsx` workers don’t crash when importing realtime/redis modules.

