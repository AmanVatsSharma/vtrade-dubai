/**
 * React hook for managing console data
 */

import { useState, useEffect, useCallback } from 'react'
import { ConsoleData, BankAccount, Deposit, Withdrawal, UserProfile } from '../console-data-service'

export function useConsoleData(userId?: string) {
  const [consoleData, setConsoleData] = useState<ConsoleData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentSettings, setPaymentSettings] = useState<{ upiId?: string; qrCodeUrl?: string } | null>(null)

  const fetchConsoleData = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      console.log('🔄 [USE-CONSOLE-DATA] Fetching console data via API')
      const response = await fetch('/api/console', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        console.warn('⚠️ [USE-CONSOLE-DATA] Non-OK response for console data', { status: response.status })
        // Attempt to read body for structured error or fallback
        try {
          const maybeJson = await response.json()
          if (maybeJson && (maybeJson.user || maybeJson._fallback)) {
            console.log('🛟 [USE-CONSOLE-DATA] Using fallback/partial console payload')
            setConsoleData(maybeJson)
            fetchPaymentSettings()
            return
          }
        } catch {
          // ignore parsing failure
        }
        throw new Error(`Failed to fetch console data: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ [USE-CONSOLE-DATA] Console data fetched successfully')
      setConsoleData(data)
      // Fire and forget fetch of payment settings used by deposits UI
      fetchPaymentSettings()
    } catch (err) {
      console.error('❌ [USE-CONSOLE-DATA] Error fetching console data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch console data')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const fetchPaymentSettings = useCallback(async () => {
    try {
      console.log('🔄 [USE-CONSOLE-DATA] Fetching payment settings')
      const response = await fetch("/api/settings/payment", { cache: "no-store" })
      const json = await response.json()

      if (!response.ok || !json?.success) {
        throw new Error(json?.error || `Failed to load payment settings (${response.status})`)
      }

      const qr = (json?.data?.qrCodeUrl as string | null | undefined) ?? undefined
      const upi = (json?.data?.upiId as string | null | undefined) ?? undefined

      setPaymentSettings({
        upiId: upi || undefined,
        qrCodeUrl: qr || undefined,
      })
      console.log("✅ [USE-CONSOLE-DATA] Payment settings loaded", { upi, qr })
    } catch (e) {
      console.warn('⚠️ [USE-CONSOLE-DATA] Failed to load payment settings')
      setPaymentSettings(null)
    }
  }, [])

  useEffect(() => {
    fetchConsoleData()
  }, [fetchConsoleData])

  const updateUserProfile = useCallback(async (profileData: Partial<UserProfile>) => {
    if (!userId) return { success: false, message: 'User ID required' }

    try {
      console.log('🔄 [USE-CONSOLE-DATA] Updating user profile via API')
      const response = await fetch('/api/console', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateProfile',
          data: profileData
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ [USE-CONSOLE-DATA] User profile updated successfully')
      
      if (result.success) {
        await fetchConsoleData() // Refresh data
      }
      return result
    } catch (err) {
      console.error('❌ [USE-CONSOLE-DATA] Error updating profile:', err)
      return { success: false, message: err instanceof Error ? err.message : 'Failed to update profile' }
    }
  }, [userId, fetchConsoleData])

  const addBankAccount = useCallback(async (bankData: Omit<BankAccount, 'id' | 'createdAt'>) => {
    if (!userId) return { success: false, message: 'User ID required' }

    try {
      console.log('🔄 [USE-CONSOLE-DATA] Adding bank account via API')
      const response = await fetch('/api/console', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'addBankAccount',
          data: bankData
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to add bank account: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ [USE-CONSOLE-DATA] Bank account added successfully')
      
      if (result.success) {
        await fetchConsoleData() // Refresh data
      }
      return result
    } catch (err) {
      console.error('❌ [USE-CONSOLE-DATA] Error adding bank account:', err)
      return { success: false, message: err instanceof Error ? err.message : 'Failed to add bank account' }
    }
  }, [userId, fetchConsoleData])

  const updateBankAccount = useCallback(async (accountId: string, bankData: Partial<BankAccount>) => {
    if (!userId) return { success: false, message: 'User ID required' }

    try {
      console.log('🔄 [USE-CONSOLE-DATA] Updating bank account via API')
      const response = await fetch('/api/console', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'updateBankAccount',
          data: { accountId, bankData }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to update bank account: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ [USE-CONSOLE-DATA] Bank account updated successfully')
      
      if (result.success) {
        await fetchConsoleData() // Refresh data
      }
      return result
    } catch (err) {
      console.error('❌ [USE-CONSOLE-DATA] Error updating bank account:', err)
      return { success: false, message: err instanceof Error ? err.message : 'Failed to update bank account' }
    }
  }, [userId, fetchConsoleData])

  const deleteBankAccount = useCallback(async (accountId: string) => {
    if (!userId) return { success: false, message: 'User ID required' }

    try {
      console.log('🔄 [USE-CONSOLE-DATA] Deleting bank account via API')
      const response = await fetch('/api/console', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deleteBankAccount',
          data: { accountId }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to delete bank account: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ [USE-CONSOLE-DATA] Bank account deleted successfully')
      
      if (result.success) {
        await fetchConsoleData() // Refresh data
      }
      return result
    } catch (err) {
      console.error('❌ [USE-CONSOLE-DATA] Error deleting bank account:', err)
      return { success: false, message: err instanceof Error ? err.message : 'Failed to delete bank account' }
    }
  }, [userId, fetchConsoleData])

  const createDepositRequest = useCallback(async (depositData: {
    amount: number
    method: string
    bankAccountId?: string
    utr?: string
    reference?: string
    remarks?: string
  }) => {
    if (!userId) return { success: false, message: 'User ID required' }

    try {
      console.log('🔄 [USE-CONSOLE-DATA] Creating deposit request via API')
      const response = await fetch('/api/console', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createDepositRequest',
          data: depositData
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create deposit request: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ [USE-CONSOLE-DATA] Deposit request created successfully')
      
      if (result.success) {
        await fetchConsoleData() // Refresh data
      }
      return result
    } catch (err) {
      console.error('❌ [USE-CONSOLE-DATA] Error creating deposit request:', err)
      return { success: false, message: err instanceof Error ? err.message : 'Failed to create deposit request' }
    }
  }, [userId, fetchConsoleData])

  const createWithdrawalRequest = useCallback(async (withdrawalData: {
    amount: number
    bankAccountId: string
    reference?: string
    remarks?: string
    charges?: number
  }) => {
    if (!userId) return { success: false, message: 'User ID required' }

    try {
      console.log('🔄 [USE-CONSOLE-DATA] Creating withdrawal request via API')
      const response = await fetch('/api/console', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'createWithdrawalRequest',
          data: withdrawalData
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create withdrawal request: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ [USE-CONSOLE-DATA] Withdrawal request created successfully')
      
      if (result.success) {
        await fetchConsoleData() // Refresh data
      }
      return result
    } catch (err) {
      console.error('❌ [USE-CONSOLE-DATA] Error creating withdrawal request:', err)
      return { success: false, message: err instanceof Error ? err.message : 'Failed to create withdrawal request' }
    }
  }, [userId, fetchConsoleData])

  return {
    consoleData,
    isLoading,
    error,
    paymentSettings,
    refetchPaymentSettings: fetchPaymentSettings,
    refetch: fetchConsoleData,
    updateUserProfile,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    createDepositRequest,
    createWithdrawalRequest
  }
}