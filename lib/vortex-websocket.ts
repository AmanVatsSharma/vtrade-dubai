// // lib/vortex-websocket.ts
// import { EventEmitter } from 'events';
// import { logger, LogCategory } from './logger';

// export interface VortexWebSocketConfig {
//   accessToken: string;
//   maxReconnectAttempts?: number;
//   reconnectInterval?: number;
//   heartbeatInterval?: number;
// }

// export interface VortexSubscription {
//   exchange: 'NSE_EQ' | 'NSE_FO' | 'NSE_CUR' | 'MCX_FO';
//   token: number;
//   mode: 'ltp' | 'ohlcv' | 'full';
//   message_type: 'subscribe' | 'unsubscribe';
// }

// export interface VortexPriceData {
//   exchange: string;
//   token: number;
//   lastTradePrice?: number;
//   lastTradeTime?: number;
//   openPrice?: number;
//   highPrice?: number;
//   lowPrice?: number;
//   closePrice?: number;
//   volume?: number;
//   lastUpdateTime?: number;
//   lastTradeQuantity?: number;
//   averageTradePrice?: number;
//   totalBuyQuantity?: number;
//   totalSellQuantity?: number;
//   openInterest?: number;
//   depth?: {
//     buy: Array<{ price: number; quantity: number; orders: number }>;
//     sell: Array<{ price: number; quantity: number; orders: number }>;
//   };
//   dprHigh?: number;
//   dprLow?: number;
// }

// export class VortexWebSocket extends EventEmitter {
//   private ws: WebSocket | null = null;
//   private config: VortexWebSocketConfig;
//   private isConnected = false;
//   private reconnectAttempts = 0;
//   private subscriptions = new Map<string, VortexSubscription>();
//   private heartbeatTimer: NodeJS.Timeout | null = null;
//   private reconnectTimer: NodeJS.Timeout | null = null;

//   constructor(config: VortexWebSocketConfig) {
//     super();
//     this.config = {
//       maxReconnectAttempts: 5,
//       reconnectInterval: 5000,
//       heartbeatInterval: 30000,
//       ...config
//     };
//   }

//   public connect(): Promise<void> {
//     return new Promise((resolve, reject) => {
//       try {
//         const wsUrl = `wss://wire.rupeezy.in/ws?auth_token=${this.config.accessToken}`;
        
//         logger.info(LogCategory.VORTEX_API, 'Connecting to Vortex WebSocket', {
//           url: wsUrl.replace(this.config.accessToken, '***'),
//           maxReconnectAttempts: this.config.maxReconnectAttempts
//         });

//         this.ws = new WebSocket(wsUrl);

//         this.ws.onopen = () => {
//           this.isConnected = true;
//           this.reconnectAttempts = 0;
          
//           logger.info(LogCategory.VORTEX_API, 'WebSocket connected successfully');
          
//           // Start heartbeat
//           this.startHeartbeat();
          
//           // Resubscribe to all previous subscriptions
//           this.resubscribeAll();
          
//           this.emit('connected');
//           resolve();
//         };

//         this.ws.onmessage = (event) => {
//           this.handleMessage(event.data);
//         };

//         this.ws.onclose = (event) => {
//           this.isConnected = false;
//           this.stopHeartbeat();
          
//           logger.warn(LogCategory.VORTEX_API, 'WebSocket connection closed', {
//             code: event.code,
//             reason: event.reason,
//             wasClean: event.wasClean
//           });

//           this.emit('disconnected', { code: event.code, reason: event.reason });

//           // Attempt to reconnect if not a clean close
//           if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts!) {
//             this.scheduleReconnect();
//           }
//         };

//         this.ws.onerror = (error) => {
//           logger.error(LogCategory.VORTEX_API, 'WebSocket error', error as Error);
//           this.emit('error', error);
//           reject(error);
//         };

//       } catch (error) {
//         logger.error(LogCategory.VORTEX_API, 'Failed to create WebSocket connection', error as Error);
//         reject(error);
//       }
//     });
//   }

//   public disconnect(): void {
//     if (this.ws) {
//       this.isConnected = false;
//       this.stopHeartbeat();
//       this.clearReconnectTimer();
      
//       logger.info(LogCategory.VORTEX_API, 'Disconnecting WebSocket');
      
//       this.ws.close(1000, 'Client disconnect');
//       this.ws = null;
      
//       this.emit('disconnected', { code: 1000, reason: 'Client disconnect' });
//     }
//   }

//   public subscribe(subscription: VortexSubscription): void {
//     if (!this.isConnected || !this.ws) {
//       logger.warn(LogCategory.VORTEX_API, 'Cannot subscribe - WebSocket not connected');
//       return;
//     }

//     const key = this.getSubscriptionKey(subscription);
//     this.subscriptions.set(key, subscription);

//     const message = JSON.stringify(subscription);
    
