"use client"

import React, { useState, useMemo, useCallback, useEffect } from "react"
import { TrendingUp, Wallet, FileText, Eye, Loader2, RefreshCcw, Wifi, WifiOff, AlertCircle, Home } from "lucide-react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { useMarketData } from "@/lib/market-data/providers/WebSocketMarketDataProvider"
import { WebSocketMarketDataProvider } from "@/lib/market-data/providers/WebSocketMarketDataProvider"
import { useRealtimeOrders } from "@/lib/hooks/use-realtime-orders"
import { useRealtimePositions } from "@/lib/hooks/use-realtime-positions"
import { useRealtimeAccount } from "@/lib/hooks/use-realtime-account"
import { OrderManagement } from "@/components/order-management"
import { PositionTracking } from "@/components/position-tracking"
import { Account } from "@/components/Account"
import { WatchlistManager } from "@/components/watchlist/WatchlistManager"
import { OrderDialog } from "@/components/OrderDialog"
import { TradingHome } from "@/components/trading/TradingHome"
import { RiskMonitor } from "@/components/risk/RiskMonitor"
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

// Index Component - Use display_price for live animated updates
const IndexDisplay: React.FC<IndexDisplayProps> = React.memo(({ name, instrumentId, quotes, isLoading }) => {
  // Parse token from instrumentId (format: "NSE_EQ-26000")
  const token = useMemo(() => {
    const parts = instrumentId.split('-');
    return parts.length === 2 ? parseInt(parts[1], 10) : null;
  }, [instrumentId]);
  
  // Quotes are keyed by token (as string), not instrumentId
  const quote = token ? quotes?.[token.toString()] : null;
  
  // Debug logging for index quotes
  useEffect(() => {
    if (quote && token) {
      console.log(`📊 [INDEX-DISPLAY] ${name} quote update`, {
        instrumentId,
        token,
        price: quote.last_trade_price,
        displayPrice: (quote as any)?.display_price,
      });
    }
  }, [quote, name, instrumentId, token]);
  
  if (isLoading || !quote) {
    return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
  }
  
  // Use display_price for live animated experience
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

  // Data hooks - Use only realtime hooks to avoid duplicate fetching
  // All hooks use SWR with deduplication, so same API calls are cached
  const { quotes, isLoading: isQuotesLoading, isConnected: wsConnectionState } = useMarketData()

  // Check if WebSocket is connected (for market data)
  const isWebSocketConnected = wsConnectionState === 'connected'

  // Realtime hooks - Single source of truth for all trading data
  const { 
    orders, 
    isLoading: isRealtimeOrdersLoading,
    error: realtimeOrdersError,
    mutate: mutateOrders,
    refresh: refreshOrders
  } = useRealtimeOrders(userId)
  
  const { 
    positions, 
    isLoading: isRealtimePositionsLoading,
    error: realtimePositionsError,
    mutate: mutatePositions,
    refresh: refreshPositions
  } = useRealtimePositions(userId)
  
  const { 
    account: realtimeAccountData, 
    isLoading: isRealtimeAccountLoading,
    error: realtimeAccountError,
    mutate: mutateAccount,
    refresh: refreshAccount
  } = useRealtimeAccount(userId)

  // Get trading account ID from realtime account data
  const tradingAccountId = useMemo(() => {
    return (session?.user as any)?.tradingAccountId || realtimeAccountData?.id || null
  }, [session, realtimeAccountData])

  // Portfolio data structure for compatibility
  const portfolio = useMemo(() => {
    if (!realtimeAccountData) return null
    return {
      account: {
        id: realtimeAccountData.id,
        totalValue: realtimeAccountData.balance || (realtimeAccountData.availableMargin + realtimeAccountData.usedMargin),
        availableMargin: realtimeAccountData.availableMargin,
        usedMargin: realtimeAccountData.usedMargin,
        balance: realtimeAccountData.balance,
        client_id: realtimeAccountData.clientId || ""
      }
    }
  }, [realtimeAccountData])

  const accountUnified = portfolio

  // Error handling
  useEffect(() => {
    const errors = [realtimeOrdersError, realtimePositionsError, realtimeAccountError].filter(Boolean)
    if (errors.length > 0) {
      setError(errors[0]?.message || "An error occurred while loading trading data")
    } else {
      setError(null)
    }
  }, [realtimeOrdersError, realtimePositionsError, realtimeAccountError])

  // Event handlers
  const handleSelectStock: StockSelectHandler = useCallback((stock: Stock) => {
    setSelectedStockForOrder(stock)
    setOrderDialogOpen(true)
  }, [])

  const handleRefreshAllData: RefreshHandler = useCallback(async () => {
    try {
      // Refresh all data in parallel
      await Promise.all([
        refreshOrders(),
        refreshPositions(),
        refreshAccount()
      ])
      toast({ title: "Refreshed", description: "Trading data updated." })
    } catch (err) {
      toast({ 
        title: "Refresh Failed", 
        description: "Failed to refresh trading data. Please try again.",
        variant: "destructive"
      })
    }
  }, [refreshOrders, refreshPositions, refreshAccount])

  const handleRetry: RetryHandler = useCallback(() => {
    setError(null)
    handleRefreshAllData()
  }, [handleRefreshAllData])

  const handleCloseOrderDialog: OrderDialogCloseHandler = useCallback(() => {
    setOrderDialogOpen(false)
    setSelectedStockForOrder(null)
  }, [])

  const handleOrderPlaced: OrderPlacedHandler = useCallback(async () => {
    // Refresh orders, positions, and account after order placement
    await Promise.all([
      refreshOrders(),
      refreshPositions(),
      refreshAccount()
    ])
  }, [refreshOrders, refreshPositions, refreshAccount])

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

  // Loading state (do not block UI render; use only for subtle indicators)
  const anyLoading = isRealtimeOrdersLoading || isRealtimePositionsLoading || isRealtimeAccountLoading || isQuotesLoading
  const anyRefreshing = false // SWR handles refreshing internally

  useEffect(() => {
    if (anyRefreshing) {
      console.info('[TradingDashboard] Refreshing data...')
    }
  }, [anyRefreshing])

  // Debug logging (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('TradingDashboard Debug:', {
        tradingAccountId,
        realtimeOrders: orders?.length || 0,
        realtimePositions: positions?.length || 0,
        hasRealtimeAccount: !!realtimeAccountData,
        currentTab,
        anyLoading,
        error
      })
    }
  }, [tradingAccountId, orders, positions, realtimeAccountData, currentTab, anyLoading, error])

  // Error state
  if (error) {
    return <ErrorScreen error={error} onRetry={handleRetry} />
  }

  // Render content based on current tab
  const renderContent = () => {
    switch (currentTab) {
      case "home":
        return (
          <div className="space-y-4">
            <RiskMonitor />
            <TradingHome 
              userName={session?.user?.name}
              session={session}
              portfolio={portfolio}
              pnl={{ totalPnL, dayPnL }}
            />
          </div>
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
            onOrderUpdate={refreshOrders} 
          />
        )
      case "positions":
        return (
          <div className="space-y-4 pb-20">
            <RiskMonitor compact={false} />
            <PositionTracking 
              positions={positions} 
              quotes={quotes} 
              onPositionUpdate={refreshPositions} 
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
      {/* Header - Responsive */}
      <header className="bg-card border-b border-border sticky top-0 z-40 w-screen backdrop-blur-lg bg-card/95">
        <div className="flex h-14 items-center justify-between px-3 sm:px-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm">
              <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
            <span className="text-sm sm:text-base font-semibold hidden xs:inline">MarketPulse360</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
            {INDEX_CONFIGS.map(({ name, instrumentId }) => (
              <IndexDisplay
                key={instrumentId}
                name={name}
                instrumentId={instrumentId}
                quotes={quotes as any}
                isLoading={isQuotesLoading}
              />
            ))}
            {/* WebSocket connection indicator */}
            <div className="flex items-center gap-1 text-xs">
              {isWebSocketConnected ? (
                <>
                  <Wifi className="h-3 w-3 text-green-500" />
                  <span className="text-green-600 hidden sm:inline">Live</span>
                </>
              ) : wsConnectionState === 'connecting' ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-yellow-500" />
                  <span className="text-yellow-600 hidden sm:inline">Connecting</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 text-red-500" />
                  <span className="text-red-600 hidden sm:inline">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Responsive */}
      <main className="px-3 sm:px-4 pt-3 sm:pt-4 pb-20 sm:pb-24 max-w-4xl mx-auto">
        {renderContent()}
      </main>

      {/* Bottom Navigation - Premium Style & Responsive */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-card via-card to-card/95 backdrop-blur-lg border-t border-border/50 shadow-2xl z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-5 gap-0 px-1 sm:px-2 py-1.5 sm:py-2 max-w-4xl mx-auto">
          {TAB_CONFIGS.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              onClick={() => setCurrentTab(id)}
              variant="ghost"
              className={`flex flex-col items-center justify-center gap-0.5 sm:gap-1 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-0.5 sm:px-1 transition-all duration-200 relative group ${
                currentTab === id 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-primary"
              }`}
              style={{ minWidth: 0, minHeight: 0 }}
            >
              {/* Premium indicator dot */}
              {currentTab === id && (
                <span className="absolute -top-0.5 right-1/2 translate-x-1/2 w-1 h-1 bg-primary rounded-full shadow-lg shadow-primary/50" />
              )}
              
              {/* Icon with premium gradient background when active */}
              <div className={`relative transition-all duration-200 ${
                currentTab === id ? 'scale-110' : 'group-hover:scale-105'
              }`}>
                {currentTab === id && (
                  <div className="absolute inset-0 bg-primary/10 rounded-lg blur-sm scale-125" />
                )}
                <Icon className={`h-4 w-4 sm:h-5 sm:w-5 relative z-10 ${
                  currentTab === id ? 'drop-shadow-lg' : ''
                }`} />
              </div>
              
              <span className={`text-[9px] sm:text-[10px] font-medium transition-all duration-200 ${
                currentTab === id ? 'font-semibold' : ''
              }`}>
                {label}
              </span>
            </Button>
          ))}
        </div>
        {/* Safe area spacer for iOS devices */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
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

  console.log('🚀 [TRADING-DASHBOARD] Using WebSocket Market Data Provider')

  return (
    <WebSocketMarketDataProvider
      userId={userId}
      enableWebSocket={true}
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
          enabled: false, 
          percentage: 0, 
          absolute: 0
        }
      }}
    >
      <TradingDashboard userId={userId} session={session} />
    </WebSocketMarketDataProvider>
  )
}

export default TradingDashboardWrapper
