// // hooks/use-vortex-websocket.ts
// "use client";
// import { useState, useEffect, useCallback, useRef } from 'react';
// import { VortexWebSocket, VortexPriceData, VortexSubscription } from '@/lib/vortex-websocket';
// import { logger, LogCategory } from '@/lib/logger';

// interface UseVortexWebSocketOptions {
//   autoConnect?: boolean;
//   maxReconnectAttempts?: number;
//   reconnectInterval?: number;
//   heartbeatInterval?: number;
// }

// interface VortexWebSocketState {
//   isConnected: boolean;
//   isConnecting: boolean;
//   error: string | null;
//   subscriptions: VortexSubscription[];
//   lastPriceUpdate: VortexPriceData | null;
//   priceData: Map<string, VortexPriceData>;
//   connectionCount: number;
// }

// export const useVortexWebSocket = (options: UseVortexWebSocketOptions = {}) => {
//   const {
//     autoConnect = false,
//     maxReconnectAttempts = 5,
//     reconnectInterval = 5000,
//     heartbeatInterval = 30000
//   } = options;

//   const [state, setState] = useState<VortexWebSocketState>({
//     isConnected: false,
//     isConnecting: false,
//     error: null,
//     subscriptions: [],
//     lastPriceUpdate: null,
//     priceData: new Map(),
//     connectionCount: 0
//   });

//   const wsRef = useRef<VortexWebSocket | null>(null);
//   const accessTokenRef = useRef<string | null>(null);

//   // Get access token from session
//   const getAccessToken = useCallback(async (): Promise<string | null> => {
//     try {
//       const response = await fetch('/api/ws');
//       const data = await response.json();
      
//       if (data.success && data.data?.url) {
//         const url = new URL(data.data.url);
//         const token = url.searchParams.get('auth_token');
//         return token;
//       }
      
//       return null;
//     } catch (error) {
//       console.error('Failed to get access token:', error);
//       return null;
//     }
//   }, []);

//   // Connect to WebSocket
//   const connect = useCallback(async () => {
//     if (state.isConnected || state.isConnecting) {
//       return;
//     }

//     setState(prev => ({ ...prev, isConnecting: true, error: null }));

//     try {
//       // Get access token
//       const token = await getAccessToken();
//       if (!token) {
//         throw new Error('No valid access token available');
//       }

//       accessTokenRef.current = token;

//       // Create WebSocket instance
//       const ws = new VortexWebSocket({
//         accessToken: token,
//         maxReconnectAttempts,
//         reconnectInterval,
//         heartbeatInterval
//       });

//       // Set up event listeners
//       ws.on('connected', () => {
//         logger.info(LogCategory.UI, 'WebSocket connected via hook');
//         setState(prev => ({
//           ...prev,
//           isConnected: true,
//           isConnecting: false,
//           error: null,
//           connectionCount: prev.connectionCount + 1
//         }));
//       });

//       ws.on('disconnected', (event) => {
//         logger.warn(LogCategory.UI, 'WebSocket disconnected via hook', event);
//         setState(prev => ({
//           ...prev,
//           isConnected: false,
//           isConnecting: false
//         }));
//       });

//       ws.on('error', (error) => {
//         logger.error(LogCategory.UI, 'WebSocket error via hook', error as Error);
//         setState(prev => ({
//           ...prev,
//           isConnected: false,
//           isConnecting: false,
//           error: error.message || 'WebSocket connection error'
//         }));
//       });

//       ws.on('subscribed', (subscription) => {
//         logger.info(LogCategory.UI, 'Subscribed to instrument via hook', subscription);
//         setState(prev => ({
//           ...prev,
//           subscriptions: [...prev.subscriptions, subscription]
//         }));
//       });

//       ws.on('unsubscribed', (subscription) => {
//         logger.info(LogCategory.UI, 'Unsubscribed from instrument via hook', subscription);
//         setState(prev => ({
//           ...prev,
//           subscriptions: prev.subscriptions.filter(sub => 
//             !(sub.exchange === subscription.exchange && 
//               sub.token === subscription.token && 
//               sub.mode === subscription.mode)
//           )
//         }));
//       });

//       ws.on('quote', (quote: VortexPriceData) => {
//         const key = `${quote.exchange}:${quote.token}`;
        
//         setState(prev => ({
//           ...prev,
//           lastPriceUpdate: quote,
//           priceData: new Map(prev.priceData.set(key, quote))
//         }));

