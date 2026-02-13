# Admin Console Module Doc

## Purpose
Provide administrative control surfaces for users, funds, risk, and system operations in the TradePro platform. This module focuses on fast operator workflows with robust error visibility and explicit data source status.

## Key Screens
- Dashboard: platform KPIs, alerts, and top traders.
- User Management: search, filters, bulk actions, and per-user dialogs.
- Fund Management: deposits and withdrawals review with approvals.
- Risk Management: platform risk config, user limits, and monitoring.
- Workers: background worker status/heartbeat + Redis realtime readiness (cross-process worker → dashboard).
- System Health, Logs, Settings, Notifications, Financial Reports.

## User Quick Actions
Exposes existing admin APIs in the User Management table:
- Reset password: `POST /api/admin/users/{userId}/reset-password`
- Reset MPIN: `POST /api/admin/users/{userId}/reset-mpin`
- Freeze/unfreeze account: `POST /api/admin/users/{userId}/freeze`
- Verify contact (email/phone): `POST /api/admin/users/{userId}/verify-contact`
- Assign/unassign RM: `PATCH /api/admin/users/{userId}/assign-rm`
- Risk limits override: `GET/PUT /api/admin/users/{userId}/risk-limit`

## Data Source Clarity
- Live/Partial/Error/Sample statuses surfaced on Dashboard, User Management, and Fund Management.
- Sample data is manual-only and never auto-selected.
- Error alerts include reasons for each failing endpoint.

## KYC & Compliance Ops
- Dedicated queue: `GET /api/admin/kyc` → `/admin-console/kyc`
- Assignment & SLA tracking: `PATCH /api/admin/kyc`
- AML flags + suspicious review status (clear/review/escalated)
- Review logs stored in `kyc_review_logs`
- Document viewer for bank proof URL
- Filters include AML flag match and SLA buckets (24h/48h/72h)

## KYC Review Flow (Mermaid)
```mermaid
flowchart TD
  A[KYC Queue] --> B[Open Review Dialog]
  B --> C[Assign reviewer + SLA due]
  C --> D[AML flag update]
  D --> E[Mark suspicious status]
  E --> F{Approve / Reject}
  F -->|Approve| G[Status Approved + Log entry]
  F -->|Reject| H[Status Rejected + Log entry]
  G --> I[Toast + Refresh Queue]
  H --> I
```

## Quick Action Flow (Mermaid)
```mermaid
flowchart TD
  A[Admin clicks Quick Actions] --> B{Select Action}
  B --> C[Dialog Form]
  C --> D[Validate Input]
  D --> E[Call Admin API]
  E --> F{Success?}
  F -->|Yes| G[Toast + Refresh Table]
  F -->|No| H[Error Alert + Retry]
```

## Changelog
- 2026-01-15 (IST): Added user quick actions for admin APIs and data source status messaging on core admin pages.
- 2026-01-15 (IST): Added KYC queue with assignment, SLA tracking, AML flags, and review logs.
- 2026-01-15 (IST): Added AML flag filter and extended SLA buckets in KYC queue.
- 2026-02-13 (IST): Enhanced Admin Console Workers view with Redis readiness + richer heartbeat stats for worker debugging.
