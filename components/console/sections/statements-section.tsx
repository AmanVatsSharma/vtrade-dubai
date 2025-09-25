"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { FileText, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatementsTable } from "../statements/statements-table"
import { FilterBar } from "../statements/filter-bar"
import { ExportDialog } from "../statements/export-dialog"
import { useSession } from "next-auth/react"
import { usePortfolio, useTransactions } from "@/lib/hooks/use-trading-data"

export interface Transaction {
  id: string
  date: string
  time: string
  type: "credit" | "debit"
  amount: number
  description: string
  balance: number
  category: "trading" | "deposit" | "withdrawal" | "brokerage" | "charges"
}

// Live transactions will be fetched based on the logged-in user's trading account

export function StatementsSection() {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  const tradingAccountId = (session?.user as any)?.tradingAccountId as string | undefined
  const { portfolio } = usePortfolio(userId, (session?.user as any)?.name ?? null, (session?.user as any)?.email ?? null)
  const resolvedAccountId = tradingAccountId || (portfolio as any)?.account?.id
  const { transactions, isLoading } = useTransactions(resolvedAccountId)
  const transactionsKey = useMemo(() => JSON.stringify(transactions ?? []), [transactions])
  const mapped: Transaction[] = useMemo(() => {
    try {
      const list = (transactions || []).map((t: any) => ({
        id: t.id,
        date: new Date(t.createdAt).toISOString().split("T")[0],
        time: new Date(t.createdAt).toLocaleTimeString(),
        type: (t.type || "CREDIT").toLowerCase() === "credit" ? "credit" : "debit",
        amount: Number(t.amount) || 0,
        description: t.description || "",
        balance: 0,
        category: (t.type || "trading").toLowerCase() as any,
      }))
      return list
    } catch (e) {
      console.warn("StatementsSection: failed to map transactions", e)
      return []
    }
  // Memoization key shields against unstable array identity
  }, [transactionsKey])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  useEffect(() => setFilteredTransactions(mapped), [mapped])
  const [showExportDialog, setShowExportDialog] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Statements</h1>
          <p className="text-muted-foreground">View and export your transaction history</p>
        </div>
        <Button onClick={() => setShowExportDialog(true)} className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-xl font-semibold">{filteredTransactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-green-100 dark:bg-green-950 rounded flex items-center justify-center">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Credits</p>
                <p className="text-xl font-semibold text-green-600">
                  ₹
                  {filteredTransactions
                    .filter((t) => t.type === "credit")
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-red-100 dark:bg-red-950 rounded flex items-center justify-center">
                <div className="w-2 h-2 bg-red-600 rounded-full" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Debits</p>
                <p className="text-xl font-semibold text-red-600">
                  ₹
                  {filteredTransactions
                    .filter((t) => t.type === "debit")
                    .reduce((sum, t) => sum + t.amount, 0)
                    .toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-blue-100 dark:bg-blue-950 rounded flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Amount</p>
                <p className="text-xl font-semibold text-blue-600">
                  ₹
                  {(
                    filteredTransactions.filter((t) => t.type === "credit").reduce((sum, t) => sum + t.amount, 0) -
                    filteredTransactions.filter((t) => t.type === "debit").reduce((sum, t) => sum + t.amount, 0)
                  ).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-0">
          <FilterBar
            transactions={mapped}
            onFilterChange={setFilteredTransactions}
            totalTransactions={mapped.length}
            filteredCount={filteredTransactions.length}
          />
        </CardContent>
      </Card>

      {/* Statements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Detailed view of all your account transactions</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <StatementsTable transactions={filteredTransactions} />
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <ExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} transactions={filteredTransactions} />
    </motion.div>
  )
}
