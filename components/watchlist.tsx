/**
 * @file watchlist.tsx
 * @description Displays the user's personal stock watchlist.
 * This component is now fully functional, allowing users to add and remove stocks,
 * view live prices, and select a stock to open the order dialog.
 */
"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Eye, Plus, X, Loader2 } from "lucide-react"
import { useSession } from "next-auth/react"
import { toast } from "@/hooks/use-toast"

import { StockSearch } from "./stock-search"
import { addStockToWatchlist, removeStockFromWatchlist } from "@/lib/hooks/use-trading-data"

interface WatchlistItemData {
  id: string
  instrumentId: string
  symbol: string
  name: string
  ltp: number
  close: number
  watchlistItemId: string
}

interface Quote {
  last_trade_price: number;
}

interface WatchlistProps {
  watchlist: { id: string | null; name: string; items: WatchlistItemData[] };
  quotes: Record<string, Quote>;
  onSelectStock: (stock: any) => void;
  onUpdate: () => void;
}

export function Watchlist({ watchlist, quotes, onSelectStock, onUpdate }: WatchlistProps) {
  const { data: session } = useSession()
  const [searchOpen, setSearchOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleAddStock = async (stockId: string) => {
    if (!session?.user?.id) return
    try {
      await addStockToWatchlist(session.user.id, stockId, watchlist.id)
      toast({ title: "Stock Added", description: "Successfully added to your watchlist." })
      onUpdate() // Refetch watchlist data
      setSearchOpen(false)
    } catch (error) {
      toast({
        title: "Failed to Add",
        description: error instanceof Error ? error.message : "Could not add stock.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveStock = async (itemId: string) => {
    setRemovingId(itemId)
    try {
      await removeStockFromWatchlist(itemId)
      toast({ title: "Stock Removed", description: "Successfully removed from your watchlist." })
      onUpdate() // Refetch watchlist data
    } catch (error) {
      toast({
        title: "Failed to Remove",
        description: error instanceof Error ? error.message : "Could not remove stock.",
        variant: "destructive",
      })
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{watchlist.name || 'Watchlist'}</h2>
          <p className="text-sm text-gray-600">Your Personal Market View</p>
        </div>
        <Button size="sm" onClick={() => setSearchOpen(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Add Stock
        </Button>
      </div>

      {watchlist.items.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Eye className="h-8 w-8 mx-auto text-gray-400 mb-3" />
            <h3 className="text-lg font-semibold">Your watchlist is empty</h3>
            <p className="text-sm text-gray-600">
              Click "Add Stock" to search and add your favorite instruments.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-1">
        {watchlist.items.map((item) => {
          const quote = quotes[item.instrumentId]
          const ltp = quote?.last_trade_price || item.ltp
          const change = ltp - item.close
          const changePercent = item.close > 0 ? (change / item.close) * 100 : 0
          return (
            <Card key={item.id} className="group relative cursor-pointer" onClick={() => onSelectStock(item)}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 overflow-hidden">
                    <h3 className="font-semibold text-sm text-gray-900">{item.symbol}</h3>
                    <p className="text-xs text-gray-500 truncate">{item.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                      <div className="font-mono font-semibold">₹{ltp.toFixed(2)}</div>
                      <div className={`text-xs ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {change >= 0 ? "+" : ""}₹{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                      </div>
                  </div>
                </div>
              </CardContent>
               <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 -translate-y-1/2 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => { e.stopPropagation(); handleRemoveStock(item.watchlistItemId); }}
                  disabled={removingId === item.watchlistItemId}
                >
                  {removingId === item.watchlistItemId 
                    ? <Loader2 className="h-4 w-4 animate-spin" /> 
                    : <X className="h-4 w-4 text-gray-500 hover:text-red-600" />
                  }
                </Button>
            </Card>
          )
        })}
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="bg-white p-0 border-0">
          <StockSearch onAddStock={handleAddStock} onClose={() => setSearchOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
