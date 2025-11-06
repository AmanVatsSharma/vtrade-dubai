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
  error?: string
}

interface UseRealtimePositionsReturn {
  positions: Position[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<any>
  optimisticAddPosition: (newPosition: Partial<Position>) => void
  optimisticClosePosition: (positionId: string) => void
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
  
  // Initial data fetch only (no polling)
  const { data, error, isLoading, mutate } = useSWR<PositionsResponse>(
    userId ? `/api/trading/positions/list?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: 0, // No polling - SSE will trigger updates
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
          console.log('✅ [REALTIME-POSITIONS] Recovered from error')
          retryCountRef.current = 0
        }
      }
    }
  )

  // Shared SSE connection for real-time updates
  useSharedSSE(userId, useCallback((message) => {
    // Handle position-related events
    if (message.event === 'position_opened' || 
        message.event === 'position_closed' || 
        message.event === 'position_updated') {
      console.log(`📨 [REALTIME-POSITIONS] Received ${message.event} event, refreshing positions`)
      mutate().catch(err => {
        console.error('❌ [REALTIME-POSITIONS] Refresh after event failed:', err)
      })
    }
  }, [mutate]))

  // Refresh function
  const refresh = useCallback(async () => {
    console.log("🔄 [REALTIME-POSITIONS] Manual refresh triggered")
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
  const optimisticClosePosition = useCallback((positionId: string) => {
    if (!validatePositionId(positionId)) {
      console.error('❌ [REALTIME-POSITIONS] Cannot close position: Invalid position ID')
      return
    }
    
    console.log("⚡ [REALTIME-POSITIONS] Optimistic close:", positionId)
    
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
              positions: currentData.positions.map((p: Position) =>
                p.id === positionId
                  ? {
                      ...p,
                      quantity: 0,
                      status: "CLOSED",
                      isClosed: true,
                      realizedPnL: p.realizedPnL ?? p.unrealizedPnL ?? 0,
                      bookedPnL: p.bookedPnL ?? p.realizedPnL ?? p.unrealizedPnL ?? 0
                    }
                  : p
              ) // Keep closed positions (qty 0) to show as booked
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
    refresh,
    optimisticAddPosition,
    optimisticClosePosition,
    mutate,
    retryCount: retryCountRef.current
  }
}
