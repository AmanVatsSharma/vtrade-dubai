"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowUpFromLine, Building2, Clock, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WithdrawalRequestForm } from "../withdrawals/withdrawal-request-form"
import { WithdrawalsList } from "../withdrawals/withdrawals-list"
import { useSession } from "next-auth/react"
import { useConsoleData } from "@/lib/hooks/use-console-data"
import { useToast } from "@/hooks/use-toast"

export interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  ifscCode: string
  accountHolderName: string
  accountType: "savings" | "current"
  isDefault: boolean
}

export interface WithdrawalRecord {
  id: string
  amount: number
  bankAccount: BankAccount
  status: "pending" | "processing" | "completed" | "failed" | "cancelled"
  requestDate: string
  requestTime: string
  processedDate?: string
  processedTime?: string
  reference: string
  remarks?: string
  charges: number
}

const mockBankAccounts: BankAccount[] = [
  {
    id: "BA001",
    bankName: "HDFC Bank",
    accountNumber: "50100123456789",
    ifscCode: "HDFC0001234",
    accountHolderName: "John Doe",
    accountType: "savings",
    isDefault: true,
  },
  {
    id: "BA002",
    bankName: "ICICI Bank",
    accountNumber: "123456789012",
    ifscCode: "ICIC0001234",
    accountHolderName: "John Doe",
    accountType: "current",
    isDefault: false,
  },
]

const mockWithdrawals: WithdrawalRecord[] = [
  {
    id: "WD001",
    amount: 25000,
    bankAccount: mockBankAccounts[0],
    status: "completed",
    requestDate: "2024-01-15",
    requestTime: "14:30:25",
    processedDate: "2024-01-15",
    processedTime: "16:45:12",
    reference: "WD-2024-001",
    charges: 0,
  },
  {
    id: "WD002",
    amount: 15000,
    bankAccount: mockBankAccounts[1],
    status: "processing",
    requestDate: "2024-01-14",
    requestTime: "10:15:42",
    reference: "WD-2024-002",
    charges: 0,
  },
  {
    id: "WD003",
    amount: 50000,
    bankAccount: mockBankAccounts[0],
    status: "pending",
    requestDate: "2024-01-13",
    requestTime: "16:20:18",
    reference: "WD-2024-003",
    charges: 0,
  },
]

export function WithdrawalsSection() {
  const { toast } = useToast()

  // Get console data
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  const { consoleData, isLoading, error, createWithdrawalRequest } = useConsoleData(userId)

  const withdrawals = consoleData?.withdrawals || []
  const bankAccounts = consoleData?.bankAccounts || []

  const handleWithdrawalRequest = async (amount: number, bankAccountId: string) => {
    const result = await createWithdrawalRequest({
      amount,
      bankAccountId,
      reference: `WD-${Date.now()}`,
      charges: 0
    })

    if (result.success) {
      toast({
        title: "Withdrawal Request Created",
        description: "Your withdrawal request has been submitted successfully.",
      })
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  const totalWithdrawn = withdrawals.filter((w) => w.status === "COMPLETED").reduce((sum, w) => sum + Number(w.amount), 0)
  const pendingWithdrawals = withdrawals.filter((w) => w.status === "PENDING" || w.status === "PROCESSING").length
  const availableBalance = consoleData?.tradingAccount?.availableMargin ?? consoleData?.tradingAccount?.balance ?? 0

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading withdrawals data...
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-xl font-semibold text-destructive">Error loading withdrawals</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      </div>
    )
  }

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
          <h1 className="text-2xl font-semibold text-foreground">Withdrawals</h1>
          <p className="text-muted-foreground">Withdraw funds from your trading account</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-xl font-semibold text-green-600">₹{availableBalance.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                <ArrowUpFromLine className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Withdrawn</p>
                <p className="text-xl font-semibold text-blue-600">₹{totalWithdrawn.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
                <p className="text-xl font-semibold text-orange-600">{pendingWithdrawals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-950 rounded-lg">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Linked Banks</p>
                <p className="text-xl font-semibold text-purple-600">{bankAccounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Withdrawal Request Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpFromLine className="w-5 h-5" />
                Request Withdrawal
              </CardTitle>
              <CardDescription>Withdraw funds to your linked bank account</CardDescription>
            </CardHeader>
            <CardContent>
              <WithdrawalRequestForm
                bankAccounts={bankAccounts}
                availableBalance={availableBalance}
                onSubmit={handleWithdrawalRequest}
              />
            </CardContent>
          </Card>
        </div>

        {/* Withdrawals List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal History</CardTitle>
              <CardDescription>Track your withdrawal requests and their status</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <WithdrawalsList withdrawals={withdrawals} />
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}
