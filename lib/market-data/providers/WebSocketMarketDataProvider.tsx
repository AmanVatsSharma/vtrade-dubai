/**
 * @file WebSocketMarketDataProvider.tsx
 * @description Real-time market data provider using Socket.IO WebSocket connection
 * 
 * PURPOSE:
 * - Provides live market prices via WebSocket (no polling)
 * - Subscribes to user's watchlist, positions, and index instruments
 * - Implements smooth price transitions with jitter and interpolation
 * - Handles connection lifecycle, reconnection, and error recovery
 * 
 * FEATURES:
 * - Real-time LTP updates via Socket.IO
 * - Auto-subscription management based on user data
 * - Smooth price animations (jitter + interpolation)
 * - Connection health monitoring
 * - Comprehensive error handling
 * - Detailed console logging
 * 
 * USAGE:
 * Wrap your dashboard with this provider:
 * <WebSocketMarketDataProvider userId={userId}>
 *   <TradingDashboard />
 * </WebSocketMarketDataProvider>
 * 
 * Then use the hook in child components:
 * const { quotes, isLoading, isConnected } = useMarketData()
 * 
 * ENVIRONMENT VARIABLES:
 * - LIVE_MARKET_WS_URL: WebSocket server URL
 * - LIVE_MARKET_WS_API_KEY: API authentication key
 * - NEXT_PUBLIC_ENABLE_WS_MARKET_DATA: Feature flag
 * 
 * ERROR HANDLING:
 * - Connection failures: Retry with exponential backoff
 * - Disconnections: Use cached prices, show disconnect status
 * - Invalid data: Log warning, skip invalid updates
 * - Subscription errors: Emit error event, continue with other subscriptions
 * 
 * @author Trading Platform Team
 * @date 2025-10-28
 */

"use client";

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from "react";
import { usePortfolio, useUserWatchlist, usePositions } from "@/lib/hooks/use-trading-data";
import { useWebSocketMarketData } from "../hooks/useWebSocketMarketData";
import { extractTokens, parseInstrumentId, INDEX_INSTRUMENTS } from "../utils/instrumentMapper";
import type { MarketDataContextType, MarketDataConfig, EnhancedQuote, ConnectionState, WSMarketDataError, SubscriptionMode } from "./types";

// Default configuration matching old provider
const DEFAULT_CONFIG: MarketDataConfig = {
  jitter: {
    enabled: true,
    interval: 250,
    intensity: 0.15,
    convergence: 0.1,
  },
  deviation: {
    enabled: false,
    percentage: 0,
    absolute: 0,
  },
  interpolation: {
    enabled: true,
    steps: 50,
    duration: 2800,
  },
};

// Context
const MarketDataContext = createContext<MarketDataContextType>({
  quotes: {},
  isLoading: true,
  isConnected: 'disconnected',
  error: null,
  config: DEFAULT_CONFIG,
  updateConfig: () => {},
  subscribe: () => {},
  unsubscribe: () => {},
  reconnect: () => {},
});

export const useMarketData = () => useContext(MarketDataContext);

interface MarketDataProviderProps {
  userId: string;
  children: ReactNode;
  config?: Partial<MarketDataConfig>;
  enableWebSocket?: boolean;
}

/**
 * WebSocket Market Data Provider
 * 
 * Provides real-time market data via Socket.IO WebSocket connection.
 * Automatically subscribes to user's watchlist, positions, and index instruments.
 */
