# Server-Side Risk Management System

## Overview

This document describes the server-side risk management system that enforces **SL/TP + account loss thresholds** inside the long-running **Positions PnL Worker** and provides a **backstop runner** for cron/admin “run now”.

> **Update (2026-02-13 IST)**: Risk enforcement is now integrated into `lib/services/position/PositionPnLWorker.ts`.  
> `/api/admin/risk/monitor` and `/api/cron/risk-monitoring` run the **Risk Backstop** (skips when positions worker is healthy unless `forceRun=true`).  
> Canonical thresholds are stored in **SystemSettings** via `GET/PUT /api/admin/risk/thresholds` (env fallback remains supported).

## Problem Statement

Previously, P&L was calculated only on the client side. This led to several critical issues:

1. **Client-Side Only Calculation**: P&L was calculated in the browser using `useMemo`, meaning it only worked when the app was open
2. **No Server-Side Monitoring**: Positions could remain open even when losses exceeded available margin
3. **Recovery Risk**: Users could see losses exceed their funds, but positions would remain open and potentially recover, when they should have been closed at the loss threshold
4. **No Automatic Closure**: There was no mechanism to automatically close positions when risk thresholds were breached

## Solution Architecture

### Components

1. **PositionPnLWorker** (`lib/services/position/PositionPnLWorker.ts`)
   - Canonical server-side enforcer
   - Calculates live P&L using the server market-data quote cache
   - Enforces per-position StopLoss/Target and account loss-utilization thresholds
   - Creates `RiskAlert` rows (throttled) for operator visibility

2. **Risk thresholds helper** (`lib/services/risk/risk-thresholds.ts`)
   - Reads/writes canonical thresholds from `SystemSettings` (env fallback supported)
   - Keys:
     - `risk_warning_threshold`
     - `risk_auto_close_threshold`

3. **Risk backstop runner** (`lib/services/risk/risk-backstop-runner.ts`)
   - Safety net runner used by cron/admin
   - Skips when positions worker is healthy (unless force-run)
   - When running, triggers `PositionPnLWorker.processPositionPnL({ forceRun: true, ... })`

4. **API Endpoints**
   - `GET/PUT /api/admin/risk/thresholds` — read/update canonical thresholds
   - `GET/POST /api/admin/risk/monitor` — run risk backstop (admin-only)
   - `GET/POST /api/cron/risk-monitoring` — cron backstop endpoint (protected by secret)

5. **Admin Console Integration**
   - Risk Management → Risk Monitoring tab:
     - Edit canonical thresholds (SystemSettings)
     - Run the unified backstop and view a worker-run summary (may be skipped if positions worker is healthy)

## How It Works

### Risk Monitoring Flow

```
1. Monitor All Accounts
   ↓
2. For each account with open positions:
   a. Calculate unrealized P&L server-side using live market data
   b. Calculate margin utilization: |Unrealized P&L| / Available Funds
   c. Check thresholds:
      - ≥ 80%: Create HIGH severity alert
      - ≥ 90%: Auto-close losing positions (worst first)
   ↓
3. Close positions until utilization < 90%
   ↓
4. Create alerts and log results
```

### Position Closure Logic

When auto-close threshold (90%) is breached:

1. **Sort positions by loss** (worst losing positions first)
2. **Close positions one by one** until utilization drops below threshold
3. **Recalculate after each closure** to ensure we don't over-close
4. **Create critical alert** for admin notification
5. **Log all actions** for audit trail

### P&L Calculation

The canonical enforcement path uses `PositionPnLWorker.processPositionPnL()` which:

1. Fetches all active positions for an account
2. Gets current LTP (Last Traded Price) from the **server market-data quote cache**
3. Calculates: `Unrealized P&L = (Current Price - Average Price) × Quantity`
4. Updates position records with latest P&L (and optionally Redis cache/SSE for smooth dashboards)
5. Enforces SL/TP + account risk thresholds and triggers safe, idempotent auto square-off when needed

## Configuration

### Thresholds

Default thresholds (configurable):

- **Warning Threshold**: 80% (0.80)
  - Creates HIGH severity alert
  - Does not auto-close positions
  - Admin can manually intervene

- **Auto-Close Threshold**: 90% (0.90)
  - Automatically closes losing positions
  - Creates CRITICAL severity alert
  - Stops closing when utilization drops below threshold

### Environment Variables

```bash
# Risk monitoring thresholds (optional, defaults shown)
RISK_WARNING_THRESHOLD=0.80      # 80% - warning threshold
RISK_AUTO_CLOSE_THRESHOLD=0.90   # 90% - auto-close threshold

# Cron secret for protecting cron endpoint
CRON_SECRET=your-secret-key-here
RISK_MONITORING_SECRET=your-secret-key-here  # Alternative name
```

## Setup Instructions

### 1. Manual Testing

Use the admin console:

1. Navigate to **Admin Console → Risk Management → Risk Monitoring**
2. Configure thresholds (default: 80% warning, 90% auto-close)
3. Click **"Run Risk Monitoring Now"**
4. View results in the dashboard

### 2. Automated Cron Setup

#### Option A: Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/risk-monitoring",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

This runs every minute. For production, consider:
- `*/30 * * * *` - Every 30 seconds
- `*/60 * * * *` - Every minute
- `0 9-16 * * 1-5` - Every hour during market hours (9 AM - 4 PM, Mon-Fri)

