"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Check, X, TrendingUp, TrendingDown, AlertCircle, Wallet } from "lucide-react"
import { AddFundsDialog } from "./add-funds-dialog"
import { ApprovalDialog } from "./approval-dialog"
import { WithdrawalDialog } from "./withdrawal-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "@/hooks/use-toast"
import { StatusBadge, PageHeader, RefreshButton, FilterBar, type FilterField } from "./shared"

// Mock data as fallback
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
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [showAddFundsDialog, setShowAddFundsDialog] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false)
  
  // Real data states
  const [deposits, setDeposits] = useState(mockFundRequests)
  const [withdrawals, setWithdrawals] = useState(mockWithdrawalRequests)
  const [isUsingMockData, setIsUsingMockData] = useState(true)
  const [loading, setLoading] = useState(true)

  const fetchRealData = async () => {
    console.log("🔄 [FUND-MANAGEMENT] Fetching real data...")
    setLoading(true)

    try {
      // Fetch deposits and withdrawals in parallel
      const [depositsResponse, withdrawalsResponse] = await Promise.all([
        fetch('/api/admin/deposits').catch(e => {
          console.error("❌ [FUND-MANAGEMENT] Deposits API failed:", e)
          return null
        }),
        fetch('/api/admin/withdrawals').catch(e => {
          console.error("❌ [FUND-MANAGEMENT] Withdrawals API failed:", e)
          return null
        })
      ])

      let hasRealData = false

      // Process deposits
      if (depositsResponse && depositsResponse.ok) {
        const data = await depositsResponse.json()
        console.log("✅ [FUND-MANAGEMENT] Deposits received:", data)

          if (data.success && data.deposits) {
          const realDeposits = data.deposits.map((d: any) => ({
            id: d.id,
            userId: d.userId,
            userName: d.user?.name || 'Unknown',
            userClientId: d.user?.clientId || '',
            amount: Number(d.amount),
            method: d.method,
            utrCode: d.utr || 'N/A',
            status: d.status,
            requestDate: new Date(d.createdAt).toLocaleString(),
            description: d.remarks || '',
            tradingAccount: d.tradingAccount,
            screenshot: d.screenshotUrl || null
          }))
          setDeposits(realDeposits)
          hasRealData = true
          console.log(`✅ [FUND-MANAGEMENT] ${realDeposits.length} real deposits loaded!`)
        }
      }

      // Process withdrawals
      if (withdrawalsResponse && withdrawalsResponse.ok) {
        const data = await withdrawalsResponse.json()
        console.log("✅ [FUND-MANAGEMENT] Withdrawals received:", data)

        if (data.success && data.withdrawals) {
          const realWithdrawals = data.withdrawals.map((w: any) => ({
            id: w.id,
            userId: w.userId,
            userName: w.user?.name || 'Unknown',
            userClientId: w.user?.clientId || '',
            amount: Number(w.amount),
            method: 'Bank Transfer',
            accountDetails: w.bankAccount ? `${w.bankAccount.bankName} - ****${w.bankAccount.accountNumber.slice(-4)}` : 'N/A',
            status: w.status,
            requestDate: new Date(w.createdAt).toLocaleString(),
            description: w.remarks || '',
            tradingAccount: w.tradingAccount,
            bankAccount: w.bankAccount
          }))
          setWithdrawals(realWithdrawals)
          hasRealData = true
          console.log(`✅ [FUND-MANAGEMENT] ${realWithdrawals.length} real withdrawals loaded!`)
        }
      }

      setIsUsingMockData(!hasRealData)
      
      if (hasRealData) {
        toast({
          title: "✅ Real Data Loaded",
          description: "Fund management is showing live data",
        })
      }

    } catch (error) {
      console.error("❌ [FUND-MANAGEMENT] Error fetching data:", error)
      setIsUsingMockData(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRealData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRealData, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleApprove = async (request: any, type: 'deposit' | 'withdrawal') => {
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
      (req.userClientId && req.userClientId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      req.accountDetails.toLowerCase().includes(searchTerm.toLowerCase()),
  )

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
      {/* Mock Data Warning */}
      {isUsingMockData && (
        <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500/50">
          <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          <AlertTitle className="text-yellow-500 text-sm sm:text-base">Using Mock Data</AlertTitle>
          <AlertDescription className="text-yellow-500/80 text-xs sm:text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="flex-1">Unable to load real data from backend. Displaying sample data.</span>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto sm:ml-0 text-xs sm:text-sm"
                onClick={fetchRealData}
                disabled={loading}
              >
                <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <PageHeader
        title="Fund Management"
        description={`Manage deposits, withdrawals, and fund requests${!isUsingMockData ? " • Live Data" : ""}`}
        icon={<Wallet className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={
          <>
            <RefreshButton onClick={fetchRealData} loading={loading} />
            <Button
              onClick={() => setShowAddFundsDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
              size="sm"
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