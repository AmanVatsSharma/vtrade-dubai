/**
 * @file prisma-middleware.ts
 * @module prisma-middleware
 * @description Prisma middleware for detecting database changes and emitting realtime events
 * @author BharatERP
 * @created 2025-01-27
 */

import { Prisma } from '@prisma/client'
import { getRealtimeEventEmitter } from './services/realtime/RealtimeEventEmitter'
import type { OrderEventData, PositionEventData, AccountEventData, WatchlistEventData } from '@/types/realtime'

const eventEmitter = getRealtimeEventEmitter()

/**
 * Cache to store tradingAccountId -> userId mappings
 * This avoids repeated database queries
 */
const accountIdToUserIdCache = new Map<string, string>()

/**
 * Get userId from tradingAccountId
 * Uses cache to avoid repeated database queries
 */
async function getUserIdFromTradingAccountId(
  prisma: any,
  tradingAccountId: string
): Promise<string | null> {
  // Check cache first
  if (accountIdToUserIdCache.has(tradingAccountId)) {
    return accountIdToUserIdCache.get(tradingAccountId) || null
  }

  try {
    // Fetch from database
    const account = await prisma.tradingAccount.findUnique({
      where: { id: tradingAccountId },
      select: { userId: true }
    })

    if (account?.userId) {
      accountIdToUserIdCache.set(tradingAccountId, account.userId)
      return account.userId
    }
  } catch (error) {
    console.error(`❌ [PRISMA-MIDDLEWARE] Error fetching userId for tradingAccountId ${tradingAccountId}:`, error)
  }

  return null
}

/**
 * Prisma middleware using $use
 * Catches database changes and emits realtime events
 * Note: We need a reference to the base prisma client, not the extended one
 */
