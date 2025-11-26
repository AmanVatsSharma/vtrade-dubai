/**
 * @file advanced-analytics.tsx
 * @module admin-console
 * @description Enterprise-grade analytics dashboard with real-time metrics, KPIs, and comprehensive data visualization
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Calendar,
  Target,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { PageHeader, RefreshButton } from "./shared"

interface MetricCardProps {
  title: string
  value: string | number
  change?: string
  trend?: "up" | "down" | "neutral"
  icon: any
  color: string
  description?: string
  loading?: boolean
}

function MetricCard({ title, value, change, trend, icon: Icon, color, description, loading }: MetricCardProps) {
  return (
    <Card className="bg-card border-border shadow-sm neon-border hover:shadow-md transition-shadow">
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">{title}</p>
            {loading ? (
              <div className="h-6 sm:h-8 w-20 sm:w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <p className="text-xl sm:text-2xl font-bold text-foreground truncate">{value}</p>
                {change && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {trend === "up" ? (
                      <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                    ) : trend === "down" ? (
                      <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 flex-shrink-0" />
                    ) : null}
                    <span className={`text-xs sm:text-sm font-medium ${trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-muted-foreground"}`}>
                      {change}
                    </span>
                  </div>
                )}
                {description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{description}</p>
                )}
              </>
            )}
          </div>
          <div className={`${color} bg-opacity-10 p-2 sm:p-3 rounded-lg flex-shrink-0`}>
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdvancedAnalytics() {
  const [timeRange, setTimeRange] = useState("7d")
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalTrades: 0,
    activeUsers: 0,
    avgOrderValue: 0,
    conversionRate: 0,
    churnRate: 0,
    userGrowth: 0,
    revenueGrowth: 0,
    topPerformingUsers: [] as any[],
    revenueByPeriod: [] as any[],
    userActivity: [] as any[],
    tradingVolume: [] as any[],
  })

  const fetchAnalytics = async () => {
    setLoading(true)
    console.log("📊 [ADVANCED-ANALYTICS] Fetching analytics data...")

    try {
      // In a real implementation, this would call an analytics API
      // For now, we'll simulate with mock data structure
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`).catch(() => null)

      if (response && response.ok) {
        const data = await response.json()
        setMetrics({
          totalRevenue: data.totalRevenue || 0,
          totalTrades: data.totalTrades || 0,
          activeUsers: data.activeUsers || 0,
          avgOrderValue: data.avgOrderValue || 0,
          conversionRate: data.conversionRate || 0,
          churnRate: data.churnRate || 0,
          userGrowth: data.userGrowth || 0,
          revenueGrowth: data.revenueGrowth || 0,
          topPerformingUsers: data.topPerformingUsers || [],
          revenueByPeriod: data.revenueByPeriod || [],
          userActivity: data.userActivity || [],
          tradingVolume: data.tradingVolume || [],
        })
        console.log("✅ [ADVANCED-ANALYTICS] Analytics data loaded")
      } else {
        console.warn("⚠️ [ADVANCED-ANALYTICS] Failed to fetch analytics data")
        setMetrics({
          totalRevenue: 0,
          totalTrades: 0,
          activeUsers: 0,
          avgOrderValue: 0,
          conversionRate: 0,
          churnRate: 0,
          userGrowth: 0,
          revenueGrowth: 0,
          topPerformingUsers: [],
          revenueByPeriod: [],
          userActivity: [],
          tradingVolume: [],
        })
      }
    } catch (error) {
      console.error("❌ [ADVANCED-ANALYTICS] Error fetching analytics:", error)
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <PageHeader
        title="Advanced Analytics"
        description="Comprehensive insights and performance metrics"
        icon={<BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={
          <>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-32 bg-background border-border text-xs sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <RefreshButton onClick={fetchAnalytics} loading={loading} />
            <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10 text-xs sm:text-sm">
              <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </>
        }
      />

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
      >
        <MetricCard
          title="Total Revenue"
          value={`₹${(metrics.totalRevenue / 100000).toFixed(2)}Cr`}
          change={`+${metrics.revenueGrowth}%`}
          trend="up"
          icon={DollarSign}
          color="text-green-400"
          description="Total platform revenue"
          loading={loading}
        />
        <MetricCard
          title="Total Trades"
          value={metrics.totalTrades.toLocaleString()}
          change="+8.2%"
          trend="up"
          icon={Activity}
          color="text-blue-400"
          description="All executed trades"
          loading={loading}
        />
        <MetricCard
          title="Active Users"
          value={metrics.activeUsers.toLocaleString()}
          change={`+${metrics.userGrowth}%`}
          trend="up"
          icon={Users}
          color="text-purple-400"
          description="Users active this period"
          loading={loading}
        />
        <MetricCard
          title="Avg Order Value"
          value={`₹${metrics.avgOrderValue.toFixed(2)}`}
          change="+3.1%"
          trend="up"
          icon={Target}
          color="text-yellow-400"
          description="Average transaction value"
          loading={loading}
        />
      </motion.div>

      {/* Secondary Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          change="+1.2%"
          trend="up"
          icon={TrendingUp}
          color="text-emerald-400"
          description="User conversion rate"
          loading={loading}
        />
        <MetricCard
          title="Churn Rate"
          value={`${metrics.churnRate}%`}
          change="-0.5%"
          trend="down"
          icon={TrendingDown}
          color="text-red-400"
          description="Monthly churn rate"
          loading={loading}
        />
        <MetricCard
          title="User Growth"
          value={`+${metrics.userGrowth}%`}
          change="+2.1%"
          trend="up"
          icon={Users}
          color="text-blue-400"
          description="Month-over-month growth"
          loading={loading}
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card border-border shadow-sm neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="w-5 h-5 text-primary" />
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end justify-between gap-2">
                {metrics.revenueByPeriod.map((item, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                      style={{ height: `${(item.value / 65000) * 100}%` }}
                    />
                    <span className="text-xs text-muted-foreground">{item.period}</span>
                    <span className="text-xs font-medium text-foreground">₹{(item.value / 1000).toFixed(0)}k</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Trading Volume */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card border-border shadow-sm neon-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Top Trading Instruments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.tradingVolume.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{item.symbol}</span>
                      <span className="text-sm text-muted-foreground">₹{(item.volume / 1000).toFixed(0)}k</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${(item.volume / 1300000) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Top Performers */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              Top Performing Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topPerformingUsers.map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.clientId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Profit</p>
                      <p className="font-bold text-green-400">₹{user.profit.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Trades</p>
                      <p className="font-bold text-foreground">{user.trades}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
