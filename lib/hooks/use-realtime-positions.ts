/**
 * @file use-realtime-positions.ts
 * @module lib/hooks/use-realtime-positions
 * @description Shared hook to stream positions (open + closed) with optimistic UX.
 * @author BharatERP
 * @created 2025-11-06
 */

/**
 * Real-time Positions Hook
 *
 * Provides real-time position updates with:
 * - Optimistic UI updates
 * - Smart polling with SWR
 * - Automatic refresh after mutations
 * - Real-time P&L updates
 * - Comprehensive error handling
 * - Input validation
 * - Retry logic
 */

"use client"

import useSWR from 'swr'
import { useCallback, useEffect, useRef } from 'react'
import { useSharedSSE } from './use-shared-sse'

// Types
interface Position {
  id: string
  symbol: string
  quantity: number
  averagePrice: number
  unrealizedPnL: number
  dayPnL: number
  realizedPnL?: number
  bookedPnL?: number
  status?: "OPEN" | "CLOSED"
  isClosed?: boolean
  stopLoss?: number | null
  target?: number | null
  createdAt: string
  stock?: any
  currentPrice?: number
  currentValue?: number
  investedValue?: number
}

interface PositionsResponse {
  success: boolean
  positions: Position[]
  meta?: {
    pnlMode?: "client" | "server"
    workerHealthy?: boolean
  }
  error?: string
}

interface UseRealtimePositionsReturn {
  positions: Position[]
  isLoading: boolean
  error: Error | null
  pnlMeta: { pnlMode: "client" | "server"; workerHealthy: boolean }
  refresh: () => Promise<any>
  optimisticAddPosition: (newPosition: Partial<Position>) => void
  optimisticClosePosition: (positionId: string, exitPrice?: number) => void
  mutate: any
  retryCount: number
}

// Enhanced fetcher with better error handling
const fetcher = async (url: string): Promise<PositionsResponse> => {
  try {
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Unauthorized: Please login again')
      } else if (res.status === 403) {
        throw new Error('Forbidden: Access denied')
      } else if (res.status === 404) {
        throw new Error('Positions endpoint not found')
      } else if (res.status >= 500) {
        throw new Error('Server error: Please try again later')
      }
      throw new Error(`Failed to fetch positions: ${res.status} ${res.statusText}`)
    }
    
    const data = await res.json()
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format')
    }
    
    if (data.success === false && data.error) {
      throw new Error(data.error)
    }
    
    return data
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ [REALTIME-POSITIONS] Fetch error:', {
        message: error.message,
        url,
        timestamp: new Date().toISOString()
      })
    }
    throw error
  }
}

// Validation helpers
function validatePosition(position: any): position is Partial<Position> {
  if (!position || typeof position !== 'object') {
    console.warn('⚠️ [REALTIME-POSITIONS] Invalid position object:', position)
    return false
  }
  
  if (position.id && typeof position.id !== 'string') {
    console.warn('⚠️ [REALTIME-POSITIONS] Invalid position ID:', position.id)
    return false
  }
  
  if (position.symbol && typeof position.symbol !== 'string') {
    console.warn('⚠️ [REALTIME-POSITIONS] Invalid symbol:', position.symbol)
    return false
  }
  
  if (position.quantity !== undefined) {
    if (typeof position.quantity !== 'number' || isNaN(position.quantity)) {
      console.warn('⚠️ [REALTIME-POSITIONS] Invalid quantity:', position.quantity)
      return false
    }

    if (position.status && position.status !== "OPEN" && position.status !== "CLOSED") {
      console.warn("⚠️ [REALTIME-POSITIONS] Invalid status:", position.status)
      return false
    }
  }
  
  if (position.averagePrice !== undefined) {
    if (typeof position.averagePrice !== 'number' || isNaN(position.averagePrice) || position.averagePrice <= 0) {
      console.warn('⚠️ [REALTIME-POSITIONS] Invalid average price:', position.averagePrice)
      return false
    }
  }
  
  return true
}

function validatePositionId(positionId: any): positionId is string {
  if (typeof positionId !== 'string' || positionId.trim().length === 0) {
    console.warn('⚠️ [REALTIME-POSITIONS] Invalid position ID:', positionId)
    return false
  }
  return true
}

