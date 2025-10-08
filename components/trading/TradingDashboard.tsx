"use client"

import React, { useState, useMemo, useCallback, useEffect } from "react"
import { TrendingUp, Wallet, FileText, Eye, Loader2, RefreshCcw, Wifi, WifiOff, AlertCircle, Home } from "lucide-react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { usePortfolio, useUserWatchlist, useOrdersAndPositions } from "@/lib/hooks/use-trading-data"
import { MarketDataProvider, useMarketData } from "@/lib/hooks/MarketDataProvider"
import { useRealtimeOrders } from "@/lib/hooks/use-realtime-orders"
import { useRealtimePositions } from "@/lib/hooks/use-realtime-positions"
import { useRealtimeAccount } from "@/lib/hooks/use-realtime-account"
import { useRealtimeTest } from "@/lib/hooks/use-realtime-test"
import { OrderManagement } from "@/components/order-management"
import { PositionTracking } from "@/components/position-tracking"
import { Account } from "@/components/Account"
import { WatchlistManager } from "@/components/watchlist/WatchlistManager"
import { OrderDialog } from "@/components/OrderDialog"
import { TradingHome } from "@/components/trading/TradingHome"
import type {
  TradingDashboardProps,
  TabConfig,
  PnLData,
  IndexData,
  Stock,
  StockSelectHandler,
  OrderUpdateHandler,
  PositionUpdateHandler,
  WatchlistUpdateHandler,
  RefreshHandler,
  RetryHandler,
  OrderDialogCloseHandler,
  OrderPlacedHandler,
  IndexDisplayProps,
  LoadingScreenProps,
  ErrorScreenProps
} from "@/types/trading"

// Constants
const TAB_CONFIGS: TabConfig[] = [
  { id: "home", icon: Home, label: "Home" },
  { id: "watchlist", icon: Eye, label: "Watchlist" },
  { id: "orders", icon: FileText, label: "Orders" },
  { id: "positions", icon: TrendingUp, label: "Positions" },
  { id: "account", icon: Wallet, label: "Account" },
]

const INDEX_CONFIGS: IndexData[] = [
  { name: "NIFTY 50", instrumentId: "NSE_EQ-26000" },
  { name: "BANK NIFTY", instrumentId: "NSE_EQ-26009" },
]

// Loading Component
const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = "Please wait to rock and trade.." }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground mb-4">
      <TrendingUp className="h-4 w-4" />
    </div>
    <h1 className="text-xl font-semibold text-foreground mb-2">MarketPulse360</h1>
    <p className="text-sm text-muted-foreground mb-6">{message}</p>
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

// Error Component
const ErrorScreen: React.FC<ErrorScreenProps> = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive text-destructive-foreground mb-4">
      <AlertCircle className="h-4 w-4" />
    </div>
    <h1 className="text-xl font-semibold text-foreground mb-2">Error Loading Dashboard</h1>
    <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">{error}</p>
    {onRetry && (
      <Button onClick={onRetry} variant="outline">
        <RefreshCcw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    )}
  </div>
)

