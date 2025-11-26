"use client"

import React, { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  BarChart3,
  Newspaper,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Zap,
  Target,
  PieChart,
  Flame,
  TrendingUpDown,
  Calendar,
  AlertCircle,
  Globe,
  Building2,
  Users,
  Award,
  ChevronRight,
  ArrowRight,
  RefreshCw,
  ShoppingCart,
  Wallet,
  LineChart,
  BarChart4,
  Bell,
  History,
  Star
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { PnLData } from "@/types/trading"

// TradingView Widget Types
declare global {
  interface Window {
    TradingView: any
  }
}

interface TradingHomeProps {
  userName?: string
  session?: any
  portfolio?: any
  pnl?: PnLData
}

// Market Status Component (centralized timing)
import { getMarketSession, isMarketOpen as checkMarketOpen } from "@/lib/hooks/market-timing"
const MarketStatus = () => {
  const [session, setSession] = React.useState<'open' | 'pre-open' | 'closed'>(getMarketSession())
  React.useEffect(() => {
    const t = setInterval(() => setSession(getMarketSession()), 15000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
      session === 'open' ? 'bg-green-500/20 text-green-600' : session === 'pre-open' ? 'bg-yellow-500/20 text-yellow-700' : 'bg-red-500/20 text-red-600'
    }`}>
      <div className={`w-2 h-2 rounded-full ${session === 'open' ? 'bg-green-500 animate-pulse' : session === 'pre-open' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
      <span className="text-xs font-semibold">
        {session === 'open' ? 'Market Open' : session === 'pre-open' ? 'Pre-Open' : 'Market Closed'}
      </span>
    </div>
  )
}

// Portfolio Summary Component with Real Data
const PortfolioSummary = ({ portfolio, pnl }: { portfolio?: any, pnl?: PnLData }) => {
  const totalPnL = Number(pnl?.totalPnL ?? 0)
  const dayPnL = Number(pnl?.dayPnL ?? 0)
  const invested = Number(
    // Prefer balance; fall back to totalValue if balance is unavailable
    (portfolio?.account?.balance ?? portfolio?.account?.totalValue ?? 0)
  )
  const currentValue = invested + totalPnL
  const returnsNumber = invested > 0 ? (totalPnL / invested) * 100 : 0
  const returns = returnsNumber.toFixed(2)

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[PortfolioSummary] values', { invested, totalPnL, dayPnL, currentValue, returns: returnsNumber })
    }
  }, [invested, totalPnL, dayPnL, currentValue, returnsNumber])
  
  return (
    <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/30 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Wallet className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Portfolio Value</p>
              <p className="text-xl font-bold text-foreground">₹{currentValue.toLocaleString('en-IN')}</p>
            </div>
          </div>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Today's P&L</p>
            <p className={`text-sm font-bold ${dayPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {dayPnL >= 0 ? '+' : ''}₹{Math.abs(dayPnL).toFixed(2)}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Total P&L</p>
            <p className={`text-sm font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnL >= 0 ? '+' : ''}₹{Math.abs(totalPnL).toFixed(2)}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Returns</p>
            <p className={`text-sm font-bold ${parseFloat(returns) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(returns) >= 0 ? '+' : ''}{returns}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Actions Component
const QuickActions = () => {
  const actions = [
    { icon: TrendingUp, label: 'Buy', color: 'green', gradient: 'from-green-500/20 to-green-600/10' },
    { icon: TrendingDown, label: 'Sell', color: 'red', gradient: 'from-red-500/20 to-red-600/10' },
    { icon: Target, label: 'SIP', color: 'blue', gradient: 'from-blue-500/20 to-blue-600/10' },
    { icon: BarChart3, label: 'Options', color: 'purple', gradient: 'from-purple-500/20 to-purple-600/10' },
  ]
  
  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((action, idx) => (
        <motion.div
          key={action.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: idx * 0.05 }}
        >
          <Button
            variant="ghost"
            className={`h-auto flex-col gap-2 p-3 w-full bg-gradient-to-br ${action.gradient} hover:scale-105 transition-transform border border-border/50`}
          >
            <action.icon className={`h-5 w-5 text-${action.color}-600`} />
            <span className="text-xs font-semibold">{action.label}</span>
          </Button>
        </motion.div>
      ))}
    </div>
  )
}

// Advanced TradingView Chart Widget
const AdvancedChart = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadScript = () => {
      try {
        if (document.getElementById('tradingview-advanced-chart')) return
        if (!containerRef.current) {
          console.error('[AdvancedChart] containerRef is null; aborting inject')
          return
        }

        const script = document.createElement('script')
        script.id = 'tradingview-advanced-chart'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
        script.async = true

        const config = {
          autosize: true,
          // Use free, globally accessible index CFD for reliability
          symbol: 'FOREXCOM:SPXUSD',
          interval: 'D',
          timezone: 'America/New_York',
          theme: 'light',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          backgroundColor: 'rgba(255, 255, 255, 1)',
          gridColor: 'rgba(240, 243, 250, 1)',
          allow_symbol_change: true,
          calendar: false,
          support_host: 'https://www.tradingview.com'
        }

        console.info('[AdvancedChart] injecting TradingView advanced chart', config)
        script.innerHTML = JSON.stringify(config)
        containerRef.current.appendChild(script)
      } catch (err) {
        console.error('[AdvancedChart] failed to inject widget', err)
      }
    }

    const timer = setTimeout(loadScript, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Live Chart</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={containerRef} className="tradingview-widget-container" style={{ height: '400px' }}>
          <div className="tradingview-widget-container__widget" style={{ height: 'calc(100% - 32px)', width: '100%' }}></div>
        </div>
      </CardContent>
    </Card>
  )
}

// Market Heat Map Widget
const MarketHeatMap = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadScript = () => {
      try {
        if (document.getElementById('tradingview-heatmap')) return
        if (!containerRef.current) {
          console.error('[MarketHeatMap] containerRef is null; aborting inject')
          return
        }

        const script = document.createElement('script')
        script.id = 'tradingview-heatmap'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-stock-heatmap.js'
        script.async = true

        const config = {
          // Show US market heatmap (free and broadly accessible)
          exchanges: ['NYSE', 'NASDAQ'],
          dataSource: 'S&P500',
          grouping: 'sector',
          blockSize: 'market_cap_basic',
          blockColor: 'change',
          locale: 'en',
          symbolUrl: '',
          colorTheme: 'light',
          hasTopBar: false,
          isDataSetEnabled: false,
          isZoomEnabled: true,
          hasSymbolTooltip: true,
          width: '100%',
          height: '400'
        }

        console.info('[MarketHeatMap] injecting TradingView heatmap', config)
        script.innerHTML = JSON.stringify(config)
        containerRef.current.appendChild(script)
      } catch (err) {
        console.error('[MarketHeatMap] failed to inject widget', err)
      }
    }

    const timer = setTimeout(loadScript, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Market Heat Map
          </CardTitle>
          <Badge variant="secondary" className="text-xs">Live</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={containerRef} className="tradingview-widget-container">
          <div className="tradingview-widget-container__widget"></div>
        </div>
      </CardContent>
    </Card>
  )
}

// Stock Screener Widget
const StockScreener = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadScript = () => {
      try {
        if (document.getElementById('tradingview-screener')) return
        if (!containerRef.current) {
          console.error('[StockScreener] containerRef is null; aborting inject')
          return
        }

        const script = document.createElement('script')
        script.id = 'tradingview-screener'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-screener.js'
        script.async = true

        const config = {
          width: '100%',
          height: 490,
          defaultColumn: 'overview',
          defaultScreen: 'most_capitalized',
          // Use US market for broad coverage
          market: 'america',
          showToolbar: true,
          colorTheme: 'light',
          locale: 'en'
        }

        console.info('[StockScreener] injecting TradingView screener', config)
        script.innerHTML = JSON.stringify(config)
        containerRef.current.appendChild(script)
      } catch (err) {
        console.error('[StockScreener] failed to inject widget', err)
      }
    }

    const timer = setTimeout(loadScript, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Stock Screener</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={containerRef} className="tradingview-widget-container">
          <div className="tradingview-widget-container__widget"></div>
        </div>
      </CardContent>
    </Card>
  )
}

// TradingView Ticker Tape Widget
const TickerTape = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadScript = () => {
      try {
        if (document.getElementById('tradingview-ticker-script')) return
        if (!containerRef.current) {
          console.error('[TickerTape] containerRef is null; aborting inject')
          return
        }

        const script = document.createElement('script')
        script.id = 'tradingview-ticker-script'
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js'
        script.async = true

        const config = {
          symbols: [
            // Broad US indices via free providers
            { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
            { proName: 'FOREXCOM:NSXUSD', title: 'NASDAQ 100' },
            { proName: 'FOREXCOM:DJI', title: 'Dow 30' },
            // Major ETFs and mega-cap stocks
            { proName: 'AMEX:SPY', title: 'SPY' },
            { proName: 'NASDAQ:AAPL', title: 'AAPL' },
            { proName: 'NASDAQ:MSFT', title: 'MSFT' },
            { proName: 'NASDAQ:AMZN', title: 'AMZN' },
            { proName: 'NASDAQ:GOOGL', title: 'GOOGL' },
            { proName: 'NASDAQ:NVDA', title: 'NVDA' },
            { proName: 'NASDAQ:TSLA', title: 'TSLA' },
            // Global market indicators
            { proName: 'TVC:DXY', title: 'DXY' },
            { proName: 'TVC:VIX', title: 'VIX' }
          ],
          showSymbolLogo: true,
          colorTheme: 'light',
          isTransparent: true,
          displayMode: 'adaptive',
          locale: 'en'
        }

        console.info('[TickerTape] injecting TradingView ticker', config)
        script.innerHTML = JSON.stringify(config)
        containerRef.current.appendChild(script)
      } catch (err) {
        console.error('[TickerTape] failed to inject widget', err)
      }
    }

    const timer = setTimeout(loadScript, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="w-full overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm">
      <div ref={containerRef} className="tradingview-widget-container h-[58px]">
        <div className="tradingview-widget-container__widget"></div>
      </div>
    </div>
  )
}

// Main Trading Home Component
export const TradingHome: React.FC<TradingHomeProps> = ({ userName, session, portfolio, pnl }) => {
  const displayName = userName || session?.user?.name || "Trader"
  const currentTime = new Date().toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })
  const [widgetConfig, setWidgetConfig] = useState({
    tickerTape: true,
    chart: true,
    heatmap: true,
    screener: false,
  })

  useEffect(() => {
    // Fetch admin configuration for widget visibility (only for TradingView widgets)
    const fetchConfig = async () => {
      try {
        const response = await fetch('/api/market-data/home-config')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.config?.enabledWidgets) {
            setWidgetConfig({
              tickerTape: data.config.enabledWidgets.tickerTape ?? true,
              chart: data.config.enabledWidgets.chart ?? true,
              heatmap: data.config.enabledWidgets.heatmap ?? true,
              screener: data.config.enabledWidgets.screener ?? false,
            })
          }
        }
      } catch (error) {
        console.error('[TradingHome] Error fetching widget config:', error)
      }
    }
    fetchConfig()
  }, [])

  return (
    <div className="space-y-4 pb-20">
      {/* Welcome Section with Market Status */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/30 backdrop-blur-sm shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <p className="text-sm text-muted-foreground">Welcome back,</p>
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  Hello {displayName}! 👋
                </h2>
                <p className="text-sm text-muted-foreground">
                  Let's make today profitable! 🚀
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {currentTime}
                </Badge>
                <MarketStatus />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* TradingView Ticker Tape */}
      {widgetConfig.tickerTape && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <TickerTape />
        </motion.div>
      )}

      {/* Portfolio Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <PortfolioSummary portfolio={portfolio} pnl={pnl} />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <QuickActions />
      </motion.div>

      {/* Advanced Chart */}
      {widgetConfig.chart && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <AdvancedChart />
        </motion.div>
      )}

      {/* Market Heat Map */}
      {widgetConfig.heatmap && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <MarketHeatMap />
        </motion.div>
      )}

      {/* Stock Screener */}
      {widgetConfig.screener && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
        >
          <StockScreener />
        </motion.div>
      )}

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.65 }}
      >
        <RecentActivity />
      </motion.div>

      {/* Market Alerts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.7 }}
      >
        <MarketAlerts />
      </motion.div>

      {/* Quick Access Stocks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.75 }}
      >
        <QuickAccessStocks />
      </motion.div>
    </div>
  )
}

// Recent Activity Component
const RecentActivity = () => {
  const [activities, setActivities] = useState<Array<{ id: string; type: string; symbol: string; action: string; time: string; amount?: number }>>([])

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        // Fetch recent orders/positions activity
        const response = await fetch('/api/trading/orders/list?limit=5')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.orders) {
            const recentActivities = data.orders.slice(0, 5).map((order: any) => ({
              id: order.id,
              type: order.side,
              symbol: order.symbol || order.instrumentSymbol || 'N/A',
              action: `${order.side} ${order.quantity} ${order.symbol || ''}`,
              time: new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
              amount: order.price * order.quantity,
            }))
            setActivities(recentActivities)
          }
        }
      } catch (error) {
        console.error('[RecentActivity] Error fetching activity:', error)
      }
    }
    fetchActivity()
    const interval = setInterval(fetchActivity, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  if (activities.length === 0) {
    return null
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Recent Activity
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            View All <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {activities.map((activity, idx) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded ${activity.type === 'BUY' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                  {activity.type === 'BUY' ? (
                    <TrendingUp className={`h-3 w-3 ${activity.type === 'BUY' ? 'text-green-600' : 'text-red-600'}`} />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{activity.symbol}</p>
                  <p className="text-xs text-muted-foreground">{activity.action}</p>
                </div>
              </div>
              <div className="text-right">
                {activity.amount && (
                  <p className="text-sm font-bold text-foreground">₹{activity.amount.toLocaleString('en-IN')}</p>
                )}
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Market Alerts Component
const MarketAlerts = () => {
  const [alerts, setAlerts] = useState<Array<{ id: string; type: string; message: string; time: string; priority: string }>>([])

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        // Fetch market alerts (price alerts, circuit breakers, etc.)
        // For now, using mock data - integrate with real alerts API
        const mockAlerts = [
          {
            id: '1',
            type: 'price',
            message: 'RELIANCE crossed ₹2,500',
            time: '5 min ago',
            priority: 'high',
          },
          {
            id: '2',
            type: 'volume',
            message: 'High volume detected in TCS',
            time: '15 min ago',
            priority: 'medium',
          },
        ]
        setAlerts(mockAlerts)
      } catch (error) {
        console.error('[MarketAlerts] Error fetching alerts:', error)
      }
    }
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (alerts.length === 0) {
    return null
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Market Alerts
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            Manage <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={`p-3 rounded-lg border ${
                alert.priority === 'high'
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                </div>
                {alert.priority === 'high' && (
                  <Badge variant="destructive" className="text-xs">High</Badge>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Quick Access Stocks Component
const QuickAccessStocks = () => {
  const [quickStocks, setQuickStocks] = useState<Array<{ symbol: string; name: string; price: number; change: number }>>([])

  useEffect(() => {
    const fetchQuickStocks = async () => {
      try {
        // Fetch frequently traded stocks or user's watchlist
        const response = await fetch('/api/market-data/home-config')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.config?.tickerTapeSymbols) {
            // Use first 4 symbols from ticker tape as quick access
            const symbols = data.config.tickerTapeSymbols.slice(0, 4)
            // Fetch prices for these symbols (mock for now - integrate with real quotes)
            const stocks = symbols.map((sym: string) => ({
              symbol: sym.split(':')[1] || sym,
              name: sym.split(':')[1] || sym,
              price: Math.random() * 5000 + 1000,
              change: (Math.random() - 0.5) * 5,
            }))
            setQuickStocks(stocks)
          }
        }
      } catch (error) {
        console.error('[QuickAccessStocks] Error fetching quick stocks:', error)
      }
    }
    fetchQuickStocks()
  }, [])

  if (quickStocks.length === 0) {
    return null
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" />
            Quick Access
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            Customize <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickStocks.map((stock, idx) => (
            <motion.div
              key={stock.symbol}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="p-3 rounded-lg bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 hover:border-primary/40 transition-all cursor-pointer"
            >
              <p className="text-sm font-semibold text-foreground mb-1">{stock.symbol}</p>
              <p className="text-xs text-muted-foreground mb-2">{stock.name}</p>
              <p className="text-lg font-bold text-foreground mb-1">₹{stock.price.toFixed(2)}</p>
              <p className={`text-xs font-semibold ${stock.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stock.change >= 0 ? '+' : ''}{stock.change.toFixed(2)}%
              </p>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default TradingHome
