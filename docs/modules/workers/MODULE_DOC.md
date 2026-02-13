# Module: workers

**Short:** Admin-facing worker registry snapshot + heartbeat health rules.

**Purpose:** Provide a single operational view of background workers (order execution, position PnL, risk backstop), including enable flags, heartbeat freshness, and Redis realtime readiness.

**Key files:**
- `lib/server/workers/registry.ts` — builds snapshot + health status, reads/writes heartbeats
- `lib/server/workers/types.ts` — snapshot types returned to UI
- `app/api/admin/workers/route.ts` — admin API endpoint (read + manage)
- `components/admin-console/workers.tsx` — Admin Console Workers page

**APIs:**
- `GET /api/admin/workers` — list workers with heartbeat health
- `POST /api/admin/workers` — toggle, run-once, set PnL mode

## Risk: canonical enforcer + backstop

- **Canonical enforcer**: `PositionPnLWorker` (server-side PnL + SL/TP + risk auto square-off).
- **Backstop**: `risk_monitoring` is repurposed as a safety net runner that triggers the positions worker only when the positions worker heartbeat is stale (unless force-run).
  - Cron endpoint: `GET /api/cron/risk-monitoring`
  - Admin run-now: `POST /api/admin/risk/monitor`

Risk thresholds are stored in **SystemSettings** (canonical) with env fallback:

- `risk_warning_threshold`
- `risk_auto_close_threshold`

**Env vars:**
- `REDIS_URL` (optional) — enables Redis readiness signals in snapshot
- `REDIS_POSITIONS_PNL_TTL_SECONDS` (default `120`)
- `REDIS_POSITIONS_PNL_MAX_AGE_MS` (default `15000`)

**Change-log:**
- 2026-02-04 (IST): Added workers management API + UI with heartbeats and run-once actions.
- 2026-02-13 (IST): Workers snapshot/UI now surfaces Redis realtime readiness + richer heartbeat stats for ops. Risk monitoring is now documented as a backstop runner (positions worker is canonical).

