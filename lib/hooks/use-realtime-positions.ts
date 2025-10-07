/**
 * Real-time Positions Hook
 * 
 * Provides real-time position updates with:
 * - Optimistic UI updates
 * - Smart polling with SWR
 * - Automatic refresh after mutations
 * - Real-time P&L updates
 */

"use client"

import useSWR from 'swr'
import { useCallback, useEffect, useRef } from 'react'

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch positions')
  return res.json()
}

export function useRealtimePositions(userId: string | undefined) {
  const shouldPoll = useRef(true)
  
  // Smart polling - poll every 3 seconds for positions
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/trading/positions/list?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: shouldPoll.current ? 3000 : 0, // Poll every 3 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000,
    }
  )

  // Stop polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      shouldPoll.current = !document.hidden
      if (!document.hidden) {
        mutate() // Refresh immediately when tab becomes visible
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [mutate])

  // Refresh function
  const refresh = useCallback(() => {
    console.log("🔄 [REALTIME-POSITIONS] Manual refresh triggered")
    return mutate()
  }, [mutate])

  // Optimistic update for new position
  const optimisticAddPosition = useCallback((newPosition: any) => {
    console.log("⚡ [REALTIME-POSITIONS] Optimistic add:", newPosition.id)
    mutate(
      (currentData: any) => {
        if (!currentData?.positions) return currentData
        
        // Check if position already exists (update quantity)
        const existingIndex = currentData.positions.findIndex(
          (p: any) => p.symbol === newPosition.symbol
        )
        
        if (existingIndex >= 0) {
          const updated = [...currentData.positions]
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: updated[existingIndex].quantity + newPosition.quantity
          }
          return { ...currentData, positions: updated }
        }
        
        return {
          ...currentData,
          positions: [newPosition, ...currentData.positions]
        }
      },
      false
    )
    
    // Revalidate after delay
    setTimeout(() => mutate(), 500)
  }, [mutate])

  // Optimistic update for closing position
  const optimisticClosePosition = useCallback((positionId: string) => {
    console.log("⚡ [REALTIME-POSITIONS] Optimistic close:", positionId)
    mutate(
      (currentData: any) => {
        if (!currentData?.positions) return currentData
        return {
          ...currentData,
          positions: currentData.positions.map((p: any) => 
            p.id === positionId ? { ...p, quantity: 0 } : p
          )
        }
      },
      false
    )
    
    // Revalidate after delay
    setTimeout(() => mutate(), 500)
  }, [mutate])

  return {
    positions: data?.positions || [],
    isLoading,
    error,
    refresh,
    optimisticAddPosition,
    optimisticClosePosition,
    mutate
  }
}
