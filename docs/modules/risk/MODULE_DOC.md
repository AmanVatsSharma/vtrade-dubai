# Module: risk

**Short:** SystemSettings-backed risk thresholds + risk backstop runner (positions worker is canonical enforcer).

**Purpose:** Provide canonical loss-utilization thresholds and safe “run now” tooling to enforce risk even if the long-running positions worker is down.

**Key files:**
- `lib/services/risk/risk-thresholds.ts` — read/write thresholds (SystemSettings + env fallback, cached)
- `lib/services/risk/risk-backstop-runner.ts` — backstop runner (skips when positions worker healthy unless force-run)
- `app/api/admin/risk/thresholds/route.ts` — admin read/update thresholds
- `app/api/admin/risk/monitor/route.ts` — admin run-now backstop endpoint
- `app/api/cron/risk-monitoring/route.ts` — cron backstop endpoint

**SystemSettings keys:**
- `risk_warning_threshold`
- `risk_auto_close_threshold`

**Env vars (fallback only):**
- `RISK_WARNING_THRESHOLD`
- `RISK_AUTO_CLOSE_THRESHOLD`

**Change-log:**
- 2026-02-13 (IST): Added SystemSettings-backed thresholds + unified risk backstop runner.

