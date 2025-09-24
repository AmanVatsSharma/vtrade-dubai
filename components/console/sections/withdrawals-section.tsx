"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowUpFromLine, Building2, Clock, CheckCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WithdrawalRequestForm } from "../withdrawals/withdrawal-request-form"
import { WithdrawalsList } from "../withdrawals/withdrawals-list"

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
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(mockWithdrawals)
  const [bankAccounts] = useState<BankAccount[]>(mockBankAccounts)

  const handleWithdrawalRequest = (amount: number, bankAccountId: string) => {
    const selectedBank = bankAccounts.find((bank) => bank.id === bankAccountId)
    if (!selectedBank) return

    const newWithdrawal: WithdrawalRecord = {
      id: `WD${String(withdrawals.length + 1).padStart(3, "0")}`,
      amount,
      bankAccount: selectedBank,
      status: "pending",
      requestDate: new Date().toISOString().split("T")[0],
      requestTime: new Date().toLocaleTimeString(),
      reference: `WD-2024-${String(withdrawals.length + 1).padStart(3, "0")}`,
      charges: 0,
    }

    setWithdrawals([newWithdrawal, ...withdrawals])
  }

  const totalWithdrawn = withdrawals.filter((w) => w.status === "completed").reduce((sum, w) => sum + w.amount, 0)

  const pendingWithdrawals = withdrawals.filter((w) => w.status === "pending" || w.status === "processing").length

  const availableBalance = 125000.75 // This would come from account data

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