//         logger.debug(LogCategory.UI, 'Price update received via hook', {
//           instrument: key,
//           price: quote.lastTradePrice
//         });
//       });

//       ws.on('priceUpdate', (quotes: VortexPriceData[]) => {
//         const newPriceData = new Map(state.priceData);
        
//         quotes.forEach(quote => {
//           const key = `${quote.exchange}:${quote.token}`;
//           newPriceData.set(key, quote);
//         });

//         setState(prev => ({
//           ...prev,
//           lastPriceUpdate: quotes[quotes.length - 1] || prev.lastPriceUpdate,
//           priceData: newPriceData
//         }));

//         logger.debug(LogCategory.UI, 'Batch price update received via hook', {
//           count: quotes.length
//         });
//       });

//       wsRef.current = ws;

//       // Connect
//       await ws.connect();

//     } catch (error) {
//       const errorMessage = error instanceof Error ? error.message : 'Unknown error';
//       logger.error(LogCategory.UI, 'Failed to connect WebSocket via hook', error as Error);
      
//       setState(prev => ({
//         ...prev,
//         isConnected: false,
//         isConnecting: false,
//         error: errorMessage
//       }));
//     }
//   }, [state.isConnected, state.isConnecting, getAccessToken, maxReconnectAttempts, reconnectInterval, heartbeatInterval]);

//   // Disconnect from WebSocket
//   const disconnect = useCallback(() => {
//     if (wsRef.current) {
//       wsRef.current.disconnect();
//       wsRef.current = null;
//     }
    
//     setState(prev => ({
//       ...prev,
//       isConnected: false,
//       isConnecting: false,
//       subscriptions: [],
//       priceData: new Map()
//     }));
//   }, []);

//   // Subscribe to instrument
//   const subscribe = useCallback((subscription: VortexSubscription) => {
//     if (wsRef.current && state.isConnected) {
//       wsRef.current.subscribe(subscription);
//     } else {
//       logger.warn(LogCategory.UI, 'Cannot subscribe - WebSocket not connected');
//     }
//   }, [state.isConnected]);

//   // Unsubscribe from instrument
//   const unsubscribe = useCallback((subscription: VortexSubscription) => {
//     if (wsRef.current && state.isConnected) {
//       wsRef.current.unsubscribe(subscription);
//     } else {
//       logger.warn(LogCategory.UI, 'Cannot unsubscribe - WebSocket not connected');
//     }
//   }, [state.isConnected]);

//   // Subscribe to LTP
//   const subscribeToLTP = useCallback((exchange: VortexSubscription['exchange'], token: number) => {
//     subscribe({
//       exchange,
//       token,
//       mode: 'ltp',
//       message_type: 'subscribe'
//     });
//   }, [subscribe]);

//   // Subscribe to OHLCV
//   const subscribeToOHLCV = useCallback((exchange: VortexSubscription['exchange'], token: number) => {
//     subscribe({
//       exchange,
//       token,
//       mode: 'ohlcv',
//       message_type: 'subscribe'
//     });
//   }, [subscribe]);

//   // Subscribe to Full
//   const subscribeToFull = useCallback((exchange: VortexSubscription['exchange'], token: number) => {
//     subscribe({
//       exchange,
//       token,
//       mode: 'full',
//       message_type: 'subscribe'
//     });
//   }, [subscribe]);

//   // Get price for specific instrument
//   const getPrice = useCallback((exchange: string, token: number): VortexPriceData | null => {
//     const key = `${exchange}:${token}`;
//     return state.priceData.get(key) || null;
//   }, [state.priceData]);

//   // Auto-connect on mount if enabled
//   useEffect(() => {
//     if (autoConnect) {
//       connect();
//     }

//     return () => {
//       disconnect();
//     };
//   }, [autoConnect, connect, disconnect]);

//   return {
//     // State
//     isConnected: state.isConnected,
//     isConnecting: state.isConnecting,
//     error: state.error,
//     subscriptions: state.subscriptions,
//     lastPriceUpdate: state.lastPriceUpdate,
//     priceData: state.priceData,
//     connectionCount: state.connectionCount,

//     // Actions
//     connect,
//     disconnect,
//     subscribe,
//     unsubscribe,
//     subscribeToLTP,
//     subscribeToOHLCV,
//     subscribeToFull,
//     getPrice,

//     // Utils
//     isWebSocketConnected: () => wsRef.current?.isWebSocketConnected() || false
//   };
// };