//     logger.info(LogCategory.VORTEX_API, 'Subscribing to instrument', {
//       exchange: subscription.exchange,
//       token: subscription.token,
//       mode: subscription.mode
//     });

//     this.ws.send(message);
//     this.emit('subscribed', subscription);
//   }

//   public unsubscribe(subscription: VortexSubscription): void {
//     if (!this.isConnected || !this.ws) {
//       logger.warn(LogCategory.VORTEX_API, 'Cannot unsubscribe - WebSocket not connected');
//       return;
//     }

//     const key = this.getSubscriptionKey(subscription);
//     this.subscriptions.delete(key);

//     const message = JSON.stringify({
//       ...subscription,
//       message_type: 'unsubscribe'
//     });
    
//     logger.info(LogCategory.VORTEX_API, 'Unsubscribing from instrument', {
//       exchange: subscription.exchange,
//       token: subscription.token,
//       mode: subscription.mode
//     });

//     this.ws.send(message);
//     this.emit('unsubscribed', subscription);
//   }

//   public subscribeToLTP(exchange: VortexSubscription['exchange'], token: number): void {
//     this.subscribe({
//       exchange,
//       token,
//       mode: 'ltp',
//       message_type: 'subscribe'
//     });
//   }

//   public subscribeToOHLCV(exchange: VortexSubscription['exchange'], token: number): void {
//     this.subscribe({
//       exchange,
//       token,
//       mode: 'ohlcv',
//       message_type: 'subscribe'
//     });
//   }

//   public subscribeToFull(exchange: VortexSubscription['exchange'], token: number): void {
//     this.subscribe({
//       exchange,
//       token,
//       mode: 'full',
//       message_type: 'subscribe'
//     });
//   }

//   public getSubscriptions(): VortexSubscription[] {
//     return Array.from(this.subscriptions.values());
//   }

//   public isWebSocketConnected(): boolean {
//     return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
//   }

//   private handleMessage(data: string | ArrayBuffer): void {
//     try {
//       if (typeof data === 'string') {
//         // Handle text messages (subscription confirmations, errors)
//         const message = JSON.parse(data);
//         logger.debug(LogCategory.VORTEX_API, 'Received text message', message);
//         this.emit('message', message);
//       } else {
//         // Handle binary data (price updates)
//         this.parseBinaryData(data);
//       }
//     } catch (error) {
//       logger.error(LogCategory.VORTEX_API, 'Failed to handle WebSocket message', error as Error);
//     }
//   }

//   private parseBinaryData(data: ArrayBuffer): void {
//     try {
//       const view = new DataView(data);
//       let offset = 0;
//       const quotes: VortexPriceData[] = [];

//       while (offset < data.byteLength) {
//         // Read quote length (2 bytes, little endian)
//         const quoteLength = view.getInt16(offset, true);
//         offset += 2;

//         if (offset + quoteLength > data.byteLength) {
//           logger.warn(LogCategory.VORTEX_API, 'Invalid quote length, stopping parse');
//           break;
//         }

//         // Parse quote based on length
//         const quote = this.parseQuote(view, offset, quoteLength);
//         if (quote) {
//           quotes.push(quote);
//         }

//         offset += quoteLength;
//       }

//       if (quotes.length > 0) {
//         logger.debug(LogCategory.VORTEX_API, 'Parsed price data', {
//           quoteCount: quotes.length,
//           instruments: quotes.map(q => `${q.exchange}:${q.token}`)
//         });
        
//         this.emit('priceUpdate', quotes);
//         quotes.forEach(quote => this.emit('quote', quote));
//       }
//     } catch (error) {
//       logger.error(LogCategory.VORTEX_API, 'Failed to parse binary data', error as Error);
//     }
//   }

//   private parseQuote(view: DataView, offset: number, length: number): VortexPriceData | null {
//     try {
//       const quote: VortexPriceData = {
//         exchange: '',
//         token: 0
//       };

//       let currentOffset = offset;

//       // Exchange (10 bytes)
//       const exchangeBytes = new Uint8Array(view.buffer, currentOffset, 10);
//       quote.exchange = new TextDecoder().decode(exchangeBytes).replace(/\0/g, '');
//       currentOffset += 10;

//       // Token (4 bytes, little endian)
//       quote.token = view.getInt32(currentOffset, true);
//       currentOffset += 4;

//       if (length >= 22) { // LTP mode
//         // LastTradePrice (8 bytes, little endian)
//         quote.lastTradePrice = view.getFloat64(currentOffset, true);
//         currentOffset += 8;

//         // LastTradeTime (4 bytes, little endian)
//         quote.lastTradeTime = view.getInt32(currentOffset, true);
//         currentOffset += 4;
//       }