**Important**: Set `CRON_SECRET` environment variable in Vercel dashboard.

#### Option B: External Cron Service

Use services like:
- **cron-job.org**
- **EasyCron**
- **GitHub Actions** (with scheduled workflows)

Example cron command:
```bash
# Every minute
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/risk-monitoring
```

#### Option C: Server-Side Cron

If running on a server with cron:

```bash
# Edit crontab
crontab -e

# Add (runs every minute during market hours)
* 9-16 * * 1-5 curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
  https://your-domain.com/api/cron/risk-monitoring
```

### 3. Background Job (Alternative)

For continuous monitoring without cron:

```typescript
import { getRiskMonitoringJob } from '@/lib/services/risk/RiskMonitoringJob'

// Start monitoring every 60 seconds
const job = getRiskMonitoringJob()
job.start(60000) // 60 seconds

// Stop when needed
// job.stop()
```

## API Reference

### POST /api/admin/risk/monitor

Manual trigger for the **risk backstop** (admin only).

**Request Body:**
```json
{
  "forceRun": false
}
```

**Response:**
```json
{
  "success": true,
  "thresholds": {
    "warningThreshold": 0.8,
    "autoCloseThreshold": 0.9,
    "source": "system_settings"
  },
  "result": {
    "success": true,
    "skipped": true,
    "skippedReason": "positions_worker_healthy",
    "pnlWorkerHealth": "healthy",
    "pnlWorkerLastRunAtIso": "2026-02-13T10:00:00.000Z",
    "elapsedMs": 12,
    "result": { "heartbeat": { "skipped": true } }
  }
}
```

### GET/PUT /api/admin/risk/thresholds

Read/update canonical thresholds stored in `SystemSettings`.

- **GET** returns `{ success, thresholds }`
- **PUT** accepts:

```json
{
  "warningThreshold": 0.8,
  "autoCloseThreshold": 0.9
}
```

### GET /api/cron/risk-monitoring

Cron endpoint (protected by `CRON_SECRET`).

**Headers:**
```
Authorization: Bearer YOUR_CRON_SECRET
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2025-01-27T10:30:00.000Z",
  "result": {
    "success": true,
    "skipped": true,
    "skippedReason": "positions_worker_healthy",
    "pnlWorkerHealth": "healthy",
    "pnlWorkerLastRunAtIso": "2026-02-13T10:00:00.000Z",
    "elapsedMs": 12
  }
}
```

## Risk Alerts

The system creates `RiskAlert` records in the database:

- **Type**: `MARGIN_CALL` (auto-close) or `LARGE_LOSS` (warning)
- **Severity**: `CRITICAL` (auto-close) or `HIGH` (warning)
- **Message**: Detailed description of the risk event
- **Resolved**: `false` (can be resolved by admin)

View alerts in: **Admin Console → Risk Management → User Risk Limits → Risk Alerts**

## Monitoring & Logging

All risk monitoring actions are logged via structured server logs:

- **TradingLog**: Position closures, alerts created
- **RiskAlert**: Alert records in database
- **Worker heartbeats**: `positions_pnl_worker_heartbeat` and `risk_monitoring_heartbeat` in `SystemSettings`

## Best Practices

1. **Run Frequently**: During market hours, run every 30-60 seconds
2. **Monitor Alerts**: Check risk alerts regularly in admin console
3. **Adjust Thresholds**: Fine-tune thresholds based on your risk appetite
4. **Test First**: Test with small thresholds before production
5. **Monitor Logs**: Check logs for any errors or issues
6. **Backup Plan**: Keep manual monitoring as backup

## Troubleshooting

### Positions Not Closing

1. Check if threshold is configured correctly
2. Verify market data API is accessible
3. Check logs for errors
4. Verify positions have valid `instrumentId` for price lookup

### Cron Not Running

1. Verify `CRON_SECRET` is set correctly
2. Check cron service logs
3. Test endpoint manually with correct auth header
4. Verify endpoint is accessible (not blocked by firewall)

### P&L Calculation Issues

1. Check market data API availability
2. Verify positions have valid `Stock` relations
3. Check `instrumentId` format matches market data API
4. Review `PositionPnLWorker` logs + heartbeat fields for quote freshness and per-tick counters

## Future Enhancements

Potential improvements:

1. **Per-User Thresholds**: Allow different thresholds per user
2. **Position-Level Thresholds**: Set thresholds per position
3. **SMS/Email Alerts**: Notify users when positions are auto-closed
4. **Market Hours Detection**: Only run during market hours
5. **Graduated Closure**: Close partial positions instead of full closure
6. **Risk Score**: Calculate overall account risk score
7. **Historical Analysis**: Track risk events over time

## Changelog

### 2025-01-27
- Initial implementation of server-side risk monitoring
- Automatic position closure at 90% threshold
- Warning alerts at 80% threshold
- Admin console integration
- Cron endpoint for automated execution

### 2026-02-13
- Canonical enforcement moved into `PositionPnLWorker` (SL/TP + account thresholds).
- `/api/admin/risk/monitor` and `/api/cron/risk-monitoring` repurposed as a backstop runner (skips when positions worker is healthy unless force-run).
- Added `GET/PUT /api/admin/risk/thresholds` for SystemSettings-backed canonical thresholds.
