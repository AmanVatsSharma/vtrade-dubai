# Module: admin-console

**Short:** Admin console UI with access control management.

**Purpose:** Provide administrators a secure dashboard for operations, including RBAC management, worker health, and risk controls.

**Files:**
- `header.tsx` — loads admin session, role, and permissions
- `sidebar.tsx` — navigation gated by permissions
- `access-control.tsx` — RBAC management UI
- `risk-management.tsx` — limits/config + alerts + thresholds + run-now backstop
- `workers.tsx` — worker cards (health, Redis readiness, run-once actions)
- `app/(admin)/admin-console/access-control/page.tsx` — access control page entry
- `app/(admin)/admin-console/workers/page.tsx` — workers page entry
- `app/api/admin/access-control/route.ts` — RBAC config API
- `app/api/admin/workers/route.ts` — workers snapshot + manage actions
- `app/api/admin/risk/thresholds/route.ts` — read/update canonical risk thresholds (SystemSettings)
- `app/api/admin/risk/monitor/route.ts` — run risk backstop (positions worker is canonical enforcer)
- `lib/server/workers/registry.ts` — worker registry + heartbeat health rules
- `lib/services/admin/AccessControlService.ts` — RBAC config persistence
- `MODULE_DOC.md` — this file

**Flow diagram (RBAC management):**
```mermaid
flowchart TD
  A[Admin opens Access Control page] --> B[GET /api/admin/access-control]
  B --> C[requireAdminPermissions]
  C --> D{Permission check}
  D -->|Denied| E[403 Forbidden]
  D -->|Allowed| F[AccessControlService.getConfig]
  F --> G[Return catalog + config]
  G --> H[UI renders permission grid]
  H --> I[Admin toggles permissions]
  I --> J[PUT /api/admin/access-control]
  J --> K[AccessControlService.updateConfig]
  K --> L[Persist to SystemSettings]
  L --> M[Audit log entry]
```

**Dependencies:**
- `lib/rbac` for permission catalog and guard
- `lib/services/admin/AccessControlService`
- `@/auth` for session resolution

**APIs:**
- `GET /api/admin/access-control` — fetch role permissions and catalog
- `PUT /api/admin/access-control` — update role permissions
- `GET /api/admin/me` — session user + permissions for UI gating
- `GET/PUT /api/admin/risk/thresholds` — read/update thresholds in SystemSettings
- `GET/POST /api/admin/risk/monitor` — risk backstop endpoint (skips when positions worker healthy unless force-run)

**Env vars:** none.

**Tests:** `tests/admin/access-control-guard.test.ts`

**Change-log:**
- 2026-01-15: Added RBAC access-control UI, restricted permission gating, and audit logging.
- 2026-02-13: Enhanced Workers page to show Redis realtime readiness + detailed heartbeat stats for background workers.
- 2026-02-13: Updated Risk Management tab to use SystemSettings-backed thresholds and unified risk backstop run-now behavior.
