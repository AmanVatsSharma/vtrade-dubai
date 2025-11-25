/**
 * @file risk-management.tsx
 * @module admin-console
 * @description Enterprise risk management dashboard with limits, alerts, and monitoring
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Settings,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface RiskLimit {
  id: string
  userId: string
  userName: string
  maxDailyLoss: number
  maxPositionSize: number
  maxLeverage: number
  maxDailyTrades: number
  status: 'ACTIVE' | 'SUSPENDED' | 'WARNING'
  lastUpdated: Date
}

interface RiskAlert {
  id: string
  userId: string
  userName: string
  type: 'LIMIT_EXCEEDED' | 'LARGE_LOSS' | 'UNUSUAL_ACTIVITY' | 'MARGIN_CALL'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  timestamp: Date
  resolved: boolean
}

export function RiskManagement() {
  const [limits, setLimits] = useState<RiskLimit[]>([])
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [selectedLimit, setSelectedLimit] = useState<RiskLimit | null>(null)
  const [newLimit, setNewLimit] = useState({
    userId: '',
    maxDailyLoss: 0,
    maxPositionSize: 0,
    maxLeverage: 0,
    maxDailyTrades: 0,
  })

  const fetchRiskData = async () => {
    setLoading(true)
    console.log("🛡️ [RISK-MANAGEMENT] Fetching risk data...")

    try {
      const [limitsResponse, alertsResponse] = await Promise.all([
        fetch('/api/admin/risk/limits').catch(() => null),
        fetch('/api/admin/risk/alerts').catch(() => null),
      ])

      if (limitsResponse && limitsResponse.ok) {
        const limitsData = await limitsResponse.json()
        setLimits(limitsData.limits || [])
      } else {
        // Mock data
        setLimits([
          {
            id: '1',
            userId: 'user-123',
            userName: 'Alex Chen',
            maxDailyLoss: 50000,
            maxPositionSize: 100000,
            maxLeverage: 5,
            maxDailyTrades: 50,
            status: 'ACTIVE',
            lastUpdated: new Date(),
          },
        ])
      }

      if (alertsResponse && alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        setAlerts(alertsData.alerts || [])
      } else {
        // Mock data
        setAlerts([
          {
            id: '1',
            userId: 'user-123',
            userName: 'Alex Chen',
            type: 'LIMIT_EXCEEDED',
            severity: 'HIGH',
            message: 'Daily loss limit exceeded',
            timestamp: new Date(),
            resolved: false,
          },
        ])
      }
    } catch (error) {
      console.error("❌ [RISK-MANAGEMENT] Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load risk management data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRiskData()
  }, [])

  const handleSaveLimit = async () => {
    try {
      const url = selectedLimit
        ? `/api/admin/risk/limits/${selectedLimit.id}`
        : '/api/admin/risk/limits'
      const method = selectedLimit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLimit),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: selectedLimit ? "Risk limit updated" : "Risk limit created",
        })
        setShowLimitDialog(false)
        setSelectedLimit(null)
        setNewLimit({
          userId: '',
          maxDailyLoss: 0,
          maxPositionSize: 0,
          maxLeverage: 0,
          maxDailyTrades: 0,
        })
        fetchRiskData()
      } else {
        throw new Error('Failed to save limit')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save risk limit",
        variant: "destructive",
      })
    }
  }

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      'LOW': 'bg-blue-400/20 text-blue-400 border-blue-400/30',
      'MEDIUM': 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30',
      'HIGH': 'bg-orange-400/20 text-orange-400 border-orange-400/30',
      'CRITICAL': 'bg-red-400/20 text-red-400 border-red-400/30',
    }
    return <Badge className={colors[severity] || colors['LOW']}>{severity}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'ACTIVE': 'bg-green-400/20 text-green-400 border-green-400/30',
      'SUSPENDED': 'bg-red-400/20 text-red-400 border-red-400/30',
      'WARNING': 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30',
    }
    return <Badge className={colors[status] || colors['ACTIVE']}>{status}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-2">
            <Shield className="w-8 h-8" />
            Risk Management
          </h1>
          <p className="text-muted-foreground">Monitor and control trading risks</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchRiskData}
            disabled={loading}
            className="border-primary/50 text-primary hover:bg-primary/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Limit
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>{selectedLimit ? 'Edit Risk Limit' : 'Create Risk Limit'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>User ID</Label>
                  <Input
                    value={newLimit.userId}
                    onChange={(e) => setNewLimit({ ...newLimit, userId: e.target.value })}
                    placeholder="Enter user ID"
                  />
                </div>
                <div>
                  <Label>Max Daily Loss (₹)</Label>
                  <Input
                    type="number"
                    value={newLimit.maxDailyLoss}
                    onChange={(e) => setNewLimit({ ...newLimit, maxDailyLoss: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Max Position Size (₹)</Label>
                  <Input
                    type="number"
                    value={newLimit.maxPositionSize}
                    onChange={(e) => setNewLimit({ ...newLimit, maxPositionSize: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Max Leverage</Label>
                  <Input
                    type="number"
                    value={newLimit.maxLeverage}
                    onChange={(e) => setNewLimit({ ...newLimit, maxLeverage: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Max Daily Trades</Label>
                  <Input
                    type="number"
                    value={newLimit.maxDailyTrades}
                    onChange={(e) => setNewLimit({ ...newLimit, maxDailyTrades: parseInt(e.target.value) })}
                  />
                </div>
                <Button onClick={handleSaveLimit} className="w-full">
                  {selectedLimit ? 'Update Limit' : 'Create Limit'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Risk Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Limits</p>
                <p className="text-2xl font-bold text-foreground">{limits.filter(l => l.status === 'ACTIVE').length}</p>
              </div>
              <Shield className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active Alerts</p>
                <p className="text-2xl font-bold text-red-400">{alerts.filter(a => !a.resolved).length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Critical Alerts</p>
                <p className="text-2xl font-bold text-orange-400">
                  {alerts.filter(a => !a.resolved && a.severity === 'CRITICAL').length}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Users at Risk</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {limits.filter(l => l.status === 'WARNING').length}
                </p>
              </div>
              <Users className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risk Limits Table */}
      <Card className="bg-card border-border shadow-sm neon-border">
        <CardHeader>
          <CardTitle>Risk Limits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>User</TableHead>
                  <TableHead>Max Daily Loss</TableHead>
                  <TableHead>Max Position Size</TableHead>
                  <TableHead>Max Leverage</TableHead>
                  <TableHead>Max Daily Trades</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {limits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No risk limits configured
                    </TableCell>
                  </TableRow>
                ) : (
                  limits.map((limit) => (
                    <TableRow key={limit.id} className="border-border">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{limit.userName}</p>
                          <p className="text-xs text-muted-foreground">{limit.userId.slice(0, 8)}...</p>
                        </div>
                      </TableCell>
                      <TableCell>₹{limit.maxDailyLoss.toLocaleString()}</TableCell>
                      <TableCell>₹{limit.maxPositionSize.toLocaleString()}</TableCell>
                      <TableCell>{limit.maxLeverage}x</TableCell>
                      <TableCell>{limit.maxDailyTrades}</TableCell>
                      <TableCell>{getStatusBadge(limit.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(limit.lastUpdated).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedLimit(limit)
                              setNewLimit({
                                userId: limit.userId,
                                maxDailyLoss: limit.maxDailyLoss,
                                maxPositionSize: limit.maxPositionSize,
                                maxLeverage: limit.maxLeverage,
                                maxDailyTrades: limit.maxDailyTrades,
                              })
                              setShowLimitDialog(true)
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Risk Alerts */}
      <Card className="bg-card border-border shadow-sm neon-border">
        <CardHeader>
          <CardTitle>Risk Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <p className="text-center text-muted-foreground">No active alerts</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-red-400/10 border-red-400/30'
                      : alert.severity === 'HIGH'
                      ? 'bg-orange-400/10 border-orange-400/30'
                      : 'bg-yellow-400/10 border-yellow-400/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getSeverityBadge(alert.severity)}
                        <span className="text-sm font-medium text-foreground">{alert.type}</span>
                        {alert.resolved && (
                          <Badge className="bg-green-400/20 text-green-400 border-green-400/30">
                            Resolved
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground mb-1">{alert.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.userName} • {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {!alert.resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          // Resolve alert
                          const response = await fetch(`/api/admin/risk/alerts/${alert.id}/resolve`, {
                            method: 'POST',
                          })
                          if (response.ok) {
                            fetchRiskData()
                          }
                        }}
                      >
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
