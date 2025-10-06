// lib/vortex/vortex-websocket.ts
// Minimal event system to avoid Node EventEmitter on client bundles
export type EventName = 'connected' | 'disconnected' | 'error' | 'subscribed' | 'unsubscribed' | 'quote' | 'priceUpdate' | 'message';

export interface VortexWebSocketConfig {
  accessToken: string;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

export interface VortexSubscription {
  exchange: 'NSE_EQ' | 'NSE_FO' | 'NSE_CUR' | 'MCX_FO';
  token: number;
  mode: 'ltp' | 'ohlcv' | 'full';
  message_type: 'subscribe' | 'unsubscribe';
}

export interface VortexPriceData {
  exchange: string;
  token: number;
  lastTradePrice?: number;
  lastTradeTime?: number;
  openPrice?: number;
  highPrice?: number;
  lowPrice?: number;
  closePrice?: number;
  volume?: number;
  lastUpdateTime?: number;
  lastTradeQuantity?: number;
  averageTradePrice?: number;
  totalBuyQuantity?: number | bigint;
  totalSellQuantity?: number | bigint;
  openInterest?: number;
  depth?: {
    buy: Array<{ price: number; quantity: number; orders: number }>;
    sell: Array<{ price: number; quantity: number; orders: number }>;
  };
  dprHigh?: number;
  dprLow?: number;
}

export class VortexWebSocket {
  private ws: WebSocket | null = null;
  public readonly config: Required<VortexWebSocketConfig>;
  private isConnected = false;
  private reconnectAttempts = 0;
  private subscriptions = new Map<string, VortexSubscription>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Map<EventName, Set<(...args: any[]) => void>> = new Map();

  constructor(config: VortexWebSocketConfig) {
    this.config = {
      maxReconnectAttempts: 5,
      reconnectInterval: 5000,
      heartbeatInterval: 30000,
      ...config,
    } as Required<VortexWebSocketConfig>;
  }

  public on(event: EventName, listener: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }

  public off(event: EventName, listener: (...args: any[]) => void): void {
    this.listeners.get(event)?.delete(listener);
  }

