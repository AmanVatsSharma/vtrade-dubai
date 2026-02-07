/**
 * @file workers.tsx
 * @module admin-console
 * @description Admin Console page to view and manage all background workers (status, enable flags, run-once actions).
 * @author BharatERP
 * @created 2026-02-04
 */

"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Cpu, Play, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { PageHeader, RefreshButton, StatusBadge } from "@/components/admin-console/shared"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type WorkerHealth = "healthy" | "stale" | "unknown" | "disabled"

type WorkerSnapshot = {
  id: "order_execution" | "position_pnl" | "risk_monitoring"
  label: string
  description: string
  enabled: boolean
  healthTtlMs: number
  health: WorkerHealth
  lastRunAtIso: string | null
  heartbeat: { lastRunAtIso: string; [k: string]: unknown } | null
  config: Record<string, unknown>
  ec2Command?: string
  cronEndpoint?: string
}

type WorkersApiGet = { success: true; timestamp: string; workers: WorkerSnapshot[] } | { success: false; error?: string }

function fmtIso(iso: string | null): string {
  if (!iso) return "—"
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return iso
  return new Date(t).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })
}

function healthToBadge(health: WorkerHealth): { label: string; status: string } {
  if (health === "healthy") return { label: "Active", status: "HEALTHY" }
  if (health === "stale") return { label: "Stale", status: "WARNING" }
  if (health === "disabled") return { label: "Disabled", status: "OFFLINE" }
  return { label: "Unknown", status: "PENDING" }
}

