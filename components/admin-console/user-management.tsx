"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Search,
  Eye,
  Edit,
  Trash2,
  Download,
  UserPlus,
  Shield,
  DollarSign,
  Activity,
  Copy,
  Check,
} from "lucide-react"
import { CreateUserDialog } from "./create-user-dialog"
import { UserStatementDialog } from "./user-statement-dialog"

const mockUsers = [
  {
    id: 1,
    clientId: "USR_001234",
    name: "Alex Chen",
    email: "alex.chen@email.com",
    phone: "+1-555-0123",
    balance: 45230.5,
    status: "active",
    kycStatus: "verified",
    joinDate: "2024-01-15",
    lastLogin: "2 hours ago",
    totalTrades: 156,
    winRate: 78,
    mpin: "1234",
  },
  {
    id: 2,
    clientId: "USR_005678",
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1-555-0456",
    balance: 38940.25,
    status: "active",
    kycStatus: "verified",
    joinDate: "2024-01-20",
    lastLogin: "1 day ago",
    totalTrades: 142,
    winRate: 72,
    mpin: "5678",
  },
  {
    id: 3,
    clientId: "USR_009876",
    name: "Mike Rodriguez",
    email: "mike.r@email.com",
    phone: "+1-555-0789",
    balance: 32150.75,
    status: "suspended",
    kycStatus: "pending",
    joinDate: "2024-02-01",
    lastLogin: "3 days ago",
    totalTrades: 128,
    winRate: 69,
    mpin: "9876",
  },
  {
    id: 4,
    clientId: "USR_004321",
    name: "Emma Wilson",
    email: "emma.w@email.com",
    phone: "+1-555-0321",
    balance: 28760.0,
    status: "active",
    kycStatus: "verified",
    joinDate: "2024-02-10",
    lastLogin: "5 hours ago",
    totalTrades: 134,
    winRate: 71,
    mpin: "4321",
  },
  {
    id: 5,
    clientId: "USR_007890",
    name: "David Kim",
    email: "david.k@email.com",
    phone: "+1-555-0890",
    balance: 25480.3,
    status: "active",
    kycStatus: "verified",
    joinDate: "2024-02-15",
    lastLogin: "30 min ago",
    totalTrades: 119,
    winRate: 65,
    mpin: "7890",
  },
]

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showStatementDialog, setShowStatementDialog] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const filteredUsers = mockUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-400/20 text-green-400 border-green-400/30">Active</Badge>
      case "suspended":
        return <Badge className="bg-red-400/20 text-red-400 border-red-400/30">Suspended</Badge>
      case "inactive":
        return <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">Inactive</Badge>
      default:
        return <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">{status}</Badge>
    }
  }

  const getKycBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-400/20 text-green-400 border-green-400/30">Verified</Badge>
      case "pending":
        return <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30">Pending</Badge>
      case "rejected":
        return <Badge className="bg-red-400/20 text-red-400 border-red-400/30">Rejected</Badge>
      default:
        return <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">Not Started</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">User Management</h1>
            <p className="text-muted-foreground">Manage user accounts, view statements, and create new users</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
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
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">12,847</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-foreground">11,234</p>
              </div>
              <Activity className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">KYC Pending</p>
                <p className="text-2xl font-bold text-foreground">234</p>
              </div>
              <Shield className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-2xl font-bold text-foreground">$2.4M</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, client ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-muted/50 border-border focus:border-primary"
                />
              </div>
              <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-primary">User Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">Client ID</TableHead>
                    <TableHead className="text-muted-foreground">User Details</TableHead>
                    <TableHead className="text-muted-foreground">Balance</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">KYC</TableHead>
                    <TableHead className="text-muted-foreground">Performance</TableHead>
                    <TableHead className="text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      className="border-border hover:bg-muted/30 transition-colors"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <code className="text-primary font-mono text-sm bg-primary/10 px-2 py-1 rounded">
                            {user.clientId}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(user.clientId, `clientId-${user.id}`)}
                            className="h-6 w-6 p-0"
                          >
                            {copiedField === `clientId-${user.id}` ? (
                              <Check className="w-3 h-3 text-green-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <p className="text-xs text-muted-foreground">{user.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-bold text-green-400">${user.balance.toLocaleString()}</p>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{getKycBadge(user.kycStatus)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.totalTrades} trades</p>
                          <p className="text-xs text-green-400">{user.winRate}% win rate</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedUser(user)
                              setShowStatementDialog(true)
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-400 hover:text-red-300">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialogs */}
      <CreateUserDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      <UserStatementDialog  open={showStatementDialog} onOpenChange={setShowStatementDialog} user={selectedUser} />
    </div>
  )
}
