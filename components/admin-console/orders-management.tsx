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
import { Hash, CheckCircle, Ban, PlayCircle, ListOrdered } from "lucide-react"
import { StatusBadge, PageHeader, RefreshButton, Pagination, FilterBar, type FilterField } from "./shared"

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
      // Validate inputs
      if (editQty !== "") {
        const qty = Number(editQty)
        if (isNaN(qty) || qty < 0) {
          alert("Quantity must be a non-negative number")
          return
        }
      }

      if (editPrice !== "") {
        const price = Number(editPrice)
        if (isNaN(price) || price < 0) {
          alert("Price must be a non-negative number")
          return
        }
      }

      // Validate order type and side
      const validTypes = ['MARKET', 'LIMIT']
      const validSides = ['BUY', 'SELL']
      const validStatuses = ['PENDING', 'EXECUTED', 'CANCELLED']

      if (editType && !validTypes.includes(editType.toUpperCase())) {
        alert(`Order type must be one of: ${validTypes.join(', ')}`)
        return
      }

      if (editSide && !validSides.includes(editSide.toUpperCase())) {
        alert(`Order side must be one of: ${validSides.join(', ')}`)
        return
      }

      if (editStatus && !validStatuses.includes(editStatus.toUpperCase())) {
        alert(`Order status must be one of: ${validStatuses.join(', ')}`)
        return
      }

      const payload: any = { orderId: row.id, updates: {} }
      if (editQty !== "") payload.updates.quantity = Number(editQty)
      payload.updates.price = editPrice === "" ? null : Number(editPrice)
      if (editType) payload.updates.orderType = editType.toUpperCase() as any
      if (editSide) payload.updates.orderSide = editSide.toUpperCase() as any
      if (editStatus) payload.updates.status = editStatus.toUpperCase() as any

      console.log("💾 [ORDERS-MGMT] Saving order edit:", payload)

      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: `Save failed: ${res.status}` }))
        throw new Error(error.error || "Failed to save order")
      }

      const result = await res.json()
      console.log("✅ [ORDERS-MGMT] Order saved successfully:", result)

      cancelEdit()
      fetchData()
    } catch (e: any) {
      console.error("❌ [ORDERS-MGMT] Save failed", e)
      alert(e.message || "Save failed")
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
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <PageHeader
        title="Orders Management"
        description="View and modify all orders with URL-synced filters"
        icon={<ListOrdered className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={<RefreshButton onClick={fetchData} loading={loading} />}
      />

      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-3">
            <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2 2xl:col-span-2">
              <label className="text-xs text-muted-foreground">User (clientId/name/id)</label>
              <Input value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1) }} placeholder="ABC123 or name" className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Search</label>
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Symbol or user contains..." className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Symbol</label>
              <Input value={symbol} onChange={(e) => { setSymbol(e.target.value.toUpperCase()); setPage(1) }} placeholder="RELIANCE" className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Input value={status} onChange={(e) => { setStatus(e.target.value.toUpperCase()); setPage(1) }} placeholder="PENDING/EXECUTED/CANCELLED" className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <Input value={type} onChange={(e) => { setType(e.target.value.toUpperCase()); setPage(1) }} placeholder="MARKET/LIMIT" className="text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Side</label>
              <Input value={side} onChange={(e) => { setSide(e.target.value.toUpperCase()); setPage(1) }} placeholder="BUY/SELL" className="text-sm" />
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
          <CardTitle className="text-lg sm:text-xl font-bold text-primary">Orders</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[1000px] sm:min-w-0">
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
                      <StatusBadge status={r.status} type="order" />
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
          </div>

            <Pagination
              currentPage={page}
              totalPages={pages}
              onPageChange={setPage}
              loading={loading}
            />
        </CardContent>
      </Card>
    </div>
  )
}
