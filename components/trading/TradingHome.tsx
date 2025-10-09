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
  BarChart4
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
import { isMarketOpen as checkMarketOpen } from "@/lib/hooks/market-timing"
const MarketStatus = () => {
  const [open, setOpen] = React.useState<boolean>(checkMarketOpen())
  React.useEffect(() => {
    const t = setInterval(() => setOpen(checkMarketOpen()), 15000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
      open ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'
    }`}>
      <div className={`w-2 h-2 rounded-full ${open ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
      <span className="text-xs font-semibold">
        {open ? 'Market Open' : 'Market Closed'}
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

// Market Stats Component Enhanced
const MarketStats = () => {
  const stats = [
    { 
      label: 'FII', 
      value: '+₹2,450 Cr', 
      subtext: 'Net Buy',
      icon: Globe,
      color: 'green',
      trend: 'up'
    },
    { 
      label: 'DII', 
      value: '-₹850 Cr', 
      subtext: 'Net Sell',
      icon: Building2,
      color: 'red',
      trend: 'down'
    },
    { 
      label: 'PCR', 
      value: '1.15', 
      subtext: 'Put-Call',
      icon: PieChart,
      color: 'blue',
      trend: 'neutral'
    },
    { 
      label: 'VIX', 
      value: '14.25', 
      subtext: 'Volatility',
      icon: Activity,
      color: 'orange',
      trend: 'down'
    },
  ]
  
  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: idx * 0.1 }}
        >
          <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/30 transition-all">
            <CardContent className="p-3">
              <div className="flex items-start justify-between mb-2">
                <div className={`p-2 rounded-lg bg-${stat.color}-500/10`}>
                  <stat.icon className={`h-4 w-4 text-${stat.color}-600`} />
                </div>
                {stat.trend === 'up' && <ArrowUpRight className="h-4 w-4 text-green-500" />}
                {stat.trend === 'down' && <ArrowDownRight className="h-4 w-4 text-red-500" />}
              </div>
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-lg font-bold text-foreground mb-0.5">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.subtext}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

// Sector Performance Component
const SectorPerformance = () => {
  const sectors = [
    { name: 'IT', change: 2.45, icon: '💻' },
    { name: 'Banking', change: 1.87, icon: '🏦' },
    { name: 'Pharma', change: -0.65, icon: '💊' },
    { name: 'Auto', change: 1.23, icon: '🚗' },
    { name: 'FMCG', change: 0.89, icon: '🛒' },
    { name: 'Energy', change: -1.12, icon: '⚡' },
  ]
  
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart4 className="h-4 w-4 text-primary" />
            Sector Performance
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            View All <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sectors.map((sector, idx) => (
            <motion.div
              key={sector.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{sector.icon}</span>
                <span className="text-sm font-medium text-foreground">{sector.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-20 h-1.5 rounded-full bg-muted overflow-hidden`}>
                  <div 
                    className={`h-full ${sector.change >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(Math.abs(sector.change) * 20, 100)}%` }}
                  ></div>
                </div>
                <span className={`text-sm font-bold min-w-[60px] text-right ${
                  sector.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {sector.change >= 0 ? '+' : ''}{sector.change}%
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
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

// Top Movers Component Enhanced
const TopMovers = () => {
  const gainers = [
    { symbol: "RELIANCE", name: "Reliance Ind.", change: 3.45, price: 2456.75, volume: "High", badge: "🔥" },
    { symbol: "TCS", name: "Tata Consultancy", change: 2.87, price: 3678.90, volume: "High", badge: "⚡" },
    { symbol: "HDFCBANK", name: "HDFC Bank", change: 2.34, price: 1567.40, volume: "Med", badge: "" },
    { symbol: "INFY", name: "Infosys Ltd", change: 2.15, price: 1456.30, volume: "High", badge: "🔥" },
  ]

  const losers = [
    { symbol: "BHARTIARTL", name: "Bharti Airtel", change: -2.67, price: 1234.50, volume: "High", badge: "⚠️" },
    { symbol: "WIPRO", name: "Wipro Ltd", change: -1.98, price: 456.80, volume: "Med", badge: "" },
    { symbol: "ITC", name: "ITC Ltd", change: -1.45, price: 345.20, volume: "Low", badge: "" },
  ]

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUpDown className="h-4 w-4 text-primary" />
            Top Movers
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            View All <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gainers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded bg-green-500/20">
              <ArrowUpRight className="h-3.5 w-3.5 text-green-600" />
            </div>
            <h4 className="text-sm font-semibold text-green-600">Top Gainers</h4>
          </div>
          <div className="space-y-2">
            {gainers.map((stock, idx) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-green-500/5 border border-green-500/20 hover:border-green-500/40 transition-all cursor-pointer group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{stock.symbol}</p>
                    {stock.badge && <span className="text-xs">{stock.badge}</span>}
                    <Badge variant="outline" className="text-xs h-4 px-1">{stock.volume} Vol</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{stock.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">₹{stock.price}</p>
                  <p className="text-xs font-semibold text-green-600">+{stock.change}%</p>
                </div>
                <Button size="sm" variant="ghost" className="ml-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ShoppingCart className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Losers */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded bg-red-500/20">
              <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
            </div>
            <h4 className="text-sm font-semibold text-red-600">Top Losers</h4>
          </div>
          <div className="space-y-2">
            {losers.map((stock, idx) => (
              <motion.div
                key={stock.symbol}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer group"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{stock.symbol}</p>
                    {stock.badge && <span className="text-xs">{stock.badge}</span>}
                    <Badge variant="outline" className="text-xs h-4 px-1">{stock.volume} Vol</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{stock.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">₹{stock.price}</p>
                  <p className="text-xs font-semibold text-red-600">{stock.change}%</p>
                </div>
                <Button size="sm" variant="ghost" className="ml-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ShoppingCart className="h-3.5 w-3.5" />
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// IPO & Events Component
const IPOAndEvents = () => {
  const ipos = [
    { name: "TechCorp India", date: "Oct 15-17", price: "₹320-350", status: "Open", type: "Mainboard" },
    { name: "GreenEnergy Ltd", date: "Oct 20-22", price: "₹180-200", status: "Upcoming", type: "SME" },
  ]
  
  const events = [
    { company: "RELIANCE", event: "Results", date: "Oct 18", impact: "High" },
    { company: "TCS", event: "Dividend", date: "Oct 22", impact: "Medium" },
  ]
  
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            IPOs & Events
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            Calendar <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* IPOs */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <Award className="h-3 w-3" /> Upcoming IPOs
          </h4>
          <div className="space-y-2">
            {ipos.map((ipo, idx) => (
              <motion.div
                key={ipo.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="p-3 rounded-lg bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/20"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{ipo.name}</p>
                    <p className="text-xs text-muted-foreground">{ipo.date}</p>
                  </div>
                  <Badge className={ipo.status === 'Open' ? 'bg-green-500' : 'bg-blue-500'}>{ipo.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Price: <span className="font-semibold text-foreground">{ipo.price}</span></span>
                  <Badge variant="outline" className="text-xs h-4">{ipo.type}</Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        <Separator />
        
        {/* Events */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">Corporate Actions</h4>
          <div className="space-y-2">
            {events.map((event, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium text-foreground">{event.company}</p>
                  <p className="text-xs text-muted-foreground">{event.event} • {event.date}</p>
                </div>
                <Badge variant={event.impact === 'High' ? 'destructive' : 'secondary'} className="text-xs">
                  {event.impact}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Market News Component Enhanced
const MarketNews = () => {
  const news = [
    {
      id: 1,
      title: "Nifty 50 hits new all-time high amid strong Q3 earnings season",
      source: "Economic Times",
      time: "2 hours ago",
      category: "Markets",
      image: "📈",
      priority: "high"
    },
    {
      id: 2,
      title: "RBI maintains repo rate at 6.5%, outlook remains stable",
      source: "Moneycontrol",
      time: "4 hours ago",
      category: "Economy",
      image: "🏦",
      priority: "medium"
    },
    {
      id: 3,
      title: "FII inflows surge to record high in January 2025",
      source: "Business Standard",
      time: "5 hours ago",
      category: "Markets",
      image: "💰",
      priority: "medium"
    },
    {
      id: 4,
      title: "IT sector sees strong growth on global demand recovery",
      source: "Live Mint",
      time: "6 hours ago",
      category: "Sectors",
      image: "💻",
      priority: "low"
    },
  ]

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-primary" />
            Market News
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            More <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {news.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                item.priority === 'high' 
                  ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 hover:border-primary/50' 
                  : 'bg-muted/30 border-border/50 hover:border-primary/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{item.image}</span>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium text-foreground line-clamp-2 flex-1">{item.title}</h4>
                    {item.priority === 'high' && <Badge variant="destructive" className="text-xs shrink-0">Breaking</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{item.source}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{item.time}</span>
                    </div>
                    <span>•</span>
                    <Badge variant="outline" className="text-xs h-4">{item.category}</Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <TickerTape />
      </motion.div>

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

      {/* Market Stats (FII, DII, PCR, VIX) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <MarketStats />
      </motion.div>

      {/* Advanced Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <AdvancedChart />
      </motion.div>

      {/* Market Heat Map */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <MarketHeatMap />
      </motion.div>

      {/* Sector Performance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <SectorPerformance />
      </motion.div>

      {/* Top Movers Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.45 }}
      >
        <TopMovers />
      </motion.div>

      {/* IPO & Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <IPOAndEvents />
      </motion.div>

      {/* Stock Screener */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
      >
        <StockScreener />
      </motion.div>

      {/* Market News Enhanced */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <MarketNews />
      </motion.div>
    </div>
  )
}

export default TradingHome
