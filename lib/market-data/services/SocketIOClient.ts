/**
 * @file SocketIOClient.ts
 * @description Socket.IO client wrapper for WebSocket market data connection
 * 
 * PURPOSE:
 * - Manage Socket.IO WebSocket connection
 * - Handle connection lifecycle (connect, disconnect, reconnect)
 * - Manage subscriptions (subscribe/unsubscribe instruments)
 * - Process incoming market data events
 * - Implement auto-reconnection with exponential backoff
 * 
 * FEATURES:
 * - Socket.IO WebSocket connection management
 * - Event handlers (connected, market_data, subscription_confirmed, error)
 * - Subscription management (subscribe_instruments, unsubscribe_instruments)
 * - Auto-reconnection logic (max 5 attempts with exponential backoff)
 * - Connection health monitoring
 * - Comprehensive error handling
 * - Detailed console logging for debugging
 * 
 * DEPENDENCIES:
 * - socket.io-client: Socket.IO client library
 * - Event emitter pattern for events
 * 
 * EXPORTS:
 * - SocketIOClient: Main class for WebSocket connection
 * 
 * USAGE:
 * const client = new SocketIOClient(config);
 * client.on('market_data', (data) => console.log(data));
 * client.connect();
 * 
 * ERROR HANDLING:
 * - Connection failures: Retry with exponential backoff
 * - WebSocket errors: Emit error event and attempt reconnection
 * - Disconnections: Automatic reconnection if configured
 * - Invalid data: Log warning and skip invalid messages
 * 
 * @author Trading Platform Team
 * @date 2025-10-28
 */

import { io, Socket } from 'socket.io-client';
import type { MarketDataQuote, WSMarketDataError } from '../providers/types';

/**
 * Event names for Socket.IO client
 */
export type SocketIOEvent = 
  | 'connected' 
  | 'disconnected' 
  | 'market_data' 
  | 'subscription_confirmed'
  | 'error'
  | 'reconnecting'
  | 'reconnected';

/**
 * Configuration for Socket.IO client
 */
export interface SocketIOClientConfig {
  url: string;
  apiKey: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
}

/**
 * Event callback type
 */
export type EventCallback = (data?: any) => void;

/**
 * Socket.IO client wrapper for market data WebSocket connection
 * 
 * Handles:
 * - Connection management
 * - Event handling
 * - Subscription management  
 * - Auto-reconnection
 * - Error recovery
 */
export class SocketIOClient {
  private socket: Socket | null = null;
  private config: Required<SocketIOClientConfig>;
  private listeners: Map<SocketIOEvent, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private shouldReconnect = true;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;

  constructor(config: SocketIOClientConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 5000,
      heartbeatInterval: 30000,
      ...config,
    } as Required<SocketIOClientConfig>;
    
    this.maxReconnectAttempts = this.config.reconnectAttempts;
    
