/**
 * Real-time Trading Account Hook
 * 
 * Provides real-time account balance updates with:
 * - Optimistic UI updates
 * - Smart polling with SWR
 * - Automatic refresh after fund operations
 * - Real-time margin updates
 * - Comprehensive error handling
 * - Numeric validation
 * - Retry logic
 */

"use client"

import useSWR from 'swr'
import { useCallback, useEffect, useRef } from 'react'

// Types
interface TradingAccount {
  id: string
  userId: string
  balance: number
  availableMargin: number
  usedMargin: number
  clientId: string
  createdAt: string
  updatedAt: string
}

interface AccountResponse {
  success: boolean
  account: TradingAccount | null
  error?: string
}

interface UseRealtimeAccountReturn {
  account: TradingAccount | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<any>
  optimisticUpdateBalance: (balanceChange: number, marginChange: number) => void
  optimisticBlockMargin: (amount: number) => void
  optimisticReleaseMargin: (amount: number) => void
  mutate: any
  retryCount: number
}

// Enhanced fetcher with better error handling
const fetcher = async (url: string): Promise<AccountResponse> => {
  try {
    const res = await fetch(url, { 
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Unauthorized: Please login again')
      } else if (res.status === 403) {
        throw new Error('Forbidden: Access denied')
      } else if (res.status === 404) {
        throw new Error('Account endpoint not found')
      } else if (res.status >= 500) {
        throw new Error('Server error: Please try again later')
      }
      throw new Error(`Failed to fetch account: ${res.status} ${res.statusText}`)
    }
    
    const data = await res.json()
    
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format')
    }
    
    if (data.success === false && data.error) {
      throw new Error(data.error)
    }
    
    return data
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ [REALTIME-ACCOUNT] Fetch error:', {
        message: error.message,
        url,
        timestamp: new Date().toISOString()
      })
    }
    throw error
  }
}

// Validation helpers
function isValidNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

function validateAmount(amount: number, context: string): boolean {
  if (!isValidNumber(amount)) {
    console.error(`❌ [REALTIME-ACCOUNT] Invalid ${context} amount:`, amount, 'Type:', typeof amount)
    return false
  }
  
  if (amount < 0) {
    console.warn(`⚠️ [REALTIME-ACCOUNT] Negative ${context} amount:`, amount)
    // Allow negative amounts for debits, but log warning
  }
  
  if (Math.abs(amount) > Number.MAX_SAFE_INTEGER) {
    console.error(`❌ [REALTIME-ACCOUNT] ${context} amount too large:`, amount)
    return false
  }
  
  return true
}

function validateAccount(account: any): account is TradingAccount {
  if (!account || typeof account !== 'object') {
    return false
  }
  
  if (!account.id || typeof account.id !== 'string') {
    console.warn('⚠️ [REALTIME-ACCOUNT] Invalid account ID')
    return false
  }
  
  if (!isValidNumber(account.balance)) {
    console.warn('⚠️ [REALTIME-ACCOUNT] Invalid balance:', account.balance)
    return false
  }
  
  if (!isValidNumber(account.availableMargin)) {
    console.warn('⚠️ [REALTIME-ACCOUNT] Invalid availableMargin:', account.availableMargin)
    return false
  }
  
  if (!isValidNumber(account.usedMargin)) {
    console.warn('⚠️ [REALTIME-ACCOUNT] Invalid usedMargin:', account.usedMargin)
    return false
  }
  
  return true
}

