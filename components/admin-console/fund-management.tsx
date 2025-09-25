"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Eye, Check, X, TrendingUp, TrendingDown, Clock, AlertCircle } from "lucide-react"
import { AddFundsDialog } from "./add-funds-dialog"
import { ApprovalDialog } from "./approval-dialog"
import { WithdrawalDialog } from "./withdrawal-dialog"

const fundRequests = [
  {
    id: 1,
    userId: "USR_001234",
    userName: "Alex Chen",
    amount: 5000,
    method: "Bank Transfer",
    utrCode: "UTR123456789",
    screenshot: "/placeholder.svg?height=200&width=300",
    status: "pending",
    requestDate: "2024-03-15 10:30 AM",
    description: "Initial deposit for trading account",
  },
  {
    id: 2,
    userId: "USR_005678",
    userName: "Sarah Johnson",
    amount: 10000,
    method: "UPI",
    utrCode: "UPI987654321",
    screenshot: "/placeholder.svg?height=200&width=300",
    status: "approved",
    requestDate: "2024-03-15 09:15 AM",
    approvedDate: "2024-03-15 09:45 AM",
    description: "Additional funds for portfolio expansion",
  },
  {
    id: 3,
    userId: "USR_009876",
    userName: "Mike Rodriguez",
    amount: 2500,
    method: "NEFT",
    utrCode: "NEFT456789123",
    screenshot: "/placeholder.svg?height=200&width=300",
    status: "rejected",
    requestDate: "2024-03-14 04:20 PM",
    rejectedDate: "2024-03-14 05:10 PM",
    rejectionReason: "Invalid UTR code",
    description: "Fund addition request",
  },
]

const withdrawalRequests = [
  {
    id: 1,
    userId: "USR_004321",
    userName: "Emma Wilson",
    amount: 3000,
    method: "Bank Transfer",
    accountDetails: "HDFC Bank - ****1234",
    status: "pending",
    requestDate: "2024-03-15 11:00 AM",
    description: "Profit withdrawal",
  },
  {
    id: 2,
    userId: "USR_007890",
    userName: "David Kim",
    amount: 1500,
    method: "UPI",
    accountDetails: "david.kim@paytm",
    status: "processing",
    requestDate: "2024-03-15 08:30 AM",
    description: "Partial withdrawal",
  },
  {
    id: 3,
    userId: "USR_001234",
    userName: "Alex Chen",
    amount: 5000,
    method: "Bank Transfer",
    accountDetails: "SBI Bank - ****5678",
    status: "completed",
    requestDate: "2024-03-14 02:15 PM",
    completedDate: "2024-03-14 04:30 PM",
    transactionId: "TXN789456123",
    description: "Emergency withdrawal",
  },
]

export function FundManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [showAddFundsDialog, setShowAddFundsDialog] = useState(false)
  const [showApprovalDialog, setShowApprovalDialog] = useState(false)
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("fund-requests")

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30">Pending</Badge>
      case "approved":
        return <Badge className="bg-green-400/20 text-green-400 border-green-400/30">Approved</Badge>
      case "rejected":
        return <Badge className="bg-red-400/20 text-red-400 border-red-400/30">Rejected</Badge>
      case "processing":
        return <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">Processing</Badge>
      case "completed":
        return <Badge className="bg-green-400/20 text-green-400 border-green-400/30">Completed</Badge>
      default:
        return <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">{status}</Badge>
    }
  }

  const filteredFundRequests = fundRequests.filter(
    (request) =>
      request.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.utrCode.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredWithdrawalRequests = withdrawalRequests.filter(
    (request) =>
      request.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.userId.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Fund Management</h1>
            <p className="text-muted-foreground">Manage deposits, withdrawals, and fund approvals</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowAddFundsDialog(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Funds
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Deposits</p>
                <p className="text-2xl font-bold text-yellow-400">$17,500</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Deposits</p>
                <p className="text-2xl font-bold text-green-400">$2.4M</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Withdrawals</p>
                <p className="text-2xl font-bold text-orange-400">$4,500</p>
              </div>
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Withdrawals</p>
                <p className="text-2xl font-bold text-red-400">$890K</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, ID, or UTR code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted/50 border-border focus:border-primary"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-muted/30">
            <TabsTrigger
              value="fund-requests"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Fund Requests
            </TabsTrigger>
            <TabsTrigger
              value="withdrawals"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Withdrawal Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fund-requests">
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-primary">Fund Deposit Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">User</TableHead>
                        <TableHead className="text-muted-foreground">Amount</TableHead>
                        <TableHead className="text-muted-foreground">Method</TableHead>
                        <TableHead className="text-muted-foreground">UTR Code</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Date</TableHead>
                        <TableHead className="text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFundRequests.map((request, index) => (
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
                              <p className="text-sm text-muted-foreground">{request.userId}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-bold text-green-400">${request.amount.toLocaleString()}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">{request.method}</Badge>
                          </TableCell>
                          <TableCell>
                            <code className="text-primary font-mono text-sm bg-primary/10 px-2 py-1 rounded">
                              {request.utrCode}
                            </code>
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-foreground">{request.requestDate}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request)
                                  setShowApprovalDialog(true)
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {request.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-green-400 hover:text-green-300"
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-primary">Withdrawal Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead className="text-muted-foreground">User</TableHead>
                        <TableHead className="text-muted-foreground">Amount</TableHead>
                        <TableHead className="text-muted-foreground">Method</TableHead>
                        <TableHead className="text-muted-foreground">Account</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground">Date</TableHead>
                        <TableHead className="text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWithdrawalRequests.map((request, index) => (
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
                              <p className="text-sm text-muted-foreground">{request.userId}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-bold text-red-400">${request.amount.toLocaleString()}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-purple-400/20 text-purple-400 border-purple-400/30">
                              {request.method}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-foreground">{request.accountDetails}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell className="text-foreground">{request.requestDate}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request)
                                  setShowWithdrawalDialog(true)
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {request.status === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-green-400 hover:text-green-300"
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Dialogs */}
      <AddFundsDialog open={showAddFundsDialog} onOpenChange={setShowAddFundsDialog} />
      <ApprovalDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog} request={selectedRequest} />
      <WithdrawalDialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog} request={selectedRequest} />
    </div>
  )
}
