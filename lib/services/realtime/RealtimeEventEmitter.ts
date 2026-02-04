/**
 * @file RealtimeEventEmitter.ts
 * @module realtime
 * @description Server-Sent Events (SSE) event emitter for real-time updates
 * Manages SSE connections per user and emits events to connected clients
 * @author BharatERP
 * @created 2025-01-27
 */

import type { SSEMessage } from '@/types/realtime'

/**
 * Realtime Event Emitter
 * 
 * Manages SSE connections and broadcasts events to connected clients.
 * Thread-safe event emission using Set for multiple connections per user.
 */
export class RealtimeEventEmitter {
  private connections: Map<string, Set<ReadableStreamDefaultController<Uint8Array>>> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private readonly HEARTBEAT_INTERVAL = 30000 // 30 seconds

  constructor() {
    console.log('🚀 [REALTIME-EMITTER] Event emitter initialized')
    this.startHeartbeat()
  }

  /**
   * Subscribe a user to realtime events
   * @param userId - User ID to subscribe
   * @param controller - SSE stream controller
   */
  subscribe(userId: string, controller: ReadableStreamDefaultController<Uint8Array>): void {
    console.log(`📡 [REALTIME-EMITTER] Subscribing user: ${userId}`)
    
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set())
    }
    
    this.connections.get(userId)!.add(controller)
    
    console.log(`✅ [REALTIME-EMITTER] User ${userId} subscribed. Total connections: ${this.getConnectionCount()}`)
    
    // Send initial connection message
    try {
      const welcomeMessage = `data: ${JSON.stringify({
        event: 'connected',
        data: { userId, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      })}\n\n`
      controller.enqueue(new TextEncoder().encode(welcomeMessage))
    } catch (error) {
      console.error(`❌ [REALTIME-EMITTER] Error sending welcome message:`, error)
    }
  }

  /**
   * Unsubscribe a user from realtime events
   * @param userId - User ID to unsubscribe
   * @param controller - SSE stream controller to remove
   */
  unsubscribe(userId: string, controller: ReadableStreamDefaultController<Uint8Array>): void {
    console.log(`📡 [REALTIME-EMITTER] Unsubscribing user: ${userId}`)
    
    const userConnections = this.connections.get(userId)
    if (userConnections) {
      userConnections.delete(controller)
      
      // Clean up empty user entries
      if (userConnections.size === 0) {
        this.connections.delete(userId)
      }
    }
    
    console.log(`✅ [REALTIME-EMITTER] User ${userId} unsubscribed. Total connections: ${this.getConnectionCount()}`)
  }

  /**
   * Emit an event to a specific user
   * @param userId - User ID to emit event to
   * @param event - Event type
   * @param data - Event data payload
   */
  emit(userId: string, event: SSEMessage['event'], data: SSEMessage['data']): void {
    const userConnections = this.connections.get(userId)
    
    if (!userConnections || userConnections.size === 0) {
      // No connections for this user - silently skip (not an error)
      return
    }

    const message: SSEMessage = {
      event,
      data,
      timestamp: new Date().toISOString()
    }

    const messageText = `data: ${JSON.stringify(message)}\n\n`
    const encoder = new TextEncoder()
    const encoded = encoder.encode(messageText)

    console.log(`📤 [REALTIME-EMITTER] Emitting ${event} to user ${userId} (${userConnections.size} connection(s))`)

    // Send to all connections for this user
    const deadConnections: ReadableStreamDefaultController<Uint8Array>[] = []
    
    userConnections.forEach((controller) => {
      try {
        controller.enqueue(encoded)
      } catch (error) {
        console.error(`❌ [REALTIME-EMITTER] Error emitting to connection:`, error)
        // Mark connection as dead for cleanup
        deadConnections.push(controller)
      }
    })

    // Clean up dead connections
    deadConnections.forEach((controller) => {
      userConnections.delete(controller)
    })

    if (deadConnections.length > 0) {
      console.log(`🧹 [REALTIME-EMITTER] Cleaned up ${deadConnections.length} dead connection(s)`)
      
      // Remove user entry if no connections remain
      if (userConnections.size === 0) {
        this.connections.delete(userId)
      }
    }
  }

  /**
   * Get total number of active connections
   */
  getConnectionCount(): number {
    let total = 0
    this.connections.forEach((connections) => {
      total += connections.size
    })
    return total
  }

  /**
   * Get number of connections for a specific user
   */
  getUserConnectionCount(userId: string): number {
    return this.connections.get(userId)?.size || 0
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    // In test runs, avoid leaking timers that keep Jest alive.
    if (process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID) {
      console.log("🧪 [REALTIME-EMITTER] Test environment detected; heartbeat disabled")
      return
    }

    this.heartbeatInterval = setInterval(() => {
      const heartbeatMessage = `: heartbeat\n\n`
      const encoder = new TextEncoder()
      const encoded = encoder.encode(heartbeatMessage)

      let totalSent = 0
      const deadConnections: Array<{ userId: string; controller: ReadableStreamDefaultController<Uint8Array> }> = []

      this.connections.forEach((connections, userId) => {
        connections.forEach((controller) => {
          try {
            controller.enqueue(encoded)
            totalSent++
          } catch (error) {
            // Connection is dead
            deadConnections.push({ userId, controller })
          }
        })
      })

      // Clean up dead connections
      deadConnections.forEach(({ userId, controller }) => {
        const userConnections = this.connections.get(userId)
        if (userConnections) {
          userConnections.delete(controller)
          if (userConnections.size === 0) {
            this.connections.delete(userId)
          }
        }
      })

      if (totalSent > 0 || deadConnections.length > 0) {
        console.log(`💓 [REALTIME-EMITTER] Heartbeat sent to ${totalSent} connection(s), cleaned ${deadConnections.length} dead`)
      }
    }, this.HEARTBEAT_INTERVAL)

    // Do not keep the Node process alive solely for heartbeat.
    ;(this.heartbeatInterval as any)?.unref?.()
  }

  /**
   * Stop heartbeat and cleanup
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    this.connections.clear()
    console.log('🛑 [REALTIME-EMITTER] Event emitter stopped')
  }
}

// Singleton instance
let eventEmitter: RealtimeEventEmitter | null = null

/**
 * Get the singleton event emitter instance
 */
export function getRealtimeEventEmitter(): RealtimeEventEmitter {
  if (!eventEmitter) {
    eventEmitter = new RealtimeEventEmitter()
  }
  return eventEmitter
}

console.log('✅ [REALTIME-EMITTER] Module initialized')

