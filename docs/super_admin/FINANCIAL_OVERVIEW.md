## Deposit Audit Trail (Super Admin)

> Updated: 2025-11-12  
> Author: GPT-5 Codex (Cursor)

### Purpose
- Give the super admin a single source of truth for every deposit approval or rejection performed by moderators/admins.
- Surface who acted, when, and why — including rejection reasons — so suspicious behaviour can be escalated quickly.
- Replace the previous KPI-only financial overview tab with an actionable ledger of approval activity.

### Data Sources
- `trading_logs` table (category: `FUNDS`) emitted by `AdminFundService` via `TradingLogger`.
- Joined with `deposits` and `users` for monetary + identity context.

### API
- `GET /api/super-admin/deposits/audit`
  - **Query params**
    - `status`: `APPROVED | REJECTED` (defaults to all)
    - `adminId`, `adminName`: filter by actor metadata
    - `search`: keyword (deposit id or free-text match against log message)
    - `from`, `to`: ISO date range boundaries; interpreted as IST when provided via UI date inputs
    - `page`, `pageSize`: server-side pagination controls (default `1`, `20`)
  - **Response**
    ```json
    {
      "success": true,
      "data": {
        "records": [
          {
            "id": "log-uuid",
            "depositId": "dep-uuid",
            "status": "APPROVED",
            "adminId": "admin-uuid",
            "adminName": "Shakti",
            "adminRole": "SUPER_ADMIN",
            "reason": null,
            "amount": 75000,
            "remarks": "Approved by Shakti",
            "user": {
              "id": "user-uuid",
              "name": "Raghav",
              "email": "raghav@example.com",
              "clientId": "CLI-101"
            },
            "createdAt": "2024-11-12T10:45:00.000Z"
          }
        ],
        "page": 1,
        "pageSize": 20,
        "total": 57
      }
    }
    ```

### UI Highlights
- Filter toolbar (status, search, admin id/name, date range) with reset + refresh controls.
- Paginated table showing timestamp (IST), deposit id, user identity, admin identity, role, amount, and reason/remarks.
- Badges to visually separate approved vs rejected decisions.
- Console logging instrumentation baked into component for quick runtime introspection.

### Flow Overview
```mermaid
flowchart TD
    A[Super Admin filters UI] -->|build query| B[/api/super-admin/deposits/audit]
    B -->|auth check + parsing| C[DepositAuditService.list]
    C -->|fetch| D[trading_logs]
    C -->|join| E[deposits + users]
    C -->|shape records| F[data payload]
    F -->|JSON response| G[Admin console table]
```

### Follow-ups / Notes
- KPI widgets can return as a secondary section once real data is ready; API contracts remain in `/api/super-admin/finance/*`.
- For deeper analytics (weekly/monthly aggregates) consider exporting audit data to the data warehouse and layering dashboards in Metabase/Looker.
