/**
 * File: lib/services/position/quote-normalizer.ts
 * Module: position
 * Purpose: Normalize upstream quote shapes into currentPrice + prevClose for consistent PnL calculations.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-04
 * Notes:
 * - Mirrors the proven normalization logic in `lib/hooks/MarketDataProvider.tsx`.
 * - Intended for server-side workers/services; safe fallbacks to Stock.ltp/averagePrice.
 */

export type QuoteLike = {
  last_trade_price?: unknown
  ltp?: unknown
  LTP?: unknown
  price?: unknown
  prev_close_price?: unknown
  close?: unknown
  ohlc?: { close?: unknown } | null
}

function toFiniteNumber(value: unknown): number | null {
  if (value == null) return null
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return null
  return n
}

export type NormalizedQuotePrices = {
  currentPrice: number
  prevClose: number
  source: {
    currentPrice: "quote" | "stock_ltp" | "average_price_fallback"
    prevClose: "quote" | "average_price_fallback"
  }
}

export function normalizeQuotePrices(input: {
  quote?: QuoteLike | null
  stockLtp?: number | null
  averagePrice?: number | null
}): NormalizedQuotePrices {
  const average = toFiniteNumber(input.averagePrice) ?? 0

  const q = input.quote ?? null

  const currentFromQuote =
    toFiniteNumber(q?.last_trade_price) ??
    toFiniteNumber(q?.ltp) ??
    toFiniteNumber(q?.LTP) ??
    toFiniteNumber(q?.price)

  const currentFromStock = toFiniteNumber(input.stockLtp)

  const currentPrice =
    (currentFromQuote != null && currentFromQuote > 0 ? currentFromQuote : null) ??
    (currentFromStock != null && currentFromStock > 0 ? currentFromStock : null) ??
    (average > 0 ? average : 0)

  const prevFromQuote =
    toFiniteNumber(q?.prev_close_price) ??
    toFiniteNumber(q?.close) ??
    toFiniteNumber(q?.ohlc?.close)

  const prevClose = (prevFromQuote != null && prevFromQuote > 0 ? prevFromQuote : null) ?? (average > 0 ? average : 0)

  return {
    currentPrice,
    prevClose,
    source: {
      currentPrice: currentFromQuote != null ? "quote" : currentFromStock != null ? "stock_ltp" : "average_price_fallback",
      prevClose: prevFromQuote != null ? "quote" : "average_price_fallback",
    },
  }
}

