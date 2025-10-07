/**
 * Real-time Trading Coordinator
 * 
 * Master hook that coordinates all real-time updates:
 * - Orders, Positions, Account balance
 * - Optimistic UI updates
 * - Automatic refresh coordination
 * - Smooth UX without manual refresh
 */

"use client"

import { useCallback } from 'react'
import { useRealtimeOrders } from './use-realtime-orders'
import { useRealtimePositions } from './use-realtime-positions'
import { useRealtimeAccount } from './use-realtime-account'

export function useRealtimeTrading(userId: string | undefined) {
  const orders = useRealtimeOrders(userId)
  const positions = useRealtimePositions(userId)
  const account = useRealtimeAccount(userId)

  // Coordinated refresh - refresh everything
  const refreshAll = useCallback(async () => {
    console.log("🔄 [REALTIME-TRADING] Refreshing all data")
    await Promise.all([
      orders.refresh(),
      positions.refresh(),
      account.refresh()
    ])
  }, [orders, positions, account])

  // Handle order placement with optimistic updates
  const handleOrderPlaced = useCallback(async (orderData: any, result: any) => {
    console.log("🎉 [REALTIME-TRADING] Order placed, updating UI optimistically")
    
    // 1. Add order to orders list (optimistic)
    orders.optimisticUpdate({
      id: result.orderId,
      symbol: orderData.symbol,
      quantity: orderData.quantity,
      orderType: orderData.orderType,
      orderSide: orderData.orderSide,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      ...orderData
    })

    // 2. Block margin (optimistic)
    if (result.marginBlocked) {
      account.optimisticBlockMargin(result.marginBlocked)
    }

    // 3. Deduct charges (optimistic)
    if (result.chargesDeducted) {
      account.optimisticUpdateBalance(-result.chargesDeducted, -result.chargesDeducted)
    }

    // 4. Schedule check for order execution (after 3 seconds)
    setTimeout(() => {
      console.log("⏰ [REALTIME-TRADING] Checking for order execution")
      orders.refresh()
      positions.refresh() // Position might be created
    }, 3500) // Slightly after 3-second execution delay

    // 5. Additional refresh after 1 second to catch any immediate updates
    setTimeout(() => {
      refreshAll()
    }, 1000)

    return result
  }, [orders, account, positions, refreshAll])

  // Handle position close with optimistic updates
  const handlePositionClosed = useCallback(async (positionId: string, result: any) => {
    console.log("🎉 [REALTIME-TRADING] Position closed, updating UI optimistically")
    
    // 1. Update position (optimistic)
    positions.optimisticClosePosition(positionId)

    // 2. Release margin (optimistic)
    if (result.marginReleased) {
      account.optimisticReleaseMargin(result.marginReleased)
    }

    // 3. Update balance with P&L (optimistic)
    if (result.realizedPnL) {
      account.optimisticUpdateBalance(result.realizedPnL, result.realizedPnL)
    }

    // 4. Refresh to confirm
    setTimeout(() => {
      refreshAll()
    }, 500)

    return result
  }, [positions, account, refreshAll])

  // Handle fund operations with optimistic updates
  const handleFundOperation = useCallback(async (
    type: 'CREDIT' | 'DEBIT' | 'BLOCK' | 'RELEASE',
    amount: number,
    result: any
  ) => {
    console.log("🎉 [REALTIME-TRADING] Fund operation completed, updating UI optimistically")
    
    switch (type) {
      case 'CREDIT':
        account.optimisticUpdateBalance(amount, amount)
        break
      case 'DEBIT':
        account.optimisticUpdateBalance(-amount, -amount)
        break
      case 'BLOCK':
        account.optimisticBlockMargin(amount)
        break
      case 'RELEASE':
        account.optimisticReleaseMargin(amount)
        break
    }

    // Refresh to confirm
    setTimeout(() => {
      account.refresh()
    }, 500)

    return result
  }, [account])

  return {
    // Data
    orders: orders.orders,
    positions: positions.positions,
    account: account.account,
    
    // Loading states
    isLoadingOrders: orders.isLoading,
    isLoadingPositions: positions.isLoading,
    isLoadingAccount: account.isLoading,
    
    // Errors
    ordersError: orders.error,
    positionsError: positions.error,
    accountError: account.error,
    
    // Refresh functions
    refreshOrders: orders.refresh,
    refreshPositions: positions.refresh,
    refreshAccount: account.refresh,
    refreshAll,
    
    // Optimistic update handlers
    handleOrderPlaced,
    handlePositionClosed,
    handleFundOperation,
    
    // Raw mutate functions (advanced use)
    mutateOrders: orders.mutate,
    mutatePositions: positions.mutate,
    mutateAccount: account.mutate,
  }
}