export function Workers() {
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [workers, setWorkers] = useState<WorkerSnapshot[]>([])

  // Config inputs (safe client-side only)
  const [orderLimit, setOrderLimit] = useState("25")
  const [orderMaxAgeMs, setOrderMaxAgeMs] = useState("0")
  const [pnlLimit, setPnlLimit] = useState("500")
  const [pnlUpdateThreshold, setPnlUpdateThreshold] = useState("1")
  const [pnlDryRun, setPnlDryRun] = useState(false)

  const workersById = useMemo(() => {
    const map = new Map<string, WorkerSnapshot>()
    for (const w of workers) map.set(w.id, w)
    return map
  }, [workers])

  const fetchWorkers = async () => {
    setLoading(true)
    console.log("🧵 [ADMIN-WORKERS] Fetching workers snapshot")
    try {
      const res = await fetch("/api/admin/workers", { method: "GET" })
      const data = (await res.json().catch(() => null)) as WorkersApiGet | null
      if (!res.ok || !data || data.success !== true) {
        throw new Error((data as any)?.error || `Failed to fetch workers (${res.status})`)
      }
      setWorkers(data.workers || [])
      console.log("✅ [ADMIN-WORKERS] Snapshot loaded", { count: data.workers?.length || 0 })
    } catch (e: any) {
      console.error("❌ [ADMIN-WORKERS] Failed to load workers", e)
      toast({
        title: "Failed to load workers",
        description: e?.message || "Unknown error",
        variant: "destructive",
      })
      setWorkers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkers()
    const interval = setInterval(fetchWorkers, 20000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const postAction = async (body: any, key: string) => {
    setActionLoading((s) => ({ ...s, [key]: true }))
    try {
      const res = await fetch("/api/admin/workers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || data?.message || `Request failed (${res.status})`)
      }
      if (Array.isArray(data.workers)) setWorkers(data.workers)
      return data
    } finally {
      setActionLoading((s) => ({ ...s, [key]: false }))
    }
  }

  const toggleWorker = async (workerId: "order_execution" | "risk_monitoring", enabled: boolean) => {
    console.log("🔁 [ADMIN-WORKERS] Toggling worker", { workerId, enabled })
    try {
      await postAction({ action: "toggle", workerId, enabled }, `toggle:${workerId}`)
      toast({ title: "Saved", description: `${workerId} is now ${enabled ? "enabled" : "disabled"}.` })
    } catch (e: any) {
      console.error("❌ [ADMIN-WORKERS] Toggle failed", e)
      toast({ title: "Toggle failed", description: e?.message || "Unknown error", variant: "destructive" })
    }
  }

  const setPnlMode = async (mode: "client" | "server") => {
    console.log("🔧 [ADMIN-WORKERS] Setting PnL mode", { mode })
    try {
      await postAction({ action: "set_mode", workerId: "position_pnl", mode }, "set_mode:position_pnl")
      toast({ title: "Saved", description: `Position PnL mode set to ${mode}.` })
    } catch (e: any) {
      console.error("❌ [ADMIN-WORKERS] Set mode failed", e)
      toast({ title: "Failed", description: e?.message || "Unknown error", variant: "destructive" })
    }
  }

  const runOnce = async (workerId: WorkerSnapshot["id"]) => {
    console.log("▶️ [ADMIN-WORKERS] Run once", { workerId })
    const params: Record<string, unknown> = {}
    if (workerId === "order_execution") {
      params.limit = Number(orderLimit || 25)
      params.maxAgeMs = Number(orderMaxAgeMs || 0)
    }
    if (workerId === "position_pnl") {
      params.limit = Number(pnlLimit || 500)
      params.updateThreshold = Number(pnlUpdateThreshold || 1)
      params.dryRun = pnlDryRun
    }
    try {
      await postAction({ action: "run_once", workerId, params }, `run_once:${workerId}`)
      toast({ title: "Triggered", description: `${workerId} ran once successfully.` })
    } catch (e: any) {
      console.error("❌ [ADMIN-WORKERS] Run once failed", e)
      toast({ title: "Run failed", description: e?.message || "Unknown error", variant: "destructive" })
    }
  }

  const order = workersById.get("order_execution") || null
  const pnl = workersById.get("position_pnl") || null
  const risk = workersById.get("risk_monitoring") || null

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <PageHeader
        title="Workers"
        description="View, enable/disable, and trigger background workers"
        icon={<Cpu className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={<RefreshButton onClick={fetchWorkers} loading={loading} />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Order execution */}
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{order?.label || "Order Execution Worker"}</span>
              <StatusBadge status={healthToBadge(order?.health || "unknown").status} type="system">
                {healthToBadge(order?.health || "unknown").label}
              </StatusBadge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{order?.description || "Executes PENDING orders asynchronously."}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">Enabled</div>
                <div className="text-xs text-muted-foreground">Soft-toggle (does not stop EC2 processes)</div>
              </div>
              <Switch
                checked={Boolean(order?.enabled)}
                onCheckedChange={(v) => toggleWorker("order_execution", Boolean(v))}
                disabled={Boolean(actionLoading["toggle:order_execution"])}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Last heartbeat</div>
              <div className="text-xs text-muted-foreground">{fmtIso(order?.lastRunAtIso || null)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Run-once limit</Label>
                <Input value={orderLimit} onChange={(e) => setOrderLimit(e.target.value)} placeholder="25" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Max age (ms)</Label>
                <Input value={orderMaxAgeMs} onChange={(e) => setOrderMaxAgeMs(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground truncate">
                {order?.cronEndpoint ? `Cron: ${order.cronEndpoint}` : "Cron: /api/cron/order-worker"}
              </div>
              <Button
                size="sm"
                onClick={() => runOnce("order_execution")}
                disabled={Boolean(actionLoading["run_once:order_execution"])}
              >
                <Play className="w-4 h-4 mr-2" />
                Run now
              </Button>
            </div>

            {order?.ec2Command ? (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="text-xs font-medium text-foreground mb-1">EC2 command</div>
                <div className="text-xs text-muted-foreground font-mono break-words">{order.ec2Command}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Position PnL */}
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{pnl?.label || "Positions PnL Worker"}</span>
              <StatusBadge status={healthToBadge(pnl?.health || "unknown").status} type="system">
                {healthToBadge(pnl?.health || "unknown").label}
              </StatusBadge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{pnl?.description || "Computes server-side PnL (optional)."}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">PnL mode</Label>
              <Select
                value={(pnl?.config?.mode as any) === "server" ? "server" : "client"}
                onValueChange={(v) => setPnlMode(v === "server" ? "server" : "client")}
                disabled={Boolean(actionLoading["set_mode:position_pnl"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client (quotes-driven)</SelectItem>
                  <SelectItem value="server">Server (worker-driven)</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                Server mode requires the worker heartbeat to be healthy; UI auto-falls back to client mode when stale.
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Last heartbeat</div>
              <div className="text-xs text-muted-foreground">{fmtIso(pnl?.lastRunAtIso || null)}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Run-once limit</Label>
                <Input value={pnlLimit} onChange={(e) => setPnlLimit(e.target.value)} placeholder="500" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Update threshold</Label>
                <Input value={pnlUpdateThreshold} onChange={(e) => setPnlUpdateThreshold(e.target.value)} placeholder="1" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={pnlDryRun} onCheckedChange={(v) => setPnlDryRun(Boolean(v))} />
                <span className="text-xs text-muted-foreground">Dry run</span>
              </div>
              <Button
                size="sm"
                onClick={() => runOnce("position_pnl")}
                disabled={Boolean(actionLoading["run_once:position_pnl"])}
              >
                <Play className="w-4 h-4 mr-2" />
                Run now
              </Button>
            </div>

            {pnl?.ec2Command ? (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="text-xs font-medium text-foreground mb-1">EC2 command</div>
                <div className="text-xs text-muted-foreground font-mono break-words">{pnl.ec2Command}</div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Risk monitoring */}
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center justify-between gap-3">
              <span className="truncate">{risk?.label || "Risk Monitoring"}</span>
              <StatusBadge status={healthToBadge(risk?.health || "unknown").status} type="system">
                {healthToBadge(risk?.health || "unknown").label}
              </StatusBadge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">{risk?.description || "Runs platform risk monitoring (cron)."}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">Enabled</div>
                <div className="text-xs text-muted-foreground">Cron must still be scheduled externally</div>
              </div>
              <Switch
                checked={Boolean(risk?.enabled)}
                onCheckedChange={(v) => toggleWorker("risk_monitoring", Boolean(v))}
                disabled={Boolean(actionLoading["toggle:risk_monitoring"])}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">Last heartbeat</div>
              <div className="text-xs text-muted-foreground">{fmtIso(risk?.lastRunAtIso || null)}</div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground truncate">
                {risk?.cronEndpoint ? `Cron: ${risk.cronEndpoint}` : "Cron: /api/cron/risk-monitoring"}
              </div>
              <Button
                size="sm"
                onClick={() => runOnce("risk_monitoring")}
                disabled={Boolean(actionLoading["run_once:risk_monitoring"])}
              >
                <Play className="w-4 h-4 mr-2" />
                Run now
              </Button>
            </div>

            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="text-xs font-medium text-foreground mb-1">Scheduling</div>
              <div className="text-xs text-muted-foreground">
                Recommended: run every 60 seconds (Vercel Cron, EC2 cron, or external scheduler).
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

