<!--
MODULE_DOC.md
Module: lib/services/position
Purpose: Position management + server-side PnL computation worker.
Last-updated: 2026-02-04
-->

## Overview

This module owns:

- Position lifecycle operations (close, update SL/Target) via `PositionManagementService`.
- Optional **server-side PnL computation** via `PositionPnLWorker` (EC2/Docker or cron).

## Server-side Position PnL (unrealized/day)

### Why

Client-side PnL uses live quotes and is great on `/dashboard`, but in enterprise deployments you may want:

- Consistent PnL values persisted in DB (reporting, admin views).
- A mode that still works when client quotes are degraded.

### Data model

Prisma `Position` fields:

- `unrealizedPnL` (Decimal(18,2))
- `dayPnL` (Decimal(18,2))

### Worker implementation

Files:

- `lib/services/position/PositionPnLWorker.ts`
- `scripts/position-pnl-worker.ts`
- `app/api/cron/position-pnl-worker/route.ts`

Computation:

- `unrealizedPnL = (currentPrice - averagePrice) * quantity`
- `dayPnL = (currentPrice - prevClose) * quantity`

Price inputs:

- Quotes are sourced from the **same live marketdata WebSocket feed** used by `/dashboard` via the server-side cache:
  - `lib/market-data/server-market-data.service.ts`
- Quote normalization is centralized in `lib/services/position/quote-normalizer.ts`.

Env (server worker):

- `LIVE_MARKET_WS_URL` (fallback: `NEXT_PUBLIC_LIVE_MARKET_WS_URL`)
- `LIVE_MARKET_WS_API_KEY` (fallback: `NEXT_PUBLIC_LIVE_MARKET_WS_API_KEY`)
- `MARKETDATA_QUOTE_MAX_AGE_MS` (default: `7500`)
- `REDIS_URL` (optional; enables cross-process SSE + PnL cache for smooth dashboard updates)
- `REDIS_POSITIONS_PNL_TTL_SECONDS` (default: `120`)
- `REDIS_POSITIONS_PNL_MAX_AGE_MS` (default: `15000`)

### Update threshold

To prevent DB/SSE spam, the worker skips updates when both deltas are below a threshold (default ₹1).

Env:

- `POSITION_PNL_UPDATE_THRESHOLD` (default: `1`)

## Runbook

### EC2/Docker (recommended)

Run alongside the web app:

```bash
POSITION_PNL_WORKER_INTERVAL_MS=3000 \
POSITION_PNL_WORKER_BATCH_LIMIT=500 \
POSITION_PNL_UPDATE_THRESHOLD=1 \
pnpm tsx scripts/position-pnl-worker.ts
```

### Serverless cron (Vercel / EventBridge)

Schedule a call to:

- `GET /api/cron/position-pnl-worker?limit=500&updateThreshold=1`

Auth:

- `Authorization: Bearer $CRON_SECRET`

## Heartbeat and admin visibility

The worker writes a heartbeat entry to `SystemSettings`:

- key: `positions_pnl_worker_heartbeat`
- value: JSON `{ lastRunAtIso, host, pid, scanned, updated, ... }`

Admin Console uses it to show **Worker Active** vs **Not Active**.

## Changelog

- **2026-02-04**: Added `PositionPnLWorker` + cron endpoint + EC2 script + heartbeat setting + admin toggle support.
- **2026-02-12**: Server-side PnL worker now uses the platform marketdata WebSocket feed (server quote cache) instead of Vortex HTTP quote batching.
- **2026-02-12**: Added Redis-backed PnL cache + batched SSE event `positions_pnl_updated` to keep `/dashboard` smooth without frequent refetches.
- **2026-02-13**: Extended PnL worker heartbeat with Redis cache write + emit counters for better Admin Console observability.

