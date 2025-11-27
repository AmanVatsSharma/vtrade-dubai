/**
 * @file positions-management.tsx
 * @module admin-console
 * @description Enhanced positions management with professional editing dialog
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Hash, Target, Crosshair, LayoutGrid, Edit, Boxes } from "lucide-react"
import { PositionEditDialog } from "./position-edit-dialog"
import { PageHeader, RefreshButton, Pagination } from "./shared"

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

  // Position edit dialog state
  const [editingPosition, setEditingPosition] = useState<PositionRow | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // Create Position dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [cpAccountId, setCpAccountId] = useState("")
  const [cpStockId, setCpStockId] = useState("")
  const [cpInstrumentId, setCpInstrumentId] = useState("")
  const [cpSymbol, setCpSymbol] = useState("")
  const [cpQty, setCpQty] = useState("")
  const [cpPrice, setCpPrice] = useState("")
  const [cpType, setCpType] = useState("MARKET")
  const [cpSide, setCpSide] = useState("BUY")
  const [cpProduct, setCpProduct] = useState("MIS")
  const [cpSegment, setCpSegment] = useState("NSE")
  const [cpLot, setCpLot] = useState("")
  const [cpErr, setCpErr] = useState<string | null>(null)

  const submitCreate = async () => {
    setCpErr(null)
    try {
      const payload: any = {
        tradingAccountId: cpAccountId.trim(),
        stockId: cpStockId.trim(),
        instrumentId: cpInstrumentId.trim() || undefined,
        symbol: cpSymbol.trim().toUpperCase(),
        quantity: Number(cpQty),
        price: cpType === 'LIMIT' ? Number(cpPrice) : undefined,
        orderType: cpType,
        orderSide: cpSide,
        productType: cpProduct,
        segment: cpSegment,
        lotSize: cpLot ? Number(cpLot) : undefined
      }
      const res = await fetch('/api/admin/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e?.error || `Create failed: ${res.status}`)
      }
      setCreateOpen(false)
      // reset fields
      setCpAccountId(""); setCpStockId(""); setCpInstrumentId(""); setCpSymbol(""); setCpQty(""); setCpPrice(""); setCpType("MARKET"); setCpSide("BUY"); setCpProduct("MIS"); setCpSegment("NSE"); setCpLot("")
      fetchData()
    } catch (e: any) {
      console.error('❌ [POSITIONS-MGMT] Create failed', e)
      setCpErr(e.message || 'Create failed')
    }
  }

  const startEdit = (row: PositionRow) => {
    setEditingPosition(row)
    setEditDialogOpen(true)
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
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <PageHeader
        title="Position Management"
        description="View and modify all positions with URL-synced filters"
        icon={<Boxes className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={
          <>
            <RefreshButton onClick={fetchData} loading={loading} />
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white text-xs sm:text-sm" size="sm">
                  <span className="hidden sm:inline">Create Position</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full sm:max-w-xl bg-card border-border max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
                <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                  <DialogTitle className="text-lg sm:text-xl font-bold text-primary">Create Position (admin)</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 py-2">
                  <div className="col-span-2">
                    <label className="text-xs text-muted-foreground">Trading Account ID</label>
                    <Input value={cpAccountId} onChange={(e) => setCpAccountId(e.target.value)} placeholder="account uuid" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Stock ID</label>
                    <Input value={cpStockId} onChange={(e) => setCpStockId(e.target.value)} placeholder="stock uuid" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Instrument ID</label>
                    <Input value={cpInstrumentId} onChange={(e) => setCpInstrumentId(e.target.value)} placeholder="optional" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Symbol</label>
                    <Input value={cpSymbol} onChange={(e) => setCpSymbol(e.target.value.toUpperCase())} placeholder="RELIANCE" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Quantity</label>
                    <Input value={cpQty} onChange={(e) => setCpQty(e.target.value)} placeholder="e.g. 100" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Order Type</label>
                    <Input value={cpType} onChange={(e) => setCpType(e.target.value.toUpperCase())} placeholder="MARKET/LIMIT" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Side</label>
                    <Input value={cpSide} onChange={(e) => setCpSide(e.target.value.toUpperCase())} placeholder="BUY/SELL" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Price (for LIMIT)</label>
                    <Input value={cpPrice} onChange={(e) => setCpPrice(e.target.value)} placeholder="optional" />
                  </div>
                </div>
                {cpErr && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
                    <AlertTitle className="text-red-500">Error</AlertTitle>
                    <AlertDescription className="text-red-400">{cpErr}</AlertDescription>
                  </Alert>
                )}
                <DialogFooter>
                  <Button onClick={submitCreate} disabled={loading || !cpAccountId || !cpStockId || !cpSymbol || !cpQty || !cpType || !cpSide}>
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

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
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-lg sm:text-xl font-bold text-primary">Positions</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[900px] sm:min-w-0">
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
                      <span className="font-mono">{r.symbol}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold">{r.quantity}</span>
                    </TableCell>
                    <TableCell>
                      <span>{r.averagePrice}</span>
                    </TableCell>
                    <TableCell>
                      <span>{r.stopLoss ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span>{r.target ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className={r.unrealizedPnL! >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                        {r.unrealizedPnL! >= 0 ? '+' : ''}{r.unrealizedPnL}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={r.dayPnL! >= 0 ? 'text-green-400 font-medium' : 'text-red-400 font-medium'}>
                        {r.dayPnL! >= 0 ? '+' : ''}{r.dayPnL}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => closePosition(r)}>
                          Close
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          </div>

            <Pagination
              currentPage={page}
              totalPages={pages}
              onPageChange={setPage}
              loading={loading}
            />
        </CardContent>
      </Card>

      {/* Position Edit Dialog */}
      {editingPosition && (
        <PositionEditDialog
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) setEditingPosition(null)
          }}
          position={editingPosition}
          onSaved={() => {
            fetchData()
            setEditDialogOpen(false)
            setEditingPosition(null)
          }}
        />
      )}
    </div>
  )
}
