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
import { ChevronLeft, ChevronRight, Filter, RefreshCw, User, Edit3, Save, X, Calendar, Hash } from "lucide-react"

interface TxnRow {
  id: string
  createdAt: string
  clientId?: string
  userName?: string
  type: "CREDIT" | "DEBIT"
  description?: string
  amount: number
}

export function TradeManagement() {
  const router = useRouter()
  const sp = useSearchParams()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<TxnRow[]>([])
  const [page, setPage] = useState<number>(parseInt(sp.get("page") || "1"))
  const [pages, setPages] = useState<number>(1)

  // Filters synced with URL
  const [userFilter, setUserFilter] = useState<string>(sp.get("user") || "")
  const [q, setQ] = useState<string>(sp.get("q") || "")
  const [type, setType] = useState<string>(sp.get("type") || "")
  const [from, setFrom] = useState<string>(sp.get("from") || "")
  const [to, setTo] = useState<string>(sp.get("to") || "")

  const params = useMemo(() => {
    const p = new URLSearchParams()
    p.set("page", String(page))
    if (userFilter) p.set("user", userFilter)
    if (q) p.set("q", q)
    if (type) p.set("type", type)
    if (from) p.set("from", from)
    if (to) p.set("to", to)
    return p
  }, [page, userFilter, q, type, from, to])

  useEffect(() => {
    // Sync URL
    const base = "/admin-console?tab=advanced"
    router.replace(`${base}&${params.toString()}`)
  }, [params, router])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/transactions?${params.toString()}&limit=50`)
      if (!res.ok) throw new Error(`Failed: ${res.status}`)
      const data = await res.json()
      const mapped: TxnRow[] = data.transactions.map((t: any) => ({
        id: t.id,
        createdAt: new Date(t.createdAt).toLocaleString(),
        clientId: t.tradingAccount?.user?.clientId,
        userName: t.tradingAccount?.user?.name,
        type: t.type,
        description: t.description,
        amount: Number(t.amount)
      }))
      setRows(mapped)
      setPages(data.pages || 1)
    } catch (e: any) {
      console.error("❌ [TRADE-MGMT] Load failed", e)
      setError(e.message || "Failed to load transactions")
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState<string>("")
  const [editDescription, setEditDescription] = useState<string>("")

  const startEdit = (row: TxnRow) => {
    setEditingId(row.id)
    setEditAmount(String(Math.abs(row.amount)))
    setEditDescription(row.description || "")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditAmount("")
    setEditDescription("")
  }

  const saveEdit = async (row: TxnRow) => {
    try {
      const amountNum = Number(editAmount)
      if (Number.isNaN(amountNum) || amountNum < 0) throw new Error("Invalid amount")

      const res = await fetch("/api/admin/transactions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: row.id, amount: amountNum, description: editDescription, reconcile: true })
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      cancelEdit()
      fetchData()
    } catch (e) {
      console.error("❌ [TRADE-MGMT] Save failed", e)
      alert((e as any)?.message || "Save failed")
    }
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Advanced Trade Management</h1>
            <p className="text-muted-foreground">View and manage all ledger transactions across the platform</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchData} disabled={loading} className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">User (clientId/name/id)</label>
              <Input value={userFilter} onChange={(e) => { setUserFilter(e.target.value); setPage(1) }} placeholder="ABC123 or name" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Search</label>
              <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} placeholder="Description contains..." />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Type</label>
              <Input value={type} onChange={(e) => { setType(e.target.value.toUpperCase()); setPage(1) }} placeholder="CREDIT/DEBIT" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1) }} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1) }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {error && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/50">
          <AlertTitle className="text-red-500">Failed to load</AlertTitle>
          <AlertDescription className="text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-primary">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Time</TableHead>
                  <TableHead className="text-muted-foreground">Client</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">No transactions</TableCell>
                  </TableRow>
                )}
                {!loading && rows.map((r) => (
                  <TableRow key={r.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {r.createdAt}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Hash className="w-4 h-4 text-muted-foreground" />
                        <code className="text-primary font-mono">{r.clientId || "-"}</code>
                        <span className="text-muted-foreground">{r.userName || ""}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.type === "CREDIT" ? (
                        <Badge className="bg-emerald-400/20 text-emerald-400 border-emerald-400/30">CREDIT</Badge>
                      ) : (
                        <Badge className="bg-rose-400/20 text-rose-400 border-rose-400/30">DEBIT</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                      ) : (
                        <span className="text-foreground text-sm">{r.description || "—"}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <Input value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
                      ) : (
                        <span className={`font-bold ${r.amount > 0 ? "text-green-400" : "text-red-400"}`}>{r.amount > 0 ? "+" : ""}₹{Math.abs(r.amount).toLocaleString()}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => saveEdit(r)} className="bg-primary hover:bg-primary/90 text-white">
                            <Save className="w-4 h-4 mr-1" /> Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                          <Edit3 className="w-4 h-4 mr-1" /> Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
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
