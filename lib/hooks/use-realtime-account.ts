/**
 * Real-time Trading Account Hook
 * 
 * Provides real-time account balance updates with:
 * - Optimistic UI updates
 * - Smart polling with SWR
 * - Automatic refresh after fund operations
 * - Real-time margin updates
 */

"use client"

import useSWR from 'swr'
import { useCallback, useEffect, useRef } from 'react'

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch trading account')
  return res.json()
}

export function useRealtimeAccount(userId: string | undefined) {
  const shouldPoll = useRef(true)
  
  // Smart polling - poll every 2 seconds for account
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/trading/account?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: shouldPoll.current ? 2000 : 0, // Poll every 2 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000,
    }
  )

  // Stop polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      shouldPoll.current = !document.hidden
      if (!document.hidden) {
        mutate() // Refresh immediately when tab becomes visible
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [mutate])

  // Refresh function
  const refresh = useCallback(() => {
    console.log("🔄 [REALTIME-ACCOUNT] Manual refresh triggered")
    return mutate()
  }, [mutate])

  // Optimistic update for balance change
  const optimisticUpdateBalance = useCallback((
    balanceChange: number,
    marginChange: number
  ) => {
    console.log("⚡ [REALTIME-ACCOUNT] Optimistic update:", { balanceChange, marginChange })
    mutate(
      (currentData: any) => {
        if (!currentData?.account) return currentData
        return {
          ...currentData,
          account: {
            ...currentData.account,
            balance: currentData.account.balance + balanceChange,
            availableMargin: currentData.account.availableMargin + marginChange
          }
        }
      },
      false
    )
    
    // Revalidate after delay
    setTimeout(() => mutate(), 500)
  }, [mutate])

  // Optimistic margin block
  const optimisticBlockMargin = useCallback((amount: number) => {
    console.log("⚡ [REALTIME-ACCOUNT] Optimistic block margin:", amount)
    mutate(
      (currentData: any) => {
        if (!currentData?.account) return currentData
        return {
          ...currentData,
          account: {
            ...currentData.account,
            availableMargin: currentData.account.availableMargin - amount,
            usedMargin: currentData.account.usedMargin + amount
          }
        }
      },
      false
    )
    
    setTimeout(() => mutate(), 500)
  }, [mutate])

  // Optimistic margin release
  const optimisticReleaseMargin = useCallback((amount: number) => {
    console.log("⚡ [REALTIME-ACCOUNT] Optimistic release margin:", amount)
    mutate(
      (currentData: any) => {
        if (!currentData?.account) return currentData
        return {
          ...currentData,
          account: {
            ...currentData.account,
            availableMargin: currentData.account.availableMargin + amount,
            usedMargin: currentData.account.usedMargin - amount
          }
        }
      },
      false
    )
    
    setTimeout(() => mutate(), 500)
  }, [mutate])

  return {
    account: data?.account || null,
    isLoading,
    error,
    refresh,
    optimisticUpdateBalance,
    optimisticBlockMargin,
    optimisticReleaseMargin,
    mutate
  }
}
