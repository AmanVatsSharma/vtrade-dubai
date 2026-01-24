/**
 * @file TradingHome.tsx
 * @module components/trading
 * @description Trading dashboard Home tab: internal widgets (ticker, chart, heatmap, screener) without external embeds.
 * @author BharatERP
 * @created 2026-01-24
 */

"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronRight, Clock, BarChart3, Target, TrendingDown, TrendingUp } from "lucide-react"
import type { PnLData } from "@/types/trading"
import { getMarketSession } from "@/lib/hooks/market-timing"
import { useUserWatchlist } from "@/lib/hooks/use-trading-data"
import { INDEX_INSTRUMENTS } from "@/lib/market-data/utils/instrumentMapper"
import { TickerBar } from "@/components/trading/widgets/ticker-bar"
import { PriceChart } from "@/components/trading/widgets/price-chart"
import { MarketHeatmap } from "@/components/trading/widgets/market-heatmap"
import { ScreenerLite } from "@/components/trading/widgets/screener-lite"

interface TradingHomeProps {
  userName?: string
  session?: any
  portfolio?: any
  pnl?: PnLData
}

const MarketStatus = () => {
  const [session, setSession] = useState<"open" | "pre-open" | "closed">(getMarketSession())
  useEffect(() => {
    const t = setInterval(() => setSession(getMarketSession()), 15000)
    return () => clearInterval(t)
  }, [])

  const cls =
    session === "open"
      ? "bg-green-500/20 text-green-600"
      : session === "pre-open"
        ? "bg-yellow-500/20 text-yellow-700"
        : "bg-red-500/20 text-red-600"

  const dot =
    session === "open"
      ? "bg-green-500 animate-pulse"
      : session === "pre-open"
        ? "bg-yellow-500"
        : "bg-red-500"

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${cls}`}>
      <div className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-xs font-semibold">
        {session === "open" ? "Market Open" : session === "pre-open" ? "Pre-Open" : "Market Closed"}
      </span>
    </div>
  )
}

const PortfolioSummary = ({ portfolio, pnl }: { portfolio?: any; pnl?: PnLData }) => {
  const totalPnL = Number(pnl?.totalPnL ?? 0)
  const dayPnL = Number(pnl?.dayPnL ?? 0)
  const invested = Number(portfolio?.account?.balance ?? portfolio?.account?.totalValue ?? 0)
  const currentValue = invested + totalPnL
  const returnsNumber = invested > 0 ? (totalPnL / invested) * 100 : 0

  return (
    <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/30 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Portfolio Value</p>
            <p className="text-xl font-bold text-foreground">₹{currentValue.toLocaleString("en-IN")}</p>
          </div>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" aria-label="Open portfolio">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Today</p>
            <p className={`text-sm font-bold ${dayPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {dayPnL >= 0 ? "+" : ""}₹{Math.abs(dayPnL).toFixed(2)}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className={`text-sm font-bold ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalPnL >= 0 ? "+" : ""}₹{Math.abs(totalPnL).toFixed(2)}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-background/50">
            <p className="text-xs text-muted-foreground mb-1">Returns</p>
            <p className={`text-sm font-bold ${returnsNumber >= 0 ? "text-green-600" : "text-red-600"}`}>
              {returnsNumber >= 0 ? "+" : ""}
              {returnsNumber.toFixed(2)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const QuickActions = () => {
  const actions = [
    { icon: TrendingUp, label: "Buy", color: "text-green-600", gradient: "from-green-500/20 to-green-600/10" },
    { icon: TrendingDown, label: "Sell", color: "text-red-600", gradient: "from-red-500/20 to-red-600/10" },
    { icon: Target, label: "SIP", color: "text-blue-600", gradient: "from-blue-500/20 to-blue-600/10" },
    { icon: BarChart3, label: "Options", color: "text-purple-600", gradient: "from-purple-500/20 to-purple-600/10" },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="ghost"
          className={`h-auto flex-col gap-2 p-3 w-full bg-gradient-to-br ${action.gradient} hover:scale-105 transition-transform border border-border/50`}
        >
          <action.icon className={`h-5 w-5 ${action.color}`} />
          <span className="text-xs font-semibold">{action.label}</span>
        </Button>
      ))}
    </div>
  )
}

export const TradingHome: React.FC<TradingHomeProps> = ({ userName, session, portfolio, pnl }) => {
  const displayName = userName || session?.user?.name || "Trader"
  const currentTime = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
  const userId = session?.user?.id as string | undefined

  const { watchlist } = useUserWatchlist(userId)

  const tickerItems = useMemo(() => {
    return [
      { label: "NIFTY 50", token: INDEX_INSTRUMENTS.NIFTY },
      { label: "BANK NIFTY", token: INDEX_INSTRUMENTS.BANKNIFTY },
    ]
  }, [])

  const heatmapItems = useMemo(() => {
    const wl = (watchlist?.items || []).filter((i: any) => i?.token).slice(0, 10)
    const wlItems = wl.map((i: any) => ({ label: i.symbol || i.name || "—", token: Number(i.token) }))
    return [
      { label: "NIFTY 50", token: INDEX_INSTRUMENTS.NIFTY },
      { label: "BANK NIFTY", token: INDEX_INSTRUMENTS.BANKNIFTY },
      ...wlItems,
    ]
  }, [watchlist])

  const chartSymbols = useMemo(() => {
    return [
      { key: "nifty", label: "NIFTY 50", token: INDEX_INSTRUMENTS.NIFTY },
      { key: "banknifty", label: "BANK NIFTY", token: INDEX_INSTRUMENTS.BANKNIFTY },
    ]
  }, [])

  return (
    <div className="space-y-4 pb-20">
      <Card className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-primary/30 backdrop-blur-sm shadow-lg">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Welcome back,</p>
              <h2 className="text-2xl font-bold text-foreground mt-1">Hello {displayName}</h2>
              <p className="text-sm text-muted-foreground mt-1">Your trading dashboard is ready.</p>
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

      <TickerBar items={tickerItems} />
      <PortfolioSummary portfolio={portfolio} pnl={pnl} />
      <QuickActions />
      <PriceChart symbols={chartSymbols} defaultSymbolKey="nifty" />
      <MarketHeatmap items={heatmapItems} />
      <ScreenerLite />
    </div>
  )
}

export default TradingHome

