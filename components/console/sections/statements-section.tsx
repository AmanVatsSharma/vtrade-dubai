"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FileText, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatementsTable } from "../statements/statements-table"
import { FilterBar } from "../statements/filter-bar"
import { ExportDialog } from "../statements/export-dialog"

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

const mockTransactions: Transaction[] = [
  {
    id: "TXN001",
    date: "2024-01-15",
    time: "14:30:25",
    type: "credit",
    amount: 50000,
    description: "Fund deposit via UPI",
    balance: 125000.75,
    category: "deposit",
  },
  {
    id: "TXN002",
    date: "2024-01-15",
    time: "10:15:42",
    type: "debit",
    amount: 2500,
    description: "Stock purchase - RELIANCE",
    balance: 75000.75,
    category: "trading",
  },
  {
    id: "TXN003",
    date: "2024-01-14",
    time: "16:45:18",
    type: "credit",
    amount: 1200,
    description: "Dividend received - TCS",
    balance: 78500.75,
    category: "trading",
  },
  {
    id: "TXN004",
    date: "2024-01-14",
    time: "11:20:33",
    type: "debit",
    amount: 25,
    description: "Brokerage charges",
    balance: 77300.75,
    category: "brokerage",
  },
  {
    id: "TXN005",
    date: "2024-01-13",
    time: "09:30:15",
    type: "debit",
    amount: 15000,
    description: "Withdrawal to bank account",
    balance: 77325.75,
    category: "withdrawal",
  },
  {
    id: "TXN006",
    date: "2024-01-12",
    time: "13:45:22",
    type: "credit",
    amount: 3500,
    description: "Stock sale - INFY",
    balance: 92325.75,
    category: "trading",
  },
  {
    id: "TXN007",
    date: "2024-01-12",
    time: "10:15:08",
    type: "debit",
    amount: 50,
    description: "Transaction charges",
    balance: 88825.75,
    category: "charges",
  },
  {
    id: "TXN008",
    date: "2024-01-11",
    time: "15:20:45",
    type: "debit",
    amount: 8000,
    description: "Stock purchase - HDFC Bank",
    balance: 88875.75,
    category: "trading",
  },
]

export function StatementsSection() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions)
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>(mockTransactions)
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
            transactions={transactions}
            onFilterChange={setFilteredTransactions}
            totalTransactions={transactions.length}
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
