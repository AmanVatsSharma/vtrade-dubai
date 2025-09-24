"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Transaction } from "./statements-section"

interface StatementsTableProps {
  transactions: Transaction[]
}

type SortField = "date" | "amount" | "balance"
type SortDirection = "asc" | "desc"

export function StatementsTable({ transactions }: StatementsTableProps) {
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const sortedTransactions = [...transactions].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case "date":
        aValue = new Date(`${a.date} ${a.time}`)
        bValue = new Date(`${b.date} ${b.time}`)
        break
      case "amount":
        aValue = a.amount
        bValue = b.amount
        break
      case "balance":
        aValue = a.balance
        bValue = b.balance
        break
      default:
        return 0
    }

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "trading":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
      case "deposit":
        return "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
      case "withdrawal":
        return "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
      case "brokerage":
        return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
      case "charges":
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-300"
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4" />
    }
    return sortDirection === "asc" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
  }

  if (transactions.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No transactions found matching your criteria.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("date")}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Date & Time
                <SortIcon field="date" />
              </Button>
            </TableHead>
            <TableHead>Type</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("amount")}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Amount
                <SortIcon field="amount" />
              </Button>
            </TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => handleSort("balance")}
                className="h-auto p-0 font-semibold hover:bg-transparent"
              >
                Balance
                <SortIcon field="balance" />
              </Button>
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTransactions.map((transaction, index) => (
            <motion.tr
              key={transaction.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group hover:bg-muted/50"
            >
              <TableCell>
                <div>
                  <div className="font-medium">{formatDate(transaction.date)}</div>
                  <div className="text-sm text-muted-foreground">{transaction.time}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    transaction.type === "credit"
                      ? "border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950"
                      : "border-red-200 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950",
                  )}
                >
                  {transaction.type === "credit" ? "Credit" : "Debit"}
                </Badge>
              </TableCell>
              <TableCell>
                <span
                  className={cn("font-semibold", transaction.type === "credit" ? "text-green-600" : "text-red-600")}
                >
                  {transaction.type === "credit" ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </span>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{transaction.description}</div>
                  <div className="text-sm text-muted-foreground">ID: {transaction.id}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={getCategoryColor(transaction.category)}>
                  {transaction.category}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">{formatCurrency(transaction.balance)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Download Receipt</DropdownMenuItem>
                    <DropdownMenuItem>Report Issue</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
