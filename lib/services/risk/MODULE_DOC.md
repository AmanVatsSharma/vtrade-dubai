<!--
MODULE_DOC.md
Module: lib/services/risk
Purpose: Risk thresholds + backstop runner + monitoring utilities.
Last-updated: 2026-02-13
-->

## Overview

This module provides **server-side risk configuration** and **operator runners** used by the worker layer and Admin Console.

Key responsibilities:

- Canonical risk thresholds persisted in `SystemSettings` with env fallback (`risk-thresholds.ts`)
- Risk backstop runner that triggers `PositionPnLWorker` only when it is stale (`risk-backstop-runner.ts`)
- Legacy monitoring utilities retained for backward compatibility (`RiskMonitoringService`, etc.)

## Canonical enforcement path

- **Primary enforcer**: `lib/services/position/PositionPnLWorker.ts`
  - Enforces per-position **StopLoss/Target**
  - Enforces account-level **loss utilization** thresholds (warn/auto-close)
- **Backstop runner**: `runRiskBackstop(...)`
  - Checks the positions worker heartbeat via the worker snapshot.
  - Skips when positions worker is healthy (unless `forceRun=true`).
  - When running, invokes `positionPnLWorker.processPositionPnL({ forceRun: true, ... })` with aggressive guardrails.
  - Writes `risk_monitoring_heartbeat` with skip/run metadata for operator visibility.

## Threshold storage

Canonical keys (global `SystemSettings`, `ownerId=null`):

- `risk_warning_threshold`
- `risk_auto_close_threshold`

Rules:

- Values are ratios in range `0..1` (APIs accept `0..100` percent input too).
- Env vars are fallback only (not canonical):
  - `RISK_WARNING_THRESHOLD`
  - `RISK_AUTO_CLOSE_THRESHOLD`

## Admin + Cron APIs

- `GET/PUT /api/admin/risk/thresholds` — read/update canonical thresholds in `SystemSettings`
- `GET/POST /api/admin/risk/monitor` — run unified backstop (skips if positions worker healthy unless `forceRun=true`)
- `GET /api/cron/risk-monitoring` — scheduled backstop (protect with `CRON_SECRET`)

## Files

- `risk-thresholds.ts` — read/write thresholds (SystemSettings + env fallback, cached)
- `risk-backstop-runner.ts` — backstop runner that conditionally triggers positions worker
- `RiskMonitoringService.ts` — legacy monitoring (kept for compatibility; cron/backstop uses `runRiskBackstop`)
- `RiskMonitoringJob.ts`, `RiskMonitoringIntegration.ts`, `RiskEventMonitor.ts` — legacy integration utilities

## Changelog

- 2026-02-13 (IST): Added SystemSettings-backed risk thresholds helper (`risk-thresholds.ts`).
- 2026-02-13 (IST): Added backstop runner (`risk-backstop-runner.ts`) and repurposed risk monitoring cron/admin “run now” to use it.

