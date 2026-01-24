/**
 * @file use-shared-sse.ts
 * @module hooks
 * @description Shared SSE connection hook - single connection for all hooks
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import React, { useEffect, useRef, useCallback } from 'react'

export type RealtimeEventType =
  | 'order_placed'
  | 'order_executed'
  | 'order_cancelled'
  | 'position_opened'
  | 'position_closed'
  | 'position_updated'
  | 'balance_updated'
  | 'margin_blocked'
  | 'margin_released'
  | 'watchlist_updated'
  | 'watchlist_item_added'
  | 'watchlist_item_removed'
  | 'connected'

export interface SSEMessage {
  event: RealtimeEventType
  data: any
  timestamp: string
}

export type EventCallback = (message: SSEMessage) => void

/**
 * Shared SSE connection manager
 * Creates a single SSE connection per userId and allows multiple subscribers
 */
class SharedSSEManager {
  private connections: Map<string, EventSource> = new Map()
  private subscribers: Map<string, Set<EventCallback>> = new Map()
  private reconnectAttempts: Map<string, number> = new Map()
  private lastEventAt: Map<string, number> = new Map()
  private lastErrorAt: Map<string, number> = new Map()
  private readonly maxReconnectAttempts = 5

  /**
   * Subscribe to SSE events for a user
   * Creates connection if needed, otherwise reuses existing
   */
  subscribe(userId: string, callback: EventCallback): () => void {
    console.log(`📡 [SHARED-SSE] Subscribing to events for user: ${userId}`)

    // Add callback to subscribers
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, new Set())
    }
    this.subscribers.get(userId)!.add(callback)

    // Create connection if it doesn't exist
    if (!this.connections.has(userId)) {
      this.createConnection(userId)
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(userId, callback)
    }
  }

  /**
   * Unsubscribe from SSE events
   */
  unsubscribe(userId: string, callback: EventCallback): void {
    console.log(`📡 [SHARED-SSE] Unsubscribing from events for user: ${userId}`)

    const userSubscribers = this.subscribers.get(userId)
    if (userSubscribers) {
      userSubscribers.delete(callback)

      // If no more subscribers, close connection
      if (userSubscribers.size === 0) {
        this.closeConnection(userId)
        this.subscribers.delete(userId)
      }
    }
  }

  /**
   * Create SSE connection for a user
   */
  private createConnection(userId: string): void {
    // Guard against SSR
    if (typeof window === 'undefined') {
      console.warn(`⚠️ [SHARED-SSE] Cannot create SSE connection on server side for user: ${userId}`)
      return
    }

    if (this.connections.has(userId)) {
      console.log(`⚠️ [SHARED-SSE] Connection already exists for user: ${userId}`)
      return
    }

    console.log(`🔌 [SHARED-SSE] Creating SSE connection for user: ${userId}`)
    
    const eventSource = new EventSource(`/api/realtime/stream?userId=${userId}`)
    this.connections.set(userId, eventSource)
    this.reconnectAttempts.set(userId, 0)
    this.lastEventAt.set(userId, Date.now())

    eventSource.onopen = () => {
      console.log(`✅ [SHARED-SSE] SSE connection established for user: ${userId}`)
      this.reconnectAttempts.set(userId, 0) // Reset on successful connection
      this.lastEventAt.set(userId, Date.now())
    }

    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data)
        console.log(`📨 [SHARED-SSE] Received event: ${message.event} for user: ${userId}`)
        this.lastEventAt.set(userId, Date.now())

        // Broadcast to all subscribers
        const subscribers = this.subscribers.get(userId)
        if (subscribers) {
          subscribers.forEach((callback) => {
            try {
              callback(message)
            } catch (error) {
              console.error(`❌ [SHARED-SSE] Error in subscriber callback:`, error)
            }
          })
        }
      } catch (error) {
        console.error(`❌ [SHARED-SSE] Error parsing SSE message:`, error)
      }
    }

    eventSource.onerror = (error) => {
      console.error(`❌ [SHARED-SSE] SSE connection error for user ${userId}:`, error)
      this.lastErrorAt.set(userId, Date.now())
      
      // Only attempt reconnection if we still have subscribers and connection is closed
      const hasSubscribers = this.subscribers.has(userId) && (this.subscribers.get(userId)?.size || 0) > 0
      
      // EventSource constants (CLOSED = 2)
      const EVENT_SOURCE_CLOSED = 2
      if (hasSubscribers && eventSource.readyState === EVENT_SOURCE_CLOSED) {
        const attempts = this.reconnectAttempts.get(userId) || 0
        if (attempts < this.maxReconnectAttempts) {
          const newAttempts = attempts + 1
          this.reconnectAttempts.set(userId, newAttempts)
          console.log(`🔄 [SHARED-SSE] Attempting reconnect ${newAttempts}/${this.maxReconnectAttempts} for user: ${userId}`)
          
          // Close old connection
          this.closeConnection(userId)
          
          // Reconnect after delay (exponential backoff)
          setTimeout(() => {
            // Double-check we still have subscribers before reconnecting
            const stillHasSubscribers = this.subscribers.has(userId) && (this.subscribers.get(userId)?.size || 0) > 0
            if (stillHasSubscribers && !this.connections.has(userId)) {
              this.createConnection(userId)
            }
          }, 1000 * newAttempts)
        } else {
          console.error(`❌ [SHARED-SSE] Max reconnect attempts reached for user: ${userId}`)
          this.closeConnection(userId)
        }
      }
    }
  }

  /**
   * Close SSE connection for a user
   */
  private closeConnection(userId: string): void {
    const eventSource = this.connections.get(userId)
    if (eventSource) {
      console.log(`🔌 [SHARED-SSE] Closing SSE connection for user: ${userId}`)
      eventSource.close()
      this.connections.delete(userId)
      this.reconnectAttempts.delete(userId)
    }
  }

  /**
   * Check if connection exists for a user
   */
  isConnected(userId: string): boolean {
    if (typeof window === 'undefined') return false
    const eventSource = this.connections.get(userId)
    if (!eventSource) return false
    // EventSource.OPEN = 1
    return eventSource.readyState === 1
  }

  /**
   * Get connection state
   */
  getConnectionState(userId: string): 'connecting' | 'open' | 'closed' {
    if (typeof window === 'undefined') return 'closed'
    const eventSource = this.connections.get(userId)
    if (!eventSource) return 'closed'

    switch (eventSource.readyState) {
      case EventSource.CONNECTING:
        return 'connecting'
      case EventSource.OPEN:
        return 'open'
      case EventSource.CLOSED:
        return 'closed'
      default:
        return 'closed'
    }
  }

  getLastEventAt(userId: string): number | null {
    return this.lastEventAt.get(userId) ?? null
  }

  getLastErrorAt(userId: string): number | null {
    return this.lastErrorAt.get(userId) ?? null
  }
}

