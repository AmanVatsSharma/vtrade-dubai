/**
 * @file realtime.ts
 * @module realtime-types
 * @description Type definitions for Server-Sent Events (SSE) realtime system
 * @author BharatERP
 * @created 2025-01-27
 */

/**
 * Realtime event types emitted by the system
 */
export type RealtimeEventType =
  | 'order_placed'
  | 'order_executed'
  | 'order_cancelled'
  | 'position_opened'
  | 'position_closed'
  | 'position_updated'
  | 'balance_updated'
  | 'margin_blocked'
  | 'margin_released'
  | 'watchlist_updated'

/**
 * Base structure for all realtime events
 */
export interface RealtimeEvent {
  event: RealtimeEventType
  data: any
  timestamp: string
  userId: string
}

/**
 * Order-related event data
 */
export interface OrderEventData {
  orderId: string
  symbol: string
  quantity: number
  orderType: string
  orderSide: string
  status: string
  price?: number | null
  tradingAccountId?: string
}

/**
 * Position-related event data
 */
export interface PositionEventData {
  positionId: string
  symbol: string
  quantity: number
  averagePrice: number
  tradingAccountId?: string
  realizedPnL?: number
}

/**
 * Account-related event data
 */
export interface AccountEventData {
  tradingAccountId: string
  balance: number
  availableMargin: number
  usedMargin: number
  balanceChange?: number
  marginChange?: number
}

/**
 * Watchlist-related event data
 */
export interface WatchlistEventData {
  watchlistId: string
  action: 'item_added' | 'item_removed' | 'item_updated'
  itemId?: string
  userId: string
}

/**
 * SSE message format sent to clients
 */
export interface SSEMessage {
  event: RealtimeEventType
  data: OrderEventData | PositionEventData | AccountEventData | WatchlistEventData
  timestamp: string
}

