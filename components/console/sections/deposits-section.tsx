"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowDownToLine, CreditCard, Building2, Smartphone } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DepositForm } from "../deposits/deposit-form"
import { DepositHistory } from "../deposits/deposit-history"
import { UPIPaymentModal } from "../deposits/upi-payment-modal"

export interface DepositRecord {
  id: string
  amount: number
  method: "upi" | "bank" | "cash"
  status: "pending" | "completed" | "failed"
  date: string
  time: string
  utr?: string
  reference?: string
}

const mockDeposits: DepositRecord[] = [
  {
    id: "DEP001",
    amount: 50000,
    method: "upi",
    status: "completed",
    date: "2024-01-15",
    time: "14:30:25",
    utr: "402912345678",
    reference: "UPI-DEP-001",
  },
  {
    id: "DEP002",
    amount: 25000,
    method: "bank",
    status: "completed",
    date: "2024-01-12",
    time: "10:15:42",
    reference: "NEFT-DEP-002",
  },
  {
    id: "DEP003",
    amount: 10000,
    method: "upi",
    status: "pending",
    date: "2024-01-10",
    time: "16:45:18",
    utr: "402987654321",
    reference: "UPI-DEP-003",
  },
]

export function DepositsSection() {
  const [deposits, setDeposits] = useState<DepositRecord[]>(mockDeposits)
  const [showUPIModal, setShowUPIModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState<number>(0)

  const handleDepositSubmit = (amount: number, method: string) => {
    if (method === "upi") {
      setDepositAmount(amount)
      setShowUPIModal(true)
    } else {
      // Handle other payment methods
      const newDeposit: DepositRecord = {
        id: `DEP${String(deposits.length + 1).padStart(3, "0")}`,
        amount,
        method: method as "bank" | "cash",
        status: "pending",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString(),
        reference: `${method.toUpperCase()}-DEP-${deposits.length + 1}`,
      }
      setDeposits([newDeposit, ...deposits])
    }
  }

  const handleUPISuccess = (utr: string) => {
    const newDeposit: DepositRecord = {
      id: `DEP${String(deposits.length + 1).padStart(3, "0")}`,
      amount: depositAmount,
      method: "upi",
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      time: new Date().toLocaleTimeString(),
      utr,
      reference: `UPI-DEP-${deposits.length + 1}`,
    }
    setDeposits([newDeposit, ...deposits])
    setShowUPIModal(false)
  }

  const totalDeposited = deposits.filter((d) => d.status === "completed").reduce((sum, d) => sum + d.amount, 0)

  const pendingDeposits = deposits.filter((d) => d.status === "pending").length

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
          <h1 className="text-2xl font-semibold text-foreground">Deposits</h1>
          <p className="text-muted-foreground">Add funds to your trading account</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                <ArrowDownToLine className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deposited</p>
                <p className="text-xl font-semibold text-green-600">₹{totalDeposited.toLocaleString("en-IN")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-950 rounded-lg">
                <CreditCard className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Deposits</p>
                <p className="text-xl font-semibold text-orange-600">{pendingDeposits}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-xl font-semibold text-blue-600">
                  ₹
                  {deposits
                    .filter((d) => new Date(d.date).getMonth() === new Date().getMonth())
                    .reduce((sum, d) => sum + d.amount, 0)
                    .toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deposit Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Add Funds
              </CardTitle>
              <CardDescription>Choose your preferred deposit method</CardDescription>
            </CardHeader>
            <CardContent>
              <DepositForm onSubmit={handleDepositSubmit} />
            </CardContent>
          </Card>
        </div>

        {/* Deposit History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Deposit History</CardTitle>
              <CardDescription>Track your recent deposit transactions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DepositHistory deposits={deposits} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* UPI Payment Modal */}
      <UPIPaymentModal
        open={showUPIModal}
        onOpenChange={setShowUPIModal}
        amount={depositAmount}
        onSuccess={handleUPISuccess}
      />
    </motion.div>
  )
}
