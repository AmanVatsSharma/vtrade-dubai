"use client"

import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, TrendingUp, TrendingDown, DollarSign, Activity, Calendar } from "lucide-react"

interface UserStatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: any
}

const mockTransactions = [
  {
    id: 1,
    date: "2024-03-15",
    type: "deposit",
    description: "Bank Transfer",
    amount: 5000,
    balance: 50230.5,
    status: "completed",
  },
  {
    id: 2,
    date: "2024-03-14",
    type: "trade",
    description: "BUY AAPL - 100 shares",
    amount: -15000,
    balance: 45230.5,
    status: "completed",
  },
  {
    id: 3,
    date: "2024-03-14",
    type: "trade",
    description: "SELL TSLA - 50 shares",
    amount: 12500,
    balance: 60230.5,
    status: "completed",
  },
  {
    id: 4,
    date: "2024-03-13",
    type: "withdrawal",
    description: "Bank Transfer",
    amount: -2000,
    balance: 47730.5,
    status: "completed",
  },
  {
    id: 5,
    date: "2024-03-12",
    type: "trade",
    description: "BUY GOOGL - 25 shares",
    amount: -8750,
    balance: 49730.5,
    status: "completed",
  },
]

export function UserStatementDialog({ open, onOpenChange, user }: UserStatementDialogProps) {
  if (!user) return null

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <TrendingUp className="w-4 h-4 text-green-400" />
      case "withdrawal":
        return <TrendingDown className="w-4 h-4 text-red-400" />
      case "trade":
        return <Activity className="w-4 h-4 text-blue-400" />
      default:
        return <DollarSign className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "deposit":
        return <Badge className="bg-green-400/20 text-green-400 border-green-400/30">Deposit</Badge>
      case "withdrawal":
        return <Badge className="bg-red-400/20 text-red-400 border-red-400/30">Withdrawal</Badge>
      case "trade":
        return <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">Trade</Badge>
      default:
        return <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">{type}</Badge>
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">User Statement</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Complete transaction history and account details for {user.name}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* User Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-xl font-bold text-green-400">${user.balance.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Trades</p>
                    <p className="text-xl font-bold text-foreground">{user.totalTrades}</p>
                  </div>
                  <Activity className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Win Rate</p>
                    <p className="text-xl font-bold text-foreground">{user.winRate}%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Account Details */}
          <Card className="bg-muted/30 border-border">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-primary">Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client ID:</span>
                    <code className="text-primary font-mono text-sm bg-primary/10 px-2 py-1 rounded">
                      {user.clientId}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="text-foreground font-medium">{user.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-foreground">{user.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="text-foreground">{user.phone}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className="bg-green-400/20 text-green-400 border-green-400/30">{user.status}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">KYC Status:</span>
                    <Badge className="bg-green-400/20 text-green-400 border-green-400/30">{user.kycStatus}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Join Date:</span>
                    <span className="text-foreground">{user.joinDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Login:</span>
                    <span className="text-foreground">{user.lastLogin}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card className="bg-muted/30 border-border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-primary">Transaction History</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Type</TableHead>
                      <TableHead className="text-muted-foreground">Description</TableHead>
                      <TableHead className="text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-muted-foreground">Balance</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockTransactions.map((transaction, index) => (
                      <motion.tr
                        key={transaction.id}
                        className="border-border"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <TableCell className="text-foreground">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{transaction.date}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getTransactionIcon(transaction.type)}
                            {getTransactionBadge(transaction.type)}
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">{transaction.description}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${transaction.amount > 0 ? "text-green-400" : "text-red-400"}`}>
                            {transaction.amount > 0 ? "+" : ""}${Math.abs(transaction.amount).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-foreground font-medium">
                          ${transaction.balance.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-400/20 text-green-400 border-green-400/30">
                            {transaction.status}
                          </Badge>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
