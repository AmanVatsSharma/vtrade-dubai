/**
 * @file trading-realtime-provider.tsx
 * @module components/trading/realtime
 * @description Centralized realtime trading data provider (orders/positions/account) + derived values for /dashboard.
 * @author BharatERP
 * @created 2026-01-24
 */

"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { Session } from "next-auth"
import { useRealtimeAccount } from "@/lib/hooks/use-realtime-account"
import { useRealtimeOrders } from "@/lib/hooks/use-realtime-orders"
import { useRealtimePositions } from "@/lib/hooks/use-realtime-positions"
import { parseInstrumentId } from "@/lib/market-data/utils/instrumentMapper"
import type { PnLData } from "@/types/trading"
import { createClientLogger } from "@/lib/logging/client-logger"
import { useSharedSSE } from "@/lib/hooks/use-shared-sse"
import type { SSEMessage } from "@/lib/hooks/use-shared-sse"

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
  const log = useMemo(() => createClientLogger("TRADING-REALTIME"), [])
  const ordersHook = useRealtimeOrders(userId)
  const positionsHook = useRealtimePositions(userId)
  const accountHook = useRealtimeAccount(userId)
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(null)

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

  /**
   * Trading Sync Coordinator
   *
   * Problem: Each slice hook refreshes only itself; plus components often trigger manual refreshes.
   * Fix: Coalesce trading lifecycle events and refresh dependent slices together.
   */
  const refreshCoordinatorRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null
    wantOrders: boolean
    wantPositions: boolean
    wantAccount: boolean
  }>({ timer: null, wantOrders: false, wantPositions: false, wantAccount: false })

  const scheduleCoalescedRefresh = useCallback(
    (flags: { orders?: boolean; positions?: boolean; account?: boolean }, reason: string) => {
      const state = refreshCoordinatorRef.current
      state.wantOrders = state.wantOrders || !!flags.orders
      state.wantPositions = state.wantPositions || !!flags.positions
      state.wantAccount = state.wantAccount || !!flags.account

      if (state.timer) return

      state.timer = setTimeout(async () => {
        const wantOrders = state.wantOrders
        const wantPositions = state.wantPositions
        const wantAccount = state.wantAccount
        state.timer = null
        state.wantOrders = false
        state.wantPositions = false
        state.wantAccount = false

        const startedAt = Date.now()
        log.info("sync: refresh start", {
          reason,
          wantOrders,
          wantPositions,
          wantAccount,
          userId,
        })

        try {
          const tasks: Array<Promise<unknown>> = []
          if (wantOrders) tasks.push(ordersHook.refresh())
          if (wantPositions) tasks.push(positionsHook.refresh())
          if (wantAccount) tasks.push(accountHook.refresh())
          await Promise.all(tasks)
          setLastRefreshAt(Date.now())
        } catch (e) {
          log.error("sync: refresh failed", { reason, message: (e as any)?.message || String(e) })
        } finally {
          log.info("sync: refresh done", { reason, elapsedMs: Date.now() - startedAt })
        }
      }, 175) // short debounce to coalesce bursts of lifecycle events
    },
    [ordersHook, positionsHook, accountHook, log, userId],
  )

  const onSseEvent = useCallback(
    (message: SSEMessage) => {
      // Coalesce by lifecycle semantics so UI never shows partial state.
      switch (message.event) {
        case "order_placed":
          scheduleCoalescedRefresh({ orders: true, account: true }, "sse:order_placed")
          break
        case "order_executed":
        case "order_cancelled":
          scheduleCoalescedRefresh({ orders: true, positions: true, account: true }, `sse:${message.event}`)
          break
        case "position_opened":
        case "position_updated":
        case "position_closed":
          scheduleCoalescedRefresh({ positions: true, orders: true, account: true }, `sse:${message.event}`)
          break
        case "balance_updated":
        case "margin_blocked":
        case "margin_released":
          scheduleCoalescedRefresh({ account: true }, `sse:${message.event}`)
          break
        default:
          // Ignore watchlist events here (other modules handle them)
          break
      }
    },
    [scheduleCoalescedRefresh],
  )

  // Establish ONE shared SSE subscription for trading lifecycle events.
  useSharedSSE(userId, onSseEvent)

  // Cleanup any pending refresh timer on unmount.
  useEffect(() => {
    return () => {
      const s = refreshCoordinatorRef.current
      if (s.timer) clearTimeout(s.timer)
      s.timer = null
      s.wantOrders = false
      s.wantPositions = false
      s.wantAccount = false
    }
  }, [])

  const refreshAll = useCallback(async () => {
    log.info("refreshAll: start", {
      userId,
      tradingAccountId,
    })
    await Promise.all([ordersHook.refresh(), positionsHook.refresh(), accountHook.refresh()])
    setLastRefreshAt(Date.now())
    log.info("refreshAll: done", { userId })
  }, [ordersHook, positionsHook, accountHook, userId, tradingAccountId, log])

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
        lastRefreshAt,
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
      lastRefreshAt,
    ],
  )

  return <TradingRealtimeContext.Provider value={value}>{children}</TradingRealtimeContext.Provider>
}

