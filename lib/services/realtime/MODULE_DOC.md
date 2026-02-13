<!--
MODULE_DOC.md
Module: lib/services/realtime
Purpose: Cross-process realtime delivery (SSE to browser, Redis Pub/Sub between processes).
Last-updated: 2026-02-13
-->

## Overview

This module owns the **server-side realtime fanout** for trading lifecycle events:

- Browser transport: **SSE** via `GET /api/realtime/stream`
- In-process delivery: `RealtimeEventEmitter` manages connected SSE controllers per user
- Cross-process delivery: optional **Redis Pub/Sub** bridge so workers (separate Node processes) can reach app SSE connections

## Why Redis

On EC2 we commonly run:

- Next.js app (one Node process)
- Order/positions workers (separate Node processes)

An in-memory emitter can’t cross process boundaries. Redis solves that by acting as a shared event bus.

## Implementation

Files:

- `RealtimeEventEmitter.ts`\n  - `emit(userId, event, data)` delivers locally and publishes to Redis (when enabled)\n  - `subscribe(userId, controller)` registers controller and ensures Redis subscription exists\n  - Redis-delivered messages are delivered locally only (no re-publish; prevents loops)\n
- `redis-realtime-bus.ts`\n  - Publishes/consumes per-user channels: `realtime:user:<userId>`\n  - Envelope includes `sourceInstanceId` to ignore self\n
## Events

- Lifecycle events emitted on DB writes (from Prisma middleware):\n  `order_*`, `position_*`, `balance_updated`, watchlist events\n- High-frequency server PnL event emitted by `PositionPnLWorker`:\n  - `positions_pnl_updated` (batched)\n
## Env vars

- `REDIS_URL` (e.g. `redis://127.0.0.1:6379`) enables the bridge.\n
## Changelog

- **2026-02-13**: Added Redis Pub/Sub bridge for cross-process realtime delivery.

