"use client"

import { motion } from "framer-motion"
import { Clock, CheckCircle, XCircle, Copy } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { DepositRecord } from "./deposits-section"

interface DepositHistoryProps {
  deposits: DepositRecord[]
}

export function DepositHistory({ deposits }: DepositHistoryProps) {
  const { toast } = useToast()

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "pending":
        return <Clock className="w-4 h-4 text-orange-600" />
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950"
      case "pending":
        return "border-orange-200 text-orange-700 bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:bg-orange-950"
      case "failed":
        return "border-red-200 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-300 dark:bg-red-950"
      default:
        return "border-gray-200 text-gray-700 bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:bg-gray-950"
    }
  }

  const getMethodBadge = (method: string) => {
    switch (method) {
      case "upi":
        return "UPI"
      case "bank":
        return "Bank Transfer"
      case "cash":
        return "Cash Deposit"
      default:
        return method.toUpperCase()
    }
  }

  const copyUTR = async (utr: string) => {
    try {
      await navigator.clipboard.writeText(utr)
      toast({
        title: "Copied!",
        description: "UTR number copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  if (deposits.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No deposits found. Make your first deposit to get started!</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>UTR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deposits.map((deposit, index) => (
            <motion.tr
              key={deposit.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group hover:bg-muted/50"
            >
              <TableCell>
                <div>
                  <div className="font-medium">{formatDate(deposit.date)}</div>
                  <div className="text-sm text-muted-foreground">{deposit.time}</div>
                </div>
              </TableCell>
              <TableCell>
                <span className="font-semibold text-green-600">{formatCurrency(deposit.amount)}</span>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{getMethodBadge(deposit.method)}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={cn("gap-1", getStatusColor(deposit.status))}>
                  {getStatusIcon(deposit.status)}
                  {deposit.status.charAt(0).toUpperCase() + deposit.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="font-mono text-sm">{deposit.reference}</span>
              </TableCell>
              <TableCell>
                {deposit.utr ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{deposit.utr}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyUTR(deposit.utr!)}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
            </motion.tr>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
