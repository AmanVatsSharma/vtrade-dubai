"use client"

import { useState } from "react"
import { Search, Plus, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { useInstrumentSearch, type SearchTab } from "@/lib/hooks/use-instrument-search"
import type { MilliInstrument } from "@/lib/services/search/milli-client"
import { milliClient } from "@/lib/services/search/milli-client"
import { cn } from "@/lib/utils"

interface Stock {
  id: string
  instrumentId: string
  token: number
  exchange: string
  ticker: string
  symbol: string
  name: string
  segment?: string
  ltp: number
  last_price?: number
  change: number
  changePercent: number
  sector?: string
  expiry_date?: string
  expiry?: string
  strike_price?: number
  strikePrice?: number
  option_type?: 'CE' | 'PE'
  lot_size?: number
  lotSize?: number
}

interface StockSearchProps {
  onAddStock: (stockData: string | { stockId?: string; token?: number; symbol?: string; name?: string; exchange?: string; segment?: string; strikePrice?: number; optionType?: 'CE' | 'PE'; expiry?: string; lotSize?: number }) => void
  onClose: () => void
}

export function StockSearch({ onAddStock, onClose }: StockSearchProps) {
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState<SearchTab>("equity")
  const [addingStockId, setAddingStockId] = useState<string | number | null>(null)
  
  // Use the new search hook
  const { results, loading, error, search } = useInstrumentSearch({
    activeTab,
    debounceMs: 300,
    limit: 20,
  })
  
  console.log('📊 [STOCK-SEARCH] Search results', {
    query,
    activeTab,
    count: results.length,
    loading,
  })
  
  // Trigger search when query changes
  const handleQueryChange = (newQuery: string) => {
    setQuery(newQuery)
    search(newQuery)
  }

  const handleAddStock = async (stock: Stock) => {
    setAddingStockId(stock.id)
    console.log('➕ [STOCK-SEARCH] Adding stock with metadata', { 
      stockId: stock.id, 
      token: stock.token, 
      symbol: stock.symbol,
      exchange: stock.exchange,
      segment: stock.segment,
      expiry: stock.expiry,
      strikePrice: stock.strike_price,
      optionType: stock.option_type,
      lotSize: stock.lot_size,
      stock 
    })
    
    try {
      // Send complete metadata as object for token-based instruments
      if (stock.token) {
        const instrumentData = {
          token: stock.token,
          symbol: stock.symbol,
          name: stock.name,
          exchange: stock.exchange,
          segment: stock.segment,
          expiry: stock.expiry || stock.expiry_date,
          strikePrice: stock.strike_price || stock.strikePrice,
          optionType: stock.option_type,
          lotSize: stock.lot_size || stock.lotSize,
        }
        await onAddStock(instrumentData)
      } else {
        // Fallback to stockId if no token
        await onAddStock(stock.id)
      }
      // best-effort telemetry (non-blocking)
      milliClient.telemetrySelection({ q: query, symbol: stock.symbol, instrumentToken: stock.token })
      onClose()
    } catch (error) {
      console.error('❌ [STOCK-SEARCH] Failed to add stock', error)
      throw error
    } finally {
      setAddingStockId(null)
    }
  }
  
  // Get exchange badge config (similar to WatchlistItemCard)
  const getExchangeBadge = (exchange?: string, segment?: string) => {
    const normalizedExchange = exchange?.toUpperCase() || ''
    const normalizedSegment = segment?.toUpperCase() || ''
    
    if (normalizedExchange.includes('MCX') || normalizedSegment.includes('MCX')) {
      return { label: 'MCX', color: 'bg-amber-100 text-amber-700 border-amber-300' }
    }
    if (normalizedExchange.includes('BSE') || normalizedSegment.includes('BSE')) {
      return { label: 'BSE', color: 'bg-orange-100 text-orange-700 border-orange-300' }
    }
    if (normalizedExchange.includes('NSE_FO') || normalizedExchange.includes('NFO') || normalizedSegment.includes('NFO')) {
      return { label: 'NSE FO', color: 'bg-purple-100 text-purple-700 border-purple-300' }
    }
    return { label: 'NSE', color: 'bg-blue-100 text-blue-700 border-blue-300' }
  }
  
  // Format expiry date
  const formatCompactExpiry = (expiry?: string | null): string => {
    if (!expiry) return ''
    try {
      // Handle YYYYMMDD format
      if (/^\d{8}$/.test(expiry)) {
        const year = expiry.substring(0, 4)
        const month = expiry.substring(4, 6)
        const day = expiry.substring(6, 8)
        const date = new Date(`${year}-${month}-${day}`)
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
      }
      // Handle ISO format
      const date = new Date(expiry)
      if (isNaN(date.getTime())) return expiry
      return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
    } catch {
      return expiry || ''
    }
  }

  return (
    <Drawer open onOpenChange={(open) => { if (!open) onClose() }}>
      <DrawerContent className="h-[95vh] bg-white dark:bg-gray-900 rounded-t-xl">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle className="text-lg font-semibold text-gray-900 dark:text-white">Add to Watchlist</DrawerTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7"><X className="h-4 w-4" /></Button>
        </DrawerHeader>

        <div className="px-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input 
              placeholder="Search by name or ticker..." 
              value={query} 
              onChange={(e) => handleQueryChange(e.target.value)} 
              className="pl-10 h-10 border-gray-300" 
            />
            {query && (
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600" 
                onClick={() => { setQuery(""); }}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SearchTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="equity">Equity</TabsTrigger>
              <TabsTrigger value="futures">Futures</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
              <TabsTrigger value="commodities">MCX</TabsTrigger>
            </TabsList>

            <TabsContent value="equity" className="mt-3" />
            <TabsContent value="futures" className="mt-3" />
            <TabsContent value="options" className="mt-3" />
            <TabsContent value="commodities" className="mt-3" />
          </Tabs>

          {loading && (
            <div className="text-center py-4 text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {error && (
            <div className="text-center py-4 text-red-500">
              Error: {error}
            </div>
          )}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto mt-2">
            {!loading && results.map((instrument: MilliInstrument, index: number) => {
              // Determine segment based on exchange
              const segment = instrument.segment || 
                (instrument.exchange === 'MCX_FO' ? 'MCX_FO' : 
                 instrument.exchange === 'NSE_FO' ? 'NSE_FO' :
                 instrument.exchange.includes('MCX') ? 'MCX_FO' :
                 instrument.exchange.includes('NSE') ? 'NSE' : 'NSE')
              
              const stock: Stock = {
                id: `token-${instrument.token}`,
                instrumentId: instrument.exchange,
                token: instrument.token,
                exchange: instrument.exchange,
                ticker: instrument.symbol,
                symbol: instrument.symbol,
                name: instrument.name || instrument.symbol,
                ltp: instrument.last_price || 0,
                last_price: instrument.last_price,
                change: 0,
                changePercent: 0,
                expiry_date: instrument.expiry_date,
                expiry: instrument.expiry_date,
                strike_price: instrument.strike_price,
                strikePrice: instrument.strike_price,
                option_type: instrument.option_type,
                lot_size: instrument.lot_size,
                lotSize: instrument.lot_size,
                segment, // Add segment field
              }
              
              const isAdding = addingStockId === stock.id
              
              const exchangeBadge = getExchangeBadge(instrument.exchange, segment)
              const isFutures = (activeTab === "futures") || (segment?.includes("FO") && !instrument.option_type)
              const isOption = activeTab === "options" || !!instrument.option_type
              const formattedExpiry = formatCompactExpiry(instrument.expiry_date || (instrument as any).expiry || (instrument as any).expiryDate)
              
              return (
                <div key={`${instrument.token}-${index}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1 overflow-hidden min-w-0">
                    {/* First Row: Symbol + Badges */}
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                        {instrument.symbol}
                      </span>
                      
                      {/* Professional Exchange Badge */}
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs px-1.5 py-0.5 font-medium", exchangeBadge.color)}
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
                            instrument.option_type === 'CE' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                          )}
                        >
                          {instrument.option_type || 'OPT'}
                        </Badge>
                      )}
                      {activeTab === "equity" && (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 font-medium">
                          EQ
                        </Badge>
                      )}
                    </div>
                    
                    {/* Second Row: Instrument Details */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {/* Expiry Date */}
                      {formattedExpiry && (isFutures || isOption) && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-mono border-gray-300 text-gray-600">
                          {formattedExpiry}
                        </Badge>
                      )}
                      
                      {/* Strike Price */}
                      {instrument.strike_price && isOption && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-mono border-gray-300 text-gray-700">
                          ₹{instrument.strike_price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </Badge>
                      )}
                      
                      {/* Lot Size */}
                      {instrument.lot_size && (isFutures || isOption || activeTab === "commodities") && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-mono border-gray-300 text-gray-600">
                          Lot: {instrument.lot_size}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Instrument Name */}
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                      {instrument.name || instrument.symbol}
                    </p>
                  </div>

                  <div className="text-right mx-4 flex-shrink-0">
                    {instrument.last_price ? (
                      <div className="font-medium font-mono text-sm text-gray-900 dark:text-white">
                        ₹{instrument.last_price.toFixed(2)}
                      </div>
                    ) : (
                      <div className="font-medium text-xs text-gray-400">No price</div>
                    )}
                  </div>

                  <Button 
                    size="sm" 
                    onClick={() => handleAddStock(stock)} 
                    disabled={isAdding} 
                    className="bg-blue-600 hover:bg-blue-700 w-16 flex-shrink-0"
                  >
                    {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </div>
              )
            })}
          </div>

          {query.length >= 2 && !loading && results.length === 0 && (
            <div className="text-center py-6 text-gray-500 dark:text-gray-400">
              No results for "{query}"
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
