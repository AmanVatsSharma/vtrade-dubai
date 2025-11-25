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
  Globe,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"

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

interface RiskConfig {
  id: string
  segment: string
  productType: string
  leverage: number
  brokerageFlat: number | null
  brokerageRate: number | null
  brokerageCap: number | null
  marginRate: number | null
  maxOrderValue: number | null
  maxPositions: number | null
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export function RiskManagement() {
  const [limits, setLimits] = useState<RiskLimit[]>([])
  const [alerts, setAlerts] = useState<RiskAlert[]>([])
  const [riskConfigs, setRiskConfigs] = useState<RiskConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [showLimitDialog, setShowLimitDialog] = useState(false)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [selectedLimit, setSelectedLimit] = useState<RiskLimit | null>(null)
  const [selectedConfig, setSelectedConfig] = useState<RiskConfig | null>(null)
  const [newLimit, setNewLimit] = useState({
    userId: '',
    maxDailyLoss: 0,
    maxPositionSize: 0,
    maxLeverage: 0,
    maxDailyTrades: 0,
  })
  const [newConfig, setNewConfig] = useState({
    segment: '',
    productType: '',
    leverage: 1,
    brokerageFlat: null as number | null,
    brokerageRate: null as number | null,
    brokerageCap: null as number | null,
    marginRate: null as number | null,
    maxOrderValue: null as number | null,
    maxPositions: null as number | null,
    active: true,
  })

  const fetchRiskData = async () => {
    setLoading(true)
    console.log("🛡️ [RISK-MANAGEMENT] Fetching risk data...")

    try {
      const [limitsResponse, alertsResponse, configsResponse] = await Promise.all([
        fetch('/api/admin/risk/limits').catch(() => null),
        fetch('/api/admin/risk/alerts').catch(() => null),
        fetch('/api/admin/risk/config').catch(() => null),
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

      if (configsResponse && configsResponse.ok) {
        const configsData = await configsResponse.json()
        console.log("✅ [RISK-MANAGEMENT] Risk configs fetched:", configsData.configs)
        setRiskConfigs(configsData.configs || [])
      } else {
        console.warn("⚠️ [RISK-MANAGEMENT] Failed to fetch risk configs")
        setRiskConfigs([])
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
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save limit')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save risk limit",
        variant: "destructive",
      })
    }
  }

  const handleSaveConfig = async () => {
    try {
      const url = selectedConfig
        ? `/api/admin/risk/config/${selectedConfig.id}`
        : '/api/admin/risk/config'
      const method = selectedConfig ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: selectedConfig ? "Platform risk config updated" : "Platform risk config created",
        })
        setShowConfigDialog(false)
        setSelectedConfig(null)
        setNewConfig({
          segment: '',
          productType: '',
          leverage: 1,
          brokerageFlat: null,
          brokerageRate: null,
          brokerageCap: null,
          marginRate: null,
          maxOrderValue: null,
          maxPositions: null,
          active: true,
        })
        fetchRiskData()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save config')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save platform risk config",
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
        </div>
      </motion.div>

      {/* Tabs for User Limits vs Platform Config */}
      <Tabs defaultValue="platform" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="platform" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Platform Risk Config
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Risk Limits
          </TabsTrigger>
        </TabsList>

        {/* Platform Risk Config Tab */}
        <TabsContent value="platform" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-primary">Platform-Wide Leverage Configuration</h2>
              <p className="text-sm text-muted-foreground">Manage leverage settings by segment and product type</p>
            </div>
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Config
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedConfig ? 'Edit Platform Risk Config' : 'Create Platform Risk Config'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Segment *</Label>
                    <Select
                      value={newConfig.segment}
                      onValueChange={(value) => setNewConfig({ ...newConfig, segment: value })}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select segment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NSE">NSE (Equity)</SelectItem>
                        <SelectItem value="NFO">NFO (F&O)</SelectItem>
                        <SelectItem value="MCX">MCX (Commodity)</SelectItem>
                        <SelectItem value="BSE">BSE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Product Type *</Label>
                    <Select
                      value={newConfig.productType}
                      onValueChange={(value) => setNewConfig({ ...newConfig, productType: value })}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select product type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MIS">MIS (Intraday)</SelectItem>
                        <SelectItem value="CNC">CNC (Delivery)</SelectItem>
                        <SelectItem value="NRML">NRML (Carry Forward)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Leverage (Multiplier) *</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="1"
                      value={newConfig.leverage}
                      onChange={(e) => setNewConfig({ ...newConfig, leverage: parseFloat(e.target.value) || 1 })}
                      placeholder="e.g., 5 for 5x leverage"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Base leverage multiplier for this segment/product type</p>
                  </div>
                  <div>
                    <Label>Brokerage Flat (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newConfig.brokerageFlat || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, brokerageFlat: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="Optional flat brokerage"
                    />
                  </div>
                  <div>
                    <Label>Brokerage Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={newConfig.brokerageRate || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, brokerageRate: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="Optional percentage rate"
                    />
                  </div>
                  <div>
                    <Label>Brokerage Cap (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newConfig.brokerageCap || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, brokerageCap: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="Optional maximum brokerage"
                    />
                  </div>
                  <div>
                    <Label>Max Order Value (₹)</Label>
                    <Input
                      type="number"
                      step="1000"
                      value={newConfig.maxOrderValue || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, maxOrderValue: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="Optional maximum order value"
                    />
                  </div>
                  <div>
                    <Label>Max Positions</Label>
                    <Input
                      type="number"
                      value={newConfig.maxPositions || ''}
                      onChange={(e) => setNewConfig({ ...newConfig, maxPositions: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="Optional maximum positions"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Active</Label>
                    <Switch
                      checked={newConfig.active}
                      onCheckedChange={(checked) => setNewConfig({ ...newConfig, active: checked })}
                    />
                  </div>
                  <Button onClick={handleSaveConfig} className="w-full">
                    {selectedConfig ? 'Update Config' : 'Create Config'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Platform Risk Configs Table */}
          <Card className="bg-card border-border shadow-sm neon-border">
            <CardHeader>
              <CardTitle>Platform Risk Configurations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Segment</TableHead>
                      <TableHead>Product Type</TableHead>
                      <TableHead>Leverage</TableHead>
                      <TableHead>Brokerage</TableHead>
                      <TableHead>Max Order Value</TableHead>
                      <TableHead>Max Positions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {riskConfigs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          No platform risk configs configured
                        </TableCell>
                      </TableRow>
                    ) : (
                      riskConfigs.map((config) => (
                        <TableRow key={config.id} className="border-border">
                          <TableCell className="font-medium text-foreground">{config.segment}</TableCell>
                          <TableCell>{config.productType}</TableCell>
                          <TableCell>
                            <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">
                              {config.leverage}x
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {config.brokerageFlat ? (
                              <span>₹{config.brokerageFlat.toFixed(2)} flat</span>
                            ) : config.brokerageRate ? (
                              <span>{config.brokerageRate.toFixed(4)}%</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {config.maxOrderValue ? `₹${config.maxOrderValue.toLocaleString()}` : '-'}
                          </TableCell>
                          <TableCell>{config.maxPositions || '-'}</TableCell>
                          <TableCell>
                            {config.active ? (
                              <Badge className="bg-green-400/20 text-green-400 border-green-400/30">Active</Badge>
                            ) : (
                              <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(config.updatedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedConfig(config)
                                setNewConfig({
                                  segment: config.segment,
                                  productType: config.productType,
                                  leverage: config.leverage,
                                  brokerageFlat: config.brokerageFlat,
                                  brokerageRate: config.brokerageRate,
                                  brokerageCap: config.brokerageCap,
                                  marginRate: config.marginRate,
                                  maxOrderValue: config.maxOrderValue,
                                  maxPositions: config.maxPositions,
                                  active: config.active,
                                })
                                setShowConfigDialog(true)
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Risk Limits Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-primary">User Risk Limits</h2>
              <p className="text-sm text-muted-foreground">Manage per-user risk limits and leverage overrides</p>
            </div>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