//       if (length >= 62) { // OHLCV mode
//         // OpenPrice (8 bytes, little endian)
//         quote.openPrice = view.getFloat64(currentOffset, true);
//         currentOffset += 8;

//         // HighPrice (8 bytes, little endian)
//         quote.highPrice = view.getFloat64(currentOffset, true);
//         currentOffset += 8;

//         // LowPrice (8 bytes, little endian)
//         quote.lowPrice = view.getFloat64(currentOffset, true);
//         currentOffset += 8;

//         // ClosePrice (8 bytes, little endian)
//         quote.closePrice = view.getFloat64(currentOffset, true);
//         currentOffset += 8;

//         // Volume (4 bytes, little endian)
//         quote.volume = view.getInt32(currentOffset, true);
//         currentOffset += 4;

//         // LastUpdateTime (4 bytes, little endian)
//         quote.lastUpdateTime = view.getInt32(currentOffset, true);
//         currentOffset += 4;

//         // LastTradeQuantity (4 bytes, little endian)
//         quote.lastTradeQuantity = view.getInt32(currentOffset, true);
//         currentOffset += 4;

//         // AverageTradePrice (8 bytes, little endian)
//         quote.averageTradePrice = view.getFloat64(currentOffset, true);
//         currentOffset += 8;

//         // TotalBuyQuantity (8 bytes, little endian)
//         quote.totalBuyQuantity = view.getBigInt64(currentOffset, true);
//         currentOffset += 8;

//         // TotalSellQuantity (8 bytes, little endian)
//         quote.totalSellQuantity = view.getBigInt64(currentOffset, true);
//         currentOffset += 8;

//         // OpenInterest (4 bytes, little endian)
//         quote.openInterest = view.getInt32(currentOffset, true);
//         currentOffset += 4;
//       }

//       if (length >= 266) { // Full mode
//         // Parse depth data (simplified - would need full implementation)
//         // This is a placeholder for the complex depth parsing
//         quote.depth = {
//           buy: [],
//           sell: []
//         };

//         // DPRHigh (4 bytes, little endian)
//         quote.dprHigh = view.getInt32(currentOffset, true);
//         currentOffset += 4;

//         // DPRLow (4 bytes, little endian)
//         quote.dprLow = view.getInt32(currentOffset, true);
//         currentOffset += 4;
//       }

//       return quote;
//     } catch (error) {
//       logger.error(LogCategory.VORTEX_API, 'Failed to parse individual quote', error as Error);
//       return null;
//     }
//   }

//   private getSubscriptionKey(subscription: VortexSubscription): string {
//     return `${subscription.exchange}:${subscription.token}:${subscription.mode}`;
//   }

//   private resubscribeAll(): void {
//     const subscriptions = Array.from(this.subscriptions.values());
    
//     logger.info(LogCategory.VORTEX_API, 'Resubscribing to instruments', {
//       count: subscriptions.length
//     });

//     subscriptions.forEach(subscription => {
//       const message = JSON.stringify(subscription);
//       this.ws?.send(message);
//     });
//   }

//   private startHeartbeat(): void {
//     this.stopHeartbeat();
    
//     this.heartbeatTimer = setInterval(() => {
//       if (this.isConnected && this.ws) {
//         // Send ping to keep connection alive
//         this.ws.send(JSON.stringify({ type: 'ping' }));
//         logger.debug(LogCategory.VORTEX_API, 'Sent heartbeat ping');
//       }
//     }, this.config.heartbeatInterval);
//   }

//   private stopHeartbeat(): void {
//     if (this.heartbeatTimer) {
//       clearInterval(this.heartbeatTimer);
//       this.heartbeatTimer = null;
//     }
//   }

//   private scheduleReconnect(): void {
//     this.clearReconnectTimer();
    
//     this.reconnectAttempts++;
//     const delay = this.config.reconnectInterval! * this.reconnectAttempts;
    
//     logger.info(LogCategory.VORTEX_API, 'Scheduling reconnection attempt', {
//       attempt: this.reconnectAttempts,
//       delay: delay,
//       maxAttempts: this.config.maxReconnectAttempts
//     });

//     this.reconnectTimer = setTimeout(() => {
//       this.connect().catch(error => {
//         logger.error(LogCategory.VORTEX_API, 'Reconnection attempt failed', error as Error);
//       });
//     }, delay);
//   }

//   private clearReconnectTimer(): void {
//     if (this.reconnectTimer) {
//       clearTimeout(this.reconnectTimer);
//       this.reconnectTimer = null;
//     }
//   }
// }

// // Export singleton instance
// let vortexWS: VortexWebSocket | null = null;

// export const getVortexWebSocket = (accessToken: string): VortexWebSocket => {
//   if (!vortexWS || vortexWS.config.accessToken !== accessToken) {
//     vortexWS = new VortexWebSocket({ accessToken });
//   }
//   return vortexWS;
// };

// export default VortexWebSocket;
