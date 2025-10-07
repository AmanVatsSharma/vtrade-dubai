/**
 * WebSocket Manager (Optional Upgrade)
 * 
 * Provides true real-time updates via WebSocket:
 * - Instant order updates
 * - Instant position updates
 * - Instant balance updates
 * - Zero polling overhead
 * - Automatic reconnection
 * 
 * This is an optional upgrade from polling to true real-time.
 */

"use client"

console.log("🌐 [WEBSOCKET-MANAGER] Module loaded")

export type WebSocketEvent = 
  | 'order_placed'
  | 'order_executed'
  | 'order_cancelled'
  | 'position_opened'
  | 'position_closed'
  | 'position_updated'
  | 'balance_updated'
  | 'margin_blocked'
  | 'margin_released'

export interface WebSocketMessage {
  event: WebSocketEvent
  data: any
  timestamp: string
  userId: string
}

export type WebSocketCallback = (message: WebSocketMessage) => void

class WebSocketManager {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners: Map<WebSocketEvent, Set<WebSocketCallback>>
  private isConnecting = false
  private shouldReconnect = true
  private heartbeatInterval: NodeJS.Timeout | null = null

  constructor(url?: string) {
    this.url = url || this.getWebSocketUrl()
    this.listeners = new Map()
    console.log("🏗️ [WEBSOCKET-MANAGER] Manager instance created")
  }

  /**
   * Get WebSocket URL from environment or construct from window.location
   */
  private getWebSocketUrl(): string {
    if (typeof window === 'undefined') return ''
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/api/ws`
  }

  /**
   * Connect to WebSocket server
   */
  connect(userId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      console.log("⚠️ [WEBSOCKET-MANAGER] Already connected or connecting")
      return
    }

    this.isConnecting = true
    this.shouldReconnect = true

    try {
      console.log("🔌 [WEBSOCKET-MANAGER] Connecting to:", this.url)
      this.ws = new WebSocket(`${this.url}?userId=${userId}`)

      this.ws.onopen = () => {
        console.log("✅ [WEBSOCKET-MANAGER] Connected")
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log("📨 [WEBSOCKET-MANAGER] Message received:", message.event)
          this.handleMessage(message)
        } catch (error) {
          console.error("❌ [WEBSOCKET-MANAGER] Failed to parse message:", error)
        }
      }

      this.ws.onerror = (error) => {
        console.error("❌ [WEBSOCKET-MANAGER] Error:", error)
        this.isConnecting = false
      }

      this.ws.onclose = () => {
        console.log("🔌 [WEBSOCKET-MANAGER] Disconnected")
        this.isConnecting = false
        this.stopHeartbeat()
        
        if (this.shouldReconnect) {
          this.reconnect(userId)
        }
      }
    } catch (error) {
      console.error("❌ [WEBSOCKET-MANAGER] Connection failed:", error)
      this.isConnecting = false
      this.reconnect(userId)
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    console.log("🔌 [WEBSOCKET-MANAGER] Disconnecting")
    this.shouldReconnect = false
    this.stopHeartbeat()
    
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Reconnect with exponential backoff
   */
  private reconnect(userId: string): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ [WEBSOCKET-MANAGER] Max reconnect attempts reached")
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`🔄 [WEBSOCKET-MANAGER] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      this.connect(userId)
    }, delay)
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    const listeners = this.listeners.get(message.event)
    
    if (listeners && listeners.size > 0) {
      listeners.forEach(callback => {
        try {
          callback(message)
        } catch (error) {
          console.error("❌ [WEBSOCKET-MANAGER] Callback error:", error)
        }
      })
    }
  }

  /**
   * Subscribe to event
   */
  on(event: WebSocketEvent, callback: WebSocketCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    
    this.listeners.get(event)!.add(callback)
    console.log(`👂 [WEBSOCKET-MANAGER] Subscribed to: ${event}`)
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(event)
      if (listeners) {
        listeners.delete(callback)
        console.log(`👋 [WEBSOCKET-MANAGER] Unsubscribed from: ${event}`)
      }
    }
  }

  /**
   * Send message to server
   */
  send(event: string, data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }))
      console.log(`📤 [WEBSOCKET-MANAGER] Sent: ${event}`)
    } else {
      console.warn("⚠️ [WEBSOCKET-MANAGER] Cannot send, not connected")
    }
  }

  /**
   * Get connection state
   */
  getState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed'
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting'
      case WebSocket.OPEN:
        return 'open'
      case WebSocket.CLOSING:
        return 'closing'
      case WebSocket.CLOSED:
        return 'closed'
      default:
        return 'closed'
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null

/**
 * Get WebSocket manager instance
 */
export function getWebSocketManager(): WebSocketManager {
  if (typeof window === 'undefined') {
    // Server-side, return dummy instance
    return new WebSocketManager()
  }
  
  if (!wsManager) {
    wsManager = new WebSocketManager()
  }
  
  return wsManager
}

console.log("✅ [WEBSOCKET-MANAGER] Module initialized")
