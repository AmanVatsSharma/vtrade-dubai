/**
 * @file watchlist.tsx
 * @description Combined version: UI from first file, logic from second file.
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
import { formatExpiryDateIST } from "@/lib/date-utils"

interface WatchlistItemData {
  id: string
  instrumentId: string
  symbol: string
  name: string
  ltp: number
  close: number
  watchlistItemId: string
  segment?: string
  strikePrice?: number
  optionType?: string
  expiry?: string
  lotSize?: number
}

interface Quote {
  last_trade_price: number
}

interface WatchlistProps {
  watchlist: { id: string | null; name: string; items: WatchlistItemData[] }
  quotes: Record<string, Quote>
  onSelectStock: (stock: any) => void
  onUpdate: () => void
}

export function Watchlist({ watchlist, quotes, onSelectStock, onUpdate }: WatchlistProps) {
  const { data: session } = useSession()
  const [searchOpen, setSearchOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  // --- Correct Logic (from 2nd file) ---
  const handleAddStock = async (stockId: string) => {
    if (!session?.user?.id) return Promise.reject();
    try {
      await addStockToWatchlist(session.user.id, stockId, watchlist.id);
      toast({ title: "Stock Added", description: "Successfully added to your watchlist." });
      await onUpdate();
      setSearchOpen(false);
      return Promise.resolve();
    } catch (error) {
      toast({
        title: "Failed to Add",
        description: error instanceof Error ? error.message : "Could not add stock.",
        variant: "destructive",
      });
      return Promise.reject(error);
    }
  };

  const handleRemoveStock = async (itemId: string) => {
    setRemovingId(itemId)
    try {
      await removeStockFromWatchlist(itemId)
      toast({ title: "Stock Removed", description: "Successfully removed from your watchlist." })
      onUpdate()
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

  // --- UI (from 1st file) ---
  return (
    <div className="space-y-4 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Watchlist</h2>
        </div>
        <Button onClick={() => setSearchOpen(true)} className="rounded-full h-10 w-10 p-0 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid gap-4">
        {watchlist?.items.length === 0 ? (
          <Card className="rounded-xl shadow-md border-gray-100 p-6 text-center text-gray-500">
            <p>Your watchlist is empty. Add some stocks to get started!</p>
          </Card>
        ) : (
          watchlist?.items.map((item) => {
            const quote = quotes[item.instrumentId]
            const ltp = ((quote as any)?.display_price ?? quote?.last_trade_price) ?? item.ltp
            const change = ltp - item.close
            const changePercent = item.close > 0 ? (change / item.close) * 100 : 0
            const isFutures = item.segment === "NFO" && !item.optionType
            const isOption = item.segment === "NFO" && !!item.optionType
            return (
              <Card
                key={item.watchlistItemId}
                onClick={() => onSelectStock({ ...item, ltp, change, changePercent })}
                className="group relative rounded-xl shadow-md border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer overflow-hidden bg-white dark:bg-gray-800"
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 overflow-hidden pr-10">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{item.symbol}</span>
                      {isFutures && <span className="bg-blue-100 text-blue-700 rounded px-2 py-0.5 text-xs">FUT</span>}
                      {isOption && <span className="bg-yellow-100 text-yellow-700 rounded px-2 py-0.5 text-xs">OPT</span>}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{item.name}</p>
                    {(isFutures || isOption) && (
                      <div className="flex flex-wrap gap-2 mt-1 text-xs">
                        {item.expiry && <span className="bg-gray-100 rounded px-2 py-0.5">Exp: {formatExpiryDateIST(item.expiry)}</span>}
                        {isOption && item.strikePrice !== undefined && <span className="bg-gray-100 rounded px-2 py-0.5">Strike: ₹{item.strikePrice}</span>}
                        {isOption && item.optionType && <span className="bg-gray-100 rounded px-2 py-0.5">{item.optionType}</span>}
                        {item.lotSize && <span className="bg-gray-100 rounded px-2 py-0.5">Lot: {item.lotSize}</span>}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="font-mono font-semibold">₹{ltp.toFixed(2)}</div>
                    <div className={`text-xs ${change >= 0 ? "text-green-600" : "text-red-600"}`}>{change >= 0 ? "+" : ""}₹{change.toFixed(2)} ({changePercent.toFixed(2)}%)</div>
                  </div>
                </CardContent>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-1/2 -translate-y-1/2 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemoveStock(item.watchlistItemId)
                  }}
                  disabled={removingId === item.watchlistItemId}
                >
                  {removingId === item.watchlistItemId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 text-gray-500 hover:text-red-600" />
                  )}
                </Button>
              </Card>
            )
          })
        )}
      </div>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="bg-white p-0 border-0">
          <StockSearch onAddStock={handleAddStock} onClose={() => setSearchOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  )
}
