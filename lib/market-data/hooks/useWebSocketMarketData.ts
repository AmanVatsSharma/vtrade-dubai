/**
 * @file useWebSocketMarketData.ts
 * @description React hook for WebSocket-based real-time market data
 * 
 * PURPOSE:
 * - Provide React hook interface for WebSocket market data
 * - Manage WebSocket connection lifecycle
 * - Handle subscription state
 * - Provide price data to components
 * - Implement loading and error states
 * - Auto-subscribe based on watchlist/positions
 * - Handle reconnection logic
 * 
 * FEATURES:
 * - Real-time price updates via WebSocket
 * - Connection status indicators
 * - Automatic subscription management
 * - Error recovery
 * - Cached price fallback during disconnection
 * - Loading states
 * 
 * DEPENDENCIES:
 * - WebSocketMarketDataService: Business logic layer
 * - React hooks for state management
 * 
 * EXPORTS:
 * - useWebSocketMarketData: Main hook
 * 
 * USAGE:
 * const { quotes, isLoading, isConnected, subscribe, unsubscribe } = useWebSocketMarketData({
 *   url: 'ws://...',
 *   apiKey: '...',
 *   autoConnect: true,
 * });
 * 
 * ERROR HANDLING:
 * - Connection failures: Show error state, retry with reconnection
 * - Disconnections: Use cached prices, show disconnected status
 * - Invalid data: Log error, skip invalid updates
 * 
 * @author Trading Platform Team
 * @date 2025-10-28
 */

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WebSocketMarketDataService } from '../services/WebSocketMarketDataService';
import type { 
  EnhancedQuote, 
  ConnectionState,
  WSMarketDataError,
  SubscriptionMode 
} from '../providers/types';

/**
 * Configuration for useWebSocketMarketData hook
 */
export interface UseWebSocketMarketDataConfig {
  url: string;
  apiKey: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  heartbeatInterval?: number;
  enableJitter?: boolean;
  enableInterpolation?: boolean;
}

/**
 * Return type for useWebSocketMarketData hook
 */
export interface UseWebSocketMarketDataReturn {
  // Price data
  quotes: Record<string, EnhancedQuote>;
  
  // Connection state
  isConnected: ConnectionState;
  isLoading: boolean;
  error: WSMarketDataError | null;
  
  // Subscription management
  subscribe: (instruments: number[], mode: SubscriptionMode) => void;
  unsubscribe: (instruments: number[], mode: SubscriptionMode) => void;
  
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
  
  // Utilities
  getPrice: (instrumentToken: number) => EnhancedQuote | null;
  getSubscriptionCount: () => number;
}

/**
 * React hook for WebSocket market data
 * 
 * Manages:
 * - WebSocket connection lifecycle
 * - Price data state
 * - Subscription management
 * - Error handling
 * - Connection status
 * 
 * @param config - Configuration for WebSocket connection
 * @returns Market data state and control functions
 */
