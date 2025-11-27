"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Eye, AlertTriangle, LayoutDashboard } from "lucide-react"
import { PageHeader, RefreshButton } from "@/components/admin-console/shared"
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

export function Dashboard() {
  const [stats, setStats] = useState<typeof mockStats>([])
  const [recentActivity, setRecentActivity] = useState<typeof mockRecentActivity>([])
  const [alerts, setAlerts] = useState<Array<{ id: string; type: string; message: string; time: string }>>([])
  const [topTraders, setTopTraders] = useState<Array<{ id: string; name: string; clientId: string; profit: number; trades: number; winRate: number }>>([])
  const [isUsingMockData, setIsUsingMockData] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchRealData = async () => {
    console.log("🔄 [ADMIN-DASHBOARD] Fetching real data...")
    setLoading(true)

    try {
      // Fetch stats, activity, alerts, and top traders in parallel
      const [statsResponse, activityResponse, alertsResponse, tradersResponse] = await Promise.all([
        fetch('/api/admin/stats').catch(e => {
          console.error("❌ [ADMIN-DASHBOARD] Stats API failed:", e)
          return null
        }),
        fetch('/api/admin/activity?limit=20').catch(e => {
          console.error("❌ [ADMIN-DASHBOARD] Activity API failed:", e)
          return null
        }),
        fetch('/api/admin/alerts?limit=10').catch(e => {
          console.error("❌ [ADMIN-DASHBOARD] Alerts API failed:", e)
          return null
        }),
        fetch('/api/admin/top-traders?limit=5').catch(e => {
          console.error("❌ [ADMIN-DASHBOARD] Top traders API failed:", e)
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

      // Process alerts
      if (alertsResponse && alertsResponse.ok) {
        const data = await alertsResponse.json()
        console.log("✅ [ADMIN-DASHBOARD] Alerts received:", data)

        if (data.success && data.alerts) {
          setAlerts(data.alerts)
          hasRealData = true
          console.log("✅ [ADMIN-DASHBOARD] Real alerts loaded!")
        }
      }

      // Process top traders
      if (tradersResponse && tradersResponse.ok) {
        const data = await tradersResponse.json()
        console.log("✅ [ADMIN-DASHBOARD] Top traders received:", data)

        if (data.success && data.traders) {
          setTopTraders(data.traders)
          hasRealData = true
          console.log("✅ [ADMIN-DASHBOARD] Real top traders loaded!")
        }
      }

      setIsUsingMockData(!hasRealData)
      
      // If no real data was loaded, use mock data as fallback
      if (!hasRealData) {
        console.warn("⚠️ [ADMIN-DASHBOARD] No real data available, using mock data")
        setStats(mockStats)
        setRecentActivity(mockRecentActivity)
      }
      
      if (hasRealData) {
        toast({
          title: "✅ Real Data Loaded",
          description: "Dashboard is showing live platform data",
        })
      }

    } catch (error) {
      console.error("❌ [ADMIN-DASHBOARD] Error fetching data:", error)
      setIsUsingMockData(true)
      // Fallback to mock data on error
      setStats(mockStats)
      setRecentActivity(mockRecentActivity)
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
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Mock Data Warning */}
      {isUsingMockData && !loading && (
        <Alert variant="destructive" className="bg-yellow-500/10 border-yellow-500/50">
          <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
          <AlertTitle className="text-yellow-500 text-sm sm:text-base">Using Mock Data</AlertTitle>
          <AlertDescription className="text-yellow-500/80 text-xs sm:text-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="flex-1">Unable to load real data from backend. Displaying sample data. Check API endpoints or try refreshing.</span>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto sm:ml-0 text-xs sm:text-sm"
                onClick={fetchRealData}
                disabled={loading}
              >
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <PageHeader
        title="Trading Console Dashboard"
        description={`Real-time monitoring and analytics for your trading platform${!isUsingMockData && !loading ? " • Live Data" : ""}`}
        icon={<LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={
          <>
            <RefreshButton onClick={fetchRealData} loading={loading} />
            {!loading && (
              <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
                <div className={`w-2 h-2 rounded-full ${isUsingMockData ? 'bg-yellow-400' : 'bg-green-400 pulse-glow'}`}></div>
                <span className={`hidden sm:inline ${isUsingMockData ? 'text-yellow-400' : 'text-green-400'}`}>
                  {isUsingMockData ? 'Mock Data' : 'Live Data'}
                </span>
              </div>
            )}
          </>
        }
      />

      {/* Loading State */}
      {loading && stats.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card border-border shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                <div className="h-5 w-5 bg-muted animate-pulse rounded"></div>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="h-8 w-32 bg-muted animate-pulse rounded mb-2"></div>
                <div className="h-3 w-20 bg-muted animate-pulse rounded mb-2"></div>
                <div className="h-3 w-16 bg-muted animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Stats Grid */
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
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
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate pr-2">{stat.title}</CardTitle>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${stat.color}`} />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-xl sm:text-2xl font-bold text-foreground mb-1 break-words">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mb-2 break-words">{stat.description}</p>
                  <div className="flex items-center text-xs flex-wrap">
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="w-3 h-3 text-green-400 mr-1 flex-shrink-0" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-red-400 mr-1 flex-shrink-0" />
                    )}
                    <span className={stat.trend === "up" ? "text-green-400" : "text-red-400"}>{stat.change}</span>
                    <span className="text-muted-foreground ml-1 hidden sm:inline">from last month</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        {/* Recent Activity */}
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="bg-card border-border shadow-sm neon-border">
            <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-lg sm:text-xl font-bold text-primary">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={activity.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2 sm:p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-all duration-200 gap-2 sm:gap-0"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          activity.status === "completed" || activity.status === "COMPLETED"
                            ? "bg-green-400 pulse-glow"
                            : activity.status === "pending" || activity.status === "PENDING"
                              ? "bg-yellow-400"
                              : activity.status === "alert"
                                ? "bg-red-400 pulse-glow"
                                : "bg-blue-400"
                        }`}
                      ></div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground text-sm sm:text-base truncate">{activity.action}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">User: {activity.clientId || activity.user}</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <p className="font-medium text-foreground text-sm sm:text-base">{activity.amount}</p>
                      <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
                        <span
                          className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
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
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
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
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-base sm:text-lg font-bold text-primary flex items-center">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                  <span className="truncate">System Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="space-y-2 sm:space-y-3">
                  {alerts.length === 0 ? (
                    <p className="text-center text-xs sm:text-sm text-muted-foreground py-4">No active alerts</p>
                  ) : (
                    alerts.map((alert, index) => (
                      <motion.div
                        key={alert.id}
                        className={`p-2 sm:p-3 rounded-lg border ${
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
                        <p className="text-xs sm:text-sm font-medium text-foreground break-words">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                      </motion.div>
                    ))
                  )}
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
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-base sm:text-lg font-bold text-primary">Top Traders</CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="space-y-2 sm:space-y-3">
                  {topTraders.length === 0 ? (
                    <p className="text-center text-xs sm:text-sm text-muted-foreground py-4">No traders data available</p>
                  ) : (
                    topTraders.map((trader, index) => (
                      <motion.div
                        key={trader.id}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-lg gap-2"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground text-xs sm:text-sm truncate">{trader.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{trader.clientId}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs sm:text-sm font-bold text-green-400">₹{trader.profit.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground whitespace-nowrap">{trader.trades} trades • {trader.winRate}% win</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}