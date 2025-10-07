/**
 * @file MarketDataProvider.tsx
 * @description Enhanced market data provider with smooth transitions, jittering effects, and configurable deviation.
 * Provides near real-time price updates with linear interpolation and randomized micro-movements.
 */
"use client"

import { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback, ReactNode } from "react"
import { usePortfolio, useUserWatchlist, useOrders, usePositions } from "@/lib/hooks/use-trading-data"
import { isMarketOpen } from "./market-timing"

const LIVE_PRICE_POLL_INTERVAL = 3000 // 3 seconds for actual price updates (optimized for responsiveness)
const JITTER_INTERVAL = 250 // 250ms for jitter updates (perfect for realistic market movement)
const INTERPOLATION_STEPS = 50 // Number of interpolation steps
const INTERPOLATION_DURATION = 2800 // Duration of interpolation in ms

// Configuration for market data enhancements
interface MarketDataConfig {
  jitter: {
    enabled: boolean;
    interval: number; // 200-300ms
    intensity: number; // ±0.1-0.2 or percentage
    convergence: number; // How fast jitter converges to real price (0-1)
  };
  deviation: {
    enabled: boolean;
    percentage: number; // 0-100% deviation
    absolute: number; // Fixed deviation amount
  };
  interpolation: {
    enabled: boolean;
    steps: number; // Number of interpolation steps
    duration: number; // Duration of interpolation in ms
  };
}

// Default configuration - perfect balance for realistic market movement with jittering
const DEFAULT_CONFIG: MarketDataConfig = {
  jitter: {
    enabled: true,
    interval: 250,
    intensity: 0.15, // ±0.15 or 0.15% (perfect for realistic market movement)
    convergence: 0.1 // 10% convergence per jitter update (natural movement)
  },
  deviation: {
    enabled: false,
    percentage: 0,
    absolute: 0
  },
  interpolation: {
    enabled: true,
    steps: INTERPOLATION_STEPS,
    duration: INTERPOLATION_DURATION
  }
};

interface EnhancedQuote {
  last_trade_price: number;
  display_price: number; // The price shown to user (with jitter/deviation)
  actual_price: number; // The real LTP
  trend: 'up' | 'down' | 'neutral';
  jitter_offset: number;
  deviation_offset: number;
  timestamp: number;
}

interface MarketDataContextType {
  quotes: Record<string, EnhancedQuote>
  isLoading: boolean
  config: MarketDataConfig
  updateConfig: (newConfig: Partial<MarketDataConfig>) => void
}

const MarketDataContext = createContext<MarketDataContextType>({
  quotes: {},
  isLoading: true,
  config: DEFAULT_CONFIG,
  updateConfig: () => {}
})

export const useMarketData = () => useContext(MarketDataContext)

interface MarketDataProviderProps {
  userId: string;
  children: ReactNode
  config?: Partial<MarketDataConfig>
}

const INDEX_INSTRUMENTS = {
  NIFTY: "NSE_EQ-26000",
  BANKNIFTY: "NSE_EQ-26009",
}

// Utility functions for price calculations
const calculateJitter = (basePrice: number, intensity: number, convergence: number, currentJitter: number): number => {
  const maxJitter = basePrice * (intensity / 100) || intensity; // Support both percentage and absolute
  const randomJitter = (Math.random() - 0.5) * 2 * maxJitter;
  return currentJitter * (1 - convergence) + randomJitter * convergence;
};

const calculateDeviation = (basePrice: number, config: MarketDataConfig['deviation']): number => {
  if (!config.enabled) return 0;
  const percentageDeviation = basePrice * (config.percentage / 100);
  return percentageDeviation + config.absolute;
};

const calculateTrend = (currentPrice: number, previousPrice: number): 'up' | 'down' | 'neutral' => {
  const diff = currentPrice - previousPrice;
  if (Math.abs(diff) < 0.01) return 'neutral';
  return diff > 0 ? 'up' : 'down';
};

const linearInterpolate = (start: number, end: number, progress: number): number => {
  return start + (end - start) * progress;
};

