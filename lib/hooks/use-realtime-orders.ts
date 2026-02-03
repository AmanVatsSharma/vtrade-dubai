/**
 * @file use-realtime-orders.ts
 * @module lib/hooks/use-realtime-orders
 * @description Real-time orders hook with SSE + backoff-based polling fallback (visibility-aware).
 * @author BharatERP
 * @created 2026-01-24
 */

/**
 * Real-time Orders Hook
 * 
 * Provides real-time order updates with:
 * - Optimistic UI updates
 * - Smart polling with SWR
 * - Automatic refresh after mutations
 * - Real-time status changes
 * - Comprehensive error handling
 * - Input validation
 * - Retry logic
 */

"use client"

import useSWR from 'swr'
import { useCallback, useEffect, useRef } from 'react'
import { useSharedSSE } from './use-shared-sse'

// Types
interface Order {
  id: string
  symbol: string
  quantity: number
  orderType: string
  orderSide: string
  price?: number | null
  averagePrice?: number | null
  filledQuantity?: number
  productType?: string
  status: string
  createdAt: string
  executedAt?: string | null
  stock?: any
}

interface OrdersResponse {
  success: boolean
  orders: Order[]
  error?: string
}

interface UseRealtimeOrdersReturn {
  orders: Order[]
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<any>
  optimisticUpdate: (newOrder: Partial<Order>) => void
  mutate: any
  retryCount: number
}

// Enhanced fetcher with better error handling
const fetcher = async (url: string): Promise<OrdersResponse> => {
  try {
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!res.ok) {
      // Handle specific HTTP errors
      if (res.status === 401) {
        throw new Error('Unauthorized: Please login again')
      } else if (res.status === 403) {
        throw new Error('Forbidden: Access denied')
      } else if (res.status === 404) {
        throw new Error('Orders endpoint not found')
      } else if (res.status >= 500) {
        throw new Error('Server error: Please try again later')
      }
      throw new Error(`Failed to fetch orders: ${res.status} ${res.statusText}`)
    }
    
    const data = await res.json()
    
    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format')
    }
    
    // Handle API error responses
    if (data.success === false && data.error) {
      throw new Error(data.error)
    }
    
    return data
  } catch (error) {
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('❌ [REALTIME-ORDERS] Fetch error:', {
        message: error.message,
        url,
        timestamp: new Date().toISOString()
      })
    }
    throw error
  }
}

// Validation helper
function validateOrder(order: any): order is Partial<Order> {
  if (!order || typeof order !== 'object') {
    console.warn('⚠️ [REALTIME-ORDERS] Invalid order object:', order)
    return false
  }
  
  if (order.id && typeof order.id !== 'string') {
    console.warn('⚠️ [REALTIME-ORDERS] Invalid order ID:', order.id)
    return false
  }
  
  if (order.quantity !== undefined && (typeof order.quantity !== 'number' || order.quantity <= 0)) {
    console.warn('⚠️ [REALTIME-ORDERS] Invalid quantity:', order.quantity)
    return false
  }
  
  return true
}

