"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Calendar, Eraser, RefreshCw, ShieldAlert } from "lucide-react"

interface PreviewCounts {
  oldOrders: number
  oldClosedPositions: number
  earliest: string | null
  latest: string | null
}

export function CleanupManagement() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState<PreviewCounts | null>(null)
  const [executing, setExecuting] = useState(false)
  const [fromDate, setFromDate] = useState<string>("")
  const [dryRunRows, setDryRunRows] = useState<any[]>([])

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const query = useMemo(() => {
    const p = new URLSearchParams()
    if (fromDate) p.set("before", fromDate)
    return p
  }, [fromDate])

  const loadPreview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/cleanup/preview?${query.toString()}`)
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      const data = await res.json()
      setCounts(data.counts)
      setDryRunRows(data.samples || [])
    } catch (e: any) {
      console.error("❌ [CLEANUP] Preview failed", e)
      setError(e.message || "Failed to load preview")
    } finally {
      setLoading(false)
    }
  }, [query])

  const executeCleanup = useCallback(async () => {
    if (!confirm("This will permanently delete historical orders/closed positions before the selected date (excluding today). Continue?")) return
    try {
      setExecuting(true)
      setError(null)
      const res = await fetch(`/api/admin/cleanup/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ before: fromDate || todayISO })
      })
      if (!res.ok) throw new Error(`Cleanup failed: ${res.status}`)
      const data = await res.json()
      alert(`Cleanup completed. Deleted: ${data.deletedOrders} orders, ${data.deletedPositions} positions.`)
      loadPreview()
    } catch (e: any) {
      console.error("❌ [CLEANUP] Execute failed", e)
      setError(e.message || "Cleanup failed")
    } finally {
      setExecuting(false)
    }
  }, [fromDate, todayISO, loadPreview])

  useEffect(() => {
    setFromDate(todayISO)
  }, [todayISO])

  useEffect(() => {
    loadPreview()
  }, [loadPreview])

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Daily Cleanup</h1>
            <p className="text-muted-foreground">Remove old orders and closed positions before the selected date (today by default)</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadPreview} disabled={loading} className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh Preview
            </Button>
          </div>
        </div>
      </motion.div>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
          <AlertTitle className="text-red-500">Operation failed</AlertTitle>
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary">Filters & Safety</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">Delete items BEFORE date</label>
              <Input type="date" value={fromDate} max={todayISO} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Alert className="bg-yellow-500/10 border-yellow-500/50">
                <ShieldAlert className="w-4 h-4 text-yellow-500" />
                <AlertTitle className="text-yellow-500">Safety Rule</AlertTitle>
                <AlertDescription className="text-yellow-500/80">
                  Cleanup will never touch today's data. It only affects orders with createdAt before the selected date, and positions that are closed before that date.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary">Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {counts && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Old Orders</div>
                <div className="text-2xl font-bold">{counts.oldOrders.toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Closed Positions (old)</div>
                <div className="text-2xl font-bold">{counts.oldClosedPositions.toLocaleString()}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Earliest</div>
                <div className="font-mono">{counts.earliest || '—'}</div>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <div className="text-xs text-muted-foreground">Latest (pre-selected date)</div>
                <div className="font-mono">{counts.latest || '—'}</div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">ID</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Meta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">Loading preview…</TableCell>
                  </TableRow>
                )}
                {!loading && dryRunRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No candidates for cleanup</TableCell>
                  </TableRow>
                )}
                {!loading && dryRunRows.map((r, idx) => (
                  <TableRow key={`${r.type}-${r.id}-${idx}`} className="border-border">
                    <TableCell>
                      <Badge className={r.type === 'ORDER' ? 'bg-blue-400/20 text-blue-400 border-blue-400/30' : 'bg-purple-400/20 text-purple-400 border-purple-400/30'}>
                        {r.type}
                      </Badge>
                    </TableCell>
                    <TableCell><code className="font-mono text-primary">{r.id}</code></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {r.date}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.meta || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex justify-end mt-4">
            <Button onClick={executeCleanup} disabled={executing || loading} className="bg-red-600 hover:bg-red-700 text-white">
              <Eraser className="w-4 h-4 mr-2" /> Execute Cleanup
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