export function useRealtimeAccount(userId: string | undefined | null): UseRealtimeAccountReturn {
  const shouldPoll = useRef(true)
  const retryCountRef = useRef(0)
  const maxRetries = 3
  
  // Smart polling - poll every 2 seconds for account
  const { data, error, isLoading, mutate } = useSWR<AccountResponse>(
    userId ? `/api/trading/account?userId=${userId}` : null,
    fetcher,
    {
      refreshInterval: shouldPoll.current ? 2000 : 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 1000,
      shouldRetryOnError: true,
      errorRetryCount: maxRetries,
      errorRetryInterval: 5000,
      onError: (err) => {
        retryCountRef.current += 1
        console.error(`❌ [REALTIME-ACCOUNT] Error (attempt ${retryCountRef.current}/${maxRetries}):`, err.message)
      },
      onSuccess: () => {
        if (retryCountRef.current > 0) {
          console.log('✅ [REALTIME-ACCOUNT] Recovered from error')
          retryCountRef.current = 0
        }
      }
    }
  )

  // Stop polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      shouldPoll.current = !document.hidden
      if (!document.hidden) {
        console.log('👁️ [REALTIME-ACCOUNT] Tab visible, refreshing data')
        mutate().catch(err => {
          console.error('❌ [REALTIME-ACCOUNT] Refresh on visibility failed:', err)
        })
      } else {
        console.log('💤 [REALTIME-ACCOUNT] Tab hidden, pausing polling')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [mutate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 [REALTIME-ACCOUNT] Cleaning up')
    }
  }, [])

  // Refresh function
  const refresh = useCallback(async () => {
    console.log("🔄 [REALTIME-ACCOUNT] Manual refresh triggered")
    try {
      return await mutate()
    } catch (error) {
      console.error("❌ [REALTIME-ACCOUNT] Manual refresh failed:", error)
      throw error
    }
  }, [mutate])

  // Optimistic update for balance change with validation
  const optimisticUpdateBalance = useCallback((
    balanceChange: number,
    marginChange: number
  ) => {
    if (!validateAmount(balanceChange, 'balance change')) {
      console.error('❌ [REALTIME-ACCOUNT] Cannot update balance: Invalid balance change')
      return
    }
    
    if (!validateAmount(marginChange, 'margin change')) {
      console.error('❌ [REALTIME-ACCOUNT] Cannot update balance: Invalid margin change')
      return
    }
    
    console.log("⚡ [REALTIME-ACCOUNT] Optimistic update:", { balanceChange, marginChange })
    
    try {
      mutate(
        (currentData: AccountResponse | undefined) => {
          if (!currentData || !currentData.account) {
            console.warn('⚠️ [REALTIME-ACCOUNT] No account data for optimistic update')
            return currentData
          }
          
          if (!validateAccount(currentData.account)) {
            console.error('❌ [REALTIME-ACCOUNT] Invalid account data')
            return currentData
          }
          
          const newBalance = currentData.account.balance + balanceChange
          const newAvailableMargin = currentData.account.availableMargin + marginChange
          
          // Prevent negative balance (optional - uncomment if needed)
          // if (newBalance < 0) {
          //   console.error('❌ [REALTIME-ACCOUNT] Operation would result in negative balance')
          //   return currentData
          // }
          
          console.log(`💰 [REALTIME-ACCOUNT] Balance: ${currentData.account.balance} → ${newBalance}`)
          console.log(`📊 [REALTIME-ACCOUNT] Available Margin: ${currentData.account.availableMargin} → ${newAvailableMargin}`)
          
          return {
            ...currentData,
            account: {
              ...currentData.account,
              balance: newBalance,
              availableMargin: newAvailableMargin
            }
          }
        },
        false
      )
      
      // Revalidate after delay
      setTimeout(() => {
        mutate().catch(err => {
          console.error('❌ [REALTIME-ACCOUNT] Delayed revalidation failed:', err)
        })
      }, 500)
    } catch (error) {
      console.error('❌ [REALTIME-ACCOUNT] Optimistic balance update failed:', error)
    }
  }, [mutate])

  // Optimistic margin block with validation
  const optimisticBlockMargin = useCallback((amount: number) => {
    if (!validateAmount(amount, 'margin block')) {
      console.error('❌ [REALTIME-ACCOUNT] Cannot block margin: Invalid amount')
      return
    }
    
    if (amount <= 0) {
      console.error('❌ [REALTIME-ACCOUNT] Cannot block margin: Amount must be positive')
      return
    }
    
    console.log("⚡ [REALTIME-ACCOUNT] Optimistic block margin:", amount)
    
    try {
      mutate(
        (currentData: AccountResponse | undefined) => {
          if (!currentData || !currentData.account) {
            console.warn('⚠️ [REALTIME-ACCOUNT] No account data for margin block')
            return currentData
          }
          
          if (!validateAccount(currentData.account)) {
            console.error('❌ [REALTIME-ACCOUNT] Invalid account data')
            return currentData
          }
          
          const newAvailableMargin = currentData.account.availableMargin - amount
          const newUsedMargin = currentData.account.usedMargin + amount
          
          // Check if sufficient margin available
          if (newAvailableMargin < 0) {
            console.warn('⚠️ [REALTIME-ACCOUNT] Insufficient margin - operation may fail')
          }
          
          console.log(`🔒 [REALTIME-ACCOUNT] Blocking margin ${amount}`)
          console.log(`📊 [REALTIME-ACCOUNT] Available: ${currentData.account.availableMargin} → ${newAvailableMargin}`)
          console.log(`📊 [REALTIME-ACCOUNT] Used: ${currentData.account.usedMargin} → ${newUsedMargin}`)
          
          return {
            ...currentData,
            account: {
              ...currentData.account,
              availableMargin: newAvailableMargin,
              usedMargin: newUsedMargin
            }
          }
        },
        false
      )
      
      setTimeout(() => {
        mutate().catch(err => {
          console.error('❌ [REALTIME-ACCOUNT] Delayed revalidation failed:', err)
        })
      }, 500)
    } catch (error) {
      console.error('❌ [REALTIME-ACCOUNT] Optimistic margin block failed:', error)
    }
  }, [mutate])

  // Optimistic margin release with validation
  const optimisticReleaseMargin = useCallback((amount: number) => {
    if (!validateAmount(amount, 'margin release')) {
      console.error('❌ [REALTIME-ACCOUNT] Cannot release margin: Invalid amount')
      return
    }
    
    if (amount <= 0) {
      console.error('❌ [REALTIME-ACCOUNT] Cannot release margin: Amount must be positive')
      return
    }
    
    console.log("⚡ [REALTIME-ACCOUNT] Optimistic release margin:", amount)
    
    try {
      mutate(
        (currentData: AccountResponse | undefined) => {
          if (!currentData || !currentData.account) {
            console.warn('⚠️ [REALTIME-ACCOUNT] No account data for margin release')
            return currentData
          }
          
          if (!validateAccount(currentData.account)) {
            console.error('❌ [REALTIME-ACCOUNT] Invalid account data')
            return currentData
          }
          
          const newAvailableMargin = currentData.account.availableMargin + amount
          const newUsedMargin = Math.max(0, currentData.account.usedMargin - amount)
          
          console.log(`🔓 [REALTIME-ACCOUNT] Releasing margin ${amount}`)
          console.log(`📊 [REALTIME-ACCOUNT] Available: ${currentData.account.availableMargin} → ${newAvailableMargin}`)
          console.log(`📊 [REALTIME-ACCOUNT] Used: ${currentData.account.usedMargin} → ${newUsedMargin}`)
          
          return {
            ...currentData,
            account: {
              ...currentData.account,
              availableMargin: newAvailableMargin,
              usedMargin: newUsedMargin
            }
          }
        },
        false
      )
      
      setTimeout(() => {
        mutate().catch(err => {
          console.error('❌ [REALTIME-ACCOUNT] Delayed revalidation failed:', err)
        })
      }, 500)
    } catch (error) {
      console.error('❌ [REALTIME-ACCOUNT] Optimistic margin release failed:', error)
    }
  }, [mutate])

  // Safe data extraction with fallback
  const account: TradingAccount | null = (() => {
    try {
      if (data?.account && validateAccount(data.account)) {
        return data.account
      }
      return null
    } catch (err) {
      console.error('❌ [REALTIME-ACCOUNT] Error extracting account:', err)
      return null
    }
  })()

  return {
    account,
    isLoading,
    error: error || null,
    refresh,
    optimisticUpdateBalance,
    optimisticBlockMargin,
    optimisticReleaseMargin,
    mutate,
    retryCount: retryCountRef.current
  }
}
