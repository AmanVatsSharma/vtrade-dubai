/**
 * Real-time Orders Hook
 * 
 * Provides real-time order updates with:
 * - Optimistic UI updates
 * - Smart polling with SWR
 * - Automatic refresh after mutations
 * - Real-time status changes
 */

"use client"

import useSWR from 'swr'
import { useCallback, useEffect, useRef } from 'react'

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch orders')
  return res.json()
}

export function useRealtimeOrders(userId: string | undefined) {
  const shouldPoll = useRef(true)
  
  // Smart polling - poll every 2 seconds when active
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/trading/orders/list?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: shouldPoll.current ? 2000 : 0, // Poll every 2 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000,
    }
  )

  // Stop polling when tab is hidden (performance optimization)
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

  // Refresh function to call after placing order
  const refresh = useCallback(() => {
    console.log("🔄 [REALTIME-ORDERS] Manual refresh triggered")
    return mutate()
  }, [mutate])

  // Optimistic update function
  const optimisticUpdate = useCallback((newOrder: any) => {
    console.log("⚡ [REALTIME-ORDERS] Optimistic update:", newOrder.id)
    mutate(
      (currentData: any) => {
        if (!currentData?.orders) return currentData
        return {
          ...currentData,
          orders: [newOrder, ...currentData.orders]
        }
      },
      false // Don't revalidate immediately
    )
    
    // Revalidate after a short delay to confirm
    setTimeout(() => mutate(), 500)
  }, [mutate])

  return {
    orders: data?.orders || [],
    isLoading,
    error,
    refresh,
    optimisticUpdate,
    mutate
  }
}