  private emit(event: EventName, ...args: any[]): void {
    this.listeners.get(event)?.forEach((l) => {
      try {
        l(...args);
      } catch {
        // ignore listener errors
      }
    });
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `wss://wire.rupeezy.in/ws?auth_token=${this.config.accessToken}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.resubscribeAll();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage((event as MessageEvent).data as any);
        };

        this.ws.onclose = (event) => {
          this.isConnected = false;
          this.stopHeartbeat();
          this.emit('disconnected', { code: event.code, reason: event.reason });
          if (!event.wasClean && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error: any) => {
          this.emit('error', error);
          reject(error);
        };
      } catch (error) {
        this.emit('error', error);
        reject(error);
      }
    });
  }

  public disconnect(): void {
    if (this.ws) {
      this.isConnected = false;
      this.stopHeartbeat();
      this.clearReconnectTimer();
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
      this.emit('disconnected', { code: 1000, reason: 'Client disconnect' });
    }
  }

  public subscribe(subscription: VortexSubscription): void {
    if (!this.isConnected || !this.ws) return;
    const key = this.getSubscriptionKey(subscription);
    this.subscriptions.set(key, subscription);
    const message = JSON.stringify(subscription);
    this.ws.send(message);
    this.emit('subscribed', subscription);
  }

  public unsubscribe(subscription: VortexSubscription): void {
    if (!this.isConnected || !this.ws) return;
    const key = this.getSubscriptionKey(subscription);
    this.subscriptions.delete(key);
    const message = JSON.stringify({ ...subscription, message_type: 'unsubscribe' });
    this.ws.send(message);
    this.emit('unsubscribed', subscription);
  }

  public subscribeToLTP(exchange: VortexSubscription['exchange'], token: number): void {
    this.subscribe({ exchange, token, mode: 'ltp', message_type: 'subscribe' });
  }
  public subscribeToOHLCV(exchange: VortexSubscription['exchange'], token: number): void {
    this.subscribe({ exchange, token, mode: 'ohlcv', message_type: 'subscribe' });
  }
  public subscribeToFull(exchange: VortexSubscription['exchange'], token: number): void {
    this.subscribe({ exchange, token, mode: 'full', message_type: 'subscribe' });
  }

  public getSubscriptions(): VortexSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  public isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(data: string | ArrayBuffer): void {
    try {
      if (typeof data === 'string') {
        const message = JSON.parse(data);
        this.emit('message', message);
      } else {
        this.parseBinaryData(data);
      }
    } catch {
      // ignore parse errors
    }
  }

  private parseBinaryData(data: ArrayBuffer): void {
    try {
      const view = new DataView(data);
      let offset = 0;
      const quotes: VortexPriceData[] = [];

      while (offset < data.byteLength) {
        const quoteLength = view.getInt16(offset, true);
        offset += 2;
        if (offset + quoteLength > data.byteLength) {
          break;
        }
        const quote = this.parseQuote(view, offset, quoteLength);
        if (quote) quotes.push(quote);
        offset += quoteLength;
      }

      if (quotes.length > 0) {
        this.emit('priceUpdate', quotes);
        quotes.forEach((q) => this.emit('quote', q));
      }
    } catch {
      // ignore
    }
  }

  private parseQuote(view: DataView, offset: number, length: number): VortexPriceData | null {
    try {
      const quote: VortexPriceData = { exchange: '', token: 0 };
      let currentOffset = offset;

      const exchangeBytes = new Uint8Array(view.buffer, currentOffset, 10);
      quote.exchange = new TextDecoder().decode(exchangeBytes).replace(/\0/g, '');
      currentOffset += 10;

      quote.token = view.getInt32(currentOffset, true);
      currentOffset += 4;

      if (length >= 22) {
        quote.lastTradePrice = view.getFloat64(currentOffset, true);
        currentOffset += 8;
        quote.lastTradeTime = view.getInt32(currentOffset, true);
        currentOffset += 4;
      }

      if (length >= 62) {
        quote.openPrice = view.getFloat64(currentOffset, true);
        currentOffset += 8;
        quote.highPrice = view.getFloat64(currentOffset, true);
        currentOffset += 8;
        quote.lowPrice = view.getFloat64(currentOffset, true);
        currentOffset += 8;
        quote.closePrice = view.getFloat64(currentOffset, true);
        currentOffset += 8;
        quote.volume = view.getInt32(currentOffset, true);
        currentOffset += 4;
        quote.lastUpdateTime = view.getInt32(currentOffset, true);
        currentOffset += 4;
        quote.lastTradeQuantity = view.getInt32(currentOffset, true);
        currentOffset += 4;
        quote.averageTradePrice = view.getFloat64(currentOffset, true);
        currentOffset += 8;
        try {
          // @ts-ignore
          quote.totalBuyQuantity = (view as any).getBigInt64 ? (view as any).getBigInt64(currentOffset, true) : view.getInt32(currentOffset, true);
        } catch {
          quote.totalBuyQuantity = view.getInt32(currentOffset, true);
        }
        currentOffset += 8;
        try {
          // @ts-ignore
          quote.totalSellQuantity = (view as any).getBigInt64 ? (view as any).getBigInt64(currentOffset, true) : view.getInt32(currentOffset, true);
        } catch {
          quote.totalSellQuantity = view.getInt32(currentOffset, true);
        }
        currentOffset += 8;
        quote.openInterest = view.getInt32(currentOffset, true);
        currentOffset += 4;
      }

      if (length >= 266) {
        quote.depth = { buy: [], sell: [] };
        quote.dprHigh = view.getInt32(currentOffset, true);
        currentOffset += 4;
        quote.dprLow = view.getInt32(currentOffset, true);
        currentOffset += 4;
      }

      return quote;
    } catch {
      return null;
    }
  }

  private getSubscriptionKey(subscription: VortexSubscription): string {
    return `${subscription.exchange}:${subscription.token}:${subscription.mode}`;
  }

  private resubscribeAll(): void {
    const subscriptions = Array.from(this.subscriptions.values());
    subscriptions.forEach((subscription) => {
      const message = JSON.stringify(subscription);
      this.ws?.send(message);
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * this.reconnectAttempts;
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {});
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

// Singleton accessor (optional)
let vortexWS: VortexWebSocket | null = null;
export const getVortexWebSocket = (accessToken: string): VortexWebSocket => {
  if (!vortexWS || vortexWS.config.accessToken !== accessToken) {
    vortexWS = new VortexWebSocket({ accessToken });
  }
  return vortexWS;
};

export default VortexWebSocket;
