"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, DollarSign, TrendingUp, Activity, ArrowUpRight, ArrowDownRight, Eye, AlertTriangle } from "lucide-react"
import { TradingChart } from "./trading-chart"
import { UserActivityChart } from "./user-activity-chart"
import { Button } from "@/components/ui/button"

const stats = [
  {
    title: "Total Users",
    value: "12,847",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    color: "text-blue-400",
    description: "Active traders",
  },
  {
    title: "Total Funds",
    value: "$2.4M",
    change: "+8.2%",
    trend: "up",
    icon: DollarSign,
    color: "text-green-400",
    description: "Under management",
  },
  {
    title: "Active Trades",
    value: "1,234",
    change: "-2.1%",
    trend: "down",
    icon: TrendingUp,
    color: "text-yellow-400",
    description: "Live positions",
  },
  {
    title: "System Load",
    value: "67%",
    change: "+5.3%",
    trend: "up",
    icon: Activity,
    color: "text-purple-400",
    description: "Server capacity",
  },
]

const recentActivity = [
  {
    id: 1,
    user: "USR_001234",
    action: "Fund Deposit",
    amount: "$5,000",
    time: "2 min ago",
    status: "completed",
    type: "deposit",
  },
  {
    id: 2,
    user: "USR_005678",
    action: "Withdrawal Request",
    amount: "$2,500",
    time: "5 min ago",
    status: "pending",
    type: "withdrawal",
  },
  {
    id: 3,
    user: "USR_009876",
    action: "Trade Executed",
    amount: "$1,200",
    time: "8 min ago",
    status: "completed",
    type: "trade",
  },
  {
    id: 4,
    user: "USR_004321",
    action: "Account Created",
    amount: "-",
    time: "12 min ago",
    status: "completed",
    type: "account",
  },
  {
    id: 5,
    user: "USR_007890",
    action: "Fund Deposit",
    amount: "$10,000",
    time: "15 min ago",
    status: "completed",
    type: "deposit",
  },
  {
    id: 6,
    user: "USR_003456",
    action: "KYC Verification",
    amount: "-",
    time: "18 min ago",
    status: "pending",
    type: "verification",
  },
  {
    id: 7,
    user: "USR_008765",
    action: "Position Closed",
    amount: "$3,400",
    time: "22 min ago",
    status: "completed",
    type: "trade",
  },
  {
    id: 8,
    user: "USR_002109",
    action: "Margin Call",
    amount: "$800",
    time: "25 min ago",
    status: "alert",
    type: "alert",
  },
]

const alerts = [
  { id: 1, type: "warning", message: "High server load detected", time: "5 min ago" },
  { id: 2, type: "info", message: "Daily backup completed", time: "1 hour ago" },
  { id: 3, type: "error", message: "Failed login attempts from IP 192.168.1.100", time: "2 hours ago" },
]

const topTraders = [
  { id: 1, name: "Alex Chen", clientId: "USR_001234", profit: "$45,230", trades: 156, winRate: "78%" },
  { id: 2, name: "Sarah Johnson", clientId: "USR_005678", profit: "$38,940", trades: 142, winRate: "72%" },
  { id: 3, name: "Mike Rodriguez", clientId: "USR_009876", profit: "$32,150", trades: 128, winRate: "69%" },
  { id: 4, name: "Emma Wilson", clientId: "USR_004321", profit: "$28,760", trades: 134, winRate: "71%" },
  { id: 5, name: "David Kim", clientId: "USR_007890", profit: "$25,480", trades: 119, winRate: "65%" },
]

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Trading Console Dashboard</h1>
            <p className="text-muted-foreground">Real-time monitoring and analytics for your trading platform</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
            >
              <Eye className="w-4 h-4 mr-2" />
              Live View
            </Button>
            <div className="flex items-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-green-400 rounded-full pulse-glow"></div>
              <span className="text-green-400">System Online</span>
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
                          activity.status === "completed"
                            ? "bg-green-400 pulse-glow"
                            : activity.status === "pending"
                              ? "bg-yellow-400"
                              : activity.status === "alert"
                                ? "bg-red-400 pulse-glow"
                                : "bg-blue-400"
                        }`}
                      ></div>
                      <div>
                        <p className="font-medium text-foreground">{activity.action}</p>
                        <p className="text-sm text-muted-foreground">User: {activity.user}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{activity.amount}</p>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            activity.status === "completed"
                              ? "bg-green-400/20 text-green-400"
                              : activity.status === "pending"
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
