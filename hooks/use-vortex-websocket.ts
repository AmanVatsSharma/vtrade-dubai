// hooks/use-vortex-websocket.ts
"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { VortexWebSocket, VortexPriceData, VortexSubscription } from '@/lib/vortex/vortex-websocket';

interface UseVortexWebSocketOptions {
  autoConnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

interface VortexWebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  subscriptions: VortexSubscription[];
  lastPriceUpdate: VortexPriceData | null;
  priceData: Map<string, VortexPriceData>;
  connectionCount: number;
}

export const useVortexWebSocket = (options: UseVortexWebSocketOptions = {}) => {
  const {
    autoConnect = false,
    maxReconnectAttempts = 5,
    reconnectInterval = 5000,
    heartbeatInterval = 30000,
  } = options;

  const [state, setState] = useState<VortexWebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    subscriptions: [],
    lastPriceUpdate: null,
    priceData: new Map(),
    connectionCount: 0,
  });

  const wsRef = useRef<VortexWebSocket | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/ws');
      const data = await response.json();
      if (data.success && data.data?.url) {
        const url = new URL(data.data.url);
        const token = url.searchParams.get('auth_token');
        return token;
      }
      return null;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    if (state.isConnected || state.isConnecting) return;
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const token = await getAccessToken();
      if (!token) throw new Error('No valid access token available');
      accessTokenRef.current = token;

      const ws = new VortexWebSocket({
        accessToken: token,
        maxReconnectAttempts,
        reconnectInterval,
        heartbeatInterval,
      });

      ws.on('connected', () => {
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          connectionCount: prev.connectionCount + 1,
        }));
      });

      ws.on('disconnected', () => {
        setState((prev) => ({ ...prev, isConnected: false, isConnecting: false }));
      });

      ws.on('error', (error: any) => {
        const message = error?.message || 'WebSocket connection error';
        setState((prev) => ({ ...prev, isConnected: false, isConnecting: false, error: message }));
      });

      ws.on('subscribed', (subscription) => {
        setState((prev) => ({ ...prev, subscriptions: [...prev.subscriptions, subscription] }));
      });

      ws.on('unsubscribed', (subscription) => {
        setState((prev) => ({
          ...prev,
          subscriptions: prev.subscriptions.filter(
            (sub) => !(sub.exchange === subscription.exchange && sub.token === subscription.token && sub.mode === subscription.mode),
          ),
        }));
      });

      ws.on('quote', (quote: VortexPriceData) => {
        const key = `${quote.exchange}:${quote.token}`;
        setState((prev) => ({
          ...prev,
          lastPriceUpdate: quote,
          priceData: new Map(prev.priceData.set(key, quote)),
        }));
      });

      ws.on('priceUpdate', (quotes: VortexPriceData[]) => {
        const newPriceData = new Map(state.priceData);
        quotes.forEach((quote) => {
          const key = `${quote.exchange}:${quote.token}`;
          newPriceData.set(key, quote);
        });
        setState((prev) => ({
          ...prev,
          lastPriceUpdate: quotes[quotes.length - 1] || prev.lastPriceUpdate,
          priceData: newPriceData,
        }));
      });

      wsRef.current = ws;
      await ws.connect();
    } catch (error: any) {
      const message = error?.message || 'Unknown error';
      setState((prev) => ({ ...prev, isConnected: false, isConnecting: false, error: message }));
    }
  }, [state.isConnected, state.isConnecting, getAccessToken, maxReconnectAttempts, reconnectInterval, heartbeatInterval, state.priceData]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      subscriptions: [],
      priceData: new Map(),
    }));
  }, []);

  const subscribe = useCallback((subscription: VortexSubscription) => {
    if (wsRef.current && state.isConnected) {
      wsRef.current.subscribe(subscription);
    } else {
      console.warn('Cannot subscribe - WebSocket not connected');
    }
  }, [state.isConnected]);

  const unsubscribe = useCallback((subscription: VortexSubscription) => {
    if (wsRef.current && state.isConnected) {
      wsRef.current.unsubscribe(subscription);
    } else {
      console.warn('Cannot unsubscribe - WebSocket not connected');
    }
  }, [state.isConnected]);

  const subscribeToLTP = useCallback((exchange: VortexSubscription['exchange'], token: number) => {
    subscribe({ exchange, token, mode: 'ltp', message_type: 'subscribe' });
  }, [subscribe]);

  const subscribeToOHLCV = useCallback((exchange: VortexSubscription['exchange'], token: number) => {
    subscribe({ exchange, token, mode: 'ohlcv', message_type: 'subscribe' });
  }, [subscribe]);

  const subscribeToFull = useCallback((exchange: VortexSubscription['exchange'], token: number) => {
    subscribe({ exchange, token, mode: 'full', message_type: 'subscribe' });
  }, [subscribe]);

  const getPrice = useCallback((exchange: string, token: number): VortexPriceData | null => {
    const key = `${exchange}:${token}`;
    return state.priceData.get(key) || null;
  }, [state.priceData]);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected: state.isConnected,
    isConnecting: state.isConnecting,
    error: state.error,
    subscriptions: state.subscriptions,
    lastPriceUpdate: state.lastPriceUpdate,
    priceData: state.priceData,
    connectionCount: state.connectionCount,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    subscribeToLTP,
    subscribeToOHLCV,
    subscribeToFull,
    getPrice,
    isWebSocketConnected: () => wsRef.current?.isWebSocketConnected() || false,
  };
};
