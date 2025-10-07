"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Eye, AlertTriangle, RefreshCw } from "lucide-react"
import { TradingChart } from "./trading-chart"
import { UserActivityChart } from "./user-activity-chart"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useEffect, useState } from "react"
import { toast } from "@/hooks/use-toast"

// Mock data as fallback
const mockStats = [
  {
    title: "Total Users",
    value: "12,847",
    change: "+12.5%",
    trend: "up" as const,
    icon: Users,
    color: "text-blue-400",
    description: "Active traders",
  },
  {
    title: "Total Funds",
    value: "$2.4M",
    change: "+8.2%",
    trend: "up" as const,
    icon: DollarSign,
    color: "text-green-400",
    description: "Under management",
  },
  {
    title: "Active Trades",
    value: "1,234",
    change: "-2.1%",
    trend: "down" as const,
    icon: TrendingUp,
    color: "text-yellow-400",
    description: "Live positions",
  },
  {
    title: "System Load",
    value: "67%",
    change: "+5.3%",
    trend: "up" as const,
    icon: Activity,
    color: "text-purple-400",
    description: "Server capacity",
  },
]

const mockRecentActivity = [
  {
    id: "1",
    user: "USR_001234",
    clientId: "USR_001234",
    action: "Fund Deposit",
    amount: "$5,000",
    time: "2 min ago",
    status: "completed",
    type: "deposit",
  },
  {
    id: "2",
    user: "USR_005678",
    clientId: "USR_005678",
    action: "Withdrawal Request",
    amount: "$2,500",
    time: "5 min ago",
    status: "pending",
    type: "withdrawal",
  },
]

const alerts = [
  { id: 1, type: "warning", message: "High server load detected", time: "5 min ago" },
  { id: 2, type: "info", message: "Daily backup completed", time: "1 hour ago" },
]

const topTraders = [
  { id: 1, name: "Alex Chen", clientId: "USR_001234", profit: "$45,230", trades: 156, winRate: "78%" },
  { id: 2, name: "Sarah Johnson", clientId: "USR_005678", profit: "$38,940", trades: 142, winRate: "72%" },
]

