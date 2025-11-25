"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, TrendingUp, TrendingDown, DollarSign, Activity, Calendar, RefreshCcw } from "lucide-react"

interface UserStatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: any
}

type StatementRow = {
  id: string
  date: string
  type: "deposit" | "withdrawal" | "trade" | "credit" | "debit"
  description: string
  amount: number
  balance?: number
  status?: string
}

export function UserStatementDialog({ open, onOpenChange, user }: UserStatementDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statement, setStatement] = useState<StatementRow[]>([])
  const [details, setDetails] = useState<any | null>(null)

  // Load real data when dialog opens
  useEffect(() => {
    if (!open || !user?.id) return

    const fetchDetails = async () => {
      setLoading(true)
      setError(null)
      console.log("🔄 [USER-STATEMENT-DIALOG] Fetching user details", { userId: user.id })
      try {
        const res = await fetch(`/api/admin/users/${user.id}`)
        if (!res.ok) throw new Error(`Failed to load user details: ${res.status}`)
        const data = await res.json()
        console.log("✅ [USER-STATEMENT-DIALOG] Details received", data)
        const u = data.user
        setDetails(u)

        // Build unified statement from orders (executed), deposits, withdrawals, and ledger transactions
        const rows: StatementRow[] = []

        // Orders as trades
        const orders = u?.tradingAccount?.orders || []
        for (const o of orders) {
          if (o.status !== "EXECUTED") continue
          const qty = Number(o.filledQuantity || o.quantity || 0)
          const px = Number(o.averagePrice || o.price || 0)
          const signed = o.orderSide === "BUY" ? -1 : 1
          rows.push({
            id: `order-${o.id}`,
            date: new Date(o.executedAt || o.createdAt).toLocaleString(),
            type: "trade",
            description: `${o.orderSide} ${o.symbol} x ${qty} @ ${px}`,
            amount: signed * qty * px,
            status: o.status
          })
        }

        // Ledger transactions (credits/debits)
        const txs = u?.tradingAccount?.trades || []
        for (const t of txs) {
          const tAmount = Number(t.amount)
          rows.push({
            id: `tx-${t.id}`,
            date: new Date(t.createdAt).toLocaleString(),
            type: t.type === "CREDIT" ? "credit" : "debit",
            description: t.description || (t.type === "CREDIT" ? "Credit" : "Debit"),
            amount: t.type === "CREDIT" ? tAmount : -tAmount,
          })
        }

        // Deposits
        const deposits = u?.deposits || []
        for (const d of deposits) {
          rows.push({
            id: `dep-${d.id}`,
            date: new Date(d.createdAt).toLocaleString(),
            type: "deposit",
            description: `Deposit (${d.method}) ${d.utr ? `UTR ${d.utr}` : ""}`.trim(),
            amount: Number(d.amount),
            status: d.status
          })
        }

        // Withdrawals
        const withdrawals = u?.withdrawals || []
        for (const w of withdrawals) {
          rows.push({
            id: `wd-${w.id}`,
            date: new Date(w.createdAt).toLocaleString(),
            type: "withdrawal",
            description: `Withdrawal ${w.reference ? `Ref ${w.reference}` : ""}`.trim(),
            amount: -Number(w.amount) - Number(w.charges || 0),
            status: w.status
          })
        }

        // Sort by date desc
        rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setStatement(rows)
      } catch (e: any) {
        console.error("❌ [USER-STATEMENT-DIALOG] Failed to fetch details", e)
        setError(e.message || "Failed to load user details")
      } finally {
        setLoading(false)
      }
    }

    fetchDetails()
  }, [open, user?.id])

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <TrendingUp className="w-4 h-4 text-green-400" />
      case "withdrawal":
        return <TrendingDown className="w-4 h-4 text-red-400" />
      case "trade":
        return <Activity className="w-4 h-4 text-blue-400" />
      case "credit":
        return <TrendingUp className="w-4 h-4 text-emerald-400" />
      case "debit":
        return <TrendingDown className="w-4 h-4 text-rose-400" />
      default:
        return <DollarSign className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "deposit":
        return <Badge className="bg-green-400/20 text-green-400 border-green-400/30">Deposit</Badge>
      case "withdrawal":
        return <Badge className="bg-red-400/20 text-red-400 border-red-400/30">Withdrawal</Badge>
      case "trade":
        return <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">Trade</Badge>
      case "credit":
        return <Badge className="bg-emerald-400/20 text-emerald-400 border-emerald-400/30">Credit</Badge>
      case "debit":
        return <Badge className="bg-rose-400/20 text-rose-400 border-rose-400/30">Debit</Badge>
      default:
        return <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">{type}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
          <DialogTitle className="text-lg sm:text-xl font-bold text-primary">User Statement</DialogTitle>
          <DialogDescription className="text-sm sm:text-base text-muted-foreground">
            Complete transaction history and account details for {user?.name}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* User Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-xl font-bold text-green-400">₹{(details?.tradingAccount?.balance ?? user?.balance ?? 0).toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Trades</p>
                    <p className="text-xl font-bold text-foreground">{details?.tradingAccount?.orders?.length ?? user?.totalTrades ?? 0}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-xl font-bold text-foreground">{user?.winRate ?? "-"}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Details */}
          <Card className="bg-muted/30 border-border">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary">Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client ID:</span>
                    <code className="text-primary font-mono text-sm bg-primary/10 px-2 py-1 rounded">
                      {details?.clientId ?? user?.clientId}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="text-foreground font-medium">{details?.name ?? user?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-foreground">{details?.email ?? user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="text-foreground">{details?.phone ?? user?.phone}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className="bg-green-400/20 text-green-400 border-green-400/30">{user?.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KYC Status:</span>
                    <Badge className="bg-green-400/20 text-green-400 border-green-400/30">{user?.kycStatus}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Join Date:</span>
                    <span className="text-foreground">{user?.joinDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Login:</span>
                    <span className="text-foreground">{user?.lastLogin}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card className="bg-muted/30 border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-primary">Transaction History</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Type</TableHead>
                      <TableHead className="text-muted-foreground">Description</TableHead>
                      <TableHead className="text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-muted-foreground">Balance</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Loading statement...
                        </TableCell>
                      </TableRow>
                    )}
                    {error && !loading && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-red-400">
                          {error}
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && !error && statement.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && !error && statement.map((transaction, index) => (
                      <motion.tr
                        key={transaction.id}
                        className="border-border"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                      >
                        <TableCell className="text-foreground">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{transaction.date}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getTransactionIcon(transaction.type)}
                            {getTransactionBadge(transaction.type)}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">{transaction.description}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${transaction.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                            {transaction.amount > 0 ? "+" : ""}₹{Math.abs(transaction.amount).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-foreground font-medium">
                          {transaction.balance !== undefined ? `₹${transaction.balance.toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell>
                          {transaction.status ? (
                            <Badge className="bg-green-400/20 text-green-400 border-green-400/30">
                              {transaction.status}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
