"use client"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { TrendingUp, PieChart, BarChart3, RefreshCw, Eye, EyeOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AccountSummaryGrid } from "../account/account-summary-grid"
import { BalanceTrendChart } from "../account/balance-trend-chart"
import { ExposurePieChart } from "../account/exposure-pie-chart"
import { PLTrendChart } from "../account/pl-trend-chart"
import { QuickActionsMenu } from "../account/quick-actions-menu"
import { useSession } from "next-auth/react"
import { usePortfolio, usePositions } from "@/lib/hooks/use-trading-data"
import { useConsoleData } from "@/lib/hooks/use-console-data"

export function AccountSection() {
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Session + console data hooks
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  const { consoleData, isLoading: isConsoleLoading, error: consoleError, refetch } = useConsoleData(userId)
  
  // Fallback to existing trading data hooks for positions
  const { positions, isLoading: isPositionsLoading, error: positionsError } = usePositions(userId)
  
  const unrealizedPnL = useMemo(() => {
    try {
      return (positions || []).reduce((sum: number, p: any) => sum + (Number(p.unrealizedPnL) || 0), 0)
    } catch (e) {
      console.warn("AccountSection: failed to compute unrealizedPnL", e)
      return 0
    }
  }, [positions])
  
  console.log("AccountSection: console data", consoleData, { isConsoleLoading, consoleError })
  console.log("AccountSection: positions count", positions?.length, { isPositionsLoading, positionsError })

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date())
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Loading state
  if (isConsoleLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading account data...
      </div>
    )
  }

  // Error state
  if (consoleError) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-xl font-semibold text-destructive">Error loading account data</div>
          <div className="text-sm text-muted-foreground">{consoleError}</div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">My Account</h1>
          <p className="text-muted-foreground">Last updated: {lastUpdated.toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBalanceVisible(!balanceVisible)}
            className="gap-2 bg-transparent"
          >
            {balanceVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {balanceVisible ? "Hide" : "Show"} Balance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Account Summary Grid */}
      <AccountSummaryGrid
        balanceVisible={balanceVisible}
        account={{
          totalValue: consoleData?.tradingAccount ? 
            (consoleData.tradingAccount.balance + consoleData.tradingAccount.availableMargin + consoleData.tradingAccount.usedMargin) : 0,
          availableMargin: consoleData?.tradingAccount?.availableMargin ?? 0,
          usedMargin: consoleData?.tradingAccount?.usedMargin ?? 0,
          balance: consoleData?.tradingAccount?.balance ?? 0,
        }}
        unrealizedPnL={unrealizedPnL}
      />

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Balance Trend
            </CardTitle>
            <CardDescription>Your account balance over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <BalanceTrendChart />
          </CardContent>
        </Card>

        {/* Exposure Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Exposure Breakdown
            </CardTitle>
            <CardDescription>Current portfolio allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <ExposurePieChart />
          </CardContent>
        </Card>
      </div>

      {/* P&L Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            P&L Trend Analysis
          </CardTitle>
          <CardDescription>Profit and Loss performance over time</CardDescription>
        </CardHeader>
        <CardContent>
          <PLTrendChart />
        </CardContent>
      </Card>

      {/* Quick Actions Floating Menu */}
      <QuickActionsMenu />
    </motion.div>
  )
}
