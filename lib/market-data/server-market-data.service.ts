/**
 * @file server-market-data.service.ts
 * @module lib/market-data
 * @description Server-side Socket.IO market-data client + in-memory quote cache for workers (positions/order).
 * @author BharatERP
 * @created 2026-02-12
 */

/**
 * NOTE: Avoid `import "server-only"` here.
 * The `server-only` package relies on Next.js bundler conditions and throws when executed via `tsx` in workers.
 */
import { io, type Socket } from "socket.io-client"
import type { MarketDataQuote, SubscriptionMode } from "@/lib/market-data/providers/types"
import { baseLogger } from "@/lib/observability/logger"

export type ServerMarketDataHealth = {
  isConnected: boolean
  socketId: string | null
  lastConnectedAt: number | null
  lastDisconnectedAt: number | null
  lastMessageAt: number | null
  lastErrorAt: number | null
  subscriptions: number
  cachedQuotes: number
}

export type ServerCachedQuote = {
  instrumentToken: number
  last_trade_price: number
  /**
   * Typically prev close for day PnL (often provided as OHLC close).
   * We store it in BOTH `prev_close_price` and `close` so existing normalizers can consume it.
   */
  prev_close_price?: number
  close?: number
  receivedAt: number
  upstreamTimestamp?: string
}

type ServerMarketDataConfig = {
  url: string
  apiKey: string
  mode: SubscriptionMode
  quoteMaxAgeMs: number
}

function toFiniteNumber(value: unknown): number | null {
  if (value == null) return null
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return null
  return n
}

function resolveWsUrl(raw: string): string {
  let socketUrl = raw.trim()
  if (socketUrl.startsWith("ws://")) socketUrl = socketUrl.replace("ws://", "http://")
  if (socketUrl.startsWith("wss://")) socketUrl = socketUrl.replace("wss://", "https://")

  let urlObj: URL
  try {
    urlObj = new URL(socketUrl)
  } catch {
    throw new Error(`Invalid LIVE_MARKET_WS_URL: ${raw}`)
  }

  // Ensure /market-data path (matches frontend client expectation)
  if (!urlObj.pathname || urlObj.pathname === "/") {
    return `${socketUrl.endsWith("/") ? socketUrl.slice(0, -1) : socketUrl}/market-data`
  }
  return socketUrl
}

function defaultServerMarketDataConfig(): ServerMarketDataConfig {
  const url =
    process.env.LIVE_MARKET_WS_URL ||
    process.env.NEXT_PUBLIC_LIVE_MARKET_WS_URL ||
    "https://marketdata.vedpragya.com/market-data"

  const apiKey =
    process.env.LIVE_MARKET_WS_API_KEY ||
    process.env.NEXT_PUBLIC_LIVE_MARKET_WS_API_KEY ||
    "demo-key-1"

  return {
    url,
    apiKey,
    mode: "ltp",
    quoteMaxAgeMs: Number(process.env.MARKETDATA_QUOTE_MAX_AGE_MS || 7_500),
  }
}

export class ServerMarketDataService {
  private readonly log = baseLogger.child({ module: "server-market-data" })
  private readonly cfg: ServerMarketDataConfig

  private socket: Socket | null = null
  private initPromise: Promise<void> | null = null

  private readonly wantedTokens = new Set<number>()
  private readonly subscribedTokens = new Set<number>()
  private readonly quotes = new Map<number, ServerCachedQuote>()

  private lastConnectedAt: number | null = null
  private lastDisconnectedAt: number | null = null
  private lastMessageAt: number | null = null
  private lastErrorAt: number | null = null

  constructor(config?: Partial<ServerMarketDataConfig>) {
    this.cfg = { ...defaultServerMarketDataConfig(), ...config }
  }

