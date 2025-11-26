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
  Play,
  Loader2,
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

interface RiskMonitoringResult {
  checkedAccounts: number
  positionsChecked: number
  positionsClosed: number
  alertsCreated: number
  errors: number
  details: Array<{
    tradingAccountId: string
    userId: string
    userName: string
    totalUnrealizedPnL: number
    availableMargin: number
    marginUtilizationPercent: number
    positionsClosed: number
    alertCreated: boolean
  }>
}

function RiskMonitoringPanel() {
  const [monitoring, setMonitoring] = useState(false)
  const [lastResult, setLastResult] = useState<RiskMonitoringResult | null>(null)
  const [warningThreshold, setWarningThreshold] = useState(0.80)
  const [autoCloseThreshold, setAutoCloseThreshold] = useState(0.90)

  const runRiskMonitoring = async () => {
    setMonitoring(true)
    try {
      const response = await fetch('/api/admin/risk/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warningThreshold,
          autoCloseThreshold
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to run risk monitoring')
      }

      const data = await response.json()
      setLastResult(data.result)
      
      toast({
        title: "Risk Monitoring Complete",
        description: `Checked ${data.result.checkedAccounts} accounts, closed ${data.result.positionsClosed} positions, created ${data.result.alertsCreated} alerts`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to run risk monitoring",
        variant: "destructive",
      })
    } finally {
      setMonitoring(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border shadow-sm neon-border">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl font-bold text-primary flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Server-Side Risk Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
            <p className="text-sm text-yellow-400 font-medium mb-2">⚠️ Important</p>
            <p className="text-xs text-muted-foreground">
              This monitoring runs server-side and works even when users close their app.
              It calculates P&L server-side and automatically closes positions when loss exceeds thresholds.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Warning Threshold (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={warningThreshold * 100}
                onChange={(e) => setWarningThreshold(parseFloat(e.target.value) / 100)}
                placeholder="80"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Create alert when loss exceeds this % of available funds
              </p>
            </div>
            <div>
              <Label>Auto-Close Threshold (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={autoCloseThreshold * 100}
                onChange={(e) => setAutoCloseThreshold(parseFloat(e.target.value) / 100)}
                placeholder="90"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Automatically close positions when loss exceeds this % of available funds
              </p>
            </div>
          </div>

          <Button
            onClick={runRiskMonitoring}
            disabled={monitoring}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {monitoring ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Risk Monitoring...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Risk Monitoring Now
              </>
            )}
          </Button>

          {lastResult && (
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Accounts Checked</p>
                  <p className="text-lg font-bold">{lastResult.checkedAccounts}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Positions Closed</p>
                  <p className="text-lg font-bold text-red-400">{lastResult.positionsClosed}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Alerts Created</p>
                  <p className="text-lg font-bold text-yellow-400">{lastResult.alertsCreated}</p>
                </Card>
                <Card className="p-3">
                  <p className="text-xs text-muted-foreground">Errors</p>
                  <p className="text-lg font-bold text-red-400">{lastResult.errors}</p>
                </Card>
              </div>

              {lastResult.details.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-sm">Monitoring Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Unrealized P&L</TableHead>
                            <TableHead>Available Margin</TableHead>
                            <TableHead>Utilization</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lastResult.details.map((detail) => (
                            <TableRow key={detail.tradingAccountId}>
                              <TableCell className="font-medium">{detail.userName}</TableCell>
                              <TableCell className={detail.totalUnrealizedPnL < 0 ? 'text-red-400' : 'text-green-400'}>
                                ₹{detail.totalUnrealizedPnL.toFixed(2)}
                              </TableCell>
                              <TableCell>₹{detail.availableMargin.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge className={
                                  detail.marginUtilizationPercent >= autoCloseThreshold
                                    ? 'bg-red-400/20 text-red-400'
                                    : detail.marginUtilizationPercent >= warningThreshold
                                    ? 'bg-yellow-400/20 text-yellow-400'
                                    : 'bg-green-400/20 text-green-400'
                                }>
                                  {(detail.marginUtilizationPercent * 100).toFixed(1)}%
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {detail.positionsClosed > 0 && (
                                  <Badge className="bg-red-400/20 text-red-400">
                                    {detail.positionsClosed} closed
                                  </Badge>
                                )}
                                {detail.alertCreated && (
                                  <Badge className="bg-yellow-400/20 text-yellow-400 ml-1">
                                    Alert
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm neon-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Cron Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            To run risk monitoring automatically, set up a cron job to call:
          </p>
          <code className="block bg-background p-2 rounded text-xs break-all">
            GET /api/cron/risk-monitoring
          </code>
          <p className="text-xs text-muted-foreground mt-2">
            Recommended: Run every 60 seconds during market hours.
            Protect with CRON_SECRET environment variable.
          </p>
        </CardContent>
      </Card>
    </div>
  )
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
        console.log(`✅ [RISK-MANAGEMENT] Loaded ${limitsData.limits?.length || 0} risk limits`)
      } else {
        console.warn("⚠️ [RISK-MANAGEMENT] Failed to fetch risk limits")
        setLimits([])
      }

      if (alertsResponse && alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        setAlerts(alertsData.alerts || [])
        console.log(`✅ [RISK-MANAGEMENT] Loaded ${alertsData.alerts?.length || 0} risk alerts`)
      } else {
        console.warn("⚠️ [RISK-MANAGEMENT] Failed to fetch risk alerts")
        setAlerts([])
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
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0"
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2 flex items-center gap-2 break-words">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />
            <span>Risk Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground break-words">Monitor and control trading risks</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRiskData}
            disabled={loading}
            className="border-primary/50 text-primary hover:bg-primary/10 text-xs sm:text-sm"
          >
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </motion.div>

      {/* Tabs for User Limits vs Platform Config vs Monitoring */}
      <Tabs defaultValue="monitoring" className="space-y-3 sm:space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-3 text-xs sm:text-sm">
          <TabsTrigger value="monitoring" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Risk Monitoring</span>
            <span className="sm:hidden">Monitor</span>
          </TabsTrigger>
          <TabsTrigger value="platform" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Globe className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Platform Risk Config</span>
            <span className="sm:hidden">Platform</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">User Risk Limits</span>
            <span className="sm:hidden">Users</span>
          </TabsTrigger>
        </TabsList>

        {/* Risk Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-3 sm:space-y-4 md:space-y-6">
          <RiskMonitoringPanel />
        </TabsContent>

        {/* Platform Risk Config Tab */}
        <TabsContent value="platform" className="space-y-3 sm:space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-primary break-words">Platform-Wide Leverage Configuration</h2>
              <p className="text-xs sm:text-sm text-muted-foreground break-words">Manage leverage settings by segment and product type</p>
            </div>
            <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Config
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
                <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                  <DialogTitle className="text-lg sm:text-xl font-bold text-primary">{selectedConfig ? 'Edit Platform Risk Config' : 'Create Platform Risk Config'}</DialogTitle>
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
            <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-lg sm:text-xl font-bold text-primary">Platform Risk Configurations</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="min-w-[1000px] sm:min-w-0">
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Risk Limits Tab */}
        <TabsContent value="users" className="space-y-3 sm:space-y-4 md:space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-primary break-words">User Risk Limits</h2>
              <p className="text-xs sm:text-sm text-muted-foreground break-words">Manage per-user risk limits and leverage overrides</p>
            </div>
            <Dialog open={showLimitDialog} onOpenChange={setShowLimitDialog}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm" size="sm">
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Add Limit</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:w-full sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
                <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6">
                  <DialogTitle className="text-lg sm:text-xl font-bold text-primary">{selectedLimit ? 'Edit Risk Limit' : 'Create Risk Limit'}</DialogTitle>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Active Limits</p>
                    <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{limits.filter(l => l.status === 'ACTIVE').length}</p>
                  </div>
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Active Alerts</p>
                    <p className="text-xl sm:text-2xl font-bold text-red-400 truncate">{alerts.filter(a => !a.resolved).length}</p>
                  </div>
                  <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Critical Alerts</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-400 truncate">
                      {alerts.filter(a => !a.resolved && a.severity === 'CRITICAL').length}
                    </p>
                  </div>
                  <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-orange-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Users at Risk</p>
                    <p className="text-xl sm:text-2xl font-bold text-yellow-400 truncate">
                      {limits.filter(l => l.status === 'WARNING').length}
                    </p>
                  </div>
                  <Users className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Limits Table */}
          <Card className="bg-card border-border shadow-sm neon-border">
            <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-lg sm:text-xl font-bold text-primary">Risk Limits</CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
              <div className="overflow-x-auto -mx-3 sm:mx-0">
                <div className="min-w-[900px] sm:min-w-0">
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
              </div>
            </CardContent>
          </Card>

          {/* Risk Alerts */}
          <Card className="bg-card border-border shadow-sm neon-border">
            <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-lg sm:text-xl font-bold text-primary">Risk Alerts</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
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