export function useRealtimeOrders(userId: string | undefined | null): UseRealtimeOrdersReturn {
  const retryCountRef = useRef(0)
  const maxRetries = 3
  const lastSyncRef = useRef<number>(Date.now())
  const pollErrorStreakRef = useRef(0)
  const revalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const DEBUG = process.env.NEXT_PUBLIC_DEBUG_REALTIME === 'true' || process.env.NODE_ENV === 'development'
  
  // Initial data fetch - polling handled by adaptive useEffect below
  const { data, error, isLoading, mutate } = useSWR<OrdersResponse>(
    userId ? `/api/trading/orders/list?userId=${userId}` : null,
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
        console.error(`❌ [REALTIME-ORDERS] Error (attempt ${retryCountRef.current}/${maxRetries}):`, err.message)
      },
      onSuccess: () => {
        if (retryCountRef.current > 0) {
          console.info('✅ [REALTIME-ORDERS] Recovered from error')
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
        console.error('❌ [REALTIME-ORDERS] Debounced revalidation failed:', err)
      })
    }, 350)
  }, [mutate])

  // Shared SSE connection for real-time updates
  const { isConnected, connectionState } = useSharedSSE(userId, useCallback((message) => {
    // Handle order-related events
    if (message.event === 'order_placed' || 
        message.event === 'order_executed' || 
        message.event === 'order_cancelled') {
      if (DEBUG) console.debug(`📨 [REALTIME-ORDERS] SSE ${message.event} → patch+revalidate`)

      // Patch cache instantly for a flicker-free UX, then verify with one debounced revalidate.
      try {
        mutate((currentData: OrdersResponse | undefined) => {
          if (!currentData || !Array.isArray(currentData.orders)) return currentData

          const d: any = message.data || {}
          const id = d.orderId as string | undefined
          if (!id) return currentData

          const ts = message.timestamp || new Date().toISOString()
          const idx = currentData.orders.findIndex((o: any) => o?.id === id)

          if (message.event === 'order_placed') {
            if (idx >= 0) return currentData
            const stub: Order = {
              id,
              symbol: String(d.symbol || 'UNKNOWN'),
              quantity: Number(d.quantity || 0),
              orderType: String(d.orderType || 'MARKET'),
              orderSide: String(d.orderSide || 'BUY'),
              price: d.price != null ? Number(d.price) : null,
              averagePrice: d.price != null ? Number(d.price) : null,
              filledQuantity: 0,
              productType: undefined,
              status: String(d.status || 'PENDING'),
              createdAt: ts,
              executedAt: null,
              stock: undefined,
            }
            return { ...currentData, orders: [stub, ...currentData.orders] }
          }

          if (idx === -1) return currentData

          const updated = [...currentData.orders]
          const prev = updated[idx] as any

          if (message.event === 'order_executed') {
            updated[idx] = {
              ...prev,
              status: 'EXECUTED',
              averagePrice: d.price != null ? Number(d.price) : prev.averagePrice,
              filledQuantity: prev.filledQuantity ?? prev.quantity ?? 0,
              executedAt: ts,
            }
          } else if (message.event === 'order_cancelled') {
            updated[idx] = {
              ...prev,
              status: 'CANCELLED',
            }
          }

          return { ...currentData, orders: updated }
        }, false)
      } catch (e) {
        console.error('❌ [REALTIME-ORDERS] Cache patch failed:', e)
      }

      scheduleRevalidate()
      lastSyncRef.current = Date.now() // Update last sync time on event
    }
  }, [mutate, DEBUG, scheduleRevalidate]))

  // Adaptive polling with backoff + visibility-awareness
  // - When SSE is open: low-frequency safety net polling
  // - When SSE is not open: fallback polling with exponential backoff + jitter
  // - When tab is hidden: reduce polling drastically
  useEffect(() => {
    if (!userId) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const computeDelayMs = () => {
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
      if (hidden) return 60000

      // Base polling interval (safety net even when SSE is up)
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
        console.error('❌ [REALTIME-ORDERS] Poll sync failed:', err)
      } finally {
        schedule()
      }
    }

    const onVisible = () => {
      const hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden'
      if (!hidden) {
        if (DEBUG) console.debug('[REALTIME-ORDERS] visibilitychange → refresh')
        mutate().catch((err) => console.error('❌ [REALTIME-ORDERS] Refresh on visible failed:', err))
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
      console.debug(`🔄 [REALTIME-ORDERS] Sync check - ${syncStatus}, last sync: ${Math.round(timeSinceLastSync / 1000)}s ago`)
    }, 60000) // Log every 60 seconds in debug mode

    return () => clearInterval(syncCheckInterval)
  }, [isConnected, DEBUG])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (revalidateTimerRef.current) clearTimeout(revalidateTimerRef.current)
      revalidateTimerRef.current = null
    }
  }, [])

  // Refresh function to call after placing order
  const refresh = useCallback(async () => {
    console.info("🔄 [REALTIME-ORDERS] Manual refresh triggered")
    try {
      return await mutate()
    } catch (error) {
      console.error("❌ [REALTIME-ORDERS] Manual refresh failed:", error)
      throw error
    }
  }, [mutate])

  // Optimistic update function with validation
  const optimisticUpdate = useCallback((newOrder: Partial<Order>) => {
    // Validate input
    if (!validateOrder(newOrder)) {
      console.error('❌ [REALTIME-ORDERS] Cannot perform optimistic update: Invalid order')
      return
    }
    
    console.log("⚡ [REALTIME-ORDERS] Optimistic update:", newOrder.id)
    
    try {
      mutate(
        (currentData: OrdersResponse | undefined) => {
          // Safety check
          if (!currentData) {
            console.warn('⚠️ [REALTIME-ORDERS] No current data for optimistic update')
            return currentData
          }
          
          if (!Array.isArray(currentData.orders)) {
            console.warn('⚠️ [REALTIME-ORDERS] Invalid orders array in current data')
            return currentData
          }
          
          return {
            ...currentData,
            orders: [newOrder as Order, ...currentData.orders]
          }
        },
        false // Don't revalidate immediately
      )
      
      // Revalidate after a short delay to confirm
      setTimeout(() => {
        mutate().catch(err => {
          console.error('❌ [REALTIME-ORDERS] Delayed revalidation failed:', err)
        })
      }, 500)
    } catch (error) {
      console.error('❌ [REALTIME-ORDERS] Optimistic update failed:', error)
    }
  }, [mutate])

  // Safe data extraction with fallback
  const orders: Order[] = (() => {
    try {
      if (data?.orders && Array.isArray(data.orders)) {
        return data.orders
      }
      return []
    } catch (err) {
      console.error('❌ [REALTIME-ORDERS] Error extracting orders:', err)
      return []
    }
  })()

  return {
    orders,
    isLoading,
    error: error || null,
    refresh,
    optimisticUpdate,
    mutate,
    retryCount: retryCountRef.current
  }
}
