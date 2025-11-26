/**
 * @file rm-management.tsx
 * @module admin-console
 * @description RM & Team management component - manages RMs and shows their team members (complements User Management)
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2025-01-27
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  UserCheck,
  UserX,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface RM {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  clientId: string | null
  isActive: boolean
  assignedUsersCount: number
  createdAt: Date
  managedBy?: {
    id: string
    name: string | null
    email: string | null
  } | null
}

interface TeamMember {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  clientId: string | null
  isActive: boolean
  createdAt: Date
}

export function RMManagement() {
  const [rms, setRms] = useState<RM[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [expandedRMs, setExpandedRMs] = useState<Set<string>>(new Set())
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({})
  const [loadingTeams, setLoadingTeams] = useState<Set<string>>(new Set())
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  })

  // Get current user role
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const role = window.localStorage.getItem('session_user_role')
        setCurrentUserRole(role)
      } catch {}
    }
  }, [])

  const fetchRMs = async () => {
    console.log("🔄 [RM-TEAM] Fetching RMs...")
    setLoading(true)
    try {
      const response = await fetch("/api/admin/rms")
      if (!response.ok) throw new Error("Failed to fetch RMs")
      
      const data = await response.json()
      setRms(data.rms || [])
      console.log(`✅ [RM-TEAM] Loaded ${data.rms?.length || 0} RMs`)
    } catch (error: any) {
      console.error("❌ [RM-TEAM] Error fetching RMs:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load RMs",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamMembers = async (rmId: string) => {
    if (teamMembers[rmId]) {
      // Already loaded, just toggle
      toggleExpandRM(rmId)
      return
    }

    console.log(`🔄 [RM-TEAM] Fetching team members for RM: ${rmId}`)
    setLoadingTeams(prev => new Set(prev).add(rmId))
    
    try {
      const response = await fetch(`/api/admin/rms/${rmId}/team`)
      if (!response.ok) throw new Error("Failed to fetch team members")
      
      const data = await response.json()
      setTeamMembers(prev => ({
        ...prev,
        [rmId]: data.members || []
      }))
      console.log(`✅ [RM-TEAM] Loaded ${data.members?.length || 0} team members for RM ${rmId}`)
      toggleExpandRM(rmId)
    } catch (error: any) {
      console.error(`❌ [RM-TEAM] Error fetching team members:`, error)
      toast({
        title: "Error",
        description: error.message || "Failed to load team members",
        variant: "destructive"
      })
    } finally {
      setLoadingTeams(prev => {
        const next = new Set(prev)
        next.delete(rmId)
        return next
      })
    }
  }

  const toggleExpandRM = (rmId: string) => {
    setExpandedRMs(prev => {
      const next = new Set(prev)
      if (next.has(rmId)) {
        next.delete(rmId)
      } else {
        next.add(rmId)
      }
      return next
    })
  }

  useEffect(() => {
    fetchRMs()
  }, [])

  const handleCreateRM = async () => {
    if (!createForm.name || !createForm.email || !createForm.phone || !createForm.password) {
      toast({
        title: "Validation Error",
        description: "Please fill all fields",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/admin/rms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create RM")
      }

      toast({
        title: "✅ Success",
        description: "Relationship Manager created successfully"
      })

      setShowCreateDialog(false)
      setCreateForm({ name: "", email: "", phone: "", password: "" })
      fetchRMs()
    } catch (error: any) {
      console.error("❌ [RM-MANAGEMENT] Error creating RM:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create RM",
        variant: "destructive"
      })
    }
  }

  const filteredRMs = rms.filter(
    (rm) =>
      rm.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rm.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rm.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <PageHeader
        title="RM & Team"
        description="Manage Relationship Managers and view their team members. For detailed user management, use User Management tab."
        icon={<UserCheck className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={
          <>
            <RefreshButton onClick={fetchRMs} loading={loading} />
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm flex-shrink-0"
              size="sm"
            >
              <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Create RM</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </>
        }
      />

      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Total RMs</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{rms.length}</p>
              </div>
              <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Active RMs</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {rms.filter(r => r.isActive).length}
                </p>
              </div>
              <UserCheck className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground">Total Assigned Users</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground truncate">
                  {rms.reduce((sum, rm) => sum + rm.assignedUsersCount, 0)}
                </p>
              </div>
              <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-purple-400 flex-shrink-0" />
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
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 md:gap-4">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search RMs by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 sm:pl-10 bg-muted/50 border-border focus:border-primary text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* RMs Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
            <CardTitle className="text-lg sm:text-xl font-bold text-primary">
              Relationship Managers & Teams ({filteredRMs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
            ) : filteredRMs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No RMs found</div>
            ) : (
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="min-w-[700px] sm:min-w-0">
                  <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground w-8"></TableHead>
                      <TableHead className="text-muted-foreground">RM Details</TableHead>
                      <TableHead className="text-muted-foreground">Contact</TableHead>
                      <TableHead className="text-muted-foreground">Team Size</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRMs.map((rm, index) => {
                      const isExpanded = expandedRMs.has(rm.id)
                      const team = teamMembers[rm.id] || []
                      const isLoadingTeam = loadingTeams.has(rm.id)
                      
                      return (
                        <>
                          <motion.tr
                            key={rm.id}
                            className="border-border hover:bg-muted/30 transition-colors"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                          >
                            <TableCell>
                              {rm.assignedUsersCount > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => fetchTeamMembers(rm.id)}
                                  className="h-6 w-6 p-0"
                                  disabled={isLoadingTeam}
                                >
                                  {isLoadingTeam ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </Button>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-foreground">{rm.name || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">ID: {rm.id.slice(0, 8)}...</p>
                                {rm.managedBy && currentUserRole === 'SUPER_ADMIN' && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Managed by: {rm.managedBy.name || rm.managedBy.email || 'N/A'}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {rm.email && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate max-w-[200px]">{rm.email}</span>
                                  </div>
                                )}
                                {rm.phone && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="w-3 h-3" />
                                    <span>{rm.phone}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">
                                {rm.assignedUsersCount} {rm.assignedUsersCount === 1 ? 'user' : 'users'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {rm.isActive ? (
                                <Badge className="bg-green-400/20 text-green-400 border-green-400/30">
                                  Active
                                </Badge>
                              ) : (
                                <Badge className="bg-red-400/20 text-red-400 border-red-400/30">
                                  Inactive
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Navigate to users filtered by this RM in User Management tab
                                    window.location.href = `/admin-console?tab=users&rmId=${rm.id}`
                                  }}
                                  className="text-primary hover:text-primary/80 text-xs"
                                >
                                  <ExternalLink className="w-3 h-3 mr-1" />
                                  Manage
                                </Button>
                              </div>
                            </TableCell>
                          </motion.tr>
                          
                          {/* Team Members Row */}
                          {isExpanded && (
                            <motion.tr
                              key={`${rm.id}-team`}
                              className="bg-muted/20"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <TableCell colSpan={6} className="p-0">
                                <div className="px-6 py-4">
                                  {isLoadingTeam ? (
                                    <div className="text-center py-8 text-muted-foreground text-sm">
                                      <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                                      Loading team members...
                                    </div>
                                  ) : team.length > 0 ? (
                                    <>
                                      <div className="flex items-center gap-2 mb-3">
                                        <Users className="w-4 h-4 text-primary" />
                                        <h4 className="text-sm font-semibold text-foreground">
                                          Team Members ({team.length})
                                        </h4>
                                      </div>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {team.map((member) => (
                                          <Card key={member.id} className="bg-card/50 border-border/50">
                                            <CardContent className="p-3">
                                              <div className="space-y-2">
                                                <div className="flex items-start justify-between">
                                                  <div className="min-w-0 flex-1">
                                                    <p className="font-medium text-sm text-foreground truncate">
                                                      {member.name || "N/A"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                      {member.clientId || member.id.slice(0, 8)}...
                                                    </p>
                                                  </div>
                                                  {member.isActive ? (
                                                    <Badge className="bg-green-400/20 text-green-400 border-green-400/30 text-xs">
                                                      Active
                                                    </Badge>
                                                  ) : (
                                                    <Badge className="bg-red-400/20 text-red-400 border-red-400/30 text-xs">
                                                      Inactive
                                                    </Badge>
                                                  )}
                                                </div>
                                                {member.email && (
                                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Mail className="w-3 h-3" />
                                                    <span className="truncate">{member.email}</span>
                                                  </div>
                                                )}
                                                {member.phone && (
                                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Phone className="w-3 h-3" />
                                                    <span>{member.phone}</span>
                                                  </div>
                                                )}
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => {
                                                    window.location.href = `/admin-console?tab=users&userId=${member.id}`
                                                  }}
                                                  className="w-full mt-2 text-xs h-7"
                                                >
                                                  <Eye className="w-3 h-3 mr-1" />
                                                  View in User Management
                                                </Button>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        ))}
                                      </div>
                                    </>
                                  ) : (
                                    <div className="text-center py-8">
                                      <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                                      <p className="text-sm text-muted-foreground">
                                        No team members assigned yet
                                      </p>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          window.location.href = `/admin-console?tab=users&rmId=${rm.id}`
                                        }}
                                        className="mt-3 text-xs"
                                      >
                                        Assign Users
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </motion.tr>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create RM Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-md bg-card border-border max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
            <DialogTitle className="text-lg sm:text-xl font-bold text-primary">Create Relationship Manager</DialogTitle>
            <DialogDescription className="text-sm sm:text-base text-muted-foreground">
              Create a new Relationship Manager (RM) account. RMs can access the admin console
              and manage their assigned team members.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Enter RM name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRM}>
                Create RM
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
