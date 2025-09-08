"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Plus, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { searchStocks } from "@/lib/hooks/use-trading-data" // Import the correct search function
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
}

interface StockSearchProps {
  onAddStock: (stockId: string) => void
  onClose: () => void
}

export function StockSearch({ onAddStock, onClose }: StockSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Stock[]>([])
  const [loading, setLoading] = useState(false)
  const [addingStockId, setAddingStockId] = useState<string | null>(null)

  const { debouncedValue: debouncedQuery, cancel } = useDebounce(query, 300);

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const data = await searchStocks(searchQuery) // Use the GraphQL function
      setResults(data || [])
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    handleSearch(debouncedQuery)
  }, [debouncedQuery, handleSearch])

  const handleAddStock = async (stock: Stock) => {
    setAddingStockId(stock.id);
    await onAddStock(stock.id)
    setAddingStockId(null);
  }

  return (
    <Card className="p-4 space-y-4 bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Add Stock to Watchlist</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search stocks by name or ticker..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-10 border-gray-300"
        />
        <button
          className="absolute right-3 top-1/2 text-gray-400 h-4 w-4"
          onClick={() => { setQuery(""); cancel(); setResults([]); }}>
          Clear
        </button>

      </div>

      {loading && <div className="text-center py-4 text-gray-500 flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Searching...</div>}

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {!loading && results.map((stock) => (
          <div key={stock.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex-1 overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">{stock.ticker}</span>
                <Badge variant="outline" className="text-xs">{stock.exchange}</Badge>
              </div>
              <p className="text-xs text-gray-600 truncate">{stock.name}</p>
            </div>

            <div className="text-right mx-4 flex-shrink-0">
              <div className="font-medium font-mono text-sm">₹{stock.ltp.toFixed(2)}</div>
              <div className={`text-xs ${stock.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {stock.change >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
              </div>
            </div>

            <Button size="sm" onClick={() => handleAddStock(stock)} disabled={addingStockId === stock.id} className="bg-blue-600 hover:bg-blue-700 w-16">
              {addingStockId === stock.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        ))}
      </div>

      {debouncedQuery.length >= 2 && !loading && results.length === 0 && (
        <div className="text-center py-4 text-gray-500">No stocks found for "{debouncedQuery}"</div>
      )}
    </Card>
  )
}
