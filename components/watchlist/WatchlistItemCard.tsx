/**
 * @file WatchlistItemCard.tsx
 * @description Enterprise-grade compact watchlist item with left swipe to delete
 */

"use client"

import React, { useState, useRef, useEffect } from "react"
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
  LineChart
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"
import type { WatchlistItemData } from "@/lib/hooks/use-enhanced-watchlist"
import { MiniChart } from "@/components/charts/MiniChart"
import { AdvancedChart } from "@/components/charts/AdvancedChart"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer"

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
  
  const x = useMotionValue(0)
  const opacity = useTransform(x, [-200, -SWIPE_THRESHOLD, 0], [0.8, 1, 1])
  const scale = useTransform(x, [-200, -SWIPE_THRESHOLD, 0], [0.95, 1, 1])

  // Calculate price data (prefer display_price for UI)
  const ltp = ((quote as any)?.display_price ?? quote?.last_trade_price) ?? item.ltp
  const prevClose = quote?.prev_close_price || item.close
  const change = ltp - prevClose
  const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0
  const isPositive = change >= 0

  // Determine if it's futures or options
  const isFutures = item.segment === "NFO" && !item.optionType
  const isOption = item.segment === "NFO" && !!item.optionType

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
    setShowChartDrawer(true)
  }
  const closeAdvancedChart = () => setShowChartDrawer(false)

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
          <CardContent className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Stock Info - Compact */}
              <div className="flex-1 overflow-hidden pr-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-base text-foreground truncate">
                    {item.symbol}
                  </span>
                  {isFutures && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5">
                      F
                    </Badge>
                  )}
                  {isOption && (
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5">
                      O
                    </Badge>
                  )}
                  {item.alertPrice && (
                    <Bell className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
                
                <p className="text-xs text-muted-foreground truncate">
                  {item.name}
                </p>
              </div>

              {/* Price Info - Compact */}
              <div className="text-right flex-shrink-0 mr-3">
                <div className="font-mono font-semibold text-base text-foreground">
                  ₹{ltp.toFixed(2)}
                </div>
                <div className={cn(
                  "text-xs flex items-center gap-1",
                  isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {isPositive ? "+" : ""}{changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Action Buttons - Compact */}
              <div className="flex items-center gap-1.5">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleQuickBuy()
                  }}
                  className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  B
                </motion.button>
                <motion.button
                  onClick={openAdvancedChart}
                  className="px-2 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Open advanced chart"
                >
                  <LineChart className="h-4 w-4" />
                </motion.button>
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleQuickSell()
                  }}
                  className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded-lg transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  S
                </motion.button>
              </div>

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
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Volume</div>
                      <div className="font-semibold text-sm">
                        {quote?.ohlc?.volume ? (quote.ohlc.volume / 1000000).toFixed(2) + 'M' : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Turnover</div>
                      <div className="font-semibold text-sm">
                        {quote?.ohlc?.turnover ? (quote.ohlc.turnover / 10000000).toFixed(2) + 'Cr' : 'N/A'}
                      </div>
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
        <Drawer open={showChartDrawer} onOpenChange={setShowChartDrawer} direction="left">
          <DrawerContent className="data-[vaul-drawer-direction=left]:w-full">
            <DrawerHeader className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Advanced Chart — {item.symbol}
              </DrawerTitle>
              <DrawerClose asChild>
                <button className="rounded-md p-2 hover:bg-muted" aria-label="Close chart">
                  <X className="h-4 w-4" />
                </button>
              </DrawerClose>
            </DrawerHeader>
            <div className="p-2">
              <AdvancedChart symbol={item.symbol} onClose={closeAdvancedChart} />
            </div>
          </DrawerContent>
        </Drawer>
      </motion.div>
    </div>
  )
}
