/**
 * React hook for managing console data
 */

import { useState, useEffect, useCallback } from 'react'
import { ConsoleDataService, ConsoleData, BankAccount, Deposit, Withdrawal, UserProfile } from '../console-data-service'

export function useConsoleData(userId?: string) {
  const [consoleData, setConsoleData] = useState<ConsoleData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchConsoleData = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await ConsoleDataService.getConsoleData(userId)
      setConsoleData(data)
    } catch (err) {
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
      const result = await ConsoleDataService.updateUserProfile(userId, profileData)
      if (result.success) {
        await fetchConsoleData() // Refresh data
      }
      return result
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to update profile' }
    }
  }, [userId, fetchConsoleData])

  const addBankAccount = useCallback(async (bankData: Omit<BankAccount, 'id' | 'createdAt'>) => {
    if (!userId) return { success: false, message: 'User ID required' }

    try {
      const result = await ConsoleDataService.addBankAccount(userId, bankData)
      if (result.success) {
        await fetchConsoleData() // Refresh data
      }
      return result
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to add bank account' }
    }
  }, [userId, fetchConsoleData])

  const updateBankAccount = useCallback(async (accountId: string, bankData: Partial<BankAccount>) => {
    if (!userId) return { success: false, message: 'User ID required' }

    try {
      const result = await ConsoleDataService.updateBankAccount(userId, accountId, bankData)
      if (result.success) {
        await fetchConsoleData() // Refresh data
      }
      return result
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : 'Failed to update bank account' }
    }
  }, [userId, fetchConsoleData])

  const deleteBankAccount = useCallback(async (accountId: string) => {
    if (!userId) return { success: false, message: 'User ID required' }

    try {
      const result = await ConsoleDataService.deleteBankAccount(userId, accountId)
      if (result.success) {
        await fetchConsoleData() // Refresh data
      }
      return result
    } catch (err) {
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
      const result = await ConsoleDataService.createDepositRequest(userId, depositData)
      if (result.success) {
        await fetchConsoleData() // Refresh data
      }
      return result
    } catch (err) {
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
      const result = await ConsoleDataService.createWithdrawalRequest(userId, withdrawalData)
      if (result.success) {
        await fetchConsoleData() // Refresh data
      }
      return result
    } catch (err) {
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