// Index Component
const IndexDisplay: React.FC<IndexDisplayProps> = React.memo(({ name, instrumentId, quotes, isLoading }) => {
  const quote = quotes?.[instrumentId]
  
  if (isLoading || !quote) {
    return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
  }
  
  const price = (quote as any)?.display_price ?? quote.last_trade_price
  const change = ((price - quote.prev_close_price) / quote.prev_close_price) * 100
  
  return (
    <div className="text-center">
      <span className="text-xs font-semibold text-muted-foreground">{name}</span>
      <p className={`text-sm font-mono font-bold ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
        ₹{price.toFixed(2)}
      </p>
    </div>
  )
})

IndexDisplay.displayName = "IndexDisplay"

// Main Trading Dashboard Component
const TradingDashboard: React.FC<TradingDashboardProps> = ({ userId, session }) => {
  // State
  const [currentTab, setCurrentTab] = useState<"home" | "watchlist" | "orders" | "positions" | "account">("home")
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [selectedStockForOrder, setSelectedStockForOrder] = useState<Stock | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Data hooks
  const { portfolio, isLoading: isPortfolioLoading, mutate: refreshPortfolio, error: portfolioError } = usePortfolio(userId)
  const { watchlist: watchlistData, isLoading: isWatchlistLoading, mutate: refetchWatchlist, error: watchlistError } = useUserWatchlist(userId)
  const { 
    orders: initialOrders, 
    positions: initialPositions, 
    isLoading: isOrdersPositionsLoading, 
    isError: isOrdersPositionsError, 
    mutate: refreshOrdersPositions,
    error: ordersPositionsError
  } = useOrdersAndPositions(userId)
  const { quotes, isLoading: isQuotesLoading } = useMarketData()

  // Realtime connection
  const { isConnected: isRealtimeConnected, lastMessage } = useRealtimeTest()

  // Get trading account ID early to avoid hoisting issues
  const tradingAccountId = useMemo(() => {
    return (portfolio as any)?.account?.id || null
  }, [portfolio])

  // Realtime subscriptions (only when we have tradingAccountId)
  const { 
    orders: realtimeOrdersData, 
    isLoading: isRealtimeOrdersLoading,
    error: realtimeOrdersError 
  } = useRealtimeOrders(tradingAccountId)
  const { 
    positions: realtimePositionsData, 
    isLoading: isRealtimePositionsLoading,
    error: realtimePositionsError 
  } = useRealtimePositions(tradingAccountId)
  const { 
    account: realtimeAccountData, 
    isLoading: isRealtimeAccountLoading,
    error: realtimeAccountError 
  } = useRealtimeAccount(tradingAccountId)

  // Unified data (realtime takes precedence)
  const orders = useMemo(() => {
    return realtimeOrdersData && realtimeOrdersData.length > 0 ? realtimeOrdersData : initialOrders
  }, [realtimeOrdersData, initialOrders])

  const positions = useMemo(() => {
    return realtimePositionsData && realtimePositionsData.length > 0 ? realtimePositionsData : initialPositions
  }, [realtimePositionsData, initialPositions])

  const accountUnified = useMemo(() => {
    return realtimeAccountData ? { account: realtimeAccountData } : portfolio
  }, [realtimeAccountData, portfolio])

  // Error handling
  useEffect(() => {
    const errors = [portfolioError, watchlistError, ordersPositionsError].filter(Boolean)
    if (errors.length > 0) {
      setError(errors[0]?.message || "An error occurred while loading trading data")
    } else {
      setError(null)
    }
  }, [portfolioError, watchlistError, ordersPositionsError])

  // Event handlers
  const handleSelectStock: StockSelectHandler = useCallback((stock: Stock) => {
    setSelectedStockForOrder(stock)
    setOrderDialogOpen(true)
  }, [])

  const handleRefreshAllData: RefreshHandler = useCallback(() => {
    try {
      refreshPortfolio()
      refetchWatchlist()
      refreshOrdersPositions()
      toast({ title: "Refreshed", description: "Trading data updated." })
    } catch (err) {
      toast({ 
        title: "Refresh Failed", 
        description: "Failed to refresh trading data. Please try again.",
        variant: "destructive"
      })
    }
  }, [refreshPortfolio, refetchWatchlist, refreshOrdersPositions])

  const handleRetry: RetryHandler = useCallback(() => {
    setError(null)
    handleRefreshAllData()
  }, [handleRefreshAllData])

  const handleCloseOrderDialog: OrderDialogCloseHandler = useCallback(() => {
    setOrderDialogOpen(false)
    setSelectedStockForOrder(null)
  }, [])

  const handleOrderPlaced: OrderPlacedHandler = useCallback(() => {
    refreshOrdersPositions()
    refreshPortfolio()
  }, [refreshOrdersPositions, refreshPortfolio])

  // P&L calculations
  const { totalPnL, dayPnL }: PnLData = useMemo(() => {
    if (!positions?.length) return { totalPnL: 0, dayPnL: 0 }
    
    let total = 0
    let day = 0
    
    positions.forEach((pos: any) => {
      const quote = quotes?.[pos.stock?.instrumentId]
      const ltp = quote?.last_trade_price ?? pos.averagePrice
      const diff = (ltp - pos.averagePrice) * pos.quantity
      total += diff
      day += (ltp - (pos.prevClosePrice ?? pos.averagePrice)) * pos.quantity
    })
    
    return { totalPnL: total, dayPnL: day }
  }, [positions, quotes])

  // Loading state
  const anyLoading = isPortfolioLoading || isWatchlistLoading || isOrdersPositionsLoading || isQuotesLoading

  // Debug logging (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('TradingDashboard Debug:', {
        tradingAccountId,
        isRealtimeConnected,
        realtimeOrders: realtimeOrdersData?.length || 0,
        realtimePositions: realtimePositionsData?.length || 0,
        hasRealtimeAccount: !!realtimeAccountData,
        lastMessage,
        currentTab,
        anyLoading,
        error
      })
    }
  }, [tradingAccountId, isRealtimeConnected, realtimeOrdersData, realtimePositionsData, realtimeAccountData, lastMessage, currentTab, anyLoading, error])

  // Error state
  if (error) {
    return <ErrorScreen error={error} onRetry={handleRetry} />
  }

  // Render content based on current tab
  const renderContent = () => {
    if (anyLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p>Loading your trading data...</p>
        </div>
      )
    }

    switch (currentTab) {
      case "home":
        return (
          <TradingHome 
            userName={session?.user?.name}
            session={session}
            portfolio={portfolio}
          />
        )
      case "watchlist":
        return (
          <WatchlistManager 
            quotes={quotes as any} 
            onSelectStock={handleSelectStock}
            onQuickBuy={handleSelectStock}
            onQuickSell={handleSelectStock}
          />
        )
      case "orders":
        return (
          <OrderManagement 
            orders={orders} 
            onOrderUpdate={refreshOrdersPositions} 
          />
        )
      case "positions":
        return (
          <div className="space-y-4 pb-20">
            {/* <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Day's MTM</p>
                  <p className={`text-lg font-semibold ${dayPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {dayPnL >= 0 ? "+" : ""}₹{dayPnL.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total P&L</p>
                  <p className={`text-lg font-semibold ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {totalPnL >= 0 ? "+" : ""}₹{totalPnL.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div> */}
            <PositionTracking 
              positions={positions} 
              quotes={quotes} 
              onPositionUpdate={refreshOrdersPositions} 
              tradingAccountId={tradingAccountId} 
            />
          </div>
        )
      case "account":
        return (
          <Account 
            portfolio={accountUnified} 
            user={session?.user} 
            onUpdate={handleRefreshAllData} 
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 w-screen">
        <div className="flex h-16 items-center justify-between px-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h1 className="text-base md:text-lg font-semibold text-foreground">
              MarketPulse360
            </h1>
          </div>
          <div className="flex items-center gap-4">
            {INDEX_CONFIGS.map(({ name, instrumentId }) => (
              <IndexDisplay
                key={instrumentId}
                name={name}
                instrumentId={instrumentId}
                quotes={quotes as any}
                isLoading={isQuotesLoading}
              />
            ))}
            {/* Realtime connection indicator */}
            <div className="flex items-center gap-1 text-xs">
              {isRealtimeConnected ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-gray-400" />
              )}
              <span className="text-muted-foreground">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pt-4 max-w-4xl mx-auto">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="grid grid-cols-5 gap-1 p-2 max-w-4xl mx-auto">
          {TAB_CONFIGS.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              onClick={() => setCurrentTab(id)}
              variant="ghost"
              className={`flex flex-col items-center justify-center gap-2 rounded-xl py-3 px-1 transition-all duration-150 shadow-sm ${
                currentTab === id 
                  ? "text-primary bg-primary/10 font-semibold shadow-lg" 
                  : "text-muted-foreground hover:text-primary"
              }`}
              style={{ minWidth: 0, minHeight: 0, borderRadius: 16 }}
            >
              <Icon className="h-5 w-5 mt-1" />
              <span className="text-sm font-medium tracking-wide" style={{ letterSpacing: 0.2 }}>
                {label}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {/* Order Dialog */}
      <OrderDialog
        isOpen={orderDialogOpen}
        onClose={handleCloseOrderDialog}
        stock={selectedStockForOrder}
        portfolio={accountUnified}
        drawer
        onOrderPlaced={handleOrderPlaced}
        session={session}
      />
    </div>
  )
}

// Wrapper Component with Session Management
const TradingDashboardWrapper: React.FC = () => {
  const { data: session, status } = useSession()
  const userId = session?.user?.id as string | undefined

  if (status === "loading") {
    return <LoadingScreen />
  }

  if (!userId) {
    return <LoadingScreen />
  }

  return (
    <MarketDataProvider
      config={{ 
        jitter: { 
          enabled: true, 
          interval: 450, 
          intensity: 0.2, 
          convergence: 0.2 
        }, 
        interpolation: { 
          enabled: true, 
          steps: 50, 
          duration: 4500 
        },
        deviation: {
          enabled: true, 
          percentage: 0.7, 
          absolute: 0.5 
        }
      }}      
      userId={userId}
    >
      <TradingDashboard userId={userId} session={session} />
    </MarketDataProvider>
  )
}

export default TradingDashboardWrapper
