"use client"

import { useState } from "react"
import { Search, Plus, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { useInstrumentSearch, type SearchTab } from "@/lib/hooks/use-instrument-search"
import type { Instrument } from "@/lib/services/market-data/search-client"

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
    console.log('➕ [STOCK-SEARCH] Adding stock', { stockId: stock.id, token: stock.token, stock })
    
    try {
      // Call the parent's onAddStock 
      // Format: token:{token}:{symbol}:{exchange}:{segment}:{name}
      if (stock.token) {
        // Build comprehensive token string with all metadata
        const tokenStr = `token:${stock.token}:${stock.symbol}:${stock.exchange}:${stock.segment || ''}:${encodeURIComponent(stock.name || '')}`
        await onAddStock(tokenStr)
      } else {
        await onAddStock(stock.id)
      }
      onClose()
    } catch (error) {
      console.error('❌ [STOCK-SEARCH] Failed to add stock', error)
      throw error
    } finally {
      setAddingStockId(null)
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
            {!loading && results.map((instrument: Instrument, index: number) => {
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
              
              return (
                <div key={`${instrument.token}-${index}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{instrument.symbol}</span>
                      <Badge variant="outline" className="text-xs">{instrument.exchange}</Badge>
                      {instrument.token && (
                        <Badge variant="secondary" className="text-xs">#{instrument.token}</Badge>
                      )}
                      {(activeTab === "futures" || activeTab === "options") && instrument.expiry_date && (
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5">
                          Exp: {instrument.expiry_date}
                        </span>
                      )}
                      {activeTab === "options" && instrument.strike_price && (
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5">
                          Strike: ₹{instrument.strike_price}
                        </span>
                      )}
                      {instrument.lot_size && (
                        <span className="text-[10px] bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5">
                          Lot: {instrument.lot_size}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {instrument.name || instrument.symbol}
                    </p>
                  </div>

                  <div className="text-right mx-4 flex-shrink-0">
                    {instrument.last_price ? (
                      <div className="font-medium font-mono text-sm">₹{instrument.last_price.toFixed(2)}</div>
                    ) : (
                      <div className="font-medium text-xs text-gray-400">No price</div>
                    )}
                  </div>

                  <Button 
                    size="sm" 
                    onClick={() => handleAddStock(stock)} 
                    disabled={isAdding} 
                    className="bg-blue-600 hover:bg-blue-700 w-16"
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
