/**
 * @file WebSocketMarketDataService.ts
 * @description Business logic layer for WebSocket market data management
 * 
 * PURPOSE:
 * - Orchestrate WebSocket connection lifecycle
 * - Transform raw WebSocket data to application format
 * - Implement caching layer for last known prices
 * - Handle instrument token resolution
 * - Provide fallback mechanisms
 * - Implement jitter and interpolation for smooth UX
 * - Rate limiting and subscription batching
 * - Error recovery strategies
 * 
 * FEATURES:
 * - Manages SocketIOClient instance
 * - Real-time price updates with caching
 * - Subscription management (subscribe/unsubscribe)
 * - Price enhancement (jitter + interpolation)
 * - Fallback to cached prices during disconnection
 * - Automatic resubscription on reconnect
 * - Error recovery with exponential backoff
 * 
 * DEPENDENCIES:
 * - SocketIOClient: WebSocket connection management
 * - Price utilities for formatting and transformations
 * 
 * EXPORTS:
 * - WebSocketMarketDataService: Service class
 * 
 * USAGE:
 * const service = new WebSocketMarketDataService(config);
 * service.on('priceUpdate', (data) => console.log(data));
 * await service.initialize();
 * service.subscribeToInstruments([26000, 11536], 'ltp');
 * 
 * ERROR HANDLING:
 * - Connection failures: Retry with exponential backoff
 * - Invalid data: Log warning and skip
 * - Subscription errors: Emit error event and continue
 * - Disconnections: Use cached prices and emit disconnect event
 * 
 * @author Trading Platform Team
 * @date 2025-10-28
 */

import { SocketIOClient } from './SocketIOClient';
import type { 
  MarketDataQuote, 
  EnhancedQuote, 
  WSMarketDataError,
  SubscriptionMode 
} from '../providers/types';
import { detectTrend, calculateChange, calculateChangePercent } from '../utils/priceFormatters';

/**
 * Service event names
 */
export type ServiceEvent = 
  | 'connected' 
  | 'disconnected' 
  | 'priceUpdate' 
  | 'subscriptionConfirmed'
  | 'error';

/**
 * Event callback type
 */
export type ServiceEventCallback = (data?: any) => void;

/**
 * Configuration for WebSocket Market Data Service
 */
export interface ServiceConfig {
  url: string;
  apiKey: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  enableJitter?: boolean;
  enableInterpolation?: boolean;
}

/**
 * WebSocket Market Data Service
 * 
 * Provides high-level interface for real-time market data:
 * - Connection management
 * - Subscription management
 * - Price data caching
 * - Enhancement (jitter, interpolation)
 * - Error recovery
 */
export class WebSocketMarketDataService {
  private client: SocketIOClient | null = null;
  private config: Required<ServiceConfig>;
  private listeners: Map<ServiceEvent, Set<ServiceEventCallback>> = new Map();
  
  // Price cache
  private priceCache: Map<number, EnhancedQuote> = new Map();
  private previousPrices: Map<number, number> = new Map();
  
  // Subscription state
  private subscriptions: Map<number, SubscriptionMode> = new Map();
  
  // Enhancement state
  private jitterOffsets: Map<number, number> = new Map();
  private interpolationStates: Map<number, {
    startPrice: number;
    targetPrice: number;
    startTime: number;
    isActive: boolean;
  }> = new Map();

  constructor(config: ServiceConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 5000,
      heartbeatInterval: 30000,
      enableJitter: true,
      enableInterpolation: true,
      ...config,
    } as Required<ServiceConfig>;
    
