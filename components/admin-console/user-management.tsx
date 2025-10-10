"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { CreateUserDialog } from "./create-user-dialog"
import { UserStatementDialog } from "./user-statement-dialog"
import { AddFundsDialog } from "./add-funds-dialog"
import { toast } from "@/hooks/use-toast"

// Mock data as fallback
const mockUsers = [
  {
    id: "1",
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
    tradingAccount: { id: "acc-1", balance: 45230, availableMargin: 40000, usedMargin: 5230 },
    stats: { totalOrders: 156, activePositions: 3, totalDeposits: 50000, totalWithdrawals: 5000 }
  },
]

export function UserManagement() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showStatementDialog, setShowStatementDialog] = useState(false)
  const [showAddFundsDialog, setShowAddFundsDialog] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  // Real data states
  const [users, setUsers] = useState(mockUsers)
  const [isUsingMockData, setIsUsingMockData] = useState(true)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({
    total: 12847,
    active: 11234,
    kycPending: 234,
    totalBalance: 2400000
  })

  const fetchRealData = async () => {
    console.log("🔄 [USER-MANAGEMENT] Fetching real users...")
    setLoading(true)

    try {
      const [usersResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/users?page=${page}&limit=50&search=${searchTerm}`).catch(e => {
          console.error("❌ [USER-MANAGEMENT] Users API failed:", e)
          return null
        }),
        fetch('/api/admin/stats').catch(e => {
          console.error("❌ [USER-MANAGEMENT] Stats API failed:", e)
          return null
        })
      ])

      let hasRealData = false

      // Process users
      if (usersResponse && usersResponse.ok) {
        const data = await usersResponse.json()
        console.log("✅ [USER-MANAGEMENT] Users received:", data)

        if (data.users) {
          const realUsers = data.users.map((u: any) => ({
            id: u.id,
            clientId: u.clientId || u.id.slice(0, 10),
            name: u.name || 'Unknown',
            email: u.email || 'N/A',
            phone: u.phone || 'N/A',
            balance: u.tradingAccount?.balance || 0,
            availableMargin: u.tradingAccount?.availableMargin || 0,
            usedMargin: u.tradingAccount?.usedMargin || 0,
            status: u.isActive ? 'active' : 'inactive',
            kycStatus: u.kycStatus === 'APPROVED' ? 'verified' : u.kycStatus === 'PENDING' ? 'pending' : 'not_verified',
            joinDate: new Date(u.createdAt).toLocaleDateString(),
            totalTrades: u.stats?.totalOrders || 0,
            activePositions: u.stats?.activePositions || 0,
            totalDeposits: u.stats?.totalDeposits || 0,
            totalWithdrawals: u.stats?.totalWithdrawals || 0,
            tradingAccount: u.tradingAccount,
            stats: u.stats
          }))
          setUsers(realUsers)
          setTotalPages(data.pages || 1)
          hasRealData = true
          console.log(`✅ [USER-MANAGEMENT] ${realUsers.length} real users loaded!`)
        }
      }

      // Process stats
      if (statsResponse && statsResponse.ok) {
        const data = await statsResponse.json()
        if (data.success && data.stats) {
          setStats({
            total: data.stats.users.total,
            active: data.stats.users.active,
            kycPending: 0, // Can add to AdminUserService if needed
            totalBalance: data.stats.tradingAccounts.totalBalance
          })
        }
      }

      setIsUsingMockData(!hasRealData)
      
      if (hasRealData) {
        toast({
          title: "✅ Real Data Loaded",
          description: "User management is showing live data",
        })
      }

    } catch (error) {
      console.error("❌ [USER-MANAGEMENT] Error fetching data:", error)
      setIsUsingMockData(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRealData()
  }, [page, searchTerm])

  const filteredUsers = users.filter(
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
      case "inactive":
        return <Badge className="bg-red-400/20 text-red-400 border-red-400/30">Inactive</Badge>
      default:
        return <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">{status}</Badge>
    }
  }

  const getKycBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "VERIFIED":
      case "APPROVED":
        return <Badge className="bg-green-400/20 text-green-400 border-green-400/30">Verified</Badge>
      case "PENDING":
        return <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30">Pending</Badge>
      case "REJECTED":
        return <Badge className="bg-red-400/20 text-red-400 border-red-400/30">Rejected</Badge>
      default:
        return <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">Not Started</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Mock Data Warning */}
      {isUsingMockData && (
        <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500/50">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Using Mock Data</AlertTitle>
          <AlertDescription className="text-yellow-500/80">
            Unable to load real users from backend. Displaying sample data.
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={fetchRealData}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">User Management</h1>
            <p className="text-muted-foreground">
              Manage user accounts, view statements, and create new users
              {!isUsingMockData && " • Live Data"}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowAddFundsDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Add Funds
            </Button>
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
                <p className="text-2xl font-bold text-foreground">{stats.total.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-foreground">{stats.active.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-foreground">{stats.kycPending.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-foreground">₹{(stats.totalBalance / 10000000).toFixed(2)}Cr</p>
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
              <Button 
                variant="outline" 
                className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
                onClick={fetchRealData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
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
            <CardTitle className="text-xl font-bold text-primary">User Accounts ({filteredUsers.length})</CardTitle>
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
                        <div>
                          <p className="font-bold text-green-400">₹{user.balance.toLocaleString()}</p>
                          {user.availableMargin !== undefined && (
                            <p className="text-xs text-muted-foreground">Avl: ₹{user.availableMargin.toLocaleString()}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{getKycBadge(user.kycStatus)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.totalTrades || user.stats?.totalOrders || 0} trades</p>
                          <p className="text-xs text-green-400">{user.activePositions || user.stats?.activePositions || 0} positions</p>
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
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              // Open Advanced trades tab filtered by this user via URL
                              const qp = new URLSearchParams({ user: user.clientId || user.id })
                              router.push(`/admin-console?tab=advanced&${qp.toString()}`)
                            }}
                            title="View Trades"
                          >
                            <Activity className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const qp = new URLSearchParams({ user: user.clientId || user.id, openOnly: 'true' })
                              router.push(`/admin-console?tab=positions&${qp.toString()}`)
                            }}
                            title="View Positions"
                          >
                            <Shield className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              // TODO: Add edit user functionality
                              toast({
                                title: "Coming Soon",
                                description: "Edit user feature will be available soon"
                              })
                            }}
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const qp = new URLSearchParams({ user: user.clientId || user.id })
                              router.push(`/admin-console?tab=orders&${qp.toString()}`)
                            }}
                            title="View Orders"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                            onClick={async () => {
                              if (!confirm(`Are you sure you want to ${user.status === 'active' ? 'deactivate' : 'activate'} ${user.name}?`)) return
                              
                              try {
                                const response = await fetch('/api/admin/users', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    userId: user.id,
                                    isActive: user.status !== 'active'
                                  })
                                })

                                if (response.ok) {
                                  toast({
                                    title: "✅ Success",
                                    description: `User ${user.status === 'active' ? 'deactivated' : 'activated'} successfully`
                                  })
                                  fetchRealData()
                                }
                              } catch (error) {
                                console.error("❌ Error updating user status:", error)
                                toast({
                                  title: "❌ Error",
                                  description: "Failed to update user status",
                                  variant: "destructive"
                                })
                              }
                            }}
                            title={user.status === 'active' ? 'Deactivate User' : 'Activate User'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialogs */}
      <CreateUserDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      <UserStatementDialog open={showStatementDialog} onOpenChange={setShowStatementDialog} user={selectedUser} />
      <AddFundsDialog open={showAddFundsDialog} onOpenChange={setShowAddFundsDialog} />
    </div>
  )
}