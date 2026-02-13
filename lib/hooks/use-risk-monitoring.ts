/**
 * @file use-risk-monitoring.ts
 * @module hooks
 * @description Client-side risk monitoring hook that calculates P&L and monitors margin thresholds
 * @author BharatERP
 * @created 2025-01-27
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRealtimePositions } from './use-realtime-positions'
import { useRealtimeAccount } from './use-realtime-account'
import { useMarketData } from '@/lib/market-data/providers/WebSocketMarketDataProvider'
import { toast } from '@/hooks/use-toast'

export interface RiskThresholds {
  warningThreshold: number // e.g., 0.80 (80% of available margin)
  autoCloseThreshold: number // e.g., 0.90 (90% of available margin)
}

export interface RiskStatus {
  totalUnrealizedPnL: number
  availableMargin: number
  totalFunds: number
  marginUtilizationPercent: number
  status: 'SAFE' | 'WARNING' | 'CRITICAL'
  shouldAutoClose: boolean
  positionsAtRisk: Array<{
    positionId: string
    symbol: string
    unrealizedPnL: number
    utilizationPercent: number
  }>
}

const DEFAULT_THRESHOLDS: RiskThresholds = {
  warningThreshold: 0.80, // 80%
  autoCloseThreshold: 0.90 // 90%
}

export function useRiskMonitoring(
  userId: string | undefined,
  thresholds: RiskThresholds = DEFAULT_THRESHOLDS
) {
  const { positions, isLoading: positionsLoading } = useRealtimePositions(userId)
  const { account, isLoading: accountLoading } = useRealtimeAccount(userId)
  const { quotes } = useMarketData()

  const [riskStatus, setRiskStatus] = useState<RiskStatus | null>(null)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  // Calculate unrealized P&L for all positions
  const calculateUnrealizedPnL = useCallback(() => {
    if (!positions || positions.length === 0) {
      return {
        totalUnrealizedPnL: 0,
        positionsAtRisk: []
      }
    }

    let totalUnrealizedPnL = 0
    const positionsAtRisk: RiskStatus['positionsAtRisk'] = []

    positions.forEach((pos: any) => {
      if (pos.quantity === 0) return // Skip closed positions

      // Get current price from quotes or use position's unrealizedPnL
      let currentPrice = pos.averagePrice
      let unrealizedPnL = pos.unrealizedPnL ?? 0

      // Try to get live price from quotes
      if (quotes && pos.stock?.instrumentId) {
        const quote = quotes[pos.stock.instrumentId]
        if (quote?.last_trade_price) {
          currentPrice = quote.last_trade_price
          unrealizedPnL = (currentPrice - pos.averagePrice) * pos.quantity
        }
      }

      totalUnrealizedPnL += unrealizedPnL

      // Track positions with losses
      if (unrealizedPnL < 0) {
        positionsAtRisk.push({
          positionId: pos.id,
          symbol: pos.symbol,
          unrealizedPnL,
          utilizationPercent: 0 // Will be calculated below
        })
      }
    })

    return { totalUnrealizedPnL, positionsAtRisk }
  }, [positions, quotes])

  // Calculate risk status
  const calculateRiskStatus = useCallback((): RiskStatus | null => {
    if (!account || positionsLoading || accountLoading) {
      return null
    }

    const { totalUnrealizedPnL, positionsAtRisk } = calculateUnrealizedPnL()

    // Calculate total available funds
    const availableMargin = account.availableMargin || 0
    const balance = account.balance || 0
    const totalFunds = availableMargin + balance

    // Calculate margin utilization (loss as % of available funds)
    const marginUtilizationPercent = totalFunds > 0
      ? Math.abs(Math.min(0, totalUnrealizedPnL)) / totalFunds
      : 0

    // Determine status
    let status: RiskStatus['status'] = 'SAFE'
    let shouldAutoClose = false

    if (marginUtilizationPercent >= thresholds.autoCloseThreshold) {
      status = 'CRITICAL'
      shouldAutoClose = true
    } else if (marginUtilizationPercent >= thresholds.warningThreshold) {
      status = 'WARNING'
    }

    // Calculate utilization for each position at risk
    const positionsWithUtilization = positionsAtRisk.map(pos => ({
      ...pos,
      utilizationPercent: totalFunds > 0
        ? Math.abs(pos.unrealizedPnL) / totalFunds
        : 0
    }))

    return {
      totalUnrealizedPnL,
      availableMargin,
      totalFunds,
      marginUtilizationPercent,
      status,
      shouldAutoClose,
      positionsAtRisk: positionsWithUtilization
    }
  }, [account, positionsLoading, accountLoading, calculateUnrealizedPnL, thresholds])

  // Update risk status when data changes
  useEffect(() => {
    const status = calculateRiskStatus()
    if (status) {
      setRiskStatus(status)
      setLastChecked(new Date())

      // Show warnings/alerts
      if (status.status === 'CRITICAL') {
        toast({
          title: "🚨 Critical Risk Alert",
          description: `Your loss (₹${Math.abs(status.totalUnrealizedPnL).toFixed(2)}) exceeds ${(thresholds.autoCloseThreshold * 100).toFixed(0)}% of available funds. Consider closing positions.`,
          variant: "destructive",
          duration: 10000,
        })
      } else if (status.status === 'WARNING') {
        toast({
          title: "⚠️ Risk Warning",
          description: `Your loss (₹${Math.abs(status.totalUnrealizedPnL).toFixed(2)}) exceeds ${(thresholds.warningThreshold * 100).toFixed(0)}% of available funds.`,
          variant: "default",
          duration: 8000,
        })
      }
    }
  }, [calculateRiskStatus, thresholds])

  // Manual close position (no auto-close from client; server enforces risk + SL/TP).
  const closePosition = useCallback(async (positionId: string) => {
    const response = await fetch(`/api/trading/positions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        positionId,
        // tradingAccountId will be fetched server-side if not provided
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const message = (errorData as any)?.error || "Failed to close position"
      toast({
        title: "Close Failed",
        description: message,
        variant: "destructive",
      })
      throw new Error(message)
    }

    const result = await response.json()
    toast({
      title: "Close Requested",
      description: "Position close triggered server-side.",
      duration: 5000,
    })
    return result
  }, [])

  return {
    riskStatus,
    lastChecked,
    closePosition,
    isLoading: positionsLoading || accountLoading,
    thresholds,
  }
}
