"use client"

/**
 * Deposits Section Component
 * 
 * Optimized for mobile with:
 * - Responsive grid layouts
 * - Touch-friendly forms
 * - Mobile-optimized modals
 * - Compact card design
 */

import { useState } from "react"
import { motion } from "framer-motion"
import { ArrowDownToLine, CreditCard, Building2, Smartphone } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DepositForm } from "../deposits/deposit-form"
import { DepositHistory } from "../deposits/deposit-history"
import { UPIPaymentModal } from "../deposits/upi-payment-modal"
import { useSession } from "next-auth/react"
import { useConsoleData } from "@/lib/hooks/use-console-data"
import { useToast } from "@/hooks/use-toast"

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
  const [showUPIModal, setShowUPIModal] = useState(false)
  const [depositAmount, setDepositAmount] = useState<number>(0)
  const { toast } = useToast()

  // Get console data
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  const { consoleData, isLoading, error, createDepositRequest } = useConsoleData(userId)

  const deposits = consoleData?.deposits || []
  const bankAccounts = consoleData?.bankAccounts || []

  const handleDepositSubmit = async (amount: number, method: string) => {
    if (method === "upi") {
      setDepositAmount(amount)
      setShowUPIModal(true)
    } else {
      // Handle other payment methods
      const result = await createDepositRequest({
        amount,
        method: method.toLowerCase(),
        bankAccountId: bankAccounts.find(ba => ba.isDefault)?.id,
        reference: `${method.toUpperCase()}-DEP-${Date.now()}`
      })

      if (result.success) {
        toast({
          title: "Deposit Request Created",
          description: "Your deposit request has been submitted successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        })
      }
    }
  }

  const handleUPISuccess = async (utr: string) => {
    const result = await createDepositRequest({
      amount: depositAmount,
      method: "upi",
      bankAccountId: bankAccounts.find(ba => ba.isDefault)?.id,
      utr,
      reference: `UPI-DEP-${Date.now()}`
    })

    if (result.success) {
      toast({
        title: "Deposit Request Created",
        description: "Your UPI deposit request has been submitted successfully.",
      })
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
    
    setShowUPIModal(false)
  }

  const totalDeposited = deposits.filter((d) => d.status === "COMPLETED").reduce((sum, d) => sum + Number(d.amount), 0)
  const pendingDeposits = deposits.filter((d) => d.status === "PENDING" || d.status === "PROCESSING").length

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading deposits data...
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-xl font-semibold text-destructive">Error loading deposits</div>
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
      {/* Header - Mobile Optimized */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Deposits</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">Add funds to your trading account</p>
      </div>

      {/* Summary Cards - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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

      {/* Main Content - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
