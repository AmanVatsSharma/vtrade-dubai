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
import { ChevronLeft, ChevronRight, RefreshCw, Hash, CheckCircle, Ban, PlayCircle } from "lucide-react"

interface OrderRow {
  id: string
  createdAt: string
  clientId?: string
  userName?: string
  symbol: string
  quantity: number
  orderType: string
  orderSide: string
  price?: number | null
  filledQuantity: number
  averagePrice?: number | null
  status: string
}

export function OrdersManagement() {
  const router = useRouter()
  const sp = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<OrderRow[]>([])
  const [page, setPage] = useState<number>(parseInt(sp.get("page") || "1"))
  const [pages, setPages] = useState<number>(1)

  const [userFilter, setUserFilter] = useState<string>(sp.get("user") || "")
  const [q, setQ] = useState<string>(sp.get("q") || "")
  const [symbol, setSymbol] = useState<string>(sp.get("symbol") || "")
  const [status, setStatus] = useState<string>(sp.get("status") || "")
  const [type, setType] = useState<string>(sp.get("type") || "")
  const [side, setSide] = useState<string>(sp.get("side") || "")

  const params = useMemo(() => {
    const p = new URLSearchParams()
    p.set("page", String(page))
    if (userFilter) p.set("user", userFilter)
    if (q) p.set("q", q)
    if (symbol) p.set("symbol", symbol)
    if (status) p.set("status", status)
    if (type) p.set("type", type)
    if (side) p.set("side", side)
    return p
  }, [page, userFilter, q, symbol, status, type, side])

  useEffect(() => {
    const base = "/admin-console?tab=orders"
    router.replace(`${base}&${params.toString()}`)
  }, [params, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/orders?${params.toString()}&limit=50`)
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      const data = await res.json()
      const mapped: OrderRow[] = data.orders.map((o: any) => ({
        id: o.id,
        createdAt: new Date(o.createdAt).toLocaleString(),
        clientId: o.tradingAccount?.user?.clientId,
        userName: o.tradingAccount?.user?.name,
        symbol: o.symbol,
        quantity: Number(o.quantity),
        orderType: o.orderType,
        orderSide: o.orderSide,
        price: o.price != null ? Number(o.price) : null,
        filledQuantity: Number(o.filledQuantity || 0),
        averagePrice: o.averagePrice != null ? Number(o.averagePrice) : null,
        status: o.status
      }))
      setRows(mapped)
      setPages(data.pages || 1)
    } catch (e: any) {
      console.error("❌ [ORDERS-MGMT] Load failed", e)
      setError(e.message || "Failed to load orders")
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => { fetchData() }, [fetchData])

  // Inline edits
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState<string>("")
  const [editPrice, setEditPrice] = useState<string>("")
  const [editType, setEditType] = useState<string>("")
  const [editSide, setEditSide] = useState<string>("")
  const [editStatus, setEditStatus] = useState<string>("")

  const startEdit = (row: OrderRow) => {
    setEditingId(row.id)
    setEditQty(String(row.quantity))
    setEditPrice(row.price != null ? String(row.price) : "")
    setEditType(row.orderType)
    setEditSide(row.orderSide)
    setEditStatus(row.status)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditQty("")
    setEditPrice("")
    setEditType("")
    setEditSide("")
    setEditStatus("")
  }

  const saveEdit = async (row: OrderRow) => {
    try {
      const payload: any = { orderId: row.id, updates: {} }
      if (editQty !== "") payload.updates.quantity = Number(editQty)
      payload.updates.price = editPrice === "" ? null : Number(editPrice)
      if (editType) payload.updates.orderType = editType as any
      if (editSide) payload.updates.orderSide = editSide as any
      if (editStatus) payload.updates.status = editStatus as any

      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      cancelEdit()
      fetchData()
    } catch (e) {
      console.error("❌ [ORDERS-MGMT] Save failed", e)
      alert((e as any)?.message || "Save failed")
    }
  }

  const cancelOrder = async (row: OrderRow) => {
    if (!confirm(`Cancel order ${row.symbol} for ${row.clientId}?`)) return
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: row.id, action: "cancel" })
      })
      if (!res.ok) throw new Error(`Cancel failed: ${res.status}`)
      fetchData()
    } catch (e) {
      console.error("❌ [ORDERS-MGMT] Cancel failed", e)
      alert((e as any)?.message || "Cancel failed")
    }
  }

  const executeOrder = async (row: OrderRow) => {
    if (!confirm(`Execute order ${row.symbol} for ${row.clientId}?`)) return
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: row.id, action: "execute" })
      })
      if (!res.ok) throw new Error(`Execute failed: ${res.status}`)
      fetchData()
    } catch (e) {
      console.error("❌ [ORDERS-MGMT] Execute failed", e)
      alert((e as any)?.message || "Execute failed")
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Orders Management</h1>
            <p className="text-muted-foreground">View and modify all orders with URL-synced filters</p>
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
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
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
              <label className="text-xs text-muted-foreground">Status</label>
              <Input value={status} onChange={(e) => { setStatus(e.target.value.toUpperCase()); setPage(1) }} placeholder="PENDING/EXECUTED/CANCELLED" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <Input value={type} onChange={(e) => { setType(e.target.value.toUpperCase()); setPage(1) }} placeholder="MARKET/LIMIT" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Side</label>
              <Input value={side} onChange={(e) => { setSide(e.target.value.toUpperCase()); setPage(1) }} placeholder="BUY/SELL" />
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
          <CardTitle className="text-xl font-bold text-primary">Orders</CardTitle>
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
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Side</TableHead>
                  <TableHead className="text-muted-foreground">Price</TableHead>
                  <TableHead className="text-muted-foreground">Filled</TableHead>
                  <TableHead className="text-muted-foreground">Avg</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">No orders</TableCell>
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
                    <TableCell><span className="font-mono">{r.symbol}</span></TableCell>
                    <TableCell>{editingId === r.id ? (<Input value={editQty} onChange={(e) => setEditQty(e.target.value)} />) : (<span className="font-bold">{r.quantity}</span>)}</TableCell>
                    <TableCell>{editingId === r.id ? (<Input value={editType} onChange={(e) => setEditType(e.target.value.toUpperCase())} />) : (r.orderType)}</TableCell>
                    <TableCell>{editingId === r.id ? (<Input value={editSide} onChange={(e) => setEditSide(e.target.value.toUpperCase())} />) : (r.orderSide)}</TableCell>
                    <TableCell>{editingId === r.id ? (<Input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />) : (r.price ?? "—")}</TableCell>
                    <TableCell>{r.filledQuantity}</TableCell>
                    <TableCell>{r.averagePrice ?? "—"}</TableCell>
                    <TableCell>{editingId === r.id ? (<Input value={editStatus} onChange={(e) => setEditStatus(e.target.value.toUpperCase())} />) : (
                      r.status === 'EXECUTED' ? <Badge className="bg-green-400/20 text-green-400 border-green-400/30">EXECUTED</Badge> :
                      r.status === 'CANCELLED' ? <Badge className="bg-red-400/20 text-red-400 border-red-400/30">CANCELLED</Badge> :
                      <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30">PENDING</Badge>
                    )}</TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => saveEdit(r)} className="bg-primary hover:bg-primary/90 text-white">Save</Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => startEdit(r)}>Edit</Button>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => cancelOrder(r)}>
                            <Ban className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => executeOrder(r)}>
                            <PlayCircle className="w-4 h-4 mr-1" /> Execute
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