export function useRealtimePositions(userId: string | undefined | null): UseRealtimePositionsReturn {
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const lastSyncRef = useRef<number>(Date.now())
  const pollErrorStreakRef = useRef(0)
  const revalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_REALTIME === 'true' || process.env.NODE_ENV === 'development'
  
  // Initial data fetch - polling handled by adaptive useEffect below
  const { data, error, isLoading, mutate } = useSWR<PositionsResponse>(
    userId ? `/api/trading/positions/list?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: 0, // Disabled - we use adaptive manual polling instead
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000,
      shouldRetryOnError: true,
      errorRetryCount: maxRetries,
      errorRetryInterval: 5000,
      onError: (err) => {
        retryCountRef.current += 1
        console.error(`❌ [REALTIME-POSITIONS] Error (attempt ${retryCountRef.current}/${maxRetries}):`, err.message)
      },
      onSuccess: () => {
        if (retryCountRef.current > 0) {
          console.info('✅ [REALTIME-POSITIONS] Recovered from error')
          retryCountRef.current = 0
        }
        lastSyncRef.current = Date.now()
      }
    }
  )

  const scheduleRevalidate = useCallback(() => {
    if (revalidateTimerRef.current) return
    revalidateTimerRef.current = setTimeout(() => {
      revalidateTimerRef.current = null
      mutate().catch((err) => {
        console.error('❌ [REALTIME-POSITIONS] Debounced revalidation failed:', err)
      })
    }, 450)
  }, [mutate])

  // Shared SSE connection for real-time updates
  const { isConnected, connectionState } = useSharedSSE(userId, useCallback((message) => {
    // Handle position-related events
    if (message.event === 'positions_pnl_updated') {
      if (DEBUG) console.debug(`📨 [REALTIME-POSITIONS] SSE ${message.event} → patch (no refetch)`)

      try {
        mutate((currentData: PositionsResponse | undefined) => {
          const updates = (message.data as any)?.updates
          if (!currentData || !Array.isArray(currentData.positions) || !Array.isArray(updates) || updates.length === 0) {
            return currentData
          }

          const map = new Map<string, any>()
          updates.forEach((u: any) => {
            if (typeof u?.positionId === "string") map.set(u.positionId, u)
          })
          if (map.size === 0) return currentData

          const nextPositions = currentData.positions.map((p: any) => {
            const u = map.get(p?.id)
            if (!u) return p

            const quantity = Number(p.quantity || 0)
            const avg = Number(p.averagePrice || 0)
            const currentPrice = u.currentPrice != null ? Number(u.currentPrice) : p.currentPrice

            const currentValue =
              typeof currentPrice === "number" && Number.isFinite(currentPrice)
                ? currentPrice * quantity
                : p.currentValue
            const investedValue = avg * quantity

            return {
              ...p,
              unrealizedPnL: u.unrealizedPnL != null ? Number(u.unrealizedPnL) : p.unrealizedPnL,
              dayPnL: u.dayPnL != null ? Number(u.dayPnL) : p.dayPnL,
              currentPrice,
              currentValue,
              investedValue,
            }
          })

          return { ...currentData, positions: nextPositions }
        }, false)
      } catch (e) {
        console.error('❌ [REALTIME-POSITIONS] PnL patch failed:', e)
      }

      lastSyncRef.current = Date.now()
      return
    }

    if (message.event === 'position_opened' || 
        message.event === 'position_closed' || 
        message.event === 'position_updated') {
      if (DEBUG) console.debug(`📨 [REALTIME-POSITIONS] SSE ${message.event} → patch+revalidate`)

      try {
        mutate((currentData: PositionsResponse | undefined) => {
          if (!currentData || !Array.isArray(currentData.positions)) return currentData

          const d: any = message.data || {}
          const id = d.positionId as string | undefined
          if (!id) return currentData

          const idx = currentData.positions.findIndex((p: any) => p?.id === id)
          const isClosed = message.event === 'position_closed' || Number(d.quantity) === 0

          if (idx === -1) {
            // Add new position stub
            const stub: Position = {
              id,
              symbol: String(d.symbol || 'UNKNOWN'),
              quantity: Number(d.quantity || 0),
              averagePrice: Number(d.averagePrice || 0),
              unrealizedPnL: Number(d.realizedPnL || 0),
              dayPnL: Number(d.realizedPnL || 0),
              realizedPnL: isClosed ? Number(d.realizedPnL || 0) : undefined,
              bookedPnL: isClosed ? Number(d.realizedPnL || 0) : undefined,
              status: isClosed ? "CLOSED" : "OPEN",
              isClosed,
              stopLoss: null,
              target: null,
              createdAt: message.timestamp || new Date().toISOString(),
              stock: undefined,
            }
            return { ...currentData, positions: [stub, ...currentData.positions] }
          }

          const updated = [...currentData.positions]
          const prev = updated[idx] as any
          updated[idx] = {
            ...prev,
            quantity: d.quantity != null ? Number(d.quantity) : prev.quantity,
            averagePrice: d.averagePrice != null ? Number(d.averagePrice) : prev.averagePrice,
            status: isClosed ? "CLOSED" : "OPEN",
            isClosed,
            realizedPnL: isClosed ? (d.realizedPnL != null ? Number(d.realizedPnL) : prev.realizedPnL) : prev.realizedPnL,
            bookedPnL: isClosed ? (d.realizedPnL != null ? Number(d.realizedPnL) : prev.bookedPnL) : prev.bookedPnL,
          }

          return { ...currentData, positions: updated }
        }, false)
      } catch (e) {
        console.error('❌ [REALTIME-POSITIONS] Cache patch failed:', e)
      }

      scheduleRevalidate()
      lastSyncRef.current = Date.now() // Update last sync time on event
    }
  }, [mutate, DEBUG, scheduleRevalidate]))

  // Adaptive polling with backoff + visibility-awareness
  useEffect(() => {
    if (!userId) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const computeDelayMs = () => {
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
      if (hidden) return 60000

      const base = isConnected ? 15000 : 3000
      const max = isConnected ? 60000 : 20000
      const streak = pollErrorStreakRef.current
      const exp = Math.min(6, streak)
      const raw = Math.min(max, base * Math.pow(2, exp))
      const jitter = raw * 0.2 * (Math.random() - 0.5)
      return Math.max(1000, Math.round(raw + jitter))
    }

    const schedule = () => {
      if (cancelled) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(tick, computeDelayMs())
    }

    const tick = async () => {
      if (cancelled) return

      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
      if (hidden) {
        schedule()
        return
      }

      try {
        await mutate()
        pollErrorStreakRef.current = 0
        lastSyncRef.current = Date.now()
      } catch (err) {
        pollErrorStreakRef.current += 1
        console.error('❌ [REALTIME-POSITIONS] Poll sync failed:', err)
      } finally {
        schedule()
      }
    }

    const onVisible = () => {
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
      if (!hidden) {
        if (DEBUG) console.debug('[REALTIME-POSITIONS] visibilitychange → refresh')
        mutate().catch((err) => console.error('❌ [REALTIME-POSITIONS] Refresh on visible failed:', err))
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    schedule()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [userId, isConnected, mutate, DEBUG])

  // Log sync status periodically
  useEffect(() => {
    if (!DEBUG) return

    const syncCheckInterval = setInterval(() => {
      const timeSinceLastSync = Date.now() - lastSyncRef.current
      const syncStatus = isConnected ? 'SSE+Poll' : 'Poll-only'
      console.debug(`🔄 [REALTIME-POSITIONS] Sync check - ${syncStatus}, last sync: ${Math.round(timeSinceLastSync / 1000)}s ago`)
    }, 60000)

    return () => clearInterval(syncCheckInterval)
  }, [isConnected, DEBUG])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (revalidateTimerRef.current) clearTimeout(revalidateTimerRef.current)
      revalidateTimerRef.current = null
    }
  }, [])

  // Refresh function
  const refresh = useCallback(async () => {
    console.info("🔄 [REALTIME-POSITIONS] Manual refresh triggered")
    try {
      return await mutate()
    } catch (error) {
      console.error("❌ [REALTIME-POSITIONS] Manual refresh failed:", error)
      throw error
    }
  }, [mutate])

  // Optimistic update for new position with validation
  const optimisticAddPosition = useCallback((newPosition: Partial<Position>) => {
    if (!validatePosition(newPosition)) {
      console.error('❌ [REALTIME-POSITIONS] Cannot add position: Invalid position data')
      return
    }
    
    console.log("⚡ [REALTIME-POSITIONS] Optimistic add:", newPosition.id)
    
    try {
      mutate(
        (currentData: PositionsResponse | undefined) => {
          if (!currentData) {
            console.warn('⚠️ [REALTIME-POSITIONS] No current data for optimistic update')
            return currentData
          }
          
          if (!Array.isArray(currentData.positions)) {
            console.warn('⚠️ [REALTIME-POSITIONS] Invalid positions array in current data')
            return currentData
          }
          
          // Check if position already exists (update quantity)
            const existingIndex = currentData.positions.findIndex(
              (p: Position) => p.symbol === newPosition.symbol
            )
          
          if (existingIndex >= 0) {
            const updated = [...currentData.positions]
            const existingPosition = updated[existingIndex]
            
            // Safe quantity update
            const newQuantity = (existingPosition.quantity || 0) + (newPosition.quantity || 0)
            
              updated[existingIndex] = {
                ...existingPosition,
                quantity: newQuantity,
                status: newQuantity === 0 ? "CLOSED" : "OPEN",
                isClosed: newQuantity === 0,
                realizedPnL:
                  newQuantity === 0
                    ? existingPosition.realizedPnL ?? existingPosition.unrealizedPnL ?? 0
                    : existingPosition.realizedPnL,
                bookedPnL:
                  newQuantity === 0
                    ? existingPosition.realizedPnL ?? existingPosition.unrealizedPnL ?? 0
                    : existingPosition.bookedPnL
              }
            
            console.log(`📊 [REALTIME-POSITIONS] Updated existing position ${newPosition.symbol}: ${existingPosition.quantity} → ${newQuantity}`)
            
            return { ...currentData, positions: updated }
          }
          
          console.log(`📊 [REALTIME-POSITIONS] Added new position ${newPosition.symbol}`)
          
            const isClosed = (newPosition.quantity ?? 0) === 0
            const normalizedPosition: Position = {
              status: newPosition.status ?? (isClosed ? "CLOSED" : "OPEN"),
              isClosed,
              realizedPnL:
                newPosition.realizedPnL ??
                (isClosed ? newPosition.unrealizedPnL ?? 0 : undefined),
              bookedPnL:
                newPosition.bookedPnL ??
                (isClosed ? newPosition.unrealizedPnL ?? 0 : undefined),
              ...newPosition
            } as Position

            return {
              ...currentData,
              positions: [normalizedPosition, ...currentData.positions]
            }
        },
        false
      )
      
      // Revalidate after delay
      setTimeout(() => {
        mutate().catch(err => {
          console.error('❌ [REALTIME-POSITIONS] Delayed revalidation failed:', err)
        })
      }, 500)
    } catch (error) {
      console.error('❌ [REALTIME-POSITIONS] Optimistic add failed:', error)
    }
  }, [mutate])

  // Optimistic update for closing position with validation
  const optimisticClosePosition = useCallback((positionId: string, exitPrice?: number) => {
    if (!validatePositionId(positionId)) {
      console.error('❌ [REALTIME-POSITIONS] Cannot close position: Invalid position ID')
      return
    }
    
    console.log("⚡ [REALTIME-POSITIONS] Optimistic close:", positionId, exitPrice ? `@ ₹${exitPrice}` : '')
    
    try {
      mutate(
        (currentData: PositionsResponse | undefined) => {
          if (!currentData) {
            console.warn('⚠️ [REALTIME-POSITIONS] No current data for optimistic close')
            return currentData
          }
          
          if (!Array.isArray(currentData.positions)) {
            console.warn('⚠️ [REALTIME-POSITIONS] Invalid positions array in current data')
            return currentData
          }
          
          return {
            ...currentData,
              positions: currentData.positions.map((p: Position) => {
                if (p.id !== positionId) return p
                
                // Calculate booked P&L based on exit price or current unrealized P&L
                const finalExitPrice = exitPrice ?? p.currentPrice ?? p.averagePrice
                const bookedPnL = (finalExitPrice - p.averagePrice) * Math.abs(p.quantity)
                
                return {
                  ...p,
                  quantity: 0,
                  status: "CLOSED",
                  isClosed: true,
                  realizedPnL: bookedPnL,
                  bookedPnL: bookedPnL,
                  currentPrice: finalExitPrice,
                  currentValue: 0, // Position closed, value is 0
                }
              }) // Keep closed positions (qty 0) to show as booked
          }
        },
        false // Don't revalidate immediately - let server response update it
      )
      
      // Revalidate after a short delay to get server-confirmed data
      setTimeout(() => {
        mutate().catch(err => {
          console.error('❌ [REALTIME-POSITIONS] Delayed revalidation failed:', err)
        })
      }, 1000) // Slightly longer delay to allow server processing
    } catch (error) {
      console.error('❌ [REALTIME-POSITIONS] Optimistic close failed:', error)
    }
  }, [mutate])

  // Safe data extraction with fallback
  const positions: Position[] = (() => {
    try {
        if (data?.positions && Array.isArray(data.positions)) {
          return data.positions.map((position: Position) => {
            const isClosed = position.isClosed ?? position.quantity === 0
            const realizedPnL =
              position.realizedPnL ?? (isClosed ? position.unrealizedPnL ?? 0 : 0)

            return {
              ...position,
              status: position.status ?? (isClosed ? "CLOSED" : "OPEN"),
              isClosed,
              realizedPnL,
              bookedPnL: position.bookedPnL ?? realizedPnL
            }
          })
      }
      return []
    } catch (err) {
      console.error('❌ [REALTIME-POSITIONS] Error extracting positions:', err)
      return []
    }
  })()

  return {
    positions,
    isLoading,
    error: error || null,
    pnlMeta: {
      pnlMode: data?.meta?.pnlMode === "server" ? "server" : "client",
      workerHealthy: Boolean(data?.meta?.workerHealthy),
    },
    refresh,
    optimisticAddPosition,
    optimisticClosePosition,
    mutate,
    retryCount: retryCountRef.current
  }
}
