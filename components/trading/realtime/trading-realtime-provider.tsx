/**
 * @file trading-realtime-provider.tsx
 * @module components/trading/realtime
 * @description Centralized realtime trading data provider (orders/positions/account) + derived values for /dashboard.
 * @author BharatERP
 * @created 2026-01-24
 */

"use client"

import React, { createContext, useCallback, useContext, useMemo } from "react"
import type { Session } from "next-auth"
import { useRealtimeAccount } from "@/lib/hooks/use-realtime-account"
import { useRealtimeOrders } from "@/lib/hooks/use-realtime-orders"
import { useRealtimePositions } from "@/lib/hooks/use-realtime-positions"
import { parseInstrumentId } from "@/lib/market-data/utils/instrumentMapper"
import type { PnLData } from "@/types/trading"

export type TradingRealtimeConnectionHealth = {
  lastRefreshAt: number | null
}

export type TradingRealtimeContextValue = {
  userId: string
  session: Session
  tradingAccountId: string | null

  orders: any[]
  positions: any[]
  account: any | null

  isLoading: boolean
  error: Error | null

  pnl: PnLData

  positionInstrumentIds: string[]
  positionTokens: number[]

  refreshAll: () => Promise<void>
  health: TradingRealtimeConnectionHealth
}

const TradingRealtimeContext = createContext<TradingRealtimeContextValue | null>(null)

export function useTradingRealtime(): TradingRealtimeContextValue {
  const ctx = useContext(TradingRealtimeContext)
  if (!ctx) {
    throw new Error("useTradingRealtime must be used within TradingRealtimeProvider")
  }
  return ctx
}

type TradingRealtimeProviderProps = {
  userId: string
  session: Session
  children: React.ReactNode
}

export function TradingRealtimeProvider({ userId, session, children }: TradingRealtimeProviderProps) {
  const ordersHook = useRealtimeOrders(userId)
  const positionsHook = useRealtimePositions(userId)
  const accountHook = useRealtimeAccount(userId)

  const tradingAccountId = useMemo(() => {
    return ((session?.user as any)?.tradingAccountId as string | undefined) ?? accountHook.account?.id ?? null
  }, [session, accountHook.account])

  const error = (ordersHook.error || positionsHook.error || accountHook.error) ?? null
  const isLoading = ordersHook.isLoading || positionsHook.isLoading || accountHook.isLoading

  // NOTE: Quote-driven P&L is computed in the dashboard (needs market-data quotes).
  // Here we compute stable fallbacks so UI has something even when market data is offline.
  const pnl: PnLData = useMemo(() => {
    const positions = positionsHook.positions || []
    if (!positions.length) return { totalPnL: 0, dayPnL: 0 }

    let total = 0
    let day = 0

    positions.forEach((pos: any) => {
      // Use API-provided values if present; otherwise fall back safely.
      total += Number(pos.unrealizedPnL ?? 0)
      day += Number(pos.dayPnL ?? 0)
    })

    return { totalPnL: total, dayPnL: day }
  }, [positionsHook.positions])

  const positionInstrumentIds = useMemo(() => {
    const ids = (positionsHook.positions || [])
      .map((p: any) => p?.stock?.instrumentId || p?.instrumentId)
      .filter((v: any): v is string => typeof v === "string" && v.length > 0)
    return Array.from(new Set(ids))
  }, [positionsHook.positions])

  const positionTokens = useMemo(() => {
    const tokens = positionInstrumentIds
      .map((id) => parseInstrumentId(id))
      .filter((t): t is number => typeof t === "number" && !Number.isNaN(t))
    return Array.from(new Set(tokens))
  }, [positionInstrumentIds])

  const refreshAll = useCallback(async () => {
    // keep logs for debugging, but avoid console.log (enterprise prod noise)
    console.info("[TradingRealtimeProvider] refreshAll: start", {
      userId,
      tradingAccountId,
    })
    await Promise.all([ordersHook.refresh(), positionsHook.refresh(), accountHook.refresh()])
    console.info("[TradingRealtimeProvider] refreshAll: done", { userId })
  }, [ordersHook, positionsHook, accountHook, userId, tradingAccountId])

  const value: TradingRealtimeContextValue = useMemo(
    () => ({
      userId,
      session,
      tradingAccountId,
      orders: ordersHook.orders,
      positions: positionsHook.positions,
      account: accountHook.account,
      isLoading,
      error,
      pnl,
      positionInstrumentIds,
      positionTokens,
      refreshAll,
      health: {
        lastRefreshAt: null,
      },
    }),
    [
      userId,
      session,
      tradingAccountId,
      ordersHook.orders,
      positionsHook.positions,
      accountHook.account,
      isLoading,
      error,
      pnl,
      positionInstrumentIds,
      positionTokens,
      refreshAll,
    ],
  )

  return <TradingRealtimeContext.Provider value={value}>{children}</TradingRealtimeContext.Provider>
}

