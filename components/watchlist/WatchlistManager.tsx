/**
 * @file WatchlistManager.tsx
 * @module components/watchlist
 * @description Premium watchlist manager with shadcn tabs and modern UI. 
 * 
 * CRITICAL: WebSocket Quotes Access Pattern
 * - WebSocket stores quotes keyed by TOKEN (e.g., quotes["26000"])
 * - Watchlist items must use item.token.toString() to access quotes
 * - DO NOT use item.instrumentId for quote lookup (e.g., quotes["NSE_EQ-26000"])
 * - Fallback to instrumentId only if token is unavailable
 * 
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2025-01-27 - Fixed WebSocket quote key mismatch issue
 */

"use client"

import React, { useState, useCallback, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Plus, 
  Eye, 
  Settings, 
  Star,
  MoreVertical,
  Search,
  Filter,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  TrendingUp
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { useRef, useEffect } from "react"
import { useMarketData } from "@/lib/market-data/providers/WebSocketMarketDataProvider"
import type { SubscriptionMode } from "@/lib/market-data/providers/types"

import { WatchlistItemCard } from "./WatchlistItemCard"
import { CreateWatchlistDialog } from "./CreateWatchlistDialog"
import { EditWatchlistDialog } from "./EditWatchlistDialog"
import { StockSearch } from "../stock-search"
import { 
  useEnhancedWatchlists, 
  useWatchlistItems,
  type WatchlistData,
  type WatchlistItemData 
} from "@/lib/hooks/use-prisma-watchlist"

interface Quote {
  last_trade_price: number
  prev_close_price: number
}

interface WatchlistManagerProps {
  quotes: Record<string, Quote>
  onSelectStock: (stock: any) => void
  onQuickBuy?: (stock: any) => void
  onQuickSell?: (stock: any) => void
  className?: string
}

type SortBy = 'name' | 'change' | 'price' | 'added'
type InstrumentTab = 'all' | 'equity' | 'futures' | 'options' | 'commodities'

export function WatchlistManager({
  quotes,
  onSelectStock,
  onQuickBuy,
  onQuickSell,
  className
}: WatchlistManagerProps) {
  const { data: session } = useSession()
  const userId = session?.user?.id as string

  // State
  const [activeTab, setActiveTab] = useState<string>("")
  const [instrumentFilter, setInstrumentFilter] = useState<InstrumentTab>('all')
  const [sortBy, setSortBy] = useState<SortBy>('added')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [editingWatchlist, setEditingWatchlist] = useState<WatchlistData | null>(null)
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set())
  const [searchInputFocused, setSearchInputFocused] = useState(false)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // Hooks
  const {
    watchlists,
    isLoading: watchlistsLoading,
    isRefreshing: watchlistsRefreshing,
    createWatchlist,
    updateWatchlist,
    deleteWatchlist,
    refetch: refetchWatchlists
  } = useEnhancedWatchlists(userId)

  const {
    addItem,
    updateItem,
    removeItem
  } = useWatchlistItems(activeTab || undefined)

  // WebSocket market data controls
  const { subscribe, unsubscribe } = useMarketData()
  const previousTokensRef = useRef<Set<number>>(new Set())

  // Helper to parse token from instrumentId if token is missing
  const parseTokenFromInstrumentId = useCallback((instrumentId?: string): number | null => {
    try {
      if (!instrumentId) return null
      // Common formats: "NSE_EQ-26000", "NFO-BANKNIFTY-2025-10-30-46000-CE-123456"
      const parts = instrumentId.split('-')
      // Prefer the last numeric segment
      for (let i = parts.length - 1; i >= 0; i--) {
        const maybe = Number(parts[i])
        if (Number.isFinite(maybe) && maybe > 0) return maybe
      }
      return null
    } catch {
      return null
    }
  }, [])

  

  // Computed values
  const activeWatchlist = useMemo(() => {
    // Preserve last selected tab if still present; otherwise fall back gracefully
    if (watchlists.length === 0) return null
    const current = watchlists.find(w => w.id === activeTab)
    return current || watchlists[0] || null
  }, [watchlists, activeTab])

  // Subscribe/unsubscribe tokens whenever active watchlist changes or refresh completes
  useEffect(() => {
    try {
      const items = activeWatchlist?.items || []
      const currentTokens = new Set<number>()

      for (const it of items) {
        const token = typeof it?.token === 'number' && Number.isFinite(it.token)
          ? it.token
          : parseTokenFromInstrumentId(it?.instrumentId || undefined)
        if (typeof token === 'number' && Number.isFinite(token)) {
          currentTokens.add(token)
        }
      }

      const prev = previousTokensRef.current
      const toUnsubscribe: number[] = []
      const toSubscribe: number[] = []

      // Determine removed tokens
      prev.forEach(t => { if (!currentTokens.has(t)) toUnsubscribe.push(t) })
      // Determine added tokens
      currentTokens.forEach(t => { if (!prev.has(t)) toSubscribe.push(t) })

      if (toUnsubscribe.length > 0) {
        console.log('🚫 [WATCHLIST-WS] Unsubscribing tokens', { count: toUnsubscribe.length, toUnsubscribe })
        try { unsubscribe(toUnsubscribe as number[], 'ltp' as SubscriptionMode) } catch (e) { /* no-op */ }
      }
      if (toSubscribe.length > 0) {
        console.log('✅ [WATCHLIST-WS] Subscribing tokens', { count: toSubscribe.length, toSubscribe })
        try { subscribe(toSubscribe as number[], 'ltp' as SubscriptionMode) } catch (e) { /* no-op */ }
      }

      previousTokensRef.current = currentTokens
    } catch (err) {
      console.error('❌ [WATCHLIST-WS] Subscription management error', err)
    }
    // Re-run on active watchlist identity, its items reference changes, or when a refresh toggles
  }, [activeWatchlist, watchlistsRefreshing, subscribe, unsubscribe, parseTokenFromInstrumentId])

  // Calculate tab counts in a separate useMemo (outside of map)
  const tabCounts = useMemo(() => {
    if (!activeWatchlist || !activeWatchlist.items || !Array.isArray(activeWatchlist.items)) {
      return { all: 0, equity: 0, futures: 0, options: 0, commodities: 0 }
    }
    
    const items = [...(activeWatchlist.items || [])]
    
    const counts = {
      all: items.length,
      equity: items.filter(item => {
        const segment = item?.segment?.toUpperCase() || ''
        return ['NSE', 'NSE_EQ', 'BSE', 'BSE_EQ'].includes(segment)
      }).length,
      futures: items.filter(item => {
        const segment = item?.segment?.toUpperCase() || ''
        return ['NSE_FO', 'BSE_FO', 'NFO'].includes(segment) && !item.optionType
      }).length,
      options: items.filter(item => {
        const segment = item?.segment?.toUpperCase() || ''
        return ['NSE_FO', 'BSE_FO', 'NFO'].includes(segment) && !!item.optionType
      }).length,
      commodities: items.filter(item => {
        const segment = item?.segment?.toUpperCase() || ''
        const exchange = item?.exchange?.toUpperCase() || ''
        return ['MCX', 'MCX_FO'].includes(segment) || exchange.includes('MCX')
      }).length,
    }
    
    return counts
  }, [activeWatchlist])

  const sortedItems = useMemo(() => {
    try {
      console.log('🔄 [WATCHLIST-MANAGER] sortedItems useMemo triggered', {
        hasActiveWatchlist: !!activeWatchlist,
        itemsCount: activeWatchlist?.items?.length || 0,
        sortBy,
        instrumentFilter,
      })

      if (!activeWatchlist || !activeWatchlist.items) {
        console.log('⚠️ [WATCHLIST-MANAGER] No active watchlist or items, returning empty array')
        return []
      }

      if (!Array.isArray(activeWatchlist.items)) {
        console.error('❌ [WATCHLIST-MANAGER] activeWatchlist.items is not an array:', typeof activeWatchlist.items)
        return []
      }

      let items = [...(activeWatchlist.items || [])]
      console.log(`📋 [WATCHLIST-MANAGER] Starting with ${items.length} items`)

      // Filter by instrument type
      try {
        items = items.filter((item, index) => {
          try {
            const segment = item?.segment?.toUpperCase() || ''
            const optionType = item?.optionType
            
            switch (instrumentFilter) {
              case 'all':
                return true
              case 'equity':
                return ['NSE', 'NSE_EQ', 'BSE', 'BSE_EQ'].includes(segment)
              case 'futures':
                return ['NSE_FO', 'BSE_FO', 'NFO'].includes(segment) && !optionType
              case 'options':
                return ['NSE_FO', 'BSE_FO', 'NFO'].includes(segment) && !!optionType
              case 'commodities':
                return ['MCX', 'MCX_FO'].includes(segment)
              default:
                return true
            }
          } catch (filterError: any) {
            console.error(`❌ [WATCHLIST-MANAGER] Error filtering item ${index}:`, {
              error: filterError.message,
              item,
            })
            return true // Include item on error to prevent data loss
          }
        })
        console.log(`✅ [WATCHLIST-MANAGER] Filtered to ${items.length} items`)
      } catch (filterError: any) {
        console.error('❌ [WATCHLIST-MANAGER] Error during filter:', {
          error: filterError.message,
          stack: filterError.stack,
        })
        // Continue with original items on filter error
      }

      // Sort items
      try {
        items.sort((a, b) => {
          try {
            switch (sortBy) {
              case 'name':
                return (a?.symbol || 'UNKNOWN').localeCompare(b?.symbol || 'UNKNOWN')
              case 'change':
                try {
                  const quoteA = quotes?.[a?.instrumentId || '']
                  const quoteB = quotes?.[b?.instrumentId || '']
                  const priceA = (quoteA as any)?.display_price ?? quoteA?.last_trade_price ?? a?.ltp ?? 0
                  const priceB = (quoteB as any)?.display_price ?? quoteB?.last_trade_price ?? b?.ltp ?? 0
                  const changeA = priceA - (a?.close || 0)
                  const changeB = priceB - (b?.close || 0)
                  return changeB - changeA
                } catch (err: any) {
                  console.error('❌ [WATCHLIST-MANAGER] Error calculating change:', err)
                  return 0
                }
              case 'price':
                try {
                  const quoteA = quotes?.[a?.instrumentId || '']
                  const quoteB = quotes?.[b?.instrumentId || '']
                  const priceA = (quoteA as any)?.display_price ?? quoteA?.last_trade_price ?? a?.ltp ?? 0
                  const priceB = (quoteB as any)?.display_price ?? quoteB?.last_trade_price ?? b?.ltp ?? 0
                  return priceB - priceA
                } catch (err: any) {
                  console.error('❌ [WATCHLIST-MANAGER] Error calculating price:', err)
                  return 0
                }
              case 'added':
              default:
                try {
                  const timeA = a?.createdAt ? new Date(a.createdAt).getTime() : 0
                  const timeB = b?.createdAt ? new Date(b.createdAt).getTime() : 0
                  if (isNaN(timeA) || isNaN(timeB)) return 0
                  return timeB - timeA
                } catch (err: any) {
                  console.error('❌ [WATCHLIST-MANAGER] Error parsing dates:', err)
                  return 0
                }
            }
          } catch (sortError: any) {
            console.error('❌ [WATCHLIST-MANAGER] Error in sort comparison:', {
              error: sortError.message,
              a,
              b,
            })
            return 0 // Return 0 to maintain order on error
          }
        })
        console.log(`✅ [WATCHLIST-MANAGER] Sorted ${items.length} items`)
      } catch (sortError: any) {
        console.error('❌ [WATCHLIST-MANAGER] Error during sort:', {
          error: sortError.message,
          stack: sortError.stack,
        })
        // Return unsorted items on sort error
      }

      console.log(`✅ [WATCHLIST-MANAGER] sortedItems complete: ${items.length} items`)
      return items
    } catch (error: any) {
      console.error('❌ [WATCHLIST-MANAGER] Fatal error in sortedItems useMemo:', {
        error: error.message,
        stack: error.stack,
        activeWatchlist,
        sortBy,
        instrumentFilter,
      })
      return [] // Return empty array on error to prevent crash
    }
  }, [activeWatchlist, sortBy, quotes, instrumentFilter])

  // Handlers
  const handleCreateWatchlist = useCallback(async (data: {
    name: string
    description?: string
    color?: string
    isDefault?: boolean
  }) => {
    try {
      await createWatchlist(data)
      setShowCreateDialog(false)
    } catch (error) {
      // Error is handled by the hook
    }
  }, [createWatchlist])

  const handleEditWatchlist = useCallback(async (data: {
    name?: string
    description?: string
    color?: string
    isDefault?: boolean
  }) => {
    if (!editingWatchlist) return
    
    try {
      await updateWatchlist(editingWatchlist.id, data)
      setShowEditDialog(false)
      setEditingWatchlist(null)
    } catch (error) {
      // Error is handled by the hook
    }
  }, [editingWatchlist, updateWatchlist])

  const handleDeleteWatchlist = useCallback(async (watchlistId: string) => {
    try {
      await deleteWatchlist(watchlistId)
      if (activeTab === watchlistId) {
        setActiveTab("")
      }
    } catch (error) {
      // Error is handled by the hook
    }
  }, [deleteWatchlist, activeTab])

  const handleAddStock = useCallback(async (stockData: string | { stockId?: string; token?: number; symbol?: string; name?: string; exchange?: string; segment?: string; strikePrice?: number; optionType?: 'CE' | 'PE'; expiry?: string; lotSize?: number; instrumentId?: string }) => {
    if (!activeTab) {
      toast({
        title: "No Watchlist Selected",
        description: "Please select a watchlist first.",
        variant: "destructive"
      })
      return
    }

    try {
      // If it's a string (legacy format or token string), try to parse it
      if (typeof stockData === 'string') {
        // Check if it's a token-based format: token:token:symbol:exchange:segment:name
        if (stockData.startsWith('token:')) {
          const parts = stockData.split(':')
          if (parts.length >= 4) {
            await addItem({
              token: parseInt(parts[1], 10),
              symbol: parts[2],
              exchange: parts[3],
              segment: parts[4] || undefined,
              name: parts[5] ? decodeURIComponent(parts[5]) : undefined,
            })
          } else {
            await addItem({ stockId: stockData })
          }
        } else {
          // Regular stockId (UUID)
          await addItem({ stockId: stockData })
        }
      } else {
        // Object with metadata - ensure token is included or can be extracted
        const itemData: any = { ...stockData }
        
        console.log('📝 [WATCHLIST-MANAGER] Adding stock with data:', {
          hasToken: !!itemData.token,
          hasStockId: !!itemData.stockId,
          hasInstrumentId: !!itemData.instrumentId,
          symbol: itemData.symbol,
          exchange: itemData.exchange,
          segment: itemData.segment
        })
        
        // If token is missing but instrumentId exists, try to extract it
        if (!itemData.token && itemData.instrumentId) {
          try {
            const parts = itemData.instrumentId.split('-')
            const lastPart = parts[parts.length - 1]
            const parsedToken = parseInt(lastPart, 10)
            if (!isNaN(parsedToken) && parsedToken > 0) {
              itemData.token = parsedToken
              console.log(`✅ [WATCHLIST-MANAGER] Extracted token ${parsedToken} from instrumentId ${itemData.instrumentId}`)
            }
          } catch (e) {
            console.warn(`⚠️ [WATCHLIST-MANAGER] Failed to extract token:`, e)
          }
        }
        
        // Ensure required fields are present
        if (!itemData.token && !itemData.stockId) {
          const errorMsg = 'Token or stockId is required to add instrument to watchlist. Please ensure the instrument has a valid token.'
          console.error('❌ [WATCHLIST-MANAGER] Missing token and stockId:', itemData)
          throw new Error(errorMsg)
        }
        
        console.log('✅ [WATCHLIST-MANAGER] Calling addItem with:', {
          token: itemData.token,
          symbol: itemData.symbol,
          exchange: itemData.exchange,
          segment: itemData.segment
        })
        
        await addItem(itemData)
      }
      setShowSearchDialog(false)
      await refetchWatchlists()
    } catch (error) {
      console.error('❌ [WATCHLIST-MANAGER] Failed to add stock:', error)
      toast({
        title: "Failed to Add Stock",
        description: error instanceof Error ? error.message : "Could not add stock to watchlist.",
        variant: "destructive"
      })
    }
  }, [activeTab, addItem, refetchWatchlists])

  const handleRemoveItem = useCallback(async (itemId: string) => {
    setRemovingItems(prev => new Set(prev).add(itemId))
    
    try {
      await removeItem(itemId)
      await refetchWatchlists()
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setRemovingItems(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }, [removeItem, refetchWatchlists])

  const handleToggleAlert = useCallback(async (itemId: string, enabled: boolean, price?: number) => {
    try {
      await updateItem(itemId, {
        alertPrice: enabled ? price : undefined,
        alertType: enabled ? "ABOVE" : undefined
      })
      await refetchWatchlists()
    } catch (error) {
      // Error is handled by the hook
    }
  }, [updateItem, refetchWatchlists])

  const handleToggleExpanded = useCallback((itemId: string) => {
    setExpandedItemId(prev => prev === itemId ? null : itemId)
  }, [])

  // Set default watchlist on first load
  React.useEffect(() => {
    if (watchlists.length > 0) {
      if (!activeTab) {
        const defaultWatchlist = watchlists.find(w => w.isDefault) || watchlists[0]
        if (defaultWatchlist) {
          setActiveTab(defaultWatchlist.id)
        }
      } else if (!watchlists.some(w => w.id === activeTab)) {
        // Previously selected tab removed; pick a new default
        const fallback = watchlists.find(w => w.isDefault) || watchlists[0]
        if (fallback) {
          setActiveTab(fallback.id)
        }
      }
    }
  }, [watchlists, activeTab])

  // Handle search input focus to show add stock dialog
  const handleSearchFocus = useCallback(() => {
    setSearchInputFocused(true)
    setShowSearchDialog(true)
  }, [])

  // Only block UI before first load. Keep content during refresh.
  if (watchlistsLoading && watchlists.length === 0) {
    return (
      <div className="space-y-6">
        {/* Tabs skeleton */}
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-36 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse"
            />
          ))}
          <div className="h-12 w-10 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse" />
        </div>

        {/* Search skeleton */}
        <div className="h-11 rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />

        {/* Instrument filter skeleton */}
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-24 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse"
            />
          ))}
        </div>

        {/* Watchlist item rows skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-gray-200 dark:border-gray-800 p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-28 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  <div className="h-3 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                </div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (watchlists.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Eye className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Watchlists
        </h3>
        <p className="text-gray-500 mb-6 max-w-sm mx-auto">
          Create your first watchlist to start tracking stocks
        </p>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Watchlist
        </Button>
      </div>
    )
  }

  return (
    <div className={className}>

      {/* Shadcn Tabs for Watchlists */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl h-auto overflow-x-auto">
          {watchlists.map((watchlist) => (
            <TabsTrigger
              key={watchlist.id}
              value={watchlist.id}
              className="flex items-center gap-2 px-4 py-3 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 min-w-0 flex-shrink-0"
              style={{
                backgroundColor: activeTab === watchlist.id ? watchlist.color + '20' : undefined,
                borderColor: activeTab === watchlist.id ? watchlist.color : undefined,
                borderWidth: activeTab === watchlist.id ? '1px' : undefined,
                minWidth: '140px',
                maxWidth: '180px',
              }}
            >
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: watchlist.color }}
              />
              <span className="font-medium truncate">{watchlist.name}</span>
              <Badge 
                variant="secondary" 
                className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex-shrink-0"
              >
                {watchlist.items.length}
              </Badge>
              {watchlist.isDefault && (
                <Star className="h-3 w-3 text-yellow-500 flex-shrink-0" />
              )}
            </TabsTrigger>
            ))}
            {watchlistsRefreshing && (
              <div className="flex items-center gap-2 ml-2 px-3 py-2 rounded-lg bg-white/60 dark:bg-gray-700/50">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-xs text-gray-600 dark:text-gray-300">Refreshing…</span>
              </div>
            )}
          
          {/* Add New Watchlist Tab - Compact */}
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-200 flex-shrink-0 w-10 h-12"
          >
            <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </TabsList>

        {watchlists.map((watchlist) => (
          <TabsContent key={watchlist.id} value={watchlist.id} className="mt-6">
            {/* Search Input with Sort Icon */}
            <motion.div 
              className="relative mb-6"
              animate={searchInputFocused ? { scale: 1.02 } : { scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search or add stocks..."
                  onFocus={handleSearchFocus}
                  className="pl-11 pr-12 py-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={() => {
                    // Cycle through sort options
                    const sortOptions: SortBy[] = ['added', 'name', 'change', 'price']
                    const currentIndex = sortOptions.indexOf(sortBy)
                    const nextIndex = (currentIndex + 1) % sortOptions.length
                    setSortBy(sortOptions[nextIndex])
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors group relative flex items-center justify-center"
                  title={`Sort by: ${sortBy === 'added' ? 'Recent' : sortBy === 'name' ? 'Name' : sortBy === 'change' ? 'Change' : 'Price'}`}
                >
                  <ArrowUpDown className="h-4 w-4 text-gray-400 hover:text-gray-600 group-hover:scale-110 transition-transform" />
                  {/* Sort indicator dot */}
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full opacity-70"></div>
                </button>
              </div>
            </motion.div>

            {/* Instrument Type Filter Tabs - Enhanced with Counts */}
            <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
              {(['all', 'equity', 'futures', 'options', 'commodities'] as InstrumentTab[]).map((tab, tabIndex) => {
                try {
                  const label = tab === 'all' ? 'All' : 
                               tab === 'equity' ? 'Equity' :
                               tab === 'futures' ? 'Futures' :
                               tab === 'options' ? 'Options' :
                               'MCX'
                  const isActive = instrumentFilter === tab
                  
                  // Get count from pre-computed tabCounts
                  const count = tabCounts[tab] || 0
                  
                  return (
                    <button
                      key={tab}
                      onClick={() => setInstrumentFilter(tab)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
                        isActive 
                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span>{label}</span>
                      <Badge 
                        variant={isActive ? "secondary" : "outline"}
                        className={`text-xs px-1.5 py-0.5 font-semibold ${
                          isActive 
                            ? 'bg-white/20 text-white border-white/30' 
                            : 'bg-white/60 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {count}
                      </Badge>
                    </button>
                  )
                } catch (tabError: any) {
                  console.error(`❌ [WATCHLIST-MANAGER] Error rendering tab ${tabIndex} (${tab}):`, {
                    error: tabError.message,
                    stack: tabError.stack,
                  })
                  return null
                }
              }).filter(Boolean)}
            </div>

            {/* Watchlist Items - Compact */}
            <div className="space-y-2">
              {watchlistsRefreshing && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
                  <span>Refreshing latest items…</span>
                </div>
              )}
              <AnimatePresence mode="popLayout">
                {sortedItems.length === 0 ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="text-center py-12"
                  >
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                      No stocks yet
                    </h3>
                    <p className="text-sm text-gray-500">
                      Tap search to add stocks
                    </p>
                  </motion.div>
                ) : (
                  sortedItems.map((item, itemIndex) => {
                    try {
                      if (!item || !item.id) {
                        console.error(`❌ [WATCHLIST-MANAGER] Invalid item at index ${itemIndex}:`, item)
                        return null
                      }

                      // Debug: Log watchlist item structure and quote lookup attempt
                      if (itemIndex === 0) {
                        console.log('🔍 [WATCHLIST-MANAGER] First item debug:', {
                          itemId: item.id,
                          instrumentId: item.instrumentId,
                          token: item.token,
                          symbol: item.symbol,
                          availableQuoteKeys: Object.keys(quotes || {}),
                          hasToken: !!item.token,
                          hasInstrumentId: !!item.instrumentId
                        })
                      }

                      // CRITICAL FIX: Use token instead of instrumentId for quote lookup
                      // WebSocket stores quotes by token (e.g., "26000"), not instrumentId (e.g., "NSE_EQ-26000")
                      const quoteKey = item.token ? item.token.toString() : (item.instrumentId || '')
                      const quote = quotes?.[quoteKey]
                      
                      // Log if quote is missing to help debug
                      if (!quote && item.token) {
                        console.warn(`⚠️ [WATCHLIST-MANAGER] Quote not found for token ${item.token} (${item.symbol}):`, {
                          searchKey: quoteKey,
                          availableKeys: Object.keys(quotes || {}).slice(0, 5),
                          totalQuotes: Object.keys(quotes || {}).length
                        })
                      }
                      
                      return (
                        <motion.div
                          key={item.watchlistItemId || item.id || `item-${itemIndex}`}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10, scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                        >
                          <WatchlistItemCard
                            item={item}
                            quote={{
                              ...quote,
                          // Mock market depth data for demonstration
                          market_depth: {
                            bid: [
                              { price: (((((quotes[quoteKey] as any)?.display_price ?? quotes[quoteKey]?.last_trade_price) ?? item.ltp))) - 0.5, quantity: 1000 },
                              { price: (((((quotes[quoteKey] as any)?.display_price ?? quotes[quoteKey]?.last_trade_price) ?? item.ltp))) - 1.0, quantity: 2500 },
                              { price: (((((quotes[quoteKey] as any)?.display_price ?? quotes[quoteKey]?.last_trade_price) ?? item.ltp))) - 1.5, quantity: 5000 }
                            ],
                            ask: [
                              { price: (((((quotes[quoteKey] as any)?.display_price ?? quotes[quoteKey]?.last_trade_price) ?? item.ltp))) + 0.5, quantity: 1200 },
                              { price: (((((quotes[quoteKey] as any)?.display_price ?? quotes[quoteKey]?.last_trade_price) ?? item.ltp))) + 1.0, quantity: 1800 },
                              { price: (((((quotes[quoteKey] as any)?.display_price ?? quotes[quoteKey]?.last_trade_price) ?? item.ltp))) + 1.5, quantity: 3200 }
                            ]
                          },
                          // Mock OHLC data
                          ohlc: {
                            open: (((((quotes[quoteKey] as any)?.display_price ?? quotes[quoteKey]?.last_trade_price) ?? item.ltp))) - 2,
                            high: (((((quotes[quoteKey] as any)?.display_price ?? quotes[quoteKey]?.last_trade_price) ?? item.ltp))) + 5,
                            low: (((((quotes[quoteKey] as any)?.display_price ?? quotes[quoteKey]?.last_trade_price) ?? item.ltp))) - 3,
                            close: quotes[quoteKey]?.prev_close_price || item.close,
                            volume: Math.floor(Math.random() * 10000000) + 1000000,
                            turnover: Math.floor(Math.random() * 100000000) + 10000000
                          }
                        }}
                        onSelect={onSelectStock}
                        onEdit={(item) => {
                          // Handle edit item
                          console.log('Edit item:', item)
                        }}
                        onRemove={handleRemoveItem}
                        onToggleAlert={handleToggleAlert}
                        onQuickBuy={onQuickBuy}
                        onQuickSell={onQuickSell}
                        isRemoving={removingItems.has(item.watchlistItemId)}
                        isExpanded={expandedItemId === item.watchlistItemId}
                        onToggleExpanded={() => handleToggleExpanded(item.watchlistItemId)}
                      />
                    </motion.div>
                      )
                    } catch (itemError: any) {
                      console.error(`❌ [WATCHLIST-MANAGER] Error rendering item ${itemIndex}:`, {
                        error: itemError.message,
                        stack: itemError.stack,
                        item,
                      })
                      return null
                    }
                  }).filter(Boolean)
                )}
              </AnimatePresence>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Dialogs */}
      <CreateWatchlistDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreateWatchlist}
      />

      <EditWatchlistDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        watchlist={editingWatchlist}
        onUpdate={handleEditWatchlist}
        onDelete={handleDeleteWatchlist}
      />

      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="bg-white p-0 border-0 max-w-md mx-auto">
          <StockSearch onAddStock={handleAddStock} onClose={() => setShowSearchDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
