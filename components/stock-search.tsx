"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Plus, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { searchEquities, searchFutures, searchOptions } from "@/lib/hooks/use-trading-data"
import { useDebounce } from "@/hooks/use-debounce" // A common utility hook for search

interface Stock {
  id: string
  instrumentId: string
  exchange: string
  ticker: string
  name: string
  ltp: number
  change: number
  changePercent: number
  sector?: string
  expiry?: string // Added for futures/options
  strikePrice?: number // Added for options
  lotSize?: number // Added for futures/options
}

interface StockSearchProps {
  onAddStock: (stockId: string) => void
  onClose: () => void
}

export function StockSearch({ onAddStock, onClose }: StockSearchProps) {
  const [query, setQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"equity" | "futures" | "options">("equity")
  const [results, setResults] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)
  const [addingStockId, setAddingStockId] = useState<string | null>(null)

  const { debouncedValue: debouncedQuery, cancel } = useDebounce(query, 300);

  const runSearch = useCallback(async (searchQuery: string, tab: "equity" | "futures" | "options") => {
    if (searchQuery.length < 2) { setResults([]); return }
    setLoading(true)
    try {
      let data: Stock[] = []
      if (tab === "equity") data = await searchEquities(searchQuery)
      else if (tab === "futures") data = await searchFutures(searchQuery)
      else data = await searchOptions(searchQuery)
      setResults(data || [])
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { runSearch(debouncedQuery, activeTab) }, [debouncedQuery, activeTab, runSearch])

  const handleAddStock = async (stock: Stock) => {
    setAddingStockId(stock.id);
    try {
      await onAddStock(stock.id);
      onClose();
    } finally {
      setAddingStockId(null);
    }
  };

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
            <Input placeholder="Search by name or ticker..." value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10 h-10 border-gray-300" />
            <button className="absolute right-3 top-1/2 text-gray-400 h-4 w-4" onClick={() => { setQuery(""); cancel(); setResults([]); }}>Clear</button>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="equity">Equity</TabsTrigger>
              <TabsTrigger value="futures">Futures</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
            </TabsList>

            <TabsContent value="equity" className="mt-3" />
            <TabsContent value="futures" className="mt-3" />
            <TabsContent value="options" className="mt-3" />
          </Tabs>

          {loading && <div className="text-center py-4 text-gray-500 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Searching...</div>}

          <div className="space-y-2 max-h-[60vh] overflow-y-auto mt-2">
            {!loading && results.map((stock) => (
              <div key={stock.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-900">{stock.ticker}</span>
                    <Badge variant="outline" className="text-xs">{stock.exchange}</Badge>
                    {activeTab !== "equity" && stock?.expiry && (
                      <span className="text-[10px] bg-gray-100 rounded px-2 py-0.5">Exp: {new Date(stock.expiry).toLocaleDateString()}</span>
                    )}
                    {activeTab === "options" && stock?.strikePrice && (
                      <span className="text-[10px] bg-gray-100 rounded px-2 py-0.5">Strike: ₹{stock.strikePrice}</span>
                    )}
                    {activeTab !== "equity" && stock?.lotSize && (
                      <span className="text-[10px] bg-gray-100 rounded px-2 py-0.5">Lot: {stock.lotSize}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 truncate">{stock.name}</p>
                </div>

                <div className="text-right mx-4 flex-shrink-0">
                  <div className="font-medium font-mono text-sm">₹{stock.ltp.toFixed(2)}</div>
                  <div className={`text-xs ${stock.change >= 0 ? "text-green-600" : "text-red-600"}`}>{stock.change >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%</div>
                </div>

                <Button size="sm" onClick={() => handleAddStock(stock)} disabled={addingStockId === stock.id} className="bg-blue-600 hover:bg-blue-700 w-16">
                  {addingStockId === stock.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                </Button>
              </div>
            ))}
          </div>

          {debouncedQuery.length >= 2 && !loading && results.length === 0 && (
            <div className="text-center py-6 text-gray-500">No results for "{debouncedQuery}"</div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