export function Dashboard() {
  const [stats, setStats] = useState(mockStats)
  const [recentActivity, setRecentActivity] = useState(mockRecentActivity)
  const [isUsingMockData, setIsUsingMockData] = useState(true)
  const [loading, setLoading] = useState(true)

  const fetchRealData = async () => {
    console.log("🔄 [ADMIN-DASHBOARD] Fetching real data...")
    setLoading(true)

    try {
      // Fetch stats and activity in parallel
      const [statsResponse, activityResponse] = await Promise.all([
        fetch('/api/admin/stats').catch(e => {
          console.error("❌ [ADMIN-DASHBOARD] Stats API failed:", e)
          return null
        }),
        fetch('/api/admin/activity?limit=20').catch(e => {
          console.error("❌ [ADMIN-DASHBOARD] Activity API failed:", e)
          return null
        })
      ])

      let hasRealData = false

      // Process stats
      if (statsResponse && statsResponse.ok) {
        const data = await statsResponse.json()
        console.log("✅ [ADMIN-DASHBOARD] Stats received:", data)

        if (data.success && data.stats) {
          const realStats = [
            {
              title: "Total Users",
              value: data.stats.users.total.toLocaleString(),
              change: "+12.5%", // Can calculate from historical data
              trend: "up" as const,
              icon: Users,
              color: "text-blue-400",
              description: `${data.stats.users.active} active`,
            },
            {
              title: "Total Funds",
              value: `₹${(data.stats.tradingAccounts.totalBalance / 10000000).toFixed(2)}Cr`,
              change: "+8.2%",
              trend: "up" as const,
              icon: DollarSign,
              color: "text-green-400",
              description: "Under management",
            },
            {
              title: "Active Positions",
              value: data.stats.trading.activePositions.toLocaleString(),
              change: "-2.1%",
              trend: "down" as const,
              icon: TrendingUp,
              color: "text-yellow-400",
              description: "Live positions",
            },
            {
              title: "Pending Requests",
              value: (data.stats.pending.deposits + data.stats.pending.withdrawals).toString(),
              change: "+5.3%",
              trend: "up" as const,
              icon: Activity,
              color: "text-purple-400",
              description: `${data.stats.pending.deposits} deposits, ${data.stats.pending.withdrawals} withdrawals`,
            },
          ]
          setStats(realStats)
          hasRealData = true
          console.log("✅ [ADMIN-DASHBOARD] Real stats loaded!")
        }
      }

      // Process activity
      if (activityResponse && activityResponse.ok) {
        const data = await activityResponse.json()
        console.log("✅ [ADMIN-DASHBOARD] Activity received:", data)

        if (data.success && data.activities) {
          const realActivity = data.activities.slice(0, 8).map((activity: any) => ({
            id: activity.id,
            user: activity.user,
            clientId: activity.clientId,
            action: activity.action,
            amount: `₹${activity.amount.toLocaleString()}`,
            time: getTimeAgo(new Date(activity.timestamp)),
            status: activity.status.toLowerCase(),
            type: activity.type.toLowerCase(),
          }))
          setRecentActivity(realActivity)
          hasRealData = true
          console.log("✅ [ADMIN-DASHBOARD] Real activity loaded!")
        }
      }

      setIsUsingMockData(!hasRealData)
      
      if (hasRealData) {
        toast({
          title: "✅ Real Data Loaded",
          description: "Dashboard is showing live platform data",
        })
      }

    } catch (error) {
      console.error("❌ [ADMIN-DASHBOARD] Error fetching data:", error)
      setIsUsingMockData(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRealData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchRealData, 30000)
    return () => clearInterval(interval)
  }, [])

  function getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds} sec ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  return (
    <div className="space-y-6">
      {/* Mock Data Warning */}
      {isUsingMockData && (
        <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500/50">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertTitle className="text-yellow-500">Using Mock Data</AlertTitle>
          <AlertDescription className="text-yellow-500/80">
            Unable to load real data from backend. Displaying sample data. Check API endpoints or try refreshing.
            <Button
              variant="outline"
              size="sm"
              className="ml-4"
              onClick={fetchRealData}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Trading Console Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time monitoring and analytics for your trading platform
              {!isUsingMockData && " • Live Data"}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
              onClick={fetchRealData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isUsingMockData ? 'bg-yellow-400' : 'bg-green-400 pulse-glow'}`}></div>
              <span className={isUsingMockData ? 'text-yellow-400' : 'text-green-400'}>
                {isUsingMockData ? 'Mock Data' : 'Live Data'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card className="bg-card border-border shadow-sm hover:border-primary/50 transition-all duration-300 neon-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mb-2">{stat.description}</p>
                  <div className="flex items-center text-xs">
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="w-3 h-3 text-green-400 mr-1" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-red-400 mr-1" />
                    )}
                    <span className={stat.trend === "up" ? "text-green-400" : "text-red-400"}>{stat.change}</span>
                    <span className="text-muted-foreground ml-1">from last month</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <TradingChart />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <UserActivityChart />
        </motion.div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="bg-card border-border shadow-sm neon-border">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-primary">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-all duration-200"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          activity.status === "completed" || activity.status === "COMPLETED"
                            ? "bg-green-400 pulse-glow"
                            : activity.status === "pending" || activity.status === "PENDING"
                              ? "bg-yellow-400"
                              : activity.status === "alert"
                                ? "bg-red-400 pulse-glow"
                                : "bg-blue-400"
                        }`}
                      ></div>
                      <div>
                        <p className="font-medium text-foreground">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">User: {activity.clientId || activity.user}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{activity.amount}</p>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            activity.status === "completed" || activity.status === "COMPLETED"
                              ? "bg-green-400/20 text-green-400"
                              : activity.status === "pending" || activity.status === "PENDING"
                                ? "bg-yellow-400/20 text-yellow-400"
                                : activity.status === "alert"
                                  ? "bg-red-400/20 text-red-400"
                                  : "bg-blue-400/20 text-blue-400"
                          }`}
                        >
                          {activity.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{activity.time}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar Content */}
        <div className="space-y-6">
          {/* System Alerts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-primary flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {alerts.map((alert, index) => (
                    <motion.div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${
                        alert.type === "error"
                          ? "bg-red-400/10 border-red-400/30"
                          : alert.type === "warning"
                            ? "bg-yellow-400/10 border-yellow-400/30"
                            : "bg-blue-400/10 border-blue-400/30"
                      }`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <p className="text-sm font-medium text-foreground">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Traders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-primary">Top Traders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topTraders.map((trader, index) => (
                    <motion.div
                      key={trader.id}
                      className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div>
                        <p className="font-medium text-foreground text-sm">{trader.name}</p>
                        <p className="text-xs text-muted-foreground">{trader.clientId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-400">{trader.profit}</p>
                        <p className="text-xs text-muted-foreground">{trader.winRate} win rate</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}