export function setupRealtimeMiddleware(prisma: any) {
  prisma.$use(async (params: any, next: any) => {
    const result = await next(params)

    // Order events
    if (params.model === 'Order') {
      if (params.action === 'create') {
        // Get userId from tradingAccountId
        const userId = await getUserIdFromTradingAccountId(prisma, result.tradingAccountId)
        
        if (userId) {
          const eventData: OrderEventData = {
            orderId: result.id,
            symbol: result.symbol,
            quantity: result.quantity,
            orderType: result.orderType,
            orderSide: result.orderSide,
            status: result.status,
            price: result.price ? Number(result.price) : null,
            tradingAccountId: result.tradingAccountId
          }

          console.log(`📤 [PRISMA-MIDDLEWARE] Emitting order_placed for user ${userId}`)
          eventEmitter.emit(userId, 'order_placed', eventData)
        }
      } else if (params.action === 'update') {
        // Get userId from tradingAccountId
        const userId = await getUserIdFromTradingAccountId(prisma, result.tradingAccountId)
        
        if (userId && result.status) {
          if (result.status === 'EXECUTED') {
            const eventData: OrderEventData = {
              orderId: result.id,
              symbol: result.symbol,
              quantity: result.quantity,
              orderType: result.orderType,
              orderSide: result.orderSide,
              status: result.status,
              price: result.averagePrice ? Number(result.averagePrice) : null,
              tradingAccountId: result.tradingAccountId
            }

            console.log(`📤 [PRISMA-MIDDLEWARE] Emitting order_executed for user ${userId}`)
            eventEmitter.emit(userId, 'order_executed', eventData)
          } else if (result.status === 'CANCELLED') {
            const eventData: OrderEventData = {
              orderId: result.id,
              symbol: result.symbol,
              quantity: result.quantity,
              orderType: result.orderType,
              orderSide: result.orderSide,
              status: result.status,
              price: null,
              tradingAccountId: result.tradingAccountId
            }

            console.log(`📤 [PRISMA-MIDDLEWARE] Emitting order_cancelled for user ${userId}`)
            eventEmitter.emit(userId, 'order_cancelled', eventData)
          }
        }
      }
    }

    // Position events
    if (params.model === 'Position') {
      if (params.action === 'create') {
        const userId = await getUserIdFromTradingAccountId(prisma, result.tradingAccountId)
        
        if (userId) {
          const eventData: PositionEventData = {
            positionId: result.id,
            symbol: result.symbol,
            quantity: result.quantity,
            averagePrice: Number(result.averagePrice),
            tradingAccountId: result.tradingAccountId
          }

          console.log(`📤 [PRISMA-MIDDLEWARE] Emitting position_opened for user ${userId}`)
          eventEmitter.emit(userId, 'position_opened', eventData)
        }
      } else if (params.action === 'update') {
        const userId = await getUserIdFromTradingAccountId(prisma, result.tradingAccountId)
        
        if (userId) {
          // Check if position was closed (quantity becomes 0)
          const isClosed = result.quantity === 0 || (params.args?.data?.quantity === 0)
          
          if (isClosed) {
            const eventData: PositionEventData = {
              positionId: result.id,
              symbol: result.symbol,
              quantity: 0,
              averagePrice: Number(result.averagePrice),
              tradingAccountId: result.tradingAccountId,
              realizedPnL: result.unrealizedPnL ? Number(result.unrealizedPnL) : undefined
            }

            console.log(`📤 [PRISMA-MIDDLEWARE] Emitting position_closed for user ${userId}`)
            eventEmitter.emit(userId, 'position_closed', eventData)
          } else {
            const eventData: PositionEventData = {
              positionId: result.id,
              symbol: result.symbol,
              quantity: result.quantity,
              averagePrice: Number(result.averagePrice),
              tradingAccountId: result.tradingAccountId
            }

            console.log(`📤 [PRISMA-MIDDLEWARE] Emitting position_updated for user ${userId}`)
            eventEmitter.emit(userId, 'position_updated', eventData)
          }
        }
      }
    }

    // TradingAccount events (balance updates)
    if (params.model === 'TradingAccount' && params.action === 'update') {
      if (result.userId) {
        // Check if balance/margin changed
        const balanceChanged = params.args?.data?.balance !== undefined
        const marginChanged = params.args?.data?.availableMargin !== undefined || params.args?.data?.usedMargin !== undefined
        
        if (balanceChanged || marginChanged) {
          const eventData: AccountEventData = {
            tradingAccountId: result.id,
            balance: result.balance,
            availableMargin: result.availableMargin,
            usedMargin: result.usedMargin
          }

          console.log(`📤 [PRISMA-MIDDLEWARE] Emitting balance_updated for user ${result.userId}`)
          eventEmitter.emit(result.userId, 'balance_updated', eventData)
        }
      }
    }

    // Watchlist events
    if (params.model === 'Watchlist' && params.action === 'update') {
      if (result.userId) {
        console.log(`📤 [PRISMA-MIDDLEWARE] Emitting watchlist_updated for user ${result.userId}`)
        eventEmitter.emit(result.userId, 'watchlist_updated', {
          watchlistId: result.id,
          action: 'item_updated' as const,
          userId: result.userId
        })
      }
    }

    // WatchlistItem events
    if (params.model === 'WatchlistItem') {
      if (params.action === 'create') {
        // Get userId from watchlist relation
        try {
          const watchlist = await prisma.watchlist.findUnique({
            where: { id: result.watchlistId },
            select: { userId: true }
          })

          if (watchlist?.userId) {
            const eventData: WatchlistEventData = {
              watchlistId: result.watchlistId,
              action: 'item_added',
              itemId: result.id,
              userId: watchlist.userId
            }

            console.log(`📤 [PRISMA-MIDDLEWARE] Emitting watchlist_item_added for user ${watchlist.userId}`)
            eventEmitter.emit(watchlist.userId, 'watchlist_item_added', eventData)
          }
        } catch (error) {
          console.error(`❌ [PRISMA-MIDDLEWARE] Error fetching watchlist userId:`, error)
        }
      } else if (params.action === 'delete') {
        // For delete, we need to get userId before the item is deleted
        // This is tricky because result might be the deleted item or just metadata
        // We'll need to get the watchlistId from params and fetch userId
        try {
          const watchlistId = params.args?.where?.id 
            ? (await prisma.watchlistItem.findUnique({ 
                where: { id: params.args.where.id }, 
                select: { watchlistId: true } 
              }))?.watchlistId
            : result.watchlistId

          if (watchlistId) {
            const watchlist = await prisma.watchlist.findUnique({
              where: { id: watchlistId },
              select: { userId: true }
            })

            if (watchlist?.userId) {
              const eventData: WatchlistEventData = {
                watchlistId: watchlistId,
                action: 'item_removed',
                itemId: params.args?.where?.id || result.id,
                userId: watchlist.userId
              }

              console.log(`📤 [PRISMA-MIDDLEWARE] Emitting watchlist_item_removed for user ${watchlist.userId}`)
              eventEmitter.emit(watchlist.userId, 'watchlist_item_removed', eventData)
            }
          }
        } catch (error) {
          console.error(`❌ [PRISMA-MIDDLEWARE] Error emitting watchlist_item_removed:`, error)
        }
      }
    }

    return result
  })
}

console.log('✅ [PRISMA-MIDDLEWARE] Module initialized')

