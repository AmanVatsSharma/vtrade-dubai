/**
 * @file RiskMonitor.tsx
 * @module risk
 * @description Client-side risk monitoring component with alerts and warnings
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  X,
  Settings,
} from 'lucide-react'
import { useRiskMonitoring, RiskThresholds } from '@/lib/hooks/use-risk-monitoring'
import { useSession } from 'next-auth/react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface RiskMonitorProps {
  thresholds?: RiskThresholds
  showSettings?: boolean
  compact?: boolean
}

export function RiskMonitor({ thresholds, showSettings = true, compact = false }: RiskMonitorProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id as string | undefined

  const {
    riskStatus,
    lastChecked,
    closePosition,
    isLoading,
  } = useRiskMonitoring(userId, thresholds)

  // Don't show component when safe
  if (isLoading || !riskStatus || riskStatus.status === 'SAFE') {
    return null
  }

  const statusColor = useMemo(() => {
    if (!riskStatus) return 'bg-gray-500'
    switch (riskStatus.status) {
      case 'CRITICAL':
        return 'bg-red-500'
      case 'WARNING':
        return 'bg-yellow-500'
      default:
        return 'bg-green-500'
    }
  }, [riskStatus])

  const statusIcon = useMemo(() => {
    if (!riskStatus) return Shield
    switch (riskStatus.status) {
      case 'CRITICAL':
        return AlertCircle
      case 'WARNING':
        return AlertTriangle
      default:
        return CheckCircle2
    }
  }, [riskStatus])

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
        <span className="text-xs text-muted-foreground">
          Risk: {riskStatus.marginUtilizationPercent.toFixed(1)}%
        </span>
      </div>
    )
  }

  return (
    <Card className={`border-2 ${
      riskStatus.status === 'CRITICAL' 
        ? 'border-red-500 bg-red-500/10' 
        : riskStatus.status === 'WARNING'
        ? 'border-yellow-500 bg-yellow-500/10'
        : 'border-green-500 bg-green-500/10'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <statusIcon className={`w-5 h-5 ${
              riskStatus.status === 'CRITICAL' 
                ? 'text-red-500' 
                : riskStatus.status === 'WARNING'
                ? 'text-yellow-500'
                : 'text-green-500'
            }`} />
            <CardTitle className="text-lg">Risk Monitor</CardTitle>
          </div>
          {showSettings && <RiskSettingsDialog thresholds={thresholds} />}
        </div>
        <CardDescription>
          {riskStatus.status === 'CRITICAL' && 'Critical risk - Immediate action required'}
          {riskStatus.status === 'WARNING' && 'Warning - Monitor positions closely'}
          {riskStatus.status === 'SAFE' && 'Account within safe limits'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Risk Level Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Margin Utilization</span>
            <span className={`font-semibold ${
              riskStatus.status === 'CRITICAL' 
                ? 'text-red-500' 
                : riskStatus.status === 'WARNING'
                ? 'text-yellow-500'
                : 'text-green-500'
            }`}>
              {(riskStatus.marginUtilizationPercent * 100).toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={riskStatus.marginUtilizationPercent * 100} 
            className={`h-2 ${
              riskStatus.status === 'CRITICAL' 
                ? '[&>div]:bg-red-500' 
                : riskStatus.status === 'WARNING'
                ? '[&>div]:bg-yellow-500'
                : '[&>div]:bg-green-500'
            }`}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Safe</span>
            <span>Warning (80%)</span>
            <span>Critical (90%)</span>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Unrealized P&L</p>
            <p className={`text-lg font-semibold ${
              riskStatus.totalUnrealizedPnL < 0 ? 'text-red-500' : 'text-green-500'
            }`}>
              {riskStatus.totalUnrealizedPnL < 0 ? '-' : '+'}₹{Math.abs(riskStatus.totalUnrealizedPnL).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Available Funds</p>
            <p className="text-lg font-semibold">₹{riskStatus.totalFunds.toFixed(2)}</p>
          </div>
        </div>

        {/* Critical Alert */}
        {riskStatus.status === 'CRITICAL' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Critical Risk Detected</AlertTitle>
            <AlertDescription>
              Your loss exceeds {(thresholds?.autoCloseThreshold || 0.90) * 100}% of available funds.
              {riskStatus.positionsAtRisk.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Positions at risk:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {riskStatus.positionsAtRisk.slice(0, 3).map((pos) => (
                      <li key={pos.positionId}>
                        {pos.symbol}: ₹{Math.abs(pos.unrealizedPnL).toFixed(2)} loss
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Warning Alert */}
        {riskStatus.status === 'WARNING' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Risk Warning</AlertTitle>
            <AlertDescription>
              Your loss exceeds {(thresholds?.warningThreshold || 0.80) * 100}% of available funds.
              Consider closing losing positions to reduce risk.
            </AlertDescription>
          </Alert>
        )}

        {/* Positions at Risk */}
        {riskStatus.positionsAtRisk.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Positions at Risk</p>
            <div className="space-y-2">
              {riskStatus.positionsAtRisk
                .sort((a, b) => a.unrealizedPnL - b.unrealizedPnL)
                .slice(0, 5)
                .map((pos) => (
                  <div
                    key={pos.positionId}
                    className="flex items-center justify-between p-2 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">{pos.symbol}</p>
                      <p className="text-xs text-red-500">
                        Loss: ₹{Math.abs(pos.unrealizedPnL).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => closePosition(pos.positionId)}
                    >
                      Close
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Auto-Close Info */}
        {riskStatus.shouldAutoClose && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Auto-Close Active</AlertTitle>
            <AlertDescription>
              Positions will be automatically closed when loss exceeds {(thresholds?.autoCloseThreshold || 0.90) * 100}% of available funds.
            </AlertDescription>
          </Alert>
        )}

        {lastChecked && (
          <p className="text-xs text-muted-foreground text-center">
            Last checked: {lastChecked.toLocaleTimeString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function RiskSettingsDialog({ thresholds }: { thresholds?: RiskThresholds }) {
  const [warningThreshold, setWarningThreshold] = useState(
    (thresholds?.warningThreshold || 0.80) * 100
  )
  const [autoCloseThreshold, setAutoCloseThreshold] = useState(
    (thresholds?.autoCloseThreshold || 0.90) * 100
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Risk Monitoring Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Warning Threshold (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={warningThreshold}
              onChange={(e) => setWarningThreshold(parseFloat(e.target.value) || 80)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Show warning when loss exceeds this % of available funds
            </p>
          </div>
          <div>
            <Label>Auto-Close Threshold (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={autoCloseThreshold}
              onChange={(e) => setAutoCloseThreshold(parseFloat(e.target.value) || 90)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Auto-close positions when loss exceeds this % of available funds
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: Settings are stored locally in your browser
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
