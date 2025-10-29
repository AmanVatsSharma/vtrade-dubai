/**
 * @file WatchlistManager.tsx
 * @description Premium watchlist manager with shadcn tabs and modern UI
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

  // Computed values
  const activeWatchlist = useMemo(() => {
    // Preserve last selected tab if still present; otherwise fall back gracefully
    const current = watchlists.find(w => w.id === activeTab)
    return current || watchlists[0]
  }, [watchlists, activeTab])

  const sortedItems = useMemo(() => {
    if (!activeWatchlist) return []
    
    let items = [...activeWatchlist.items]

    // Filter by instrument type
    items = items.filter((item) => {
      const segment = item.segment?.toUpperCase() || ''
      const optionType = item.optionType
      
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
    })

    // Sort items
    items.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.symbol.localeCompare(b.symbol)
        case 'change':
          const changeA = ((((quotes[a.instrumentId] as any)?.display_price ?? quotes[a.instrumentId]?.last_trade_price) ?? a.ltp)) - a.close
          const changeB = ((((quotes[b.instrumentId] as any)?.display_price ?? quotes[b.instrumentId]?.last_trade_price) ?? b.ltp)) - b.close
          return changeB - changeA
        case 'price':
          const priceA = (((quotes[a.instrumentId] as any)?.display_price ?? quotes[a.instrumentId]?.last_trade_price) ?? a.ltp)
          const priceB = (((quotes[b.instrumentId] as any)?.display_price ?? quotes[b.instrumentId]?.last_trade_price) ?? b.ltp)
          return priceB - priceA
        case 'added':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

    return items
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

  const handleAddStock = useCallback(async (stockData: string | { stockId?: string; token?: number; symbol?: string; name?: string; exchange?: string; segment?: string; strikePrice?: number; optionType?: 'CE' | 'PE'; expiry?: string; lotSize?: number }) => {
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
        // Object with metadata
        await addItem(stockData)
      }
      setShowSearchDialog(false)
      await refetchWatchlists()
    } catch (error) {
      // Error is handled by the hook
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
        setActiveTab(defaultWatchlist.id)
      } else if (!watchlists.some(w => w.id === activeTab)) {
        // Previously selected tab removed; pick a new default
        const fallback = watchlists.find(w => w.isDefault) || watchlists[0]
        setActiveTab(fallback.id)
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
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-500">Loading watchlists...</p>
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
              {(['all', 'equity', 'futures', 'options', 'commodities'] as InstrumentTab[]).map((tab) => {
                const label = tab === 'all' ? 'All' : 
                             tab === 'equity' ? 'Equity' :
                             tab === 'futures' ? 'Futures' :
                             tab === 'options' ? 'Options' :
                             'MCX'
                const isActive = instrumentFilter === tab
                
                // Calculate count for each filter
                const count = useMemo(() => {
                  if (!activeWatchlist) return 0
                  
                  let items = [...activeWatchlist.items]
                  
                  switch (tab) {
                    case 'all':
                      return items.length
                    case 'equity':
                      return items.filter(item => {
                        const segment = item.segment?.toUpperCase() || ''
                        return ['NSE', 'NSE_EQ', 'BSE', 'BSE_EQ'].includes(segment)
                      }).length
                    case 'futures':
                      return items.filter(item => {
                        const segment = item.segment?.toUpperCase() || ''
                        return ['NSE_FO', 'BSE_FO', 'NFO'].includes(segment) && !item.optionType
                      }).length
                    case 'options':
                      return items.filter(item => {
                        const segment = item.segment?.toUpperCase() || ''
                        return ['NSE_FO', 'BSE_FO', 'NFO'].includes(segment) && !!item.optionType
                      }).length
                    case 'commodities':
                      return items.filter(item => {
                        const segment = item.segment?.toUpperCase() || ''
                        const exchange = item.exchange?.toUpperCase() || ''
                        return ['MCX', 'MCX_FO'].includes(segment) || exchange.includes('MCX')
                      }).length
                    default:
                      return 0
                  }
                }, [activeWatchlist, tab])
                
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
              })}
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
                  sortedItems.map((item) => (
                    <motion.div
                      key={item.watchlistItemId}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                    >
                      <WatchlistItemCard
                        item={item}
                        quote={{
                          ...quotes[item.instrumentId],
                          // Mock market depth data for demonstration
                          market_depth: {
                            bid: [
                              { price: (((((quotes[item.instrumentId] as any)?.display_price ?? quotes[item.instrumentId]?.last_trade_price) ?? item.ltp))) - 0.5, quantity: 1000 },
                              { price: (((((quotes[item.instrumentId] as any)?.display_price ?? quotes[item.instrumentId]?.last_trade_price) ?? item.ltp))) - 1.0, quantity: 2500 },
                              { price: (((((quotes[item.instrumentId] as any)?.display_price ?? quotes[item.instrumentId]?.last_trade_price) ?? item.ltp))) - 1.5, quantity: 5000 }
                            ],
                            ask: [
                              { price: (((((quotes[item.instrumentId] as any)?.display_price ?? quotes[item.instrumentId]?.last_trade_price) ?? item.ltp))) + 0.5, quantity: 1200 },
                              { price: (((((quotes[item.instrumentId] as any)?.display_price ?? quotes[item.instrumentId]?.last_trade_price) ?? item.ltp))) + 1.0, quantity: 1800 },
                              { price: (((((quotes[item.instrumentId] as any)?.display_price ?? quotes[item.instrumentId]?.last_trade_price) ?? item.ltp))) + 1.5, quantity: 3200 }
                            ]
                          },
                          // Mock OHLC data
                          ohlc: {
                            open: (((((quotes[item.instrumentId] as any)?.display_price ?? quotes[item.instrumentId]?.last_trade_price) ?? item.ltp))) - 2,
                            high: (((((quotes[item.instrumentId] as any)?.display_price ?? quotes[item.instrumentId]?.last_trade_price) ?? item.ltp))) + 5,
                            low: (((((quotes[item.instrumentId] as any)?.display_price ?? quotes[item.instrumentId]?.last_trade_price) ?? item.ltp))) - 3,
                            close: quotes[item.instrumentId]?.prev_close_price || item.close,
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
                  ))
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
