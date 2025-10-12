import { NextResponse } from "next/server";

export async function GET() {
  const start = Date.now();
  try {
    console.log("🧭 [/api/quotes/docs] Serving Quotes API developer documentation");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="application-name" content="Vedpragya Bharat Quotes API" />
  <meta name="description" content="Fast, reliable market data API by Vedpragya Bharat Pvt Ltd" />
  <meta property="og:title" content="Vedpragya Bharat Quotes API – Developer Docs" />
  <meta property="og:site_name" content="Vedpragya Bharat Pvt Ltd" />
  <title>Vedpragya Bharat Quotes API – Developer Docs</title>
  <style>
    :root {
      --bg: #0b0f17;
      --card: #0f1420;
      --muted: #94a3b8;
      --text: #e2e8f0;
      --accent: #7c3aed;
      --accent2: #06b6d4;
      --ok: #22c55e;
      --warn: #f59e0b;
      --err: #ef4444;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      color: var(--text); background: radial-gradient(1200px 800px at 20% -10%, rgba(124, 58, 237, 0.15), transparent),
                radial-gradient(1000px 600px at 120% 10%, rgba(6, 182, 212, 0.12), transparent), var(--bg);
    }
    a { color: #a78bfa; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .shell { max-width: 1040px; margin: 0 auto; padding: 48px 20px 72px; }
    .hero {
      display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 24px; align-items: center; margin-bottom: 28px;
    }
    .badge { display: inline-flex; align-items: center; gap: 8px; color: #c7d2fe; background: linear-gradient(90deg, rgba(124,58,237,.18), rgba(6,182,212,.18)); border: 1px solid rgba(124,58,237,.35); padding: 6px 10px; border-radius: 999px; font-size: 12px; letter-spacing: .3px; }
    h1 { font-size: 38px; line-height: 1.12; margin: 12px 0 8px; }
    .sub { color: var(--muted); max-width: 680px; }
    .grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin: 26px 0 34px; }
    .card { background: linear-gradient(180deg, rgba(255,255,255,.02), transparent 60%), var(--card); border: 1px solid rgba(148,163,184,.2); border-radius: 16px; padding: 16px; }
    .k { color: #93c5fd; font-weight: 600; }
    .v { color: #fca5a5; }
    pre, code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    pre { background: #0b1220; border: 1px solid rgba(148,163,184,.2); padding: 14px; border-radius: 12px; overflow:auto; -webkit-overflow-scrolling: touch; }
    code { overflow-wrap: anywhere; }
    img, video { max-width: 100%; height: auto; }
    .hrow { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .section { margin: 26px 0 10px; }
    .title { display:flex; align-items:center; justify-content:space-between; gap: 12px; }
    .pill { font-size: 12px; padding: 3px 10px; border-radius: 999px; border: 1px solid rgba(148,163,184,.25); color: var(--muted); }
    .ul { margin: 8px 0 0 18px; color: var(--muted); }
    .callout { display:flex; align-items:flex-start; gap: 10px; background: rgba(34,197,94,.08); border:1px solid rgba(34,197,94,.35); padding: 10px 12px; border-radius: 12px; color: #bbf7d0; }
    .warn { background: rgba(245,158,11,.08); border-color: rgba(245,158,11,.35); color: #fde68a; }
    .err { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.35); color: #fecaca; }
    .footer { color: var(--muted); margin-top: 36px; font-size: 12px; }
    .flow { font-size: 12px; color: #a3a3a3; line-height: 1.4; white-space: pre; background: #0a0f1a; border: 1px dashed rgba(148,163,184,.25); padding: 10px 12px; border-radius: 12px; }
    .kbd { display:inline-block; padding: 2px 6px; border-radius: 6px; border: 1px solid rgba(148,163,184,.3); background: #0b1220; font-size: 12px; color: #e2e8f0; }
    .divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(148,163,184,.3), transparent); margin: 22px 0; }
    @media (max-width: 960px){ .hero{ grid-template-columns:1fr } .grid{ grid-template-columns:1fr } .hrow{ grid-template-columns:1fr } }
    @media (max-width: 600px){ h1{ font-size:28px } .shell{ padding:32px 16px 56px } .badge{ font-size:11px } .pill{ font-size:11px } .sub{ font-size:14px } }
  </style>
</head>
<body>
  <div class="shell">
    <span class="badge">Vedpragya Bharat Pvt Ltd · Quotes API</span>
    <div class="hero">
      <div>
        <h1>Vedpragya Bharat Quotes API</h1>
        <p class="sub">Ultra-fast consolidated market quotes for NSE, BSE, and MCX. Query up to <strong>500 instruments per request</strong> with millisecond response times using our batching layer.</p>
      </div>
      <div class="card">
        <div class="title">
          <strong>Endpoint</strong>
          <span class="pill">GET</span>
        </div>
        <div style="margin-top:8px">
          <code>/api/quotes</code>
        </div>
        <div class="divider"></div>
        <div style="display:grid; grid-template-columns: auto 1fr; gap: 8px 12px; font-size:14px; color: var(--muted)">
          <div class="k">q</div><div>Repeatable parameter for instrument ID. Max 500 per request.</div>
          <div class="k">mode</div><div><code>ltp</code> (default) or <code>full</code> (detailed, heavier)</div>
          <div class="k">x-client-id</div><div>Optional header to identify your client in logs.</div>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="title"><strong>CSV Download</strong><span class="pill">Public</span></div>
        <p class="sub">Full instrument master for NSE/BSE/MCX. Use this to discover valid <code>instrumentId</code> values.</p>
        <p><a href="/marketInstrumentsData.csv" download>Download marketInstrumentsData.csv</a></p>
        <p class="ul">Path: <code>/public/marketInstrumentsData.csv</code> (coming soon)</p>
      </div>
      <div class="card">
        <div class="title"><strong>Limits</strong><span class="pill">Guidance</span></div>
        <ul class="ul">
          <li>Max <strong>500</strong> instruments per request.</li>
          <li>Batcher aggregates concurrent traffic efficiently server-side.</li>
          <li>Use <span class="kbd">q</span> multiple times: <code>?q=NSE:SBIN-EQ&q=BSE:500112&...</code></li>
        </ul>
      </div>
      <div class="card">
        <div class="title"><strong>Exchanges</strong><span class="pill">Supported</span></div>
        <ul class="ul">
          <li>NSE: <code>NSE:SBIN-EQ</code> or token forms like <code>NSE_EQ-26000</code></li>
          <li>BSE: <code>BSE:500112</code> (e.g., SBIN), equities & indices</li>
          <li>MCX: <code>MCX:CRUDEOIL</code> and derivatives symbols</li>
        </ul>
      </div>
    </div>

    <div class="section">
      <div class="title"><h3>Quickstart</h3><span class="pill">cURL</span></div>
      <pre><code>curl "/api/quotes?q=NSE_EQ-26000&q=BSE:500112&q=MCX:CRUDEOIL&mode=ltp" | jq</code></pre>
    </div>

    <div class="hrow">
      <div class="card">
        <div class="title"><strong>JavaScript (browser)</strong><span class="pill">fetch</span></div>
        <pre><code>const params = new URLSearchParams([
  ["q", "NSE:SBIN-EQ"],
  ["q", "BSE:500112"],
  ["q", "MCX:CRUDEOIL"],
]);
params.set("mode", "ltp");
const res = await fetch('/api/quotes?' + params.toString(), {
  headers: { "x-client-id": "docs-demo" },
  cache: "no-store",
});
const json = await res.json();
console.log(json);
</code></pre>
      </div>
      <div class="card">
        <div class="title"><strong>Node (axios)</strong><span class="pill">server</span></div>
        <pre><code>import axios from "axios";

const { data } = await axios.get("/api/quotes", {
  params: { mode: "ltp" },
  paramsSerializer: { indexes: null }, // repeat q
  headers: { "x-client-id": "pricing-service" },
  // Send repeated parameters explicitly
  // axios will handle: ?q=A&q=B
});
</code></pre>
      </div>
    </div>

    <div class="section">
      <div class="title"><h3>Response</h3><span class="pill">JSON</span></div>
      <pre><code>{
  "success": true,
  "data": {
    "NSE:SBIN-EQ": { "ltp": 823.45, "timestamp": "..." },
    "BSE:500112": { "ltp": 823.5,  "timestamp": "..." }
    // ... up to 500 instruments
  },
  "meta": {
    "instrumentCount": 2,
    "mode": "ltp",
    "processingTime": 12,
    "timestamp": "2025-01-01T10:00:00.000Z"
  }
}</code></pre>
      <div class="callout warn" style="margin-top:10px">
        <div>⚠️</div>
        <div><strong>Note:</strong> <code>mode=full</code> returns heavier payloads. Prefer <code>ltp</code> for latency-critical paths.</div>
      </div>
    </div>

    <div class="section">
      <div class="title"><h3>Errors</h3><span class="pill">Reference</span></div>
      <div class="grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="card">
          <strong>401 · NO_SESSION</strong>
          <p class="ul">Authenticate first. Visit <code>/admin/dashboard</code> and create a session.</p>
          <pre><code>{ "error": "No active session found.", "code": "NO_SESSION" }</code></pre>
        </div>
        <div class="card">
          <strong>500 · MISSING_API_KEY</strong>
          <p class="ul">Set the required market data API key in environment.</p>
          <pre><code>{ "error": "Server configuration error", "code": "MISSING_API_KEY" }</code></pre>
        </div>
        <div class="card">
          <strong>502 · API_ERROR</strong>
          <p class="ul">Upstream provider error. Retry with backoff.</p>
          <pre><code>{ "error": "Failed to fetch data from upstream provider", "code": "API_ERROR" }</code></pre>
        </div>
      </div>
      <div class="card" style="margin-top:12px;">
        <strong>Unexpected</strong>
        <pre><code>{ "error": "An unexpected error occurred while fetching quotes", "code": "UNEXPECTED_ERROR" }</code></pre>
      </div>
    </div>

    <div class="section">
      <div class="title"><h3>Flow</h3><span class="pill">Architecture</span></div>
      <pre class="flow"><code>Client → /api/quotes?q=... (&lt;= 500) ──► Session Check ──► Batching Layer ──► Market Provider
                                             │                   │
                                             ▼                   ▼
                                    NO_SESSION (401)      Single upstream call
      </code></pre>
    </div>

    <div class="section">
      <div class="title"><h3>Best Practices</h3><span class="pill">Production</span></div>
      <ul class="ul">
        <li>Group instruments per-request up to 500; avoid 1-per-request patterns.</li>
        <li>Send an <code>x-client-id</code> header for observability.</li>
        <li>Use <code>cache: \"no-store\"</code> on client fetch for real-time data.</li>
        <li>Retry transient 502s with exponential backoff.</li>
      </ul>
    </div>

    <div class="divider"></div>
    <div class="footer">
      © Vedpragya Bharat Pvt Ltd • Built for speed • Docs route <code>/api/quotes/docs</code> • CSV <a href="/marketInstrumentsData.csv">/marketInstrumentsData.csv</a>
    </div>
  </div>
</body>
</html>`;

    const res = new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Docs-Generated-At": new Date().toISOString(),
        "X-Response-Time": `${Date.now() - start}ms`,
      },
    });
    return res;
  } catch (err) {
    console.error("❌ [/api/quotes/docs] Failed to render docs:", err);
    return NextResponse.json({
      error: "Failed to render Quotes API docs",
    }, { status: 500 });
  }
}
