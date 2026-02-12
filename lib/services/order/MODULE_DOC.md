<!--
MODULE_DOC.md
Module: lib/services/order
Purpose: Document the order placement + async execution lifecycle.
Last-updated: 2026-02-11
-->

## Overview

This module owns **order placement** and **order execution**.

Key goals:
- **Fast API response** for `/api/trading/orders` (return immediately after order is accepted).
- **Atomic** accounting updates (fund reservation + order creation) without nested DB transactions.
- **Async execution** via a worker so the UI can stay responsive and backend latency stays low.

## Current lifecycle

### API contract

Endpoint: `POST /api/trading/orders` (see `app/api/trading/orders/route.ts`)

Response behavior:
- Returns **202** when `executionScheduled: true` (order accepted and queued).
- Returns **200** only if a handler ever returns `executionScheduled: false` (not the default flow now).

### Placement flow

Implementation: `lib/services/order/OrderExecutionService.ts` → `placeOrder()`

- Validate input + trading account
- Compute margin + charges
- Validate available margin
- Single DB transaction:
  - Ensure/Recover `Stock` record
  - Create `Order` row (`status=PENDING`)
  - Block margin + create fund transaction (linked to `orderId`)
  - Debit charges + create fund transaction (linked to `orderId`)
- Return `{ orderId, executionScheduled: true }`

### Execution flow (async)

Implementation: `lib/services/order/OrderExecutionWorker.ts`

- Worker finds oldest `Order.status=PENDING`
- For each order:
  - Compute execution price (order price/avgPrice; fallback to stock LTP)
  - Single DB transaction:
    - Upsert `Position` (BUY adds quantity; SELL subtracts)
    - Update `Order.positionId`
    - Mark `Order` as `EXECUTED` with `filledQuantity` + `averagePrice`
    - Link `Transaction.positionId` for all transactions where `orderId` matches
- Emits realtime events automatically via Prisma middleware (`lib/prisma-middleware.ts`) on `Order/Position/TradingAccount` updates

## Deployment patterns

### Recommended (low latency)

**Docker on EC2 / ECS**:
- Run Next.js app
- Run the worker as a separate process/container:

```bash
ORDER_WORKER_INTERVAL_MS=750 ORDER_WORKER_BATCH_LIMIT=50 npm run worker:order
```

### Vercel (serverless) support

Vercel does not run long-lived background workers by default. To ensure orders do not remain `PENDING`:

- **Inline best-effort execution**: `POST /api/trading/orders` enqueues background execution using Vercel `waitUntil()` (non-blocking).
- **Cron backstop (recommended)**: configure a Vercel Cron Job to call the batch worker endpoint to catch any missed orders.

Cron endpoint:
- `GET /api/cron/order-worker?limit=25`
- Auth: `Authorization: Bearer $CRON_SECRET`

### Amplify-friendly fallback

Amplify/serverless cannot reliably continue background work after returning a response.

Use **a scheduled Lambda** (EventBridge) to trigger the worker:
- Call: `GET /api/cron/order-worker?limit=25`
- Secure with: `Authorization: Bearer $CRON_SECRET`

Route: `app/api/cron/order-worker/route.ts`

## Observability

Timing logs exist at:
- API route: `app/api/trading/orders/route.ts` (parse body, market session check, schema parse, placeOrder total)
- Service: `OrderExecutionService.placeOrder()` logs a step timing summary

## Changelog

- **2026-02-03**: Switched to ACCEPTED/QUEUED response, removed nested Prisma transactions, added `OrderExecutionWorker` + cron trigger.
- **2026-02-04**: Added Vercel-safe background execution (`waitUntil`) + advisory lock to prevent double-processing; documented cron backstop.
- **2026-02-11**: Updated EC2/Docker runbook commands to use npm scripts for workers.

