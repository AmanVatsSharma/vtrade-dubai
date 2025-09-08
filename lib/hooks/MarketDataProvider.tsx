/**
 * @file MarketDataProvider.tsx
 * @description Provides a centralized context for fetching and distributing live market data.
 * This component batches all required instrument IDs (from watchlist, positions, indices)
 * into a single API call. The polling interval has been corrected.
 */
"use client"

import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react"
import { isMarketOpen } from "../market-timing";

const LIVE_PRICE_POLL_INTERVAL = 50000 // Corrected to 5 seconds

interface Quote {
  last_trade_price: number;
}

interface MarketDataContextType {
  quotes: Record<string, Quote>
  isLoading: boolean
}

const MarketDataContext = createContext<MarketDataContextType>({
  quotes: {},
  isLoading: true,
})

export const useMarketData = () => useContext(MarketDataContext)

interface MarketDataProviderProps {
  watchlist: { items: { instrumentId: string }[] } | null
  positions: { instrumentId?: string }[] | null
  children: ReactNode
}

const INDEX_INSTRUMENTS = {
  NIFTY: "NSE_EQ-26000",
  BANKNIFTY: "NSE_EQ-26009",
}

export function MarketDataProvider({ watchlist, positions, children }: MarketDataProviderProps) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [isLoading, setIsLoading] = useState(true)

  const instrumentIds = useMemo(() => {
    const ids = new Set<string>()
    ids.add(INDEX_INSTRUMENTS.NIFTY)
    ids.add(INDEX_INSTRUMENTS.BANKNIFTY)
    watchlist?.items.forEach((item) => item.instrumentId && ids.add(item.instrumentId))
    positions?.forEach((pos) => pos.instrumentId && ids.add(pos.instrumentId))
    return Array.from(ids)
  }, [watchlist, positions])

  useEffect(() => {
    if (instrumentIds.length === 0) {
      setIsLoading(false)
      return
    }

    let isMounted = true;
    const fetchQuotes = async () => {
      try {
        const params = new URLSearchParams()
        instrumentIds.forEach((id) => params.append("q", id))
        const res = await fetch(`/api/quotes?${params.toString()}`)

        if (!res.ok) throw new Error(`Failed to fetch quotes: ${res.statusText}`)
        
        const data = await res.json()
        if (isMounted && data.status === "success" && data.data) {
          setQuotes(data.data)
        }
      } catch (error) {
        console.error("MarketDataProvider Error:", error)
      } finally {
        if (isMounted && isLoading) setIsLoading(false)
      }
    }

    fetchQuotes()
    let interval: NodeJS.Timeout;
    if (isMarketOpen()) {
        interval = setInterval(fetchQuotes, LIVE_PRICE_POLL_INTERVAL);
    } else {
        // Fetch once if the market is closed
        fetchQuotes();
    }

    return () => {
        isMounted = false;
        if (interval) clearInterval(interval);
    }
  }, [instrumentIds, isLoading])

  return (
    <MarketDataContext.Provider value={{ quotes, isLoading }}>
      {children}
    </MarketDataContext.Provider>
  )
}
