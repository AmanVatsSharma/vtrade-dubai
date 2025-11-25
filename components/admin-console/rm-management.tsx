/**
 * @file rm-management.tsx
 * @module admin-console
 * @description Relationship Manager (RM) management component for admin console
 * @author BharatERP
 * @created 2025-01-27
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
}

export function RMManagement() {
  const [rms, setRms] = useState<RM[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  })

  const fetchRMs = async () => {
    console.log("🔄 [RM-MANAGEMENT] Fetching RMs...")
    setLoading(true)
    try {
      const response = await fetch("/api/admin/rms")
      if (!response.ok) throw new Error("Failed to fetch RMs")
      
      const data = await response.json()
      setRms(data.rms || [])
      console.log(`✅ [RM-MANAGEMENT] Loaded ${data.rms?.length || 0} RMs`)
    } catch (error: any) {
      console.error("❌ [RM-MANAGEMENT] Error fetching RMs:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load RMs",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
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
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Relationship Manager Management</h1>
            <p className="text-muted-foreground">
              Manage Relationship Managers and their assigned users
            </p>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create RM
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total RMs</p>
                <p className="text-2xl font-bold text-foreground">{rms.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active RMs</p>
                <p className="text-2xl font-bold text-foreground">
                  {rms.filter(r => r.isActive).length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Assigned Users</p>
                <p className="text-2xl font-bold text-foreground">
                  {rms.reduce((sum, rm) => sum + rm.assignedUsersCount, 0)}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-400" />
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
                  placeholder="Search RMs by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-muted/50 border-border focus:border-primary"
                />
              </div>
              <Button
                variant="outline"
                onClick={fetchRMs}
                disabled={loading}
                className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
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
          <CardHeader>
            <CardTitle className="text-xl font-bold text-primary">
              Relationship Managers ({filteredRMs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredRMs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No RMs found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">RM Details</TableHead>
                      <TableHead className="text-muted-foreground">Contact</TableHead>
                      <TableHead className="text-muted-foreground">Assigned Users</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRMs.map((rm, index) => (
                      <motion.tr
                        key={rm.id}
                        className="border-border hover:bg-muted/30 transition-colors"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{rm.name || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">ID: {rm.id.slice(0, 8)}...</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {rm.email && (
                              <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-3 h-3" />
                                <span>{rm.email}</span>
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
                            {rm.assignedUsersCount} users
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Navigate to users filtered by this RM
                              window.location.href = `/admin-console?tab=users&rmId=${rm.id}`
                            }}
                            className="text-primary hover:text-primary/80"
                          >
                            View Users
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Create RM Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Relationship Manager</DialogTitle>
            <DialogDescription>
              Create a new Relationship Manager account. They will be able to access the admin console
              and view their assigned users.
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
