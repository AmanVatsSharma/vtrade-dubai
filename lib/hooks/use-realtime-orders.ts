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
  const eventSourceRef = useRef<EventSource | null>(null)
  
  // Initial data fetch only (no polling)
  const { data, error, isLoading, mutate } = useSWR<OrdersResponse>(
    userId ? `/api/trading/orders/list?userId=${userId}` : null,
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
        console.error(`❌ [REALTIME-ORDERS] Error (attempt ${retryCountRef.current}/${maxRetries}):`, err.message)
      },
      onSuccess: () => {
        if (retryCountRef.current > 0) {
          console.log('✅ [REALTIME-ORDERS] Recovered from error')
          retryCountRef.current = 0
        }
      }
    }
  )

  // SSE connection for real-time updates
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return

    console.log('📡 [REALTIME-ORDERS] Connecting to SSE stream')

    const eventSource = new EventSource(`/api/realtime/stream?userId=${userId}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log('✅ [REALTIME-ORDERS] SSE connection established')
    }

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        
        // Handle order-related events
        if (message.event === 'order_placed' || 
            message.event === 'order_executed' || 
            message.event === 'order_cancelled') {
          console.log(`📨 [REALTIME-ORDERS] Received ${message.event} event, refreshing orders`)
          mutate().catch(err => {
            console.error('❌ [REALTIME-ORDERS] Refresh after event failed:', err)
          })
        }
      } catch (error) {
        console.error('❌ [REALTIME-ORDERS] Error parsing SSE message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('❌ [REALTIME-ORDERS] SSE connection error:', error)
      // EventSource will automatically reconnect
    }

    // Cleanup on unmount
    return () => {
      console.log('🧹 [REALTIME-ORDERS] Closing SSE connection')
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [userId, mutate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      console.log('🧹 [REALTIME-ORDERS] Cleaned up')
    }
  }, [])

  // Refresh function to call after placing order
  const refresh = useCallback(async () => {
    console.log("🔄 [REALTIME-ORDERS] Manual refresh triggered")
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
