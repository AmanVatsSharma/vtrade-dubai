/**
 * @file RealtimeEventEmitter.ts
 * @module realtime
 * @description Server-Sent Events (SSE) event emitter for real-time updates
 * Manages SSE connections per user and emits events to connected clients
 * @author BharatERP
 * @created 2025-01-27
 */

import type { SSEMessage } from '@/types/realtime'
import { baseLogger } from '@/lib/observability/logger'
import { isRedisRealtimeEnabled, publishUserMessage, subscribeUserMessages } from "@/lib/services/realtime/redis-realtime-bus"

/**
 * Realtime Event Emitter
 * 
 * Manages SSE connections and broadcasts events to connected clients.
 * Thread-safe event emission using Set for multiple connections per user.
 */
export class RealtimeEventEmitter {
  private readonly log = baseLogger.child({ module: "realtime-emitter" })
  private connections: Map<string, Set<ReadableStreamDefaultController<Uint8Array>>> = new Map()
  private redisUnsubs: Map<string, () => void> = new Map()
  private heartbeatInterval: NodeJS.Timeout | null = null
  private readonly HEARTBEAT_INTERVAL = 30000 // 30 seconds

  constructor() {
    this.log.info("initialized")
    this.startHeartbeat()
  }

  /**
   * Subscribe a user to realtime events
   * @param userId - User ID to subscribe
   * @param controller - SSE stream controller
   */
  subscribe(userId: string, controller: ReadableStreamDefaultController<Uint8Array>): void {
    this.log.info({ userId }, "subscribe")
    
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set())
    }
    
    this.connections.get(userId)!.add(controller)
    
    this.log.info({ userId, totalConnections: this.getConnectionCount() }, "subscribed")

    // Cross-process: ensure Redis subscription exists for this user (one per userId).
    if (isRedisRealtimeEnabled() && !this.redisUnsubs.has(userId)) {
      subscribeUserMessages(userId, (payload) => {
        // Redis-delivered messages should not be re-published; deliver locally only.
        this.emitLocal(userId, payload)
      })
        .then((unsub) => {
          this.redisUnsubs.set(userId, unsub)
        })
        .catch((e) => {
          this.log.warn({ userId, message: (e as any)?.message || String(e) }, "redis subscribe failed")
        })
    }
    
    // Send initial connection message
    try {
      const welcomeMessage = `data: ${JSON.stringify({
        event: 'connected',
        data: { userId, timestamp: new Date().toISOString() },
        timestamp: new Date().toISOString()
      })}\n\n`
      controller.enqueue(new TextEncoder().encode(welcomeMessage))
    } catch (error) {
      this.log.error({ userId, message: (error as any)?.message || String(error) }, "welcome_message_failed")
    }
  }

  /**
   * Unsubscribe a user from realtime events
   * @param userId - User ID to unsubscribe
   * @param controller - SSE stream controller to remove
   */
  unsubscribe(userId: string, controller: ReadableStreamDefaultController<Uint8Array>): void {
    this.log.info({ userId }, "unsubscribe")
    
    const userConnections = this.connections.get(userId)
    if (userConnections) {
      userConnections.delete(controller)
      
      // Clean up empty user entries
      if (userConnections.size === 0) {
        this.connections.delete(userId)

        const redisUnsub = this.redisUnsubs.get(userId)
        if (redisUnsub) {
          try {
            redisUnsub()
          } catch {
            // ignore
          }
          this.redisUnsubs.delete(userId)
        }
      }
    }
    
    this.log.info({ userId, totalConnections: this.getConnectionCount() }, "unsubscribed")
  }

  /**
   * Emit an event to a specific user
   * @param userId - User ID to emit event to
   * @param event - Event type
   * @param data - Event data payload
   */
  emit(userId: string, event: SSEMessage['event'], data: SSEMessage['data']): void {
    const message: SSEMessage = {
      event,
      data,
      timestamp: new Date().toISOString()
    }

    // Deliver locally to any connected SSE clients in THIS process.
    this.emitLocal(userId, message)

    // Publish to Redis bus so other processes (e.g. workers) can reach the app server SSE connections.
    if (isRedisRealtimeEnabled()) {
      publishUserMessage(userId, message).catch(() => {})
    }
  }

  /**
   * Emit to local connections ONLY (no Redis publish).
   */
  private emitLocal(userId: string, message: SSEMessage): void {
    const userConnections = this.connections.get(userId)
    if (!userConnections || userConnections.size === 0) return

    const messageText = `data: ${JSON.stringify(message)}\n\n`
    const encoder = new TextEncoder()
    const encoded = encoder.encode(messageText)

    this.log.debug({ userId, event: message.event, connections: userConnections.size }, "emitLocal")

    const deadConnections: ReadableStreamDefaultController<Uint8Array>[] = []
    userConnections.forEach((controller) => {
      try {
        controller.enqueue(encoded)
      } catch (error) {
        this.log.warn(
          { userId, event: message.event, message: (error as any)?.message || String(error) },
          "emit_failed_dead_connection",
        )
        deadConnections.push(controller)
      }
    })

    deadConnections.forEach((controller) => userConnections.delete(controller))
    if (deadConnections.length > 0) {
      this.log.info({ userId, dead: deadConnections.length }, "cleaned_dead_connections")
      if (userConnections.size === 0) {
        this.connections.delete(userId)
        const redisUnsub = this.redisUnsubs.get(userId)
        if (redisUnsub) {
          try {
            redisUnsub()
          } catch {
            // ignore
          }
          this.redisUnsubs.delete(userId)
        }
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
      this.log.debug("test environment detected; heartbeat disabled")
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
        this.log.debug({ totalSent, cleaned: deadConnections.length }, "heartbeat")
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
    this.log.info("stopped")
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

