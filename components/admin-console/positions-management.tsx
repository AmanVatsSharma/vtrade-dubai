"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ChevronLeft, ChevronRight, RefreshCw, Hash, Target, Crosshair, LayoutGrid } from "lucide-react"

interface PositionRow {
  id: string
  createdAt: string
  clientId?: string
  userName?: string
  symbol: string
  quantity: number
  averagePrice: number
  stopLoss?: number | null
  target?: number | null
  unrealizedPnL?: number
  dayPnL?: number
}

export function PositionsManagement() {
  const router = useRouter()
  const sp = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<PositionRow[]>([])
  const [page, setPage] = useState<number>(parseInt(sp.get("page") || "1"))
  const [pages, setPages] = useState<number>(1)

  const [userFilter, setUserFilter] = useState<string>(sp.get("user") || "")
  const [q, setQ] = useState<string>(sp.get("q") || "")
  const [symbol, setSymbol] = useState<string>(sp.get("symbol") || "")
  const [openOnly, setOpenOnly] = useState<boolean>((sp.get("openOnly") || "true").toLowerCase() === "true")

  const params = useMemo(() => {
    const p = new URLSearchParams()
    p.set("page", String(page))
    if (userFilter) p.set("user", userFilter)
    if (q) p.set("q", q)
    if (symbol) p.set("symbol", symbol)
    if (openOnly) p.set("openOnly", "true")
    return p
  }, [page, userFilter, q, symbol, openOnly])

  useEffect(() => {
    const base = "/admin-console?tab=positions"
    router.replace(`${base}&${params.toString()}`)
  }, [params, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/positions?${params.toString()}&limit=50`)
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      const data = await res.json()
      const mapped: PositionRow[] = data.positions.map((p: any) => ({
        id: p.id,
        createdAt: new Date(p.createdAt).toLocaleString(),
        clientId: p.tradingAccount?.user?.clientId,
        userName: p.tradingAccount?.user?.name,
        symbol: p.symbol,
        quantity: Number(p.quantity),
        averagePrice: Number(p.averagePrice),
        stopLoss: p.stopLoss != null ? Number(p.stopLoss) : null,
        target: p.target != null ? Number(p.target) : null,
        unrealizedPnL: p.unrealizedPnL != null ? Number(p.unrealizedPnL) : 0,
        dayPnL: p.dayPnL != null ? Number(p.dayPnL) : 0
      }))
      setRows(mapped)
      setPages(data.pages || 1)
    } catch (e: any) {
      console.error("❌ [POSITIONS-MGMT] Load failed", e)
      setError(e.message || "Failed to load positions")
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => { fetchData() }, [fetchData])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState<string>("")
  const [editAvg, setEditAvg] = useState<string>("")
  const [editSL, setEditSL] = useState<string>("")
  const [editTP, setEditTP] = useState<string>("")
  const [editSymbol, setEditSymbol] = useState<string>("")
  const [editUPnL, setEditUPnL] = useState<string>("")
  const [editDayPnL, setEditDayPnL] = useState<string>("")

  const startEdit = (row: PositionRow) => {
    setEditingId(row.id)
    setEditQty(String(row.quantity))
    setEditAvg(String(row.averagePrice))
    setEditSL(row.stopLoss != null ? String(row.stopLoss) : "")
    setEditTP(row.target != null ? String(row.target) : "")
    setEditSymbol(row.symbol)
    setEditUPnL(row.unrealizedPnL != null ? String(row.unrealizedPnL) : "")
    setEditDayPnL(row.dayPnL != null ? String(row.dayPnL) : "")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditQty("")
    setEditAvg("")
    setEditSL("")
    setEditTP("")
    setEditSymbol("")
    setEditUPnL("")
    setEditDayPnL("")
  }

  const saveEdit = async (row: PositionRow) => {
    try {
      const payload: any = { positionId: row.id, updates: {} }
      if (editQty !== "") payload.updates.quantity = Number(editQty)
      if (editAvg !== "") payload.updates.averagePrice = Number(editAvg)
      payload.updates.stopLoss = editSL === "" ? null : Number(editSL)
      payload.updates.target = editTP === "" ? null : Number(editTP)
      if (editSymbol && editSymbol !== row.symbol) payload.updates.symbol = editSymbol
      if (editUPnL !== "") payload.updates.unrealizedPnL = Number(editUPnL)
      if (editDayPnL !== "") payload.updates.dayPnL = Number(editDayPnL)

      const res = await fetch("/api/admin/positions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      cancelEdit()
      fetchData()
    } catch (e) {
      console.error("❌ [POSITIONS-MGMT] Save failed", e)
      alert((e as any)?.message || "Save failed")
    }
  }

  const closePosition = async (row: PositionRow) => {
    if (!confirm(`Close position ${row.symbol} for ${row.clientId}?`)) return
    try {
      const res = await fetch("/api/admin/positions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId: row.id, action: "close" })
      })
      if (!res.ok) throw new Error(`Close failed: ${res.status}`)
      fetchData()
    } catch (e) {
      console.error("❌ [POSITIONS-MGMT] Close failed", e)
      alert((e as any)?.message || "Close failed")
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Position Management</h1>
            <p className="text-muted-foreground">View and modify all positions with URL-synced filters</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchData} disabled={loading} className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">User (clientId/name/id)</label>
              <Input value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1) }} placeholder="ABC123 or name" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Search</label>
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Symbol or user contains..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Symbol</label>
              <Input value={symbol} onChange={(e) => { setSymbol(e.target.value.toUpperCase()); setPage(1) }} placeholder="RELIANCE" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Open Only</label>
              <Input value={openOnly ? "true" : "false"} onChange={(e) => { setOpenOnly(e.target.value.toLowerCase() === 'true'); setPage(1) }} placeholder="true/false" />
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
          <AlertTitle className="text-red-500">Failed to load</AlertTitle>
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary">Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Time</TableHead>
                  <TableHead className="text-muted-foreground">Client</TableHead>
                  <TableHead className="text-muted-foreground">Symbol</TableHead>
                  <TableHead className="text-muted-foreground">Qty</TableHead>
                  <TableHead className="text-muted-foreground">Avg</TableHead>
                  <TableHead className="text-muted-foreground">SL</TableHead>
                  <TableHead className="text-muted-foreground">TP</TableHead>
                  <TableHead className="text-muted-foreground">U-PnL</TableHead>
                  <TableHead className="text-muted-foreground">Day PnL</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">No positions</TableCell>
                  </TableRow>
                )}
                {!loading && rows.map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell>{r.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <code className="text-primary font-mono">{r.clientId || "-"}</code>
                        <span className="text-muted-foreground">{r.userName || ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <Input value={editSymbol} onChange={(e) => setEditSymbol(e.target.value.toUpperCase())} />
                      ) : (
                        <span className="font-mono">{r.symbol}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <Input value={editQty} onChange={(e) => setEditQty(e.target.value)} />
                      ) : (
                        <span className="font-bold">{r.quantity}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <Input value={editAvg} onChange={(e) => setEditAvg(e.target.value)} />
                      ) : (
                        <span>{r.averagePrice}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <Input value={editSL} onChange={(e) => setEditSL(e.target.value)} />
                      ) : (
                        <span>{r.stopLoss ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <Input value={editTP} onChange={(e) => setEditTP(e.target.value)} />
                      ) : (
                        <span>{r.target ?? "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <Input value={editUPnL} onChange={(e) => setEditUPnL(e.target.value)} />
                      ) : (
                        <span className={r.unrealizedPnL! >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                          {r.unrealizedPnL! >= 0 ? '+' : ''}{r.unrealizedPnL}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <Input value={editDayPnL} onChange={(e) => setEditDayPnL(e.target.value)} />
                      ) : (
                        <span className={r.dayPnL! >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                          {r.dayPnL! >= 0 ? '+' : ''}{r.dayPnL}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => saveEdit(r)} className="bg-primary hover:bg-primary/90 text-white">
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                            Edit
                          </Button>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => closePosition(r)}>
                            Close
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {pages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages || loading}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