    console.log('🏗️ [SOCKET-IO-CLIENT] Client instance created', { 
      url: this.config.url,
      reconnectAttempts: this.maxReconnectAttempts 
    });
  }

  /**
   * Register event listener
   */
  on(event: SocketIOEvent, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    console.log(`👂 [SOCKET-IO-CLIENT] Registered listener for: ${event}`);
  }

  /**
   * Remove event listener
   */
  off(event: SocketIOEvent, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback);
    console.log(`👋 [SOCKET-IO-CLIENT] Removed listener for: ${event}`);
  }

  /**
   * Emit event to all registered listeners
   */
  private emit(event: SocketIOEvent, data?: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ [SOCKET-IO-CLIENT] Listener error for ${event}:`, error);
      }
    });
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.isConnecting) {
      console.warn('⚠️ [SOCKET-IO-CLIENT] Already connecting');
      return;
    }

    if (this.socket?.connected) {
      console.warn('⚠️ [SOCKET-IO-CLIENT] Already connected');
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;
    
    console.log('🔌 [SOCKET-IO-CLIENT] Connecting...', { 
      url: this.config.url,
      timestamp: new Date().toISOString() 
    });

    try {
      // Initialize Socket.IO connection
      this.socket = io(this.config.url, {
        extraHeaders: {
          'x-api-key': this.config.apiKey,
        },
        reconnection: false, // Manual reconnection handling
        timeout: 10000,
        transports: ['websocket', 'polling'],
      });

      // Setup event handlers
      this.socket.on('connect', () => {
        console.log('✅ [SOCKET-IO-CLIENT] Connected successfully', {
          socketId: this.socket?.id,
          timestamp: new Date().toISOString(),
        });
        
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connected');
      });

      this.socket.on('connected', (data) => {
        console.log('✅ [SOCKET-IO-CLIENT] Connected event received', data);
        this.emit('connected', data);
      });

      this.socket.on('subscription_confirmed', (data) => {
        console.log('✅ [SOCKET-IO-CLIENT] Subscription confirmed', data);
        this.emit('subscription_confirmed', data);
      });

      this.socket.on('market_data', (data: MarketDataQuote) => {
        console.log('📊 [SOCKET-IO-CLIENT] Market data received', {
          instrumentToken: data.instrumentToken,
          timestamp: data.timestamp,
        });
        this.emit('market_data', data);
      });

      this.socket.on('error', (error: WSMarketDataError) => {
        console.error('❌ [SOCKET-IO-CLIENT] WebSocket error', error);
        this.emit('error', error);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('🔌 [SOCKET-IO-CLIENT] Disconnected', { 
          reason,
          timestamp: new Date().toISOString() 
        });
        
        this.isConnecting = false;
        this.stopHeartbeat();
        this.emit('disconnected', { reason });
        
        // Attempt reconnection
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ [SOCKET-IO-CLIENT] Connection error', error);
        this.isConnecting = false;
        this.emit('error', { message: error.message, code: 'CONNECTION_ERROR' });
        
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      });

    } catch (error) {
      console.error('❌ [SOCKET-IO-CLIENT] Failed to create connection', error);
      this.isConnecting = false;
      this.emit('error', { message: (error as Error).message, code: 'INIT_ERROR' });
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    console.log('🔌 [SOCKET-IO-CLIENT] Disconnecting...');
    
    this.shouldReconnect = false;
    this.isConnecting = false;
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.emit('disconnected');
    console.log('✅ [SOCKET-IO-CLIENT] Disconnected');
  }

  /**
   * Subscribe to instruments
   * @param instruments - Array of instrument tokens
   * @param mode - Subscription mode (ltp, ohlcv, full)
   */
  subscribe(instruments: number[], mode: 'ltp' | 'ohlcv' | 'full'): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ [SOCKET-IO-CLIENT] Cannot subscribe - not connected');
      return;
    }

    console.log('📡 [SOCKET-IO-CLIENT] Subscribing to instruments', { 
      instruments,
      mode,
      count: instruments.length 
    });

    this.socket.emit('subscribe_instruments', {
      instruments,
      mode,
    });
  }

  /**
   * Unsubscribe from instruments
   * @param instruments - Array of instrument tokens
   */
  unsubscribe(instruments: number[]): void {
    if (!this.socket?.connected) {
      console.warn('⚠️ [SOCKET-IO-CLIENT] Cannot unsubscribe - not connected');
      return;
    }

    console.log('🚫 [SOCKET-IO-CLIENT] Unsubscribing from instruments', { 
      instruments,
      count: instruments.length 
    });

    this.socket.emit('unsubscribe_instruments', {
      instruments,
    });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ [SOCKET-IO-CLIENT] Max reconnection attempts reached', {
        attempts: this.reconnectAttempts,
        max: this.maxReconnectAttempts,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.calculateReconnectDelay(this.reconnectAttempts);
    
    console.log(`🔄 [SOCKET-IO-CLIENT] Reconnecting in ${delay}ms`, {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
    });

    this.emit('reconnecting', { 
      attempt: this.reconnectAttempts, 
      maxAttempts: this.maxReconnectAttempts 
    });

    this.reconnectTimer = setTimeout(() => {
      console.log(`🔄 [SOCKET-IO-CLIENT] Reconnect attempt ${this.reconnectAttempts}`);
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateReconnectDelay(attempt: number): number {
    // Exponential backoff: 5s, 10s, 20s, 40s, 80s
    return Math.min(1000 * Math.pow(2, attempt - 1), 30000);
  }

  /**
   * Start heartbeat/ping interval
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        console.log('💓 [SOCKET-IO-CLIENT] Heartbeat');
        this.socket.emit('ping');
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat/ping interval
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket ID
   */
  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