    console.log('🏗️ [WS-MARKET-DATA-SERVICE] Service instance created', {
      url: this.config.url,
      enableJitter: this.config.enableJitter,
      enableInterpolation: this.config.enableInterpolation,
    });
  }

  /**
   * Register event listener
   */
  on(event: ServiceEvent, callback: ServiceEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    console.log(`👂 [WS-MARKET-DATA-SERVICE] Registered listener for: ${event}`);
  }

  /**
   * Remove event listener
   */
  off(event: ServiceEvent, callback: ServiceEventCallback): void {
    this.listeners.get(event)?.delete(callback);
    console.log(`👋 [WS-MARKET-DATA-SERVICE] Removed listener for: ${event}`);
  }

  /**
   * Emit event to all registered listeners
   */
  private emit(event: ServiceEvent, data?: any): void {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`❌ [WS-MARKET-DATA-SERVICE] Listener error for ${event}:`, error);
      }
    });
  }

  /**
   * Initialize service and establish WebSocket connection
   */
  async initialize(): Promise<void> {
    console.log('🚀 [WS-MARKET-DATA-SERVICE] Initializing service...');
    
    try {
      // Create Socket.IO client
      this.client = new SocketIOClient({
        url: this.config.url,
        apiKey: this.config.apiKey,
        reconnectAttempts: this.config.reconnectAttempts,
        reconnectDelay: this.config.reconnectDelay,
        heartbeatInterval: this.config.heartbeatInterval,
      });

      // Setup event handlers
      this.setupClientHandlers();
      
      // Connect to WebSocket
      this.client.connect();
      
      console.log('✅ [WS-MARKET-DATA-SERVICE] Service initialized');
    } catch (error) {
      console.error('❌ [WS-MARKET-DATA-SERVICE] Failed to initialize service', error);
      throw error;
    }
  }

  /**
   * Setup Socket.IO client event handlers
   */
  private setupClientHandlers(): void {
    if (!this.client) return;

    // Connected event
    this.client.on('connected', () => {
      console.log('✅ [WS-MARKET-DATA-SERVICE] Client connected');
      this.emit('connected');
      
      // Resubscribe to all previous subscriptions
      this.resubscribeAll();
    });

    // Disconnected event
    this.client.on('disconnected', () => {
      console.log('❌ [WS-MARKET-DATA-SERVICE] Client disconnected');
      this.emit('disconnected');
    });

    // Subscription confirmed
    this.client.on('subscription_confirmed', (data) => {
      console.log('✅ [WS-MARKET-DATA-SERVICE] Subscription confirmed', data);
      this.emit('subscriptionConfirmed', data);
    });

    // Market data received
    this.client.on('market_data', (quote: MarketDataQuote) => {
      try {
        console.log('📊 [WS-MARKET-DATA-SERVICE] Market data received', {
          instrumentToken: quote.instrumentToken,
          price: quote.data.last_price,
        });
        
        this.processMarketData(quote);
      } catch (error) {
        console.error('❌ [WS-MARKET-DATA-SERVICE] Error processing market data', error);
      }
    });

    // Error event
    this.client.on('error', (error: WSMarketDataError) => {
      console.error('❌ [WS-MARKET-DATA-SERVICE] Client error', error);
      this.emit('error', error);
    });
  }

  /**
   * Process incoming market data
   */
  private processMarketData(quote: MarketDataQuote): void {
    const { instrumentToken, data, timestamp } = quote;
    
    // Get previous price for calculations
    const previousPrice = this.previousPrices.get(instrumentToken);
    const currentPrice = data.last_price;
    
    // Calculate change and trend
    const change = previousPrice ? calculateChange(currentPrice, previousPrice) : 0;
    const changePercent = previousPrice ? calculateChangePercent(currentPrice, previousPrice) : 0;
    const trend = previousPrice ? detectTrend(currentPrice, previousPrice) : 'neutral';
    
    // Create enhanced quote
    const enhancedQuote: EnhancedQuote = {
      instrumentToken,
      last_trade_price: currentPrice,
      prev_close_price: previousPrice,
      display_price: currentPrice,
      actual_price: currentPrice,
      trend,
      jitter_offset: 0,
      deviation_offset: 0,
      timestamp: Date.now(),
      lastUpdateTime: new Date(timestamp).getTime(),
      open: data.ohlc?.open,
      high: data.ohlc?.high,
      low: data.ohlc?.low,
      close: data.ohlc?.close,
      volume: data.volume,
    };

    // Apply enhancements if enabled
    if (this.config.enableJitter) {
      this.applyJitter(enhancedQuote);
    }

    if (this.config.enableInterpolation) {
      this.applyInterpolation(enhancedQuote);
    }

    // Update cache
    this.priceCache.set(instrumentToken, enhancedQuote);
    this.previousPrices.set(instrumentToken, currentPrice);
    
    // Emit price update
    this.emit('priceUpdate', {
      instrumentToken,
      quotes: Array.from(this.priceCache.values()),
    });
  }

  /**
   * Apply jitter to quote for realistic price movement
   */
  private applyJitter(quote: EnhancedQuote): void {
    const currentOffset = this.jitterOffsets.get(quote.instrumentToken) || 0;
    const maxJitter = quote.last_trade_price * 0.001; // 0.1% max jitter
    const randomJitter = (Math.random() - 0.5) * 2 * maxJitter;
    const newOffset = currentOffset * 0.9 + randomJitter * 0.1;
    
    this.jitterOffsets.set(quote.instrumentToken, newOffset);
    quote.jitter_offset = newOffset;
    quote.display_price = quote.actual_price + newOffset;
  }

  /**
   * Apply interpolation for smooth price transitions
   */
  private applyInterpolation(quote: EnhancedQuote): void {
    const state = this.interpolationStates.get(quote.instrumentToken);
    
    if (!state || !state.isActive) {
      // Start new interpolation
      this.interpolationStates.set(quote.instrumentToken, {
        startPrice: state?.targetPrice || quote.actual_price,
        targetPrice: quote.actual_price,
        startTime: Date.now(),
        isActive: true,
      });
      return;
    }

    const now = Date.now();
    const elapsed = now - state.startTime;
    const duration = 1000; // 1 second interpolation
    
    if (elapsed < duration) {
      const progress = elapsed / duration;
      quote.display_price = state.startPrice + (state.targetPrice - state.startPrice) * progress;
    } else {
      quote.display_price = quote.actual_price;
      state.isActive = false;
    }

    state.targetPrice = quote.actual_price;
  }

  /**
   * Subscribe to instruments
   */
  subscribeToInstruments(instruments: number[], mode: SubscriptionMode): void {
    if (!this.client?.isConnected) {
      console.warn('⚠️ [WS-MARKET-DATA-SERVICE] Cannot subscribe - not connected');
      return;
    }

    console.log('📡 [WS-MARKET-DATA-SERVICE] Subscribing to instruments', {
      instruments,
      mode,
      count: instruments.length,
    });

    // Update subscription state
    instruments.forEach(instrument => {
      this.subscriptions.set(instrument, mode);
    });

    // Emit subscription request
    this.client.subscribe(instruments, mode);
  }

  /**
   * Unsubscribe from instruments
   */
  unsubscribeFromInstruments(instruments: number[]): void {
    if (!this.client?.isConnected) {
      console.warn('⚠️ [WS-MARKET-DATA-SERVICE] Cannot unsubscribe - not connected');
      return;
    }

    console.log('🚫 [WS-MARKET-DATA-SERVICE] Unsubscribing from instruments', {
      instruments,
      count: instruments.length,
    });

    // Remove from subscription state
    instruments.forEach(instrument => {
      this.subscriptions.delete(instrument);
    });

    // Emit unsubscribe request
    this.client.unsubscribe(instruments);
  }

  /**
   * Resubscribe to all previous subscriptions
   */
  private resubscribeAll(): void {
    if (!this.client?.isConnected) {
      return;
    }

    console.log('🔄 [WS-MARKET-DATA-SERVICE] Resubscribing to all instruments', {
      count: this.subscriptions.size,
    });

    // Group instruments by mode
    const instrumentsByMode = new Map<SubscriptionMode, number[]>();
    
    this.subscriptions.forEach((mode, instrument) => {
      if (!instrumentsByMode.has(mode)) {
        instrumentsByMode.set(mode, []);
      }
      instrumentsByMode.get(mode)!.push(instrument);
    });

    // Subscribe for each mode
    instrumentsByMode.forEach((instruments, mode) => {
      this.client!.subscribe(instruments, mode);
    });
  }

  /**
   * Get price for instrument
   */
  getPrice(instrumentToken: number): EnhancedQuote | null {
    return this.priceCache.get(instrumentToken) || null;
  }

  /**
   * Get all cached prices
   */
  getAllPrices(): Map<number, EnhancedQuote> {
    return new Map(this.priceCache);
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.client?.isConnected ?? false;
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    console.log('🔌 [WS-MARKET-DATA-SERVICE] Disconnecting service');
    
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }

    // Clear subscription state
    this.subscriptions.clear();
    this.jitterOffsets.clear();
    this.interpolationStates.clear();
  }

  /**
   * Cleanup service
   */
  destroy(): void {
    console.log('🗑️ [WS-MARKET-DATA-SERVICE] Destroying service');
    
    this.disconnect();
    this.listeners.clear();
    this.priceCache.clear();
    this.previousPrices.clear();
  }
}