export function WebSocketMarketDataProvider({ 
  userId, 
  children, 
  config: userConfig = {},
  enableWebSocket = true,
}: MarketDataProviderProps) {
  const [config, setConfig] = useState<MarketDataConfig>({ ...DEFAULT_CONFIG, ...userConfig });
  // Track previous subscriptions for dynamic updates
  const previousTokensRef = useRef<Set<number>>(new Set());

  console.log('🚀 [WS-PROVIDER] Initializing WebSocket Market Data Provider', {
    userId,
    enableWebSocket,
    timestamp: new Date().toISOString(),
  });

  // Get environment variables
  // Match test-websocket page URL format: https://marketdata.vedpragya.com/market-data
  // SocketIOClient will handle ws:// to http:// and wss:// to https:// conversion
  const wsUrl = process.env.NEXT_PUBLIC_LIVE_MARKET_WS_URL || 
    (typeof window !== 'undefined' && window.location.protocol === 'https:' 
      ? 'https://marketdata.vedpragya.com/market-data'
      : 'https://marketdata.vedpragya.com/market-data');
  const apiKey = process.env.NEXT_PUBLIC_LIVE_MARKET_WS_API_KEY || 'demo-key-1';
  const isEnabled = process.env.NEXT_PUBLIC_ENABLE_WS_MARKET_DATA === 'true' || enableWebSocket;

  console.log('🔧 [WS-PROVIDER] Configuration', {
    wsUrl,
    isEnabled,
    hasApiKey: !!apiKey,
  });

  // Initialize WebSocket hook
  const wsData = useWebSocketMarketData({
    url: wsUrl,
    apiKey,
    autoConnect: isEnabled,
    reconnectAttempts: 5,
    reconnectDelay: 5000,
    heartbeatInterval: 30000,
    enableJitter: config.jitter.enabled,
    enableInterpolation: config.interpolation.enabled,
  });

  // Get user data
  const { watchlist } = useUserWatchlist(userId);
  const { positions } = usePositions(userId);

  // Collect instrument tokens for subscription
  const instrumentTokens = useMemo(() => {
    const tokens = new Set<number>();
    
    // Add index instruments
    Object.values(INDEX_INSTRUMENTS).forEach((token) => {
      if (token) tokens.add(token);
    });

    // Add watchlist instruments
    if (watchlist?.items) {
      watchlist.items.forEach((item: any) => {
        // First, try to use the token field directly (new API)
        if (item.token) {
          tokens.add(item.token);
          console.log('🔑 [WS-PROVIDER] Using token from Stock.token field:', item.token);
        }
        // Fallback to parsing instrumentId
        else if (item.instrumentId) {
          const token = parseInstrumentId(item.instrumentId);
          if (token) tokens.add(token);
          console.log('📋 [WS-PROVIDER] Parsed token from instrumentId:', token);
        }
      });
    }

    // Add position instruments
    if (positions?.length) {
      positions.forEach((pos: any) => {
        if (pos.instrumentId) {
          const token = parseInstrumentId(pos.instrumentId);
          if (token) tokens.add(token);
        }
      });
    }

    console.log('📋 [WS-PROVIDER] Collected instrument tokens', {
      count: tokens.size,
      instruments: Array.from(tokens),
    });

    return Array.from(tokens);
  }, [watchlist, positions]);

  // Dynamic subscription management: update subscriptions when instruments change
  useEffect(() => {
    if (wsData.isConnected !== 'connected') {
      console.log('⏳ [WS-PROVIDER] Waiting for connection before subscribing', {
        connectionState: wsData.isConnected,
      });
      return;
    }

    if (instrumentTokens.length === 0) {
      console.log('⚠️ [WS-PROVIDER] No instruments to subscribe to');
      return;
    }

    // Convert to Set for easier comparison
    const currentTokens = new Set(instrumentTokens);
    const previousTokens = previousTokensRef.current;

    // Find added and removed tokens
    const addedTokens = instrumentTokens.filter(token => !previousTokens.has(token));
    const removedTokens = Array.from(previousTokens).filter(token => !currentTokens.has(token));

    // Log subscription changes
    console.log('🔄 [WS-PROVIDER] Subscription update check', {
      previousCount: previousTokens.size,
      currentCount: currentTokens.size,
      added: addedTokens.length > 0 ? addedTokens : 'none',
      removed: removedTokens.length > 0 ? removedTokens : 'none',
      allInstruments: Array.from(currentTokens),
    });

    // Unsubscribe from removed instruments
    if (removedTokens.length > 0) {
      console.log('🚫 [WS-PROVIDER] Unsubscribing from removed instruments', {
        tokens: removedTokens,
        count: removedTokens.length,
      });
      wsData.unsubscribe(removedTokens, 'ltp');
    }

    // Subscribe to new instruments (including initial subscription)
    if (addedTokens.length > 0 || previousTokens.size === 0) {
      // If first time (previousTokens is empty), subscribe to all
      // Otherwise, only subscribe to newly added
      const tokensToSubscribe = previousTokens.size === 0 ? instrumentTokens : addedTokens;
      
      console.log('📡 [WS-PROVIDER] Subscribing to instruments', {
        tokens: tokensToSubscribe,
        count: tokensToSubscribe.length,
        mode: 'ltp',
        isInitial: previousTokens.size === 0,
      });
      
      wsData.subscribe(tokensToSubscribe, 'ltp');
    }

    // Update previous tokens reference
    previousTokensRef.current = new Set(currentTokens);
  }, [wsData.isConnected, instrumentTokens, wsData]);

  // Reset subscription tracking on disconnection
  useEffect(() => {
    if (wsData.isConnected === 'disconnected') {
      console.log('🔌 [WS-PROVIDER] Connection lost - resetting subscription tracking');
      previousTokensRef.current = new Set();
    }
  }, [wsData.isConnected]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<MarketDataConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...newConfig,
      jitter: { ...prev.jitter, ...newConfig.jitter },
      deviation: { ...prev.deviation, ...newConfig.deviation },
      interpolation: { ...prev.interpolation, ...newConfig.interpolation },
    }));
  }, []);

  // Reconnect handler
  const reconnect = useCallback(() => {
    console.log('🔄 [WS-PROVIDER] Reconnecting...');
    // Reset subscription tracking on reconnect to allow resubscription
    previousTokensRef.current = new Set();
    wsData.reconnect();
  }, [wsData]);

  // Subscribe handler
  const subscribe = useCallback((instruments: number[], mode: SubscriptionMode) => {
    console.log('📡 [WS-PROVIDER] Manual subscription', {
      instruments,
      mode,
      count: instruments.length,
    });
    wsData.subscribe(instruments, mode);
  }, [wsData]);

  // Unsubscribe handler
  const unsubscribe = useCallback((instruments: number[], mode: SubscriptionMode) => {
    console.log('🚫 [WS-PROVIDER] Manual unsubscription', {
      instruments,
      mode,
      count: instruments.length,
    });
    wsData.unsubscribe(instruments, mode);
  }, [wsData]);

  // Convert WebSocket quotes to EnhancedQuote format
  const quotes = useMemo(() => {
    const result: Record<string, EnhancedQuote> = {};
    
    Object.entries(wsData.quotes).forEach(([key, quote]) => {
      result[key] = quote;
    });

    return result;
  }, [wsData.quotes]);

  // Context value
  const contextValue: MarketDataContextType = {
    quotes,
    isLoading: wsData.isLoading,
    isConnected: wsData.isConnected,
    error: wsData.error,
    config,
    updateConfig,
    subscribe,
    unsubscribe,
    reconnect,
  };

  // Log connection status and subscription updates
  useEffect(() => {
    console.log('📊 [WS-PROVIDER] Connection status update', {
      isConnected: wsData.isConnected,
      isLoading: wsData.isLoading,
      activeSubscriptions: wsData.getSubscriptionCount(),
      quotesReceived: Object.keys(quotes).length,
      trackedTokens: previousTokensRef.current.size,
    });
  }, [wsData.isConnected, wsData.isLoading, wsData.getSubscriptionCount, quotes]);

  // Log watchlist/position changes that trigger subscription updates
  useEffect(() => {
    console.log('📋 [WS-PROVIDER] User data update', {
      watchlistItems: watchlist?.items?.length || 0,
      positionsCount: positions?.length || 0,
      totalInstruments: instrumentTokens.length,
      instruments: instrumentTokens,
    });
  }, [watchlist, positions, instrumentTokens]);

  return (
    <MarketDataContext.Provider value={contextValue}>
      {children}
    </MarketDataContext.Provider>
  );
}

