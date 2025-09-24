/**
 * @file use-realtime-trading.ts
 * @description Supabase Realtime subscriptions for trading data
 * Provides live updates for orders, positions, accounts, and transactions
 */

"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { RealtimeChannel } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface RealtimeTradingData {
  orders: any[]
  positions: any[]
  tradingAccount: any
  transactions: any[]
}

interface UseRealtimeTradingOptions {
  tradingAccountId?: string
  userId?: string
  onOrdersUpdate?: (orders: any[]) => void
  onPositionsUpdate?: (positions: any[]) => void
  onAccountUpdate?: (account: any) => void
  onTransactionsUpdate?: (transactions: any[]) => void
}

export function useRealtimeTrading(options: UseRealtimeTradingOptions = {}) {
  const [data, setData] = useState<RealtimeTradingData>({
    orders: [],
    positions: [],
    tradingAccount: null,
    transactions: []
  })
  const [channels, setChannels] = useState<RealtimeChannel[]>([])

  useEffect(() => {
    if (!options.tradingAccountId) return

    const newChannels: RealtimeChannel[] = []

    // Orders subscription
    const ordersChannel = supabase
      .channel('orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tradingAccountId=eq.${options.tradingAccountId}`
        },
        (payload) => {
          console.log('Orders update:', payload)
          options.onOrdersUpdate?.(payload.new as any)
        }
      )
      .subscribe()

    newChannels.push(ordersChannel)

    // Positions subscription
    const positionsChannel = supabase
      .channel('positions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions',
          filter: `tradingAccountId=eq.${options.tradingAccountId}`
        },
        (payload) => {
          console.log('Positions update:', payload)
          options.onPositionsUpdate?.(payload.new as any)
        }
      )
      .subscribe()

    newChannels.push(positionsChannel)

    // Trading account subscription
    const accountChannel = supabase
      .channel('trading_account')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_accounts',
          filter: `id=eq.${options.tradingAccountId}`
        },
        (payload) => {
          console.log('Account update:', payload)
          options.onAccountUpdate?.(payload.new as any)
        }
      )
      .subscribe()

    newChannels.push(accountChannel)

    // Transactions subscription
    const transactionsChannel = supabase
      .channel('transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `tradingAccountId=eq.${options.tradingAccountId}`
        },
        (payload) => {
          console.log('Transactions update:', payload)
          options.onTransactionsUpdate?.(payload.new as any)
        }
      )
      .subscribe()

    newChannels.push(transactionsChannel)

    setChannels(newChannels)

    return () => {
      newChannels.forEach(channel => {
        supabase.removeChannel(channel)
      })
    }
  }, [options.tradingAccountId])

  return {
    data,
    channels,
    isConnected: channels.length > 0
  }
}

// Hook for specific entity subscriptions
export function useRealtimeOrders(tradingAccountId?: string) {
  const [orders, setOrders] = useState<any[]>([])

  useEffect(() => {
    if (!tradingAccountId) return

    const channel = supabase
      .channel('orders-single')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `tradingAccountId=eq.${tradingAccountId}`
        },
        (payload) => {
          setOrders(prev => {
            const newOrders = [...prev]
            const index = newOrders.findIndex(o => o.id === payload.new.id)
            
            if (payload.eventType === 'INSERT') {
              newOrders.unshift(payload.new as any)
            } else if (payload.eventType === 'UPDATE') {
              if (index >= 0) {
                newOrders[index] = payload.new as any
              }
            } else if (payload.eventType === 'DELETE') {
              if (index >= 0) {
                newOrders.splice(index, 1)
              }
            }
            
            return newOrders
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tradingAccountId])

  return orders
}

export function useRealtimePositions(tradingAccountId?: string) {
  const [positions, setPositions] = useState<any[]>([])

  useEffect(() => {
    if (!tradingAccountId) return

    const channel = supabase
      .channel('positions-single')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions',
          filter: `tradingAccountId=eq.${tradingAccountId}`
        },
        (payload) => {
          setPositions(prev => {
            const newPositions = [...prev]
            const index = newPositions.findIndex(p => p.id === payload.new.id)
            
            if (payload.eventType === 'INSERT') {
              newPositions.unshift(payload.new as any)
            } else if (payload.eventType === 'UPDATE') {
              if (index >= 0) {
                newPositions[index] = payload.new as any
              }
            } else if (payload.eventType === 'DELETE') {
              if (index >= 0) {
                newPositions.splice(index, 1)
              }
            }
            
            return newPositions
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tradingAccountId])

  return positions
}

export function useRealtimeAccount(tradingAccountId?: string) {
  const [account, setAccount] = useState<any>(null)

  useEffect(() => {
    if (!tradingAccountId) return

    const channel = supabase
      .channel('account-single')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trading_accounts',
          filter: `id=eq.${tradingAccountId}`
        },
        (payload) => {
          setAccount(payload.new as any)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tradingAccountId])

  return account
}
