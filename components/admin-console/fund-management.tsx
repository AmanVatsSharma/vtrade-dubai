/**
 * @file fund-management.tsx
 * @module admin-console
 * @description Fund management dashboard for deposits and withdrawals
 * @author BharatERP
 * @created 2026-01-15
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Check, X, TrendingUp, TrendingDown, AlertCircle, Wallet, RefreshCw, Activity } from "lucide-react"
import { AddFundsDialog } from "./add-funds-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"
import { StatusBadge, PageHeader, RefreshButton, FilterBar, type FilterField } from "./shared"
import { deriveDataSourceStatus, type DataSourceStatus } from "@/lib/admin/data-source"

// Sample data for manual demos
const mockFundRequests = [
  {
    id: "1",
    userId: "USR_001234",
    userClientId: "CLI001234",
    userName: "Alex Chen",
    amount: 5000,
    method: "Bank Transfer",
    utrCode: "UTR123456789",
    screenshot: "/placeholder.svg",
    status: "PENDING",
    requestDate: "2024-03-15 10:30 AM",
    description: "Initial deposit",
  },
]

const mockWithdrawalRequests = [
  {
    id: "1",
    userId: "USR_004321",
    userClientId: "CLI004321",
    userName: "Emma Wilson",
    amount: 3000,
    method: "Bank Transfer",
    accountDetails: "HDFC Bank - ****1234",
    status: "PENDING",
    requestDate: "2024-03-15 11:00 AM",
    description: "Profit withdrawal",
  },
]

export function FundManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddFundsDialog, setShowAddFundsDialog] = useState(false)
  
  // Data states
  const [deposits, setDeposits] = useState<typeof mockFundRequests>([])
  const [withdrawals, setWithdrawals] = useState<typeof mockWithdrawalRequests>([])
  const [useSampleData, setUseSampleData] = useState(false)
  const [dataSourceStatus, setDataSourceStatus] = useState<DataSourceStatus>("loading")
  const [dataSourceErrors, setDataSourceErrors] = useState<string[]>([])
  const [dataSourceSummary, setDataSourceSummary] = useState<{ okCount: number; total: number } | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const getIstTimestamp = () => new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })

  const getResponseErrorMessage = async (response: Response, fallback: string) => {
    const data = await response.json().catch(() => null)
    return data?.error || data?.message || fallback
  }

  const fetchRealData = async () => {
    console.log(`[FUND-MANAGEMENT] ${getIstTimestamp()} Fetching real data`)
    setLoading(true)
    setDataSourceStatus("loading")

    const depositResult = { name: "Deposits API", ok: false, error: "" }
    const withdrawalResult = { name: "Withdrawals API", ok: false, error: "" }

    try {
      const [depositsResponse, withdrawalsResponse] = await Promise.all([
        fetch("/api/admin/deposits").catch((error) => {
          depositResult.error = error?.message || "Deposits request failed"
          return null
        }),
        fetch("/api/admin/withdrawals").catch((error) => {
          withdrawalResult.error = error?.message || "Withdrawals request failed"
          return null
        }),
      ])

      if (depositsResponse && depositsResponse.ok) {
        const data = await depositsResponse.json()
        if (data.success && data.deposits) {
          const realDeposits = data.deposits.map((d: any) => ({
            id: d.id,
            userId: d.userId,
            userName: d.user?.name || "Unknown",
            userClientId: d.user?.clientId || "",
            amount: Number(d.amount),
            method: d.method,
            utrCode: d.utr || "N/A",
            status: d.status,
            requestDate: new Date(d.createdAt).toLocaleString(),
            description: d.remarks || "",
            tradingAccount: d.tradingAccount,
            screenshot: d.screenshotUrl || null,
          }))
          setDeposits(realDeposits)
          depositResult.ok = true
        }
      } else if (depositsResponse) {
        depositResult.error = await getResponseErrorMessage(depositsResponse, "Failed to load deposits")
        setDeposits([])
      } else {
        setDeposits([])
      }

      if (withdrawalsResponse && withdrawalsResponse.ok) {
        const data = await withdrawalsResponse.json()
        if (data.success && data.withdrawals) {
          const realWithdrawals = data.withdrawals.map((w: any) => ({
            id: w.id,
            userId: w.userId,
            userName: w.user?.name || "Unknown",
            userClientId: w.user?.clientId || "",
            amount: Number(w.amount),
            method: "Bank Transfer",
            accountDetails: w.bankAccount
              ? `${w.bankAccount.bankName} - ****${w.bankAccount.accountNumber.slice(-4)}`
              : "N/A",
            status: w.status,
            requestDate: new Date(w.createdAt).toLocaleString(),
            description: w.remarks || "",
            tradingAccount: w.tradingAccount,
            bankAccount: w.bankAccount,
          }))
          setWithdrawals(realWithdrawals)
          withdrawalResult.ok = true
        }
      } else if (withdrawalsResponse) {
        withdrawalResult.error = await getResponseErrorMessage(withdrawalsResponse, "Failed to load withdrawals")
        setWithdrawals([])
      } else {
        setWithdrawals([])
      }

      const summary = deriveDataSourceStatus([depositResult, withdrawalResult])
      setDataSourceStatus(summary.status)
      setDataSourceErrors(summary.errors)
      setDataSourceSummary({ okCount: summary.okCount, total: summary.total })
      setLastUpdatedAt(getIstTimestamp())
    } catch (error: any) {
      console.error("[FUND-MANAGEMENT] Fetch failed", error)
      setDeposits([])
      setWithdrawals([])
      setDataSourceStatus("error")
      setDataSourceErrors([error?.message || "Unable to fetch fund data"])
      setDataSourceSummary({ okCount: 0, total: 2 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (useSampleData) return

    fetchRealData()
    const interval = setInterval(fetchRealData, 30000)
    return () => clearInterval(interval)
  }, [useSampleData])

  const handleUseSampleData = () => {
    setUseSampleData(true)
    setLoading(false)
    setDeposits(mockFundRequests)
    setWithdrawals(mockWithdrawalRequests)
    setDataSourceStatus("sample")
    setDataSourceErrors([])
    setDataSourceSummary({ okCount: 0, total: 2 })
    setLastUpdatedAt(getIstTimestamp())
    toast({ title: "Sample data loaded", description: "Fund management is now showing sample data." })
  }

  const handleUseLiveData = () => {
    setUseSampleData(false)
  }

  const handleApprove = async (request: any, type: 'deposit' | 'withdrawal') => {
    if (useSampleData) {
      toast({
        title: "Live data required",
        description: "Switch to live data to approve requests.",
        variant: "destructive"
      })
      return
    }
    console.log(`✅ [FUND-MANAGEMENT] Approving ${type}:`, request.id)
    
    try {
      const endpoint = type === 'deposit' ? '/api/admin/deposits' : '/api/admin/withdrawals'
      const body: any = {
        [type === 'deposit' ? 'depositId' : 'withdrawalId']: request.id,
        action: 'approve'
      }

      // For withdrawals, add transaction ID
      if (type === 'withdrawal') {
        const txnId = prompt('Enter transaction/reference ID:')
        if (!txnId) return
        body.transactionId = txnId
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to approve ${type}`)
      }

      console.log(`✅ [FUND-MANAGEMENT] ${type} approved successfully`)
      toast({
        title: "✅ Approved",
        description: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ₹${request.amount} approved successfully`,
      })

      // Refresh data
      fetchRealData()

    } catch (error: any) {
      console.error(`❌ [FUND-MANAGEMENT] Error approving ${type}:`, error)
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleReject = async (request: any, type: 'deposit' | 'withdrawal') => {
    if (useSampleData) {
      toast({
        title: "Live data required",
        description: "Switch to live data to reject requests.",
        variant: "destructive"
      })
      return
    }
    console.log(`❌ [FUND-MANAGEMENT] Rejecting ${type}:`, request.id)
    
    const reason = prompt('Enter reason for rejection:')
    if (!reason) return

    try {
      const endpoint = type === 'deposit' ? '/api/admin/deposits' : '/api/admin/withdrawals'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [type === 'deposit' ? 'depositId' : 'withdrawalId']: request.id,
          action: 'reject',
          reason
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to reject ${type}`)
      }

      console.log(`✅ [FUND-MANAGEMENT] ${type} rejected successfully`)
      toast({
        title: "✅ Rejected",
        description: `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} rejected: ${reason}`,
      })

      // Refresh data
      fetchRealData()

    } catch (error: any) {
      console.error(`❌ [FUND-MANAGEMENT] Error rejecting ${type}:`, error)
      toast({
        title: "❌ Error",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const filteredDeposits = deposits.filter(
    (req) =>
      req.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.userClientId && req.userClientId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      req.utrCode.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredWithdrawals = withdrawals.filter(
    (req) =>
      req.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ((req as any).userClientId && (req as any).userClientId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      req.accountDetails.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const dataBadge = (() => {
    if (dataSourceStatus === "live") return { status: "SUCCESS", label: "Live" }
    if (dataSourceStatus === "partial") {
      const suffix = dataSourceSummary ? ` ${dataSourceSummary.okCount}/${dataSourceSummary.total}` : ""
      return { status: "WARNING", label: `Partial${suffix}` }
    }
    if (dataSourceStatus === "error") return { status: "ERROR", label: "Error" }
    if (dataSourceStatus === "sample") return { status: "INFO", label: "Sample" }
    return { status: "PENDING", label: "Loading" }
  })()

  // Filter fields configuration
  const filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search by user name, client ID, or UTR...',
      span: 2
    }
  ]

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Data Source Status */}
      {dataSourceStatus === "error" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <AlertTitle className="text-red-500 text-sm sm:text-base">Live data unavailable</AlertTitle>
          <AlertDescription className="text-red-400 text-xs sm:text-sm space-y-2">
            {dataSourceErrors.length > 0 && (
              <div className="space-y-1">
                {dataSourceErrors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm"
                onClick={fetchRealData}
                disabled={loading}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                Retry
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm"
                onClick={handleUseSampleData}
              >
                Use Sample Data
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {dataSourceStatus === "partial" && (
        <Alert className="bg-yellow-500/10 border-yellow-500/50">
          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          <AlertTitle className="text-yellow-500 text-sm sm:text-base">Partial data loaded</AlertTitle>
          <AlertDescription className="text-yellow-500/80 text-xs sm:text-sm space-y-2">
            {dataSourceErrors.length > 0 && (
              <div className="space-y-1">
                {dataSourceErrors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm"
                onClick={fetchRealData}
                disabled={loading}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
                Retry
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs sm:text-sm"
                onClick={handleUseSampleData}
              >
                Use Sample Data
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      {dataSourceStatus === "sample" && (
        <Alert className="bg-blue-500/10 border-blue-500/50">
          <Activity className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <AlertTitle className="text-blue-500 text-sm sm:text-base">Sample data mode</AlertTitle>
          <AlertDescription className="text-blue-500/80 text-xs sm:text-sm space-y-2">
            <p>Sample data is active. Switch back to live data to run admin actions reliably.</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-xs sm:text-sm"
              onClick={handleUseLiveData}
            >
              Use Live Data
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <PageHeader
        title="Fund Management"
        description="Manage deposits, withdrawals, and fund requests"
        icon={<Wallet className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={
          <>
            <StatusBadge status={dataBadge.status} type="general">
              {dataBadge.label}
            </StatusBadge>
            {lastUpdatedAt && <span className="text-xs text-muted-foreground">Updated {lastUpdatedAt}</span>}
            {!useSampleData && (
              <Button variant="outline" size="sm" onClick={handleUseSampleData} className="text-xs sm:text-sm">
                Load Sample
              </Button>
            )}
            <RefreshButton
              onClick={() => (useSampleData ? handleUseLiveData() : fetchRealData())}
              loading={loading}
            />
            <Button
              onClick={() => setShowAddFundsDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
              size="sm"
              disabled={useSampleData}
              title={useSampleData ? "Switch to live data to add funds" : "Add funds"}
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Add Funds</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </>
        }
      />

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <FilterBar
          filters={{ search: searchTerm }}
          fields={filterFields}
          onFilterChange={(key, value) => {
            if (key === 'search') setSearchTerm(value)
          }}
          onReset={() => setSearchTerm('')}
          showReset={false}
        />
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Tabs defaultValue="deposits" className="space-y-3 sm:space-y-4 md:space-y-6">
          <TabsList className="bg-muted/50 w-full sm:w-auto flex flex-col sm:flex-row">
            <TabsTrigger value="deposits" className="text-xs sm:text-sm w-full sm:w-auto">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Deposit Requests</span>
              <span className="sm:hidden">Deposits</span>
              <span className="ml-1 sm:ml-2">({filteredDeposits.length})</span>
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-xs sm:text-sm w-full sm:w-auto">
              <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Withdrawal Requests</span>
              <span className="sm:hidden">Withdrawals</span>
              <span className="ml-1 sm:ml-2">({filteredWithdrawals.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Deposits Tab */}
          <TabsContent value="deposits">
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-lg sm:text-xl font-bold text-primary">Deposit Requests</CardTitle>
              </CardHeader>
              <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <div className="min-w-[900px] sm:min-w-0">
                    <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">User</TableHead>
                        <TableHead className="text-muted-foreground">Amount</TableHead>
                        <TableHead className="text-muted-foreground">Method</TableHead>
                        <TableHead className="text-muted-foreground">UTR/Reference</TableHead>
                        <TableHead className="text-muted-foreground">Proof</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Date</TableHead>
                        <TableHead className="text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeposits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            No deposit requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDeposits.map((request, index) => (
                          <motion.tr
                            key={request.id}
                            className="border-border hover:bg-muted/30 transition-colors"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground">{request.userName}</p>
                                <p className="text-sm text-muted-foreground">{request.userClientId || request.userId}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-bold text-green-400">₹{request.amount.toLocaleString()}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-foreground">{request.method}</p>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">{request.utrCode}</code>
                            </TableCell>
                            <TableCell>
                              {request.screenshot ? (
                                <a
                                  href={request.screenshot}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary underline"
                                >
                                  View
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell><StatusBadge status={request.status} /></TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground">{request.requestDate}</p>
                            </TableCell>
                            <TableCell>
                              {request.status === 'PENDING' ? (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(request, 'deposit')}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleReject(request, 'deposit')}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </motion.tr>
                        ))
                      )}
                    </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals">
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-lg sm:text-xl font-bold text-primary">Withdrawal Requests</CardTitle>
              </CardHeader>
              <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
                <div className="overflow-x-auto -mx-3 sm:mx-0">
                  <div className="min-w-[900px] sm:min-w-0">
                    <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">User</TableHead>
                        <TableHead className="text-muted-foreground">Amount</TableHead>
                        <TableHead className="text-muted-foreground">Bank Account</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Date</TableHead>
                        <TableHead className="text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWithdrawals.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No withdrawal requests found
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredWithdrawals.map((request, index) => (
                          <motion.tr
                            key={request.id}
                            className="border-border hover:bg-muted/30 transition-colors"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground">{request.userName}</p>
                                <p className="text-sm text-muted-foreground">{request.userClientId || request.userId}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-bold text-red-400">₹{request.amount.toLocaleString()}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm text-foreground">{request.accountDetails}</p>
                            </TableCell>
                            <TableCell><StatusBadge status={request.status} /></TableCell>
                            <TableCell>
                              <p className="text-sm text-muted-foreground">{request.requestDate}</p>
                            </TableCell>
                            <TableCell>
                              {request.status === 'PENDING' ? (
                                <div className="flex items-center space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(request, 'withdrawal')}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleReject(request, 'withdrawal')}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </motion.tr>
                        ))
                      )}
                    </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Dialogs */}
      <AddFundsDialog open={showAddFundsDialog} onOpenChange={setShowAddFundsDialog} />
    </div>
  )
}