// Singleton instance
const sseManager = new SharedSSEManager()

/**
 * Shared SSE Hook
 * 
 * Use this hook to subscribe to real-time events.
 * All hooks sharing the same userId will use a SINGLE SSE connection.
 * 
 * @param userId - User ID to subscribe to
 * @param onEvent - Callback function for events
 * @returns Connection state
 */
export function useSharedSSE(
  userId: string | undefined | null,
  onEvent: EventCallback
) {
  const onEventRef = useRef(onEvent)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Keep callback ref updated
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  // Subscribe to events
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return

    console.log(`📡 [SHARED-SSE-HOOK] Setting up subscription for user: ${userId}`)

    // Subscribe with stable callback
    const unsubscribe = sseManager.subscribe(userId, (message) => {
      onEventRef.current(message)
    })

    unsubscribeRef.current = unsubscribe

    // Cleanup on unmount
    return () => {
      console.log(`🧹 [SHARED-SSE-HOOK] Cleaning up subscription for user: ${userId}`)
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [userId])

  // Only check connection state on client-side to avoid SSR issues
  const [connectionState, setConnectionState] = React.useState<'connecting' | 'open' | 'closed'>('closed')
  const [isConnected, setIsConnected] = React.useState(false)
  const [lastEventAt, setLastEventAt] = React.useState<number | null>(null)
  const [lastErrorAt, setLastErrorAt] = React.useState<number | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || !userId) {
      setIsConnected(false)
      setConnectionState('closed')
      setLastEventAt(null)
      setLastErrorAt(null)
      return
    }

    // Check connection state
    const checkState = () => {
      setIsConnected(sseManager.isConnected(userId))
      setConnectionState(sseManager.getConnectionState(userId))
      setLastEventAt(sseManager.getLastEventAt(userId))
      setLastErrorAt(sseManager.getLastErrorAt(userId))
    }

    checkState()
    
    // Poll connection state periodically, but avoid 1s polling (can be noisy on slower devices).
    const interval = setInterval(checkState, 5000)

    const handleVisibilityOrNetwork = () => {
      // quick probe when user comes back / network changes
      checkState()
    }

    window.addEventListener('online', handleVisibilityOrNetwork)
    window.addEventListener('offline', handleVisibilityOrNetwork)
    document.addEventListener('visibilitychange', handleVisibilityOrNetwork)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleVisibilityOrNetwork)
      window.removeEventListener('offline', handleVisibilityOrNetwork)
      document.removeEventListener('visibilitychange', handleVisibilityOrNetwork)
    }
  }, [userId])

  return {
    isConnected,
    connectionState,
    lastEventAt,
    lastErrorAt,
  }
}

// Initialize log only in client-side
if (typeof window !== 'undefined') {
  console.log('✅ [SHARED-SSE] Module initialized')
}