export function MarketDataProvider({ userId, children, config: userConfig }: MarketDataProviderProps) {
  const [quotes, setQuotes] = useState<Record<string, EnhancedQuote>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [config, setConfig] = useState<MarketDataConfig>({ ...DEFAULT_CONFIG, ...userConfig })
  // Keep latest config and quotes in refs to avoid unstable callback deps
  const configRef = useRef<MarketDataConfig>({ ...DEFAULT_CONFIG, ...userConfig })
  useEffect(() => { configRef.current = config }, [config])
  const quotesRef = useRef<Record<string, EnhancedQuote>>({})
  useEffect(() => { quotesRef.current = quotes }, [quotes])
  
  const { watchlist } = useUserWatchlist(userId);
  const { positions } = usePositions(userId);

  // Refs for managing animations and intervals
  const animationFrameRef = useRef<number>()
  const jitterIntervalRef = useRef<ReturnType<typeof setInterval>>()
  const pollIntervalRef = useRef<ReturnType<typeof setInterval>>()
  const interpolationRefs = useRef<Record<string, {
    startPrice: number;
    targetPrice: number;
    startTime: number;
    duration: number;
    isActive: boolean;
  }>>({})
  const jitterRefs = useRef<Record<string, number>>({})
  const pollKeyRef = useRef<string | null>(null)

  const instrumentIds = useMemo(() => {
    const ids = new Set<string>()
    ids.add(INDEX_INSTRUMENTS.NIFTY)
    ids.add(INDEX_INSTRUMENTS.BANKNIFTY)
    watchlist?.items.forEach((item: { instrumentId?: string }) => item.instrumentId && ids.add(item.instrumentId))
    positions?.forEach((pos: { instrumentId?: string }) => pos?.instrumentId && ids.add(pos.instrumentId))
    return Array.from(ids)
  }, [watchlist, positions])

  // Stable key that won't change if the set content is the same
  const instrumentKey = useMemo(() => {
    return instrumentIds.slice().sort().join('|')
  }, [instrumentIds])

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<MarketDataConfig>) => {
    setConfig((prev: MarketDataConfig) => ({
      ...prev,
      ...newConfig,
      jitter: { ...prev.jitter, ...newConfig.jitter },
      deviation: { ...prev.deviation, ...newConfig.deviation },
      interpolation: { ...prev.interpolation, ...newConfig.interpolation }
    }))
  }, [])

  // Enhanced quote processing with jitter and deviation
  const processQuotes = useCallback((rawQuotes: Record<string, any>, previousQuotes: Record<string, EnhancedQuote>) => {
    const processedQuotes: Record<string, EnhancedQuote> = {}
    const now = Date.now()
    const localConfig = configRef.current

    for (const instrumentId in rawQuotes) {
      const quote: any = (rawQuotes as any)[instrumentId]
      const actualPrice = quote?.last_trade_price || 0
  const previousQuote = previousQuotes[instrumentId]
      const previousPrice = previousQuote?.actual_price || actualPrice
      
      // Calculate trend
      const trend = calculateTrend(actualPrice, previousPrice)
      
      // Calculate deviation
      const deviationOffset = calculateDeviation(actualPrice, localConfig.deviation)
      
      // Initialize or update jitter
      if (!jitterRefs.current[instrumentId]) {
        jitterRefs.current[instrumentId] = 0
      }
      
      // Calculate jitter if enabled
      let jitterOffset = 0
      if (localConfig.jitter.enabled) {
        jitterOffset = calculateJitter(
          actualPrice,
          localConfig.jitter.intensity,
          localConfig.jitter.convergence,
          jitterRefs.current[instrumentId]
        )
        jitterRefs.current[instrumentId] = jitterOffset
      }
      
      // Calculate display price
      const displayPrice = actualPrice + deviationOffset + jitterOffset
      
      processedQuotes[instrumentId] = {
        last_trade_price: actualPrice,
        display_price: displayPrice,
        actual_price: actualPrice,
        trend,
        jitter_offset: jitterOffset,
        deviation_offset: deviationOffset,
        timestamp: now
      }
      
      // Set up interpolation if enabled and price changed significantly
      if (localConfig.interpolation.enabled && previousQuote && Math.abs(actualPrice - previousPrice) > 0.01) {
        interpolationRefs.current[instrumentId] = {
          startPrice: previousQuote.display_price,
          targetPrice: displayPrice,
          startTime: now,
          duration: localConfig.interpolation.duration,
          isActive: true
        }
      }
    }

    return processedQuotes
  }, [])

  // Animation loop for smooth interpolation
  const animateInterpolation = useCallback(() => {
    const now = Date.now()
    let hasActiveAnimations = false

    setQuotes((prevQuotes: Record<string, EnhancedQuote>) => {
      const updatedQuotes = { ...prevQuotes }
      
      for (const instrumentId in interpolationRefs.current) {
        const interpolation: any = interpolationRefs.current[instrumentId]
        if (!interpolation?.isActive) continue
        
        const elapsed = now - interpolation.startTime
        const progress = Math.min(elapsed / interpolation.duration, 1)
        
        if (progress >= 1) {
          // Animation complete
          interpolation.isActive = false
          if (updatedQuotes[instrumentId]) {
            updatedQuotes[instrumentId] = {
              ...updatedQuotes[instrumentId],
              display_price: interpolation.targetPrice
            }
          }
        } else {
          // Continue interpolation
          hasActiveAnimations = true
          const interpolatedPrice = linearInterpolate(
            interpolation.startPrice,
            interpolation.targetPrice,
            progress
          )
          
          if (updatedQuotes[instrumentId]) {
            updatedQuotes[instrumentId] = {
              ...updatedQuotes[instrumentId],
              display_price: interpolatedPrice
            }
          }
        }
      }
      
      return updatedQuotes
    })

    if (hasActiveAnimations) {
      animationFrameRef.current = requestAnimationFrame(animateInterpolation)
    }
  }, [])

  // Jitter update function (uses refs to avoid dependency churn)
  const updateJitter = useCallback(() => {
    const localConfig = configRef.current
    if (!localConfig.jitter.enabled) return

    setQuotes((prevQuotes: Record<string, EnhancedQuote>) => {
      const updatedQuotes = { ...prevQuotes }
      
      for (const instrumentId in prevQuotes) {
        const quote = prevQuotes[instrumentId] as EnhancedQuote
        const newJitter = calculateJitter(
          quote.actual_price,
          localConfig.jitter.intensity,
          localConfig.jitter.convergence,
          jitterRefs.current[instrumentId] || 0
        )
        
        jitterRefs.current[instrumentId] = newJitter
        
        const deviationOffset = calculateDeviation(quote.actual_price, localConfig.deviation)
        const displayPrice = quote.actual_price + deviationOffset + newJitter
        
        updatedQuotes[instrumentId] = {
          ...quote,
          display_price: displayPrice,
          jitter_offset: newJitter,
          deviation_offset: deviationOffset
        }
      }
      
      return updatedQuotes
    })
  }, [])

  // Main fetch function - optimized with error handling and retry logic
  const fetchQuotes = useCallback(async (retryCount = 0) => {
      try {
        const params = new URLSearchParams()
        const ids = instrumentKey ? instrumentKey.split('|').filter(Boolean) : []
        
        if (ids.length === 0) {
          setIsLoading(false)
          return
        }
        
        ids.forEach((id: string) => params.append("q", id))
        
        // Add timeout for better error handling
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
        
        const res = await fetch(`/api/quotes?${params.toString()}`, {
          signal: controller.signal,
          cache: 'no-store'
        })
        
        clearTimeout(timeoutId)

        if (!res.ok) throw new Error(`Failed to fetch quotes: ${res.statusText}`)
        const raw = await res.json()

        // Accept multiple response shapes from quotes API
        let quotesPayload: any = raw
        if (raw?.success) quotesPayload = raw.data ?? raw
        if (raw?.status === 'success') quotesPayload = raw.data ?? raw
        if (quotesPayload?.data && typeof quotesPayload.data === 'object') {
          quotesPayload = quotesPayload.data
        }
        
        const processedQuotes = processQuotes(quotesPayload, quotesRef.current)
        setQuotes(processedQuotes)
        
        // Start interpolation animation if enabled
        if (configRef.current.interpolation.enabled) {
          animationFrameRef.current = requestAnimationFrame(animateInterpolation)
        }
      
      } catch (error) {
        console.error("MarketDataProvider Error:", error)
        
        // Retry logic for failed fetches (up to 2 retries)
        if (retryCount < 2) {
          console.log(`Retrying fetch (attempt ${retryCount + 1})...`)
          setTimeout(() => fetchQuotes(retryCount + 1), 1000)
        }
      } finally {
        setIsLoading(false)
      }
  }, [instrumentKey, processQuotes, animateInterpolation])

  // Main effect for setting up polling only (jitter handled separately)
  useEffect(() => {
    if (!instrumentKey) {
      setIsLoading(false)
      return
    }

    const keyChanged = pollKeyRef.current !== instrumentKey
    if (keyChanged) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      pollKeyRef.current = instrumentKey

      // Initial fetch on key change
      fetchQuotes()

            // Set up polling interval - optimized for smooth enterprise-grade experience
      // Always poll to keep UI alive and responsive, regardless of market status
      pollIntervalRef.current = setInterval(() => fetchQuotes(), LIVE_PRICE_POLL_INTERVAL)
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [instrumentKey, fetchQuotes])

  // Update jitter interval when config changes
  useEffect(() => {
    if (jitterIntervalRef.current) {
      clearInterval(jitterIntervalRef.current)
    }
    
    if (config.jitter.enabled) {
      jitterIntervalRef.current = setInterval(updateJitter, config.jitter.interval)
    }

    return () => {
      if (jitterIntervalRef.current) {
        clearInterval(jitterIntervalRef.current)
      }
    }
  }, [config.jitter.enabled, config.jitter.interval, updateJitter])

  // Ensure loading flips off once quotes arrive (extra safety)
  useEffect(() => {
    if (isLoading && quotes && Object.keys(quotes).length > 0) {
      setIsLoading(false)
    }
  }, [quotes, isLoading])

  return (
    <MarketDataContext.Provider value={{ quotes, isLoading, config, updateConfig }}>
      {children}
    </MarketDataContext.Provider>
  )
}