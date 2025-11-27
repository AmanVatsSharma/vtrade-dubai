/**
 * @file user-management.tsx
 * @module admin-console
 * @description Enhanced user management component with advanced filters, bulk operations, and comprehensive user management features
 * @author BharatERP
 * @created 2025-01-27
 */

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
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
  Filter,
  X,
  FileCheck,
  Clock,
  CheckCircle2,
  RefreshCw,
} from "lucide-react"
import { StatusBadge, PageHeader, RefreshButton, FilterBar, Pagination, type FilterField } from "./shared"
import { Label } from "@/components/ui/label"
import { CreateUserDialog } from "./create-user-dialog"
import { UserStatementDialog } from "./user-statement-dialog"
import { AddFundsDialog } from "./add-funds-dialog"
import { EditUserDialog } from "./edit-user-dialog"
import { KYCManagementDialog } from "./kyc-management-dialog"
import { UserActivityDialog } from "./user-activity-dialog"
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
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showKYCDialog, setShowKYCDialog] = useState(false)
  const [showActivityDialog, setShowActivityDialog] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter states
  const [filters, setFilters] = useState({
    status: 'all' as 'active' | 'inactive' | 'all',
    kycStatus: 'all' as string,
    role: 'all' as string,
    dateFrom: '',
    dateTo: ''
  })
  
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

  const buildQueryString = () => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('limit', '50')
    if (searchTerm) params.set('search', searchTerm)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (filters.kycStatus !== 'all') params.set('kycStatus', filters.kycStatus)
    if (filters.role !== 'all') params.set('role', filters.role)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    return params.toString()
  }

  const fetchRealData = async () => {
    console.log("🔄 [USER-MANAGEMENT] Fetching real users...")
    setLoading(true)

    try {
      const queryString = buildQueryString()
      const [usersResponse, statsResponse] = await Promise.all([
        fetch(`/api/admin/users?${queryString}`).catch(e => {
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
    setSelectedUsers(new Set()) // Clear selections on data refresh
  }, [page, searchTerm, filters])

  const handleBulkAction = async (action: 'activate' | 'deactivate') => {
    if (selectedUsers.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select at least one user",
        variant: "destructive"
      })
      return
    }

    const confirmMessage = `Are you sure you want to ${action === 'activate' ? 'activate' : 'deactivate'} ${selectedUsers.size} user(s)?`
    if (!confirm(confirmMessage)) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: Array.from(selectedUsers),
          action: 'updateStatus',
          isActive: action === 'activate'
        })
      })

      if (!response.ok) throw new Error("Failed to perform bulk operation")

      toast({
        title: "✅ Success",
        description: `${selectedUsers.size} user(s) ${action === 'activate' ? 'activated' : 'deactivated'} successfully`
      })

      setSelectedUsers(new Set())
      fetchRealData()
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to perform bulk operation",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(users.map(u => u.id)))
    }
  }

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

  // Filter fields configuration
  const filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search by name, client ID, or email...',
      span: 2
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Active', value: 'active' },
        { label: 'Inactive', value: 'inactive' }
      ]
    },
    {
      key: 'kycStatus',
      label: 'KYC Status',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Pending', value: 'PENDING' },
        { label: 'Approved', value: 'APPROVED' },
        { label: 'Rejected', value: 'REJECTED' },
        { label: 'Not Submitted', value: 'NOT_SUBMITTED' }
      ]
    },
    {
      key: 'role',
      label: 'Role',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'User', value: 'USER' },
        { label: 'Moderator', value: 'MODERATOR' },
        { label: 'Admin', value: 'ADMIN' },
        { label: 'Super Admin', value: 'SUPER_ADMIN' }
      ]
    },
    {
      key: 'dateFrom',
      label: 'Date From',
      type: 'date'
    },
    {
      key: 'dateTo',
      label: 'Date To',
      type: 'date'
    }
  ]

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
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Mock Data Warning */}
      {isUsingMockData && (
        <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500/50">
          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          <AlertTitle className="text-yellow-500 text-sm sm:text-base">Using Mock Data</AlertTitle>
          <AlertDescription className="text-yellow-500/80 text-xs sm:text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="flex-1">Unable to load real users from backend. Displaying sample data.</span>
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
        title="User Management"
        description={`Manage user accounts, view statements, and create new users${!isUsingMockData ? " • Live Data" : ""}`}
        icon={<Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={
          <>
            <Button
              onClick={() => setShowAddFundsDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
              size="sm"
            >
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Add Funds</span>
              <span className="sm:hidden">Add</span>
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm"
              size="sm"
            >
              <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create User</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </>
        }
      />

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Users</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{stats.total.toLocaleString()}</p>
              </div>
              <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Active Users</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{stats.active.toLocaleString()}</p>
              </div>
              <Activity className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">KYC Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{stats.kycPending.toLocaleString()}</p>
              </div>
              <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Balance</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground truncate">₹{(stats.totalBalance / 10000000).toFixed(2)}Cr</p>
              </div>
              <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-purple-400 flex-shrink-0" />
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
          <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, client ID, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 bg-muted/50 border-border focus:border-primary text-sm"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent text-xs sm:text-sm flex-1 sm:flex-initial"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Filters</span>
                  <span className="sm:hidden">Filter</span>
                  {(filters.status !== 'all' || filters.kycStatus !== 'all' || filters.role !== 'all' || filters.dateFrom || filters.dateTo) && (
                    <Badge className="ml-1 sm:ml-2 bg-primary text-primary-foreground text-xs">{Object.values(filters).filter(v => v !== 'all' && v !== '').length}</Badge>
                  )}
                </Button>
                <RefreshButton onClick={fetchRealData} loading={loading} />
                <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent text-xs sm:text-sm">
                  <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-border"
              >
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value as any })}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">KYC Status</Label>
                  <Select value={filters.kycStatus} onValueChange={(value) => setFilters({ ...filters, kycStatus: value })}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="NOT_SUBMITTED">Not Submitted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Role</Label>
                  <Select value={filters.role} onValueChange={(value) => setFilters({ ...filters, role: value })}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="MODERATOR">Moderator</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Date From</Label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Date To</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="bg-background border-border"
                    />
                    {(filters.status !== 'all' || filters.kycStatus !== 'all' || filters.role !== 'all' || filters.dateFrom || filters.dateTo) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters({ status: 'all', kycStatus: 'all', role: 'all', dateFrom: '', dateTo: '' })}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Bulk Actions */}
            {selectedUsers.size > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 pt-3 sm:pt-4 border-t border-border">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {selectedUsers.size} user(s) selected
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('activate')}
                    disabled={loading}
                    className="border-green-500/50 text-green-500 hover:bg-green-500/10 text-xs sm:text-sm flex-1 sm:flex-initial"
                  >
                    <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Activate Selected</span>
                    <span className="sm:hidden">Activate</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('deactivate')}
                    disabled={loading}
                    className="border-red-500/50 text-red-500 hover:bg-red-500/10 text-xs sm:text-sm flex-1 sm:flex-initial"
                  >
                    <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Deactivate Selected</span>
                    <span className="sm:hidden">Deactivate</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUsers(new Set())}
                    className="text-xs sm:text-sm"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
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
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-primary">User Accounts ({filteredUsers.length})</CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
            <div className="overflow-x-auto -mx-3 sm:mx-0">
              <div className="min-w-[800px] sm:min-w-0">
                <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.size === users.length && users.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
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
                      className={`border-border hover:bg-muted/30 transition-colors ${selectedUsers.has(user.id) ? 'bg-primary/5' : ''}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                      </TableCell>
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
                          {(user as any).availableMargin !== undefined && (
                            <p className="text-xs text-muted-foreground">Avl: ₹{((user as any).availableMargin as number).toLocaleString()}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={user.status} type="user" /></TableCell>
                      <TableCell><StatusBadge status={user.kycStatus} type="kyc" /></TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.totalTrades || user.stats?.totalOrders || 0} trades</p>
                          <p className="text-xs text-green-400">{(user as any).activePositions || user.stats?.activePositions || 0} positions</p>
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
                              setSelectedUser(user)
                              setShowEditDialog(true)
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
                              setSelectedUser(user)
                              setShowKYCDialog(true)
                            }}
                            title="Manage KYC"
                          >
                            <FileCheck className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              setSelectedUser(user)
                              setShowActivityDialog(true)
                            }}
                            title="View Activity"
                          >
                            <Clock className="w-4 h-4" />
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
            </div>
            
            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              loading={loading}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Dialogs */}
      <CreateUserDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      <UserStatementDialog open={showStatementDialog} onOpenChange={setShowStatementDialog} user={selectedUser} />
      <AddFundsDialog open={showAddFundsDialog} onOpenChange={setShowAddFundsDialog} />
      <EditUserDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog} 
        user={selectedUser}
        onUserUpdated={() => {
          fetchRealData()
          setShowEditDialog(false)
        }}
      />
      <KYCManagementDialog 
        open={showKYCDialog} 
        onOpenChange={setShowKYCDialog} 
        user={selectedUser}
        onKYCUpdated={() => {
          fetchRealData()
          setShowKYCDialog(false)
        }}
      />
      <UserActivityDialog 
        open={showActivityDialog} 
        onOpenChange={setShowActivityDialog} 
        user={selectedUser}
      />
    </div>
  )
}