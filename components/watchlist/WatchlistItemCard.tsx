/**
 * @file WatchlistItemCard.tsx
 * @description Enterprise-grade compact watchlist item with left swipe to delete
 */

"use client"

import React, { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  Bell, 
  BellOff,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  MoreVertical,
  BarChart3,
  Activity,
  X,
  LineChart,
  DollarSign
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { WatchlistItemData } from "@/lib/hooks/use-enhanced-watchlist"
import { MiniChart } from "@/components/charts/MiniChart"
import { AdvancedChart } from "@/components/charts/AdvancedChart"
import { buildMockCandles, candlesToLineSeries } from "@/lib/charts/mock-candles"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer"
import { formatExpiryDateIST, getCurrentISTDate } from "@/lib/date-utils"

interface MarketDepth {
  bid: Array<{ price: number; quantity: number }>
  ask: Array<{ price: number; quantity: number }>
}

interface OHLCData {
  open: number
  high: number
  low: number
  close: number
  volume: number
  turnover: number
}

interface ExtendedQuote {
  last_trade_price: number
  prev_close_price: number
  day_high?: number
  day_low?: number
  day_change?: number
  day_change_percent?: number
  market_depth?: MarketDepth
  ohlc?: OHLCData
}

interface WatchlistItemCardProps {
  item: WatchlistItemData
  quote?: ExtendedQuote
  onSelect?: (item: WatchlistItemData & { change: number; changePercent: number }) => void
  onEdit?: (item: WatchlistItemData) => void
  onRemove?: (itemId: string) => Promise<void>
  onToggleAlert?: (itemId: string, enabled: boolean, price?: number) => Promise<void>
  onQuickBuy?: (item: WatchlistItemData & { change: number; changePercent: number }) => void
  onQuickSell?: (item: WatchlistItemData & { change: number; changePercent: number }) => void
  isRemoving?: boolean
  className?: string
  isExpanded?: boolean
  onToggleExpanded?: () => void
}

const SWIPE_THRESHOLD = 80
const DELETE_ACTION_WIDTH = 70

/**
 * Get exchange badge configuration for professional display
 */
const getExchangeBadge = (exchange?: string, segment?: string) => {
  const normalizedExchange = exchange?.toUpperCase() || ''
  const normalizedSegment = segment?.toUpperCase() || ''
  
  // Check for MCX first
  if (normalizedExchange.includes('MCX') || normalizedSegment.includes('MCX')) {
    return { label: 'MCX', color: 'bg-amber-500 text-white', bgLight: 'bg-amber-100 text-amber-700' }
  }
  
  // Check for BSE
  if (normalizedExchange.includes('BSE') || normalizedSegment.includes('BSE')) {
    return { label: 'BSE', color: 'bg-orange-500 text-white', bgLight: 'bg-orange-100 text-orange-700' }
  }
  
  // Check for NSE F&O
  if (normalizedExchange.includes('NSE_FO') || normalizedExchange.includes('NFO') || normalizedSegment.includes('NFO')) {
    return { label: 'NSE FO', color: 'bg-purple-500 text-white', bgLight: 'bg-purple-100 text-purple-700' }
  }
  
  // Default to NSE Equity
  return { label: 'NSE', color: 'bg-blue-500 text-white', bgLight: 'bg-blue-100 text-blue-700' }
}

/**
 * Format expiry date in compact format (DD MMM YY)
 */
const formatCompactExpiry = (expiry?: string | null): string => {
  if (!expiry) return ''
  
  try {
    const date = new Date(expiry)
    if (isNaN(date.getTime())) return ''
    
    const day = date.getDate().toString().padStart(2, '0')
    const month = date.toLocaleDateString('en-IN', { month: 'short' })
    const year = date.getFullYear().toString().slice(-2)
    
    return `${day} ${month} ${year}`
  } catch {
    return ''
  }
}

/**
 * Calculate days until expiry
 */
const getDaysUntilExpiry = (expiry?: string | null): number | null => {
  if (!expiry) return null
  
  try {
    const expiryDate = new Date(expiry)
    if (isNaN(expiryDate.getTime())) return null
    
    const now = getCurrentISTDate()
    const diffMs = expiryDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    
    return diffDays
  } catch {
    return null
  }
}

/**
 * Format strike price with currency symbol
 */
const formatStrikePrice = (strike?: number | null): string => {
  if (strike == null) return ''
  return `₹${strike.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function WatchlistItemCard({
  item,
  quote,
  onSelect,
  onEdit,
  onRemove,
  onToggleAlert,
  onQuickBuy,
  onQuickSell,
  isRemoving = false,
  className,
  isExpanded = false,
  onToggleExpanded
}: WatchlistItemCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showChartDrawer, setShowChartDrawer] = useState(false)

  const handleChartDrawerChange = (openState: boolean) => {
    if (!openState) {
      console.info("📊 [WATCHLIST-CHART] Drawer dismissed", {
        symbol: item.symbol,
        watchlistItemId: item.watchlistItemId
      })
    }
    setShowChartDrawer(openState)
  }
  
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-200, -SWIPE_THRESHOLD, 0], [0.8, 1, 1])
  const scale = useTransform(x, [-200, -SWIPE_THRESHOLD, 0], [0.95, 1, 1])

  // Calculate price data (prefer display_price for UI)
  const ltp = ((quote as any)?.display_price ?? quote?.last_trade_price) ?? item.ltp
  const prevClose = quote?.prev_close_price || item.close
  const change = ltp - prevClose
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0
  const isPositive = change >= 0

  // Determine instrument type
  const isFutures = (item.segment === "NFO" || item.segment?.includes("FO")) && !item.optionType
  const isOption = (item.segment === "NFO" || item.segment?.includes("FO")) && !!item.optionType
  const isEquity = !isFutures && !isOption && (item.segment === "EQ" || !item.segment?.includes("FO"))
  const isMCX = item.exchange?.includes("MCX") || item.segment?.includes("MCX")
  
  // Get exchange badge
  const exchangeBadge = getExchangeBadge(item.exchange, item.segment)
  
  // Get expiry info
  const expiryDate = item.expiry ? formatCompactExpiry(item.expiry) : ''
  const daysUntilExpiry = getDaysUntilExpiry(item.expiry)
  const isNearExpiry = daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry >= 0
  
  // Get strike price formatted
  const strikePriceFormatted = formatStrikePrice(item.strikePrice)

  // Pre-compute deterministic mock chart data so the mini and advanced charts stay in sync
  const chartSeedPrice = Math.max(Number.isFinite(ltp) ? Number(ltp) : Number(item.close || 1), 1)
  const chartSeedKey = item.symbol || item.instrumentId || "WATCHLIST"
  const mockCandles = useMemo(() => buildMockCandles(chartSeedPrice, 180, chartSeedKey), [chartSeedPrice, chartSeedKey])
  const miniChartSeries = useMemo(() => candlesToLineSeries(mockCandles), [mockCandles])

  const formattedVolume = quote?.ohlc?.volume
    ? `${(quote.ohlc.volume / 1_000_000).toFixed(2)}M`
    : "N/A"
  const formattedTurnover = quote?.ohlc?.turnover
    ? `${(quote.ohlc.turnover / 10_000_000).toFixed(2)}Cr`
    : "N/A"

  const handleDragStart = () => {
    setIsDragging(true)
  }

  const handleDragEnd = (_: any, info: PanInfo) => {
    setIsDragging(false)
    
    if (info.offset.x < -SWIPE_THRESHOLD) {
      setShowActions(true)
      x.set(-DELETE_ACTION_WIDTH)
    } else {
      setShowActions(false)
      x.set(0)
    }
  }

  const handleQuickAction = async (action: 'remove' | 'alert') => {
    if (isAnimating) return
    
    setIsAnimating(true)
    
    try {
      switch (action) {
        case 'remove':
          if (onRemove) await onRemove(item.watchlistItemId)
          break
        case 'alert':
          if (onToggleAlert) {
            const enabled = !item.alertPrice
            await onToggleAlert(item.watchlistItemId, enabled, enabled ? ltp : undefined)
          }
          break
      }
    } catch (error) {
      console.error(`Error in ${action}:`, error)
    } finally {
      setIsAnimating(false)
      setShowActions(false)
      x.set(0)
    }
  }

  const handleQuickBuy = () => {
    // Open orders dialog for buying
    if (onQuickBuy) {
      onQuickBuy({ ...item, ltp, change, changePercent })
    }
  }

  const handleQuickSell = () => {
    // Open orders dialog for selling
    if (onQuickSell) {
      onQuickSell({ ...item, ltp, change, changePercent })
    }
  }

  const handleCardClick = () => {
    if (!isDragging && !showActions && onToggleExpanded) {
      onToggleExpanded()
    }
  }

  const openAdvancedChart = (e: React.MouseEvent) => {
    e.stopPropagation()
    console.info("📊 [WATCHLIST-CHART] Opening advanced drawer", {
      symbol: item.symbol,
      watchlistItemId: item.watchlistItemId,
      ltp
    })
    setShowChartDrawer(true)
  }
  const closeAdvancedChart = () => {
    console.info("📊 [WATCHLIST-CHART] Closing advanced drawer", {
      symbol: item.symbol,
      watchlistItemId: item.watchlistItemId
    })
    setShowChartDrawer(false)
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Swipe Delete Background - RIGHT SIDE */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute inset-y-0 right-0 flex items-center justify-center bg-gradient-to-l from-red-500 to-red-600 z-10 rounded-xl w-20 shadow-lg"
          >
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleQuickAction('remove')}
              className="h-full w-full p-0 text-white hover:bg-red-700 rounded-xl"
              disabled={isAnimating || isRemoving}
            >
              {isRemoving ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Trash2 className="h-6 w-6" />
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -DELETE_ACTION_WIDTH, right: 0 }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        style={{ x, opacity, scale }}
        className="relative z-20 bg-card"
      >
        <Card
          onClick={handleCardClick}
          className={cn(
			"group relative cursor-pointer transition-all duration-200 overflow-hidden",
			"bg-gradient-to-br from-card to-primary/5 border border-border/60 backdrop-blur supports-[backdrop-filter]:bg-card/80",
			"hover:shadow-lg hover:ring-1 hover:ring-primary/20",
            "rounded-xl",
            isDragging && "shadow-xl scale-[1.02]",
            showActions && "shadow-lg"
          )}
        >
          <CardContent className="px-3 sm:px-4 py-2.5 sm:py-3">
            <div className="flex items-center justify-between gap-2">
              {/* Stock Info - Enhanced */}
              <div className="flex-1 overflow-hidden pr-2 sm:pr-3 min-w-0">
                {/* First Row: Symbol + Exchange Badge + Type Badges */}
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="font-semibold text-base text-foreground truncate">
                    {(isFutures || isMCX) ? (item.name || item.symbol) : item.symbol}
                  </span>
                  
                  {/* Professional Exchange Badge */}
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs px-1.5 py-0.5 font-medium",
                      exchangeBadge.bgLight
                    )}
                  >
                    {exchangeBadge.label}
                  </Badge>
                  
                  {/* Instrument Type Badges */}
                  {isFutures && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 font-medium">
                      FUT
                    </Badge>
                  )}
                  {isOption && (
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs px-1.5 py-0.5 font-medium",
                        item.optionType === 'CE' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      )}
                    >
                      {item.optionType || 'OPT'}
                    </Badge>
                  )}
                  {isEquity && !isMCX && (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 font-medium">
                      EQ
                    </Badge>
                  )}
                  
                  {item.alertPrice && (
                    <Bell className="h-3 w-3 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
                
                {/* Second Row: Instrument-Specific Details */}
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  {/* Expiry Date (for F&O) */}
                  {expiryDate && (isFutures || isOption) && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 font-mono",
                        isNearExpiry ? "border-red-400 text-red-600 bg-red-50" : "border-gray-300 text-gray-600"
                      )}
                    >
                      {expiryDate}
                      {isNearExpiry && daysUntilExpiry !== null && (
                        <span className="ml-1">({daysUntilExpiry}d)</span>
                      )}
                    </Badge>
                  )}
                  
                  {/* Strike Price (for Options) */}
                  {strikePriceFormatted && isOption && (
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0.5 font-mono border-gray-300 text-gray-700"
                    >
                      {strikePriceFormatted}
                    </Badge>
                  )}
                  
                  {/* Lot Size */}
                  {item.lotSize && (isFutures || isOption || isMCX) && (
                    <Badge 
                      variant="outline" 
                      className="text-[10px] px-1.5 py-0.5 font-mono border-gray-300 text-gray-600"
                    >
                      Lot: {item.lotSize}
                    </Badge>
                  )}
                </div>
                
                {/* Instrument Name (for equity/fallback) */}
                {(isEquity || (!isFutures && !isOption)) && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {item.name}
                  </p>
                )}
              </div>

              {/* Price Info - Compact & Responsive */}
              <div className="text-right flex-shrink-0 mr-2 sm:mr-3">
                <div className="font-mono font-semibold text-sm sm:text-base text-foreground">
                  ₹{ltp.toFixed(2)}
                </div>
                <div className={cn(
                  "text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1",
                  isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {isPositive ? (
                    <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  ) : (
                    <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  )}
                  <span>
                    {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Ghost Icon Button - Opens Order Panel */}
              <motion.button
                onClick={(e) => {
                  e.stopPropagation()
                  handleQuickBuy()
                }}
                className="p-2 sm:p-2.5 bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 rounded-lg sm:rounded-xl transition-all duration-200 flex items-center justify-center flex-shrink-0 border border-gray-200/50 dark:border-gray-700/50 hover:border-green-300 dark:hover:border-green-600/50 shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                title="Place Order"
              >
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
              </motion.button>

              {/* Expand/Collapse Chevron */}
              <motion.div
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <ChevronRight className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
              </motion.div>
            </div>
          </CardContent>

          {/* Expanded Details Section */}
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0, y: -10 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{ height: 0, opacity: 0, y: -10 }}
                transition={{ 
                  duration: 0.25, 
                  ease: "easeInOut",
                  opacity: { duration: 0.2 }
                }}
                className="overflow-hidden border-t border-gray-100 dark:border-gray-700"
              >
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                  {/* OHLC Data */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Open</div>
                      <div className="font-semibold text-sm">
                        ₹{quote?.ohlc?.open?.toFixed(2) || item.ltp.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">High</div>
                      <div className="font-semibold text-sm text-green-600">
                        ₹{quote?.day_high?.toFixed(2) || quote?.ohlc?.high?.toFixed(2) || item.ltp.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Low</div>
                      <div className="font-semibold text-sm text-red-600">
                        ₹{quote?.day_low?.toFixed(2) || quote?.ohlc?.low?.toFixed(2) || item.ltp.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Close</div>
                      <div className="font-semibold text-sm">
                        ₹{quote?.prev_close_price?.toFixed(2) || quote?.ohlc?.close?.toFixed(2) || item.close.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Volume & Turnover */}
                  {/* Volume & turnover summary with chart shortcut */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Volume</div>
                      <div className="font-semibold text-sm">{formattedVolume}</div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Turnover</span>
                        <button
                          type="button"
                          onClick={openAdvancedChart}
                          className="inline-flex items-center justify-center rounded-md border border-dashed border-gray-300 bg-white/70 p-1.5 text-gray-500 transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:bg-gray-900/60 dark:hover:bg-gray-800/80"
                          title="Open full-screen chart"
                          aria-label="Open full-screen chart"
                        >
                          <LineChart className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="font-semibold text-sm">{formattedTurnover}</div>
                    </div>
                  </div>

                  {/* Market Depth */}
                  {quote?.market_depth && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <BarChart3 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Market Depth</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Bid Side */}
                        <div>
                          <div className="text-xs text-green-600 font-medium mb-2">BID</div>
                          <div className="space-y-1">
                            {quote.market_depth.bid.slice(0, 3).map((bid, index) => (
                              <div key={index} className="flex justify-between text-xs">
                                <span className="text-green-600">{bid.quantity.toLocaleString()}</span>
                                <span className="font-mono">₹{bid.price.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Ask Side */}
                        <div>
                          <div className="text-xs text-red-600 font-medium mb-2">ASK</div>
                          <div className="space-y-1">
                            {quote.market_depth.ask.slice(0, 3).map((ask, index) => (
                              <div key={index} className="flex justify-between text-xs">
                                <span className="font-mono">₹{ask.price.toFixed(2)}</span>
                                <span className="text-red-600">{ask.quantity.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Professional Mini Chart */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                    <MiniChart
                      symbol={item.symbol}
                      currentPrice={ltp}
                      previousClose={quote?.prev_close_price || item.close}
                      data={miniChartSeries}
                      height={100}
                      className="w-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading Overlay */}
          <AnimatePresence>
            {isRemoving && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 flex items-center justify-center z-30 rounded-xl"
              >
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Removing...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
        {/* Left-side Drawer for Full Chart */}
        <Drawer open={showChartDrawer} onOpenChange={handleChartDrawerChange} direction="left">
          <DrawerContent className="data-[vaul-drawer-direction=left]:h-screen data-[vaul-drawer-direction=left]:w-screen data-[vaul-drawer-direction=left]:max-w-none data-[vaul-drawer-direction=left]:rounded-none data-[vaul-drawer-direction=left]:border-0 px-0 pb-0">
            <div className="flex h-full flex-col bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white">
              <DrawerHeader className="flex flex-col gap-3 border-b border-white/10 bg-white/5 px-6 py-4 text-white backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <DrawerTitle className="flex items-center gap-2 text-base font-semibold">
                    <BarChart3 className="h-4 w-4" />
                    Advanced Chart — {item.symbol}
                  </DrawerTitle>
                  <DrawerClose asChild>
                    <button
                      className="rounded-full border border-white/10 p-2 text-white/70 transition hover:border-red-200/60 hover:bg-red-500/20 hover:text-white"
                      aria-label="Close chart"
                      title="Close chart drawer"
                      onClick={closeAdvancedChart}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </DrawerClose>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <span className="font-semibold text-white">₹{ltp.toFixed(2)}</span>
                  <span className={cn("font-medium", isPositive ? "text-emerald-300" : "text-rose-300")}>
                    {isPositive ? "+" : ""}
                    {change.toFixed(2)} ({changePercent.toFixed(2)}%)
                  </span>
                  <span className="text-xs uppercase tracking-wide text-white/60">Mock data — enterprise view</span>
                </div>
              </DrawerHeader>
              <div className="flex-1 overflow-hidden p-4">
                <AdvancedChart
                  symbol={item.symbol}
                  onClose={closeAdvancedChart}
                  mockSeedPrice={chartSeedPrice}
                  mockSeries={mockCandles}
                  className="h-full rounded-2xl border border-white/10 bg-white/5"
                />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </motion.div>
    </div>
  )
}
