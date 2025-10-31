"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, useAnimation } from "framer-motion"
import { 
  TrendingUp, TrendingDown, Target, X, Loader2,
  Activity, DollarSign, Clock, Shield, AlertCircle,
  Percent, Hash, BarChart3, Sparkles, 
  ArrowUpRight, ArrowDownRight
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { closePosition, updateStopLoss, updateTarget } from "@/lib/hooks/use-trading-data"
import { useSession } from "next-auth/react"
import { useRealtimePositions } from "@/lib/hooks/use-realtime-positions"
import { cn } from "@/lib/utils"
import { formatExpiryDateIST, formatDateIST } from "@/lib/date-utils"

// Types
interface Position {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  instrumentId?: string;
  stock?: {
    instrumentId?: string;
  };
  stopLoss?: number;
  target?: number;
  segment?: string;
  expiry?: string;
  strikePrice?: number;
  optionType?: string;
  lotSize?: number;
  unrealizedPnL: number;
}

interface Quote { 
  last_trade_price: number 
}

interface PositionTrackingProps {
  positions: Position[];
  quotes: Record<string, Quote>;
  onPositionUpdate: () => void;
  tradingAccountId?: string;
}

// Position filters
const POSITION_FILTERS = [
  { id: 'all', label: 'All', icon: BarChart3 },
  { id: 'long', label: 'Long', icon: TrendingUp },
  { id: 'short', label: 'Short', icon: TrendingDown },
  { id: 'profit', label: 'Profit', icon: ArrowUpRight },
  { id: 'loss', label: 'Loss', icon: ArrowDownRight },
  { id: 'today', label: "Today's", icon: Clock },
] as const

type FilterType = typeof POSITION_FILTERS[number]['id']

// Helper: instrumentId (handles both direct and nested structures)
const getInstrumentId = (position: Position): string | null => {
  return position.stock?.instrumentId ?? position.instrumentId ?? null
}

// Helper: parse token from instrumentId (e.g., "NSE_EQ-26000" or "NFO-...-123456")
const parseTokenFromInstrumentId = (instrumentId?: string | null): number | null => {
  try {
    if (!instrumentId) return null
    const parts = instrumentId.split('-')
    for (let i = parts.length - 1; i >= 0; i--) {
      const maybe = Number(parts[i])
      if (Number.isFinite(maybe) && maybe > 0) return maybe
    }
    return null
  } catch {
    return null
  }
}

// Helper: compute quote key for a position (WebSocket quotes are keyed by token string)
const getQuoteKeyForPosition = (position: Position): string | null => {
  const anyPos: any = position as any
  const token: number | undefined = anyPos?.stock?.token ?? anyPos?.token
  if (typeof token === 'number' && Number.isFinite(token)) return String(token)
  const instrumentId = getInstrumentId(position)
  const parsed = parseTokenFromInstrumentId(instrumentId)
  return parsed != null ? String(parsed) : instrumentId
}

// Swipeable Position Card Component
const SwipeablePositionCard = ({ 
  position, 
  quote, 
  onClose, 
  onStopLoss, 
  onTarget,
  isLoading 
}: {
  position: Position
  quote: Quote | null
  onClose: () => void
  onStopLoss: () => void
  onTarget: () => void
  isLoading: boolean
}) => {
  const x = useMotionValue(0)
  const controls = useAnimation()
  const cardRef = useRef<HTMLDivElement>(null)
  
  const background = useTransform(
    x,
    [-200, 0, 200],
    ["rgba(239, 68, 68, 0.15)", "rgba(0, 0, 0, 0)", "rgba(34, 197, 94, 0.15)"]
  )

  const rotateY = useTransform(x, [-200, 200], [-15, 15])
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0.5, 1, 1, 1, 0.5])

  // Calculate P&L
  const isFutures = position.segment === "NFO" && !position.optionType
  const isOption = position.segment === "NFO" && !!position.optionType
  const isClosed = position.quantity === 0

  let displayPnL: number
  let displayPnLPercent: number
  let currentPrice: number

  if (isClosed) {
    displayPnL = position.unrealizedPnL ?? 0
    displayPnLPercent = position.averagePrice !== 0 ? (displayPnL / position.averagePrice) * 100 : 0
    currentPrice = position.averagePrice
  } else {
    // Use display_price for live animated position updates
    currentPrice = ((quote as any)?.display_price ?? quote?.last_trade_price) ?? position.averagePrice
    displayPnL = (currentPrice - position.averagePrice) * position.quantity
    displayPnLPercent = position.averagePrice !== 0 
      ? ((currentPrice - position.averagePrice) / position.averagePrice) * 100 
      : 0
  }

  const isProfitable = displayPnL >= 0

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const threshold = 100
    
    if (info.offset.x < -threshold) {
      // Left swipe - Close position
      await controls.start({ x: -300, opacity: 0 })
      onClose()
    } else if (info.offset.x > threshold) {
      // Right swipe - Quick actions
      toast({
        title: "Quick Actions",
        description: "Set SL/Target from the action menu",
      })
      controls.start({ x: 0 })
    } else {
      controls.start({ x: 0 })
    }
  }

  return (
    <motion.div
      ref={cardRef}
      className="relative touch-pan-y"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Background gradient on swipe */}
      <motion.div 
        className="absolute inset-0 rounded-2xl"
        style={{ background }}
      />
      
      <motion.div
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ x, rotateY, opacity }}
        animate={controls}
        className="relative"
      >
        <Card className={cn(
          "border border-border shadow-lg backdrop-blur-xl transition-all duration-300",
          "bg-gradient-to-br from-card/90 to-card/70",
          isClosed && "opacity-75",
          isProfitable ? "hover:shadow-green-500/20" : "hover:shadow-red-500/20"
        )}>
          <CardContent className="p-4 space-y-3">
            {/* Header Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.h3 
                  className="font-bold text-lg"
                  whileHover={{ scale: 1.02 }}
                >
                  {position.symbol}
                </motion.h3>
                
                {/* Position Type Badges */}
                <div className="flex gap-1">
                  {isFutures && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 text-xs px-2 py-0.5">
                      FUT
                    </Badge>
                  )}
                  {isOption && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 text-xs px-2 py-0.5">
                      {position.optionType}
                    </Badge>
                  )}
                  {position.quantity > 0 ? (
                    <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 text-xs px-2 py-0.5">
                      LONG
                    </Badge>
                  ) : (
                    <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 text-xs px-2 py-0.5">
                      SHORT
                    </Badge>
                  )}
                </div>

                {/* Live indicator */}
                <motion.div
                  className="w-2 h-2 bg-green-500 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              {/* P&L Display */}
              <motion.div 
                className="text-right"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className={cn(
                  "font-bold text-xl font-mono",
                  isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}>
                  {isProfitable ? "+" : ""}₹{Math.abs(displayPnL).toFixed(2)}
                </div>
                <div className={cn(
                  "text-xs flex items-center justify-end gap-1",
                  isProfitable ? "text-green-600" : "text-red-600"
                )}>
                  {isProfitable ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(displayPnLPercent).toFixed(2)}%
                </div>
              </motion.div>
            </div>

            {/* F&O Details Row (if applicable) */}
            {(isFutures || isOption) && (
              <div className="flex flex-wrap gap-1.5">
                {position.expiry && (
                  <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="text-xs font-medium">{formatExpiryDateIST(position.expiry)}</span>
                  </div>
                )}
                {isOption && position.strikePrice !== undefined && (
                  <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
                    <Target className="w-3 h-3 text-gray-500" />
                    <span className="text-xs font-medium">₹{position.strikePrice}</span>
                  </div>
                )}
                {position.lotSize && (
                  <div className="flex items-center gap-1 bg-muted rounded-lg px-2 py-1">
                    <Hash className="w-3 h-3 text-gray-500" />
                    <span className="text-xs font-medium">Lot: {position.lotSize}</span>
                  </div>
                )}
              </div>
            )}

            {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2">
              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg p-2">
                <Hash className="w-4 h-4 text-blue-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Qty</p>
                  <p className="text-sm font-bold">{Math.abs(position.quantity)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg p-2">
                <DollarSign className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Avg</p>
                  <p className="text-sm font-bold">₹{position.averagePrice.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg p-2">
                <Activity className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">LTP</p>
                  <p className="text-sm font-bold">₹{currentPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* SL/Target Progress Bar */}
            {(position.stopLoss || position.target) && !isClosed && (
              <div className="relative">
                <div className="flex justify-between text-xs mb-1">
                  {position.stopLoss && (
                    <span className="text-red-500 font-medium flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      ₹{position.stopLoss}
                    </span>
                  )}
                  <span className="text-gray-600 dark:text-gray-400 font-mono">
                    ₹{currentPrice.toFixed(2)}
                  </span>
                  {position.target && (
                    <span className="text-green-500 font-medium flex items-center gap-1">
                      ₹{position.target}
                      <Target className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    className={cn(
                      "h-full rounded-full",
                      isProfitable 
                        ? "bg-gradient-to-r from-green-400 to-green-600" 
                        : "bg-gradient-to-r from-red-400 to-red-600"
                    )}
                    initial={{ width: "0%" }}
                    animate={{ width: "65%" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}

            {/* Quick Actions Row */}
            {!isClosed && (
              <div className="flex gap-2 pt-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  disabled={isLoading}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg",
                    "bg-gradient-to-r from-red-500 to-red-600 text-white",
                    "font-medium text-sm transition-all",
                    "disabled:opacity-50"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <X className="w-4 h-4" />
                      Exit
                    </>
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onStopLoss}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10 hover:bg-orange-500/20"
                >
                  <Shield className="w-4 h-4 text-orange-500" />
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onTarget}
                  className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10 hover:bg-green-500/20"
                >
                  <Target className="w-4 h-4 text-green-500" />
                </motion.button>
              </div>
            )}

            {/* Closed Position Indicator */}
            {isClosed && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                  CLOSED
                </Badge>
                <span className="text-xs text-gray-500">
                  Booked P&L • {formatDateIST(new Date())}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

// Main Component
export function PositionTracking({ 
  positions, 
  quotes, 
  onPositionUpdate, 
  tradingAccountId 
}: PositionTrackingProps) {
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  const { optimisticClosePosition, mutate: mutatePositions } = useRealtimePositions(userId)
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [stopLossDialogOpen, setStopLossDialogOpen] = useState(false)
  const [targetDialogOpen, setTargetDialogOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [stopLossValue, setStopLossValue] = useState(0)
  const [targetValue, setTargetValue] = useState(0)
  const [loading, setLoading] = useState<string | null>(null)

  // Calculate P&L Summary - Use display_price for live animated updates
  const { totalPnL, dayPnL, winRate, totalPositions } = useMemo(() => {
    let total = 0
    let day = 0
    let winners = 0
    let activePositions = 0

    positions.forEach((pos) => {
      if (pos.quantity === 0) {
        total += pos.unrealizedPnL ?? 0
        day += pos.unrealizedPnL ?? 0
        if (pos.unrealizedPnL > 0) winners++
      } else {
        const quoteKey = getQuoteKeyForPosition(pos)
        const quote = quoteKey ? quotes[quoteKey] : null
        // Use display_price for live animated position updates
        const ltp = (((quote as any)?.display_price ?? quote?.last_trade_price) ?? pos.averagePrice)
        const pnl = (ltp - pos.averagePrice) * pos.quantity
        total += pnl
        day += pnl
        if (pnl > 0) winners++
        activePositions++
      }
    })

    const winRate = positions.length > 0 ? (winners / positions.length) * 100 : 0

    return { 
      totalPnL: total, 
      dayPnL: day, 
      winRate,
      totalPositions: activePositions
    }
  }, [positions, quotes])

  // Filter positions - Use display_price for live filtering
  const filteredPositions = useMemo(() => {
    return positions.filter(pos => {
      switch (activeFilter) {
        case 'long':
          return pos.quantity > 0
        case 'short':
          return pos.quantity < 0
        case 'profit':
          if (pos.quantity === 0) return pos.unrealizedPnL > 0
          const quoteKey = getQuoteKeyForPosition(pos)
          const quote = quoteKey ? quotes[quoteKey] : null
          const ltp = (((quote as any)?.display_price ?? quote?.last_trade_price) ?? pos.averagePrice)
          return (ltp - pos.averagePrice) * pos.quantity > 0
        case 'loss':
          if (pos.quantity === 0) return pos.unrealizedPnL < 0
          const quoteKeyLoss = getQuoteKeyForPosition(pos)
          const quoteLoss = quoteKeyLoss ? quotes[quoteKeyLoss] : null
          const ltpLoss = (((quoteLoss as any)?.display_price ?? quoteLoss?.last_trade_price) ?? pos.averagePrice)
          return (ltpLoss - pos.averagePrice) * pos.quantity < 0
        case 'today':
          // Filter for today's positions (this would need actual date logic)
          return true
        default:
          return true
      }
    })
  }, [positions, quotes, activeFilter])

  const handleAction = async (action: 'close' | 'stoploss' | 'target', positionId: string, value?: number) => {
    setLoading(positionId)
    try {
      if (action === 'close') {
        if (!tradingAccountId) throw new Error('Missing trading account')
        
        // Get current price for the position being closed
        const position = positions.find(p => p.id === positionId)
        const quoteKey = position ? getQuoteKeyForPosition(position) : null
        const currentLtp = quoteKey ? (quotes[quoteKey] as any)?.display_price ?? quotes[quoteKey]?.last_trade_price : undefined
        
        // Optimistic close: remove the position immediately
        try { optimisticClosePosition(positionId) } catch {}
        
        await closePosition(
          positionId, 
          { 
            user: { 
              id: "current-user", 
              clientId: "client-123", 
              tradingAccountId 
            } 
          },
          currentLtp  // Pass current price as fallback
        )
        toast({
          title: "Position Closed",
          description: "Your position has been closed successfully.",
          className: "bg-green-500 text-white border-0"
        })
        // Ensure realtime list is synced promptly
        try { await mutatePositions() } catch {}
      } else if (action === 'stoploss' && value) {
        await updateStopLoss(positionId, value)
        toast({
          title: "Stop Loss Set",
          description: `Stop loss set at ₹${value}`,
        })
      } else if (action === 'target' && value) {
        await updateTarget(positionId, value)
        toast({
          title: "Target Set",
          description: `Target set at ₹${value}`,
        })
      }

      onPositionUpdate()
      
      if (action === 'stoploss') setStopLossDialogOpen(false)
      if (action === 'target') setTargetDialogOpen(false)
    } catch (error) {
      toast({ 
        title: `Failed to ${action} position`, 
        description: error instanceof Error ? error.message : "Unknown error", 
        variant: "destructive" 
      })
      // Revert by revalidating if optimistic removal happened
      if (action === 'close') {
        try { await mutatePositions() } catch {}
      }
    } finally {
      setLoading(null)
    }
  }

  const openDialog = (type: 'stoploss' | 'target', position: Position) => {
    setSelectedPosition(position)
    if (type === 'stoploss') {
      setStopLossValue(position.stopLoss || 0)
      setStopLossDialogOpen(true)
    } else {
      setTargetValue(position.target || 0)
      setTargetDialogOpen(true)
    }
  }

  if (positions.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-20 text-gray-500"
      >
        <Sparkles className="w-12 h-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">No Open Positions</p>
        <p className="text-sm text-gray-400 mt-1">Start trading to see your positions here</p>
      </motion.div>
    )
  }

  return (
    <>
      {/* P&L Summary Cards - Always at top */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={cn(
            "border-0 shadow-lg",
            "bg-gradient-to-br",
            dayPnL >= 0 
              ? "from-green-500/10 to-green-600/10 dark:from-green-500/20 dark:to-green-600/20" 
              : "from-red-500/10 to-red-600/10 dark:from-red-500/20 dark:to-red-600/20"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Day's MTM</p>
                <Activity className="w-4 h-4 text-gray-400" />
              </div>
              <motion.p 
                className={cn(
                  "text-2xl font-bold font-mono",
                  dayPnL >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {dayPnL >= 0 ? "+" : ""}₹{Math.abs(dayPnL).toFixed(2)}
              </motion.p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className={cn(
            "border-0 shadow-lg",
            "bg-gradient-to-br",
            totalPnL >= 0 
              ? "from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20" 
              : "from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total P&L</p>
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
              <motion.p 
                className={cn(
                  "text-2xl font-bold font-mono",
                  totalPnL >= 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"
                )}
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {totalPnL >= 0 ? "+" : ""}₹{Math.abs(totalPnL).toFixed(2)}
              </motion.p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Stats Bar */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-4 px-2"
      >
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <BarChart3 className="w-3 h-3 text-gray-500" />
            <span className="font-medium">{totalPositions} Active</span>
          </div>
          <div className="flex items-center gap-1">
            <Percent className="w-3 h-3 text-gray-500" />
            <span className="font-medium">{winRate.toFixed(0)}% Win</span>
          </div>
        </div>
        <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 text-xs">
          Live
        </Badge>
      </motion.div>

      {/* Compact Filter Tabs */}
      <div className="mb-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 min-w-max px-1">
          {POSITION_FILTERS.map((filter, index) => {
            const Icon = filter.icon
            const count = filter.id === 'all' 
              ? positions.length 
              : positions.filter(p => {
                  switch (filter.id) {
                    case 'long': return p.quantity > 0
                    case 'short': return p.quantity < 0
                    case 'profit': 
                      if (p.quantity === 0) return p.unrealizedPnL > 0
            const quoteKey = getQuoteKeyForPosition(p)
            const q = quoteKey ? quotes[quoteKey] : null
            const ltp = (q as any)?.display_price ?? q?.last_trade_price ?? p.averagePrice
                      return (ltp - p.averagePrice) * p.quantity > 0
                    case 'loss':
                      if (p.quantity === 0) return p.unrealizedPnL < 0
                      const quoteKeyLoss = getQuoteKeyForPosition(p)
                      const ql = quoteKeyLoss ? quotes[quoteKeyLoss] : null
                      const ltpl = (ql as any)?.display_price ?? ql?.last_trade_price ?? p.averagePrice
                      return (ltpl - p.averagePrice) * p.quantity < 0
                    default: return true
                  }
                }).length
            
            return (
              <motion.button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium",
                  "transition-all duration-200",
                  activeFilter === filter.id 
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg" 
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Icon className="w-3.5 h-3.5" />
                {filter.label}
                {count > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs",
                    activeFilter === filter.id 
                      ? "bg-white/20 text-white" 
                      : "bg-gray-200 dark:bg-gray-700"
                  )}>
                    {count}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Positions List with Stagger Animation */}
      <motion.div 
        className="space-y-3 pb-20"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: 0.05
            }
          }
        }}
      >
        <AnimatePresence mode="popLayout">
          {filteredPositions.map((position) => {
            const quoteKey = getQuoteKeyForPosition(position)
            const quote = quoteKey ? quotes[quoteKey] : null
            
            return (
              <SwipeablePositionCard
                key={position.id}
                position={position}
                quote={quote}
                onClose={() => handleAction('close', position.id)}
                onStopLoss={() => openDialog('stoploss', position)}
                onTarget={() => openDialog('target', position)}
                isLoading={loading === position.id}
              />
            )
          })}
        </AnimatePresence>
      </motion.div>

      {/* Stop Loss Dialog */}
      <AnimatePresence>
        {stopLossDialogOpen && (
          <Dialog open={stopLossDialogOpen} onOpenChange={setStopLossDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-0 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-500" />
                  Set Stop Loss
                </DialogTitle>
              </DialogHeader>
              {selectedPosition && (
                <motion.div 
                  className="space-y-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border-0">
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg mb-2">{selectedPosition.symbol}</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Hash className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">Qty:</span>
                          <span className="font-medium">{Math.abs(selectedPosition.quantity)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                          <span className="font-medium">₹{selectedPosition.averagePrice}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="space-y-2">
                    <Label htmlFor="stoploss" className="flex items-center gap-2">
                      Stop Loss Price
                      <AlertCircle className="w-3 h-3 text-gray-400" />
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <Input 
                        id="stoploss"
                        type="number" 
                        value={stopLossValue} 
                        onChange={(e) => setStopLossValue(Number(e.target.value))} 
                        step="0.05"
                        className="pl-8 font-mono"
                        placeholder="Enter stop loss price"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAction('stoploss', selectedPosition.id, stopLossValue)} 
                      disabled={loading === selectedPosition.id || !stopLossValue} 
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg",
                        "bg-gradient-to-r from-orange-500 to-orange-600 text-white",
                        "font-medium transition-all",
                        "disabled:opacity-50"
                      )}
                    >
                      {loading === selectedPosition.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Shield className="w-4 h-4" />
                          Set Stop Loss
                        </>
                      )}
                    </motion.button>
                    <Button 
                      variant="outline" 
                      onClick={() => setStopLossDialogOpen(false)} 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Target Dialog */}
      <AnimatePresence>
        {targetDialogOpen && (
          <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
            <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-0 shadow-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-500" />
                  Set Target Price
                </DialogTitle>
              </DialogHeader>
              {selectedPosition && (
                <motion.div 
                  className="space-y-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-850 border-0">
                    <CardContent className="p-4">
                      <h3 className="font-bold text-lg mb-2">{selectedPosition.symbol}</h3>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-1">
                          <Hash className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">Qty:</span>
                          <span className="font-medium">{Math.abs(selectedPosition.quantity)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">Avg:</span>
                          <span className="font-medium">₹{selectedPosition.averagePrice}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="space-y-2">
                    <Label htmlFor="target" className="flex items-center gap-2">
                      Target Price
                      <Sparkles className="w-3 h-3 text-gray-400" />
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <Input 
                        id="target"
                        type="number" 
                        value={targetValue} 
                        onChange={(e) => setTargetValue(Number(e.target.value))} 
                        step="0.05"
                        className="pl-8 font-mono"
                        placeholder="Enter target price"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAction('target', selectedPosition.id, targetValue)} 
                      disabled={loading === selectedPosition.id || !targetValue} 
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg",
                        "bg-gradient-to-r from-green-500 to-green-600 text-white",
                        "font-medium transition-all",
                        "disabled:opacity-50"
                      )}
                    >
                      {loading === selectedPosition.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Target className="w-4 h-4" />
                          Set Target
                        </>
                      )}
                    </motion.button>
                    <Button 
                      variant="outline" 
                      onClick={() => setTargetDialogOpen(false)} 
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  )
}
