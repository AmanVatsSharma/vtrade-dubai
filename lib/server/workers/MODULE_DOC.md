<!--
MODULE_DOC.md
Module: lib/server/workers
Purpose: Central registry + health snapshot for background workers (Admin Console).
Last-updated: 2026-02-13
-->

## Overview

This module owns the **worker registry** used by Admin Console to:

- Fetch a unified snapshot of worker status (`enabled`, `health`, `lastRunAtIso`)
- Store/parse worker **heartbeats** from `SystemSettings`
- Provide safe, non-secret **config hints** for operators (cron endpoints, EC2 commands, Redis readiness)

As of 2026-02-13 (IST), **risk monitoring is treated as a backstop runner**:

- The canonical enforcer is `PositionPnLWorker` (runs continuously on EC2).
- The `risk_monitoring` cron/API should only run when the positions worker is stale (unless force-run).

## Heartbeats

Heartbeats are stored in `SystemSettings` as JSON values.

Key rules:

- Heartbeat keys are per worker (e.g. `order_worker_heartbeat`, `positions_pnl_worker_heartbeat`)
- Value must include `lastRunAtIso`
- Backward-compatible parsing: accepts JSON or a plain ISO string
- Health is derived as `healthy`/`stale`/`unknown`/`disabled` based on TTL and enabled flag

### Backstop heartbeat fields (risk monitoring)

The `risk_monitoring_heartbeat` JSON may include operational fields like:

- `source`: `"backstop"`
- `skipped`: boolean
- `skippedReason`: e.g. `"positions_worker_healthy"`
- `pnlWorkerHealth`: snapshot health string for the positions worker
- `pnlWorkerLastRunAtIso`: last run timestamp of the positions worker
- `positionWorkerHeartbeat`: embedded `PositionPnLWorker` heartbeat (optional, for operator visibility)

## Redis readiness

If `REDIS_URL` is configured, the registry surfaces `redisEnabled=true` and sets:

- `realtimeBus = "redis_pubsub"` (cross-process worker → app realtime delivery)
- Position PnL cache knobs (`redisPnlCacheTtlSeconds`, `redisPnlMaxAgeMs`, key prefix)

This is informational only; worker processes must also be configured with the same env.

## Files

- `registry.ts` — snapshot builder + health computation + heartbeat upsert helpers
- `types.ts` — shared types returned to Admin Console
- `MODULE_DOC.md` — this file

## APIs (consumers)

- `GET /api/admin/workers` — returns snapshot (used by `components/admin-console/workers.tsx`)
- `POST /api/admin/workers` — run-once / toggle / set-mode actions

## Env vars

- `REDIS_URL` (optional): enables Redis realtime bus + cache signals
- `REDIS_POSITIONS_PNL_TTL_SECONDS` (default: `120`)
- `REDIS_POSITIONS_PNL_MAX_AGE_MS` (default: `15000`)

## Tests

No dedicated unit tests yet (covered indirectly by admin API behavior).

## Change-log

- 2026-02-04 (IST): Added worker registry snapshot + heartbeat rules for Admin Console workers management.
- 2026-02-13 (IST): Snapshot now surfaces Redis readiness + PnL cache knobs for better ops visibility.
- 2026-02-13 (IST): Documented risk backstop heartbeat fields and clarified canonical enforcement path (positions worker primary).

