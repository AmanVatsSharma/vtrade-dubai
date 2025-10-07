/**
 * React hook for managing console data
 */

import { useState, useEffect, useCallback } from 'react'
import { ConsoleData, BankAccount, Deposit, Withdrawal, UserProfile } from '../console-data-service'

export function useConsoleData(userId?: string) {
  const [consoleData, setConsoleData] = useState<ConsoleData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch console data: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('✅ [USE-CONSOLE-DATA] Console data fetched successfully')
      setConsoleData(data)
    } catch (err) {
      console.error('❌ [USE-CONSOLE-DATA] Error fetching console data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch console data')
    } finally {
      setIsLoading(false)
    }
  }, [userId])

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
    refetch: fetchConsoleData,
    updateUserProfile,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    createDepositRequest,
    createWithdrawalRequest
  }
}