  async ensureInitialized(): Promise<void> {
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      const wsUrl = resolveWsUrl(this.cfg.url)
      this.log.info(
        {
          wsUrl,
          hasApiKey: Boolean(this.cfg.apiKey),
          mode: this.cfg.mode,
          quoteMaxAgeMs: this.cfg.quoteMaxAgeMs,
        },
        "initializing",
      )

      const socket = io(wsUrl, {
        query: { api_key: this.cfg.apiKey },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1_000,
        reconnectionDelayMax: 15_000,
        timeout: 10_000,
      })

      socket.on("connect", () => {
        this.lastConnectedAt = Date.now()
        this.log.info({ socketId: socket.id }, "connected")
        this.resubscribeAllBestEffort()
      })

      socket.on("disconnect", (reason) => {
        this.lastDisconnectedAt = Date.now()
        this.log.warn({ reason }, "disconnected")
        // When reconnecting, we’ll resubscribe from wantedTokens.
        this.subscribedTokens.clear()
      })

      socket.on("connect_error", (err) => {
        this.lastErrorAt = Date.now()
        this.log.error({ message: (err as any)?.message || String(err) }, "connect_error")
      })

      socket.on("error", (err) => {
        this.lastErrorAt = Date.now()
        this.log.error({ err }, "socket_error")
      })

      socket.on("market_data", (payload: MarketDataQuote) => {
        try {
          this.lastMessageAt = Date.now()
          this.handleMarketData(payload)
        } catch (e) {
          this.lastErrorAt = Date.now()
          this.log.error({ message: (e as any)?.message || String(e) }, "market_data_handler_failed")
        }
      })

      this.socket = socket
    })()

    return this.initPromise
  }

  getHealth(): ServerMarketDataHealth {
    return {
      isConnected: Boolean(this.socket?.connected),
      socketId: this.socket?.id || null,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectedAt: this.lastDisconnectedAt,
      lastMessageAt: this.lastMessageAt,
      lastErrorAt: this.lastErrorAt,
      subscriptions: this.subscribedTokens.size,
      cachedQuotes: this.quotes.size,
    }
  }

  ensureSubscribed(tokens: number[]): void {
    for (const t of tokens) {
      if (typeof t === "number" && Number.isFinite(t) && t > 0) this.wantedTokens.add(t)
    }
    this.subscribeWantedBestEffort()
  }

  getQuote(instrumentToken: number, input?: { maxAgeMs?: number }): ServerCachedQuote | null {
    const token = Number(instrumentToken)
    if (!Number.isFinite(token) || token <= 0) return null

    const q = this.quotes.get(token) || null
    if (!q) return null

    const maxAgeMs = Math.max(0, input?.maxAgeMs ?? this.cfg.quoteMaxAgeMs)
    const age = Date.now() - q.receivedAt
    if (maxAgeMs > 0 && age > maxAgeMs) return null

    return q
  }

  private handleMarketData(payload: MarketDataQuote): void {
    const token = Number(payload.instrumentToken)
    if (!Number.isFinite(token) || token <= 0) return

    const ltp = toFiniteNumber((payload as any)?.data?.last_price)
    if (ltp == null || ltp <= 0) return

    // For day PnL we want previous close; most feeds provide it as OHLC close.
    const prevClose = toFiniteNumber((payload as any)?.data?.ohlc?.close)

    const quote: ServerCachedQuote = {
      instrumentToken: token,
      last_trade_price: ltp,
      prev_close_price: prevClose != null && prevClose > 0 ? prevClose : undefined,
      close: prevClose != null && prevClose > 0 ? prevClose : undefined,
      receivedAt: Date.now(),
      upstreamTimestamp: payload.timestamp,
    }

    this.quotes.set(token, quote)
  }

  private subscribeWantedBestEffort(): void {
    const socket = this.socket
    if (!socket?.connected) return

    const toSubscribe: number[] = []
    this.wantedTokens.forEach((t) => {
      if (!this.subscribedTokens.has(t)) toSubscribe.push(t)
    })

    if (toSubscribe.length === 0) return

    // Keep subscriptions bounded per request to avoid huge payloads.
    const CHUNK = 400
    for (let i = 0; i < toSubscribe.length; i += CHUNK) {
      const chunk = toSubscribe.slice(i, i + CHUNK)
      socket.emit("subscribe", { instruments: chunk, mode: this.cfg.mode })
      chunk.forEach((t) => this.subscribedTokens.add(t))
    }
  }

  private resubscribeAllBestEffort(): void {
    // On reconnect we rebuild subscribedTokens from wantedTokens.
    this.subscribedTokens.clear()
    this.subscribeWantedBestEffort()
  }
}

let singleton: ServerMarketDataService | null = null

export function getServerMarketDataService(): ServerMarketDataService {
  if (!singleton) singleton = new ServerMarketDataService()
  return singleton
}