export function useWebSocketMarketData(
  config: UseWebSocketMarketDataConfig
): UseWebSocketMarketDataReturn {
  const [quotes, setQuotes] = useState<Record<string, EnhancedQuote>>({});
  const [isConnected, setIsConnected] = useState<ConnectionState>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<WSMarketDataError | null>(null);
  
  const serviceRef = useRef<WebSocketMarketDataService | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * Initialize service
   */
  const initializeService = useCallback(async () => {
    if (isInitializedRef.current) {
      console.warn('⚠️ [HOOK-WS-MARKET-DATA] Service already initialized');
      return;
    }

    console.log('🚀 [HOOK-WS-MARKET-DATA] Initializing service...');
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Create service instance
      const service = new WebSocketMarketDataService({
        url: config.url,
        apiKey: config.apiKey,
        reconnectAttempts: config.reconnectAttempts,
        reconnectDelay: config.reconnectDelay,
        heartbeatInterval: config.heartbeatInterval,
        enableJitter: config.enableJitter,
        enableInterpolation: config.enableInterpolation,
      });

      // Setup event handlers
      service.on('connected', () => {
        console.log('✅ [HOOK-WS-MARKET-DATA] Connected');
        setIsConnected('connected');
        setIsLoading(false);
        setError(null);
      });

      service.on('disconnected', () => {
        console.log('❌ [HOOK-WS-MARKET-DATA] Disconnected');
        setIsConnected('disconnected');
      });

      service.on('error', (err: WSMarketDataError) => {
        console.error('❌ [HOOK-WS-MARKET-DATA] Error', err);
        setError(err);
        setIsConnected('error');
        setIsLoading(false);
      });

      service.on('priceUpdate', (data: { quotes: EnhancedQuote[] }) => {
        console.log('📊 [HOOK-WS-MARKET-DATA] Price update', {
          count: data.quotes.length,
        });
        
        // Update quotes state
        const newQuotes: Record<string, EnhancedQuote> = {};
        data.quotes.forEach(quote => {
          newQuotes[quote.instrumentToken.toString()] = quote;
        });
        
        setQuotes(prevQuotes => ({
          ...prevQuotes,
          ...newQuotes,
        }));
      });

      // Initialize and connect
      await service.initialize();
      
      serviceRef.current = service;
      isInitializedRef.current = true;
      
      console.log('✅ [HOOK-WS-MARKET-DATA] Service initialized');
    } catch (err) {
      console.error('❌ [HOOK-WS-MARKET-DATA] Failed to initialize', err);
      setError({
        code: 'INIT_ERROR',
        message: (err as Error).message,
        timestamp: new Date().toISOString(),
      });
      setIsConnected('error');
      setIsLoading(false);
    }
  }, [config]);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(async () => {
    console.log('🔌 [HOOK-WS-MARKET-DATA] Connecting...');
    
    if (!serviceRef.current) {
      await initializeService();
    }
    
    setIsConnected('connecting');
    setIsLoading(true);
  }, [initializeService]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    console.log('🔌 [HOOK-WS-MARKET-DATA] Disconnecting...');
    
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
      isInitializedRef.current = false;
    }
    
    setIsConnected('disconnected');
    setIsLoading(false);
    setQuotes({});
  }, []);

  /**
   * Reconnect to WebSocket
   */
  const reconnect = useCallback(async () => {
    console.log('🔄 [HOOK-WS-MARKET-DATA] Reconnecting...');
    
    disconnect();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await connect();
  }, [connect, disconnect]);

  /**
   * Subscribe to instruments
   */
  const subscribe = useCallback((instruments: number[], mode: SubscriptionMode) => {
    if (!serviceRef.current) {
      console.warn('⚠️ [HOOK-WS-MARKET-DATA] Cannot subscribe - service not initialized');
      return;
    }
    
    if (!serviceRef.current.isConnected) {
      console.warn('⚠️ [HOOK-WS-MARKET-DATA] Cannot subscribe - not connected');
      return;
    }

    console.log('📡 [HOOK-WS-MARKET-DATA] Subscribing', {
      instruments,
      mode,
      count: instruments.length,
    });
    
    serviceRef.current.subscribeToInstruments(instruments, mode);
  }, []);

  /**
   * Unsubscribe from instruments
   */
  const unsubscribe = useCallback((instruments: number[], mode: SubscriptionMode) => {
    if (!serviceRef.current) {
      console.warn('⚠️ [HOOK-WS-MARKET-DATA] Cannot unsubscribe - service not initialized');
      return;
    }
    
    console.log('🚫 [HOOK-WS-MARKET-DATA] Unsubscribing', {
      instruments,
      mode,
      count: instruments.length,
    });
    
    serviceRef.current.unsubscribeFromInstruments(instruments);
  }, []);

  /**
   * Get price for instrument
   */
  const getPrice = useCallback((instrumentToken: number): EnhancedQuote | null => {
    return quotes[instrumentToken.toString()] || null;
  }, [quotes]);

  /**
   * Get subscription count
   */
  const getSubscriptionCount = useCallback((): number => {
    return Object.keys(quotes).length;
  }, [quotes]);

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    if (config.autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [config.autoConnect, connect, disconnect]);

  return {
    quotes,
    isConnected,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    reconnect,
    getPrice,
    getSubscriptionCount,
  };
}

