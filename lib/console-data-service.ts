/**
 * Console Data Service
 * Handles all console-related data operations using Supabase RPC functions
 */

import { supabaseServer } from './supabase/supabase-server'

export interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  ifscCode: string
  accountHolderName: string
  accountType: 'savings' | 'current'
  isDefault: boolean
  isActive: boolean
  createdAt: string
}

export interface Deposit {
  id: string
  amount: number
  method: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  utr?: string
  reference?: string
  remarks?: string
  processedAt?: string
  createdAt: string
  bankAccount?: {
    bankName: string
    accountNumber: string
  }
}

export interface Withdrawal {
  id: string
  amount: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  reference?: string
  remarks?: string
  charges: number
  processedAt?: string
  createdAt: string
  bankAccount: {
    bankName: string
    accountNumber: string
    ifscCode: string
  }
}

export interface UserProfile {
  id: string
  firstName?: string
  lastName?: string
  dateOfBirth?: string
  gender?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  panNumber?: string
  aadhaarNumber?: string
  occupation?: string
  annualIncome?: number
  riskProfile?: string
  investmentExperience?: string
  createdAt: string
}

export interface ConsoleData {
  user: {
    id: string
    name?: string
    email?: string
    phone?: string
    clientId?: string
    role: string
    isActive: boolean
    createdAt: string
    kycStatus: string
  }
  tradingAccount: {
    id: string
    balance: number
    availableMargin: number
    usedMargin: number
    clientId?: string
    createdAt: string
  }
  bankAccounts: BankAccount[]
  deposits: Deposit[]
  withdrawals: Withdrawal[]
  transactions: any[]
  positions: any[]
  orders: any[]
  userProfile?: UserProfile
  summary: {
    totalDeposits: number
    totalWithdrawals: number
    pendingDeposits: number
    pendingWithdrawals: number
    totalBankAccounts: number
  }
}

export class ConsoleDataService {
  /**
   * Get all console data for a user
   */
  static async getConsoleData(userId: string): Promise<ConsoleData | null> {
    try {
      const { data, error } = await supabaseServer.rpc('get_user_console_data', {
        user_id_param: userId
      })

      if (error) {
        console.error('Error fetching console data:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in getConsoleData:', error)
      return null
    }
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabaseServer.rpc('update_user_profile', {
        user_id_param: userId,
        profile_data: profileData
      })

      if (error) {
        console.error('Error updating user profile:', error)
        return { success: false, message: 'Failed to update profile' }
      }

      return data
    } catch (error) {
      console.error('Error in updateUserProfile:', error)
      return { success: false, message: 'Failed to update profile' }
    }
  }

  /**
   * Add bank account
   */
  static async addBankAccount(userId: string, bankData: Omit<BankAccount, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string; accountId?: string }> {
    try {
      const { data, error } = await supabaseServer.rpc('add_bank_account', {
        user_id_param: userId,
        bank_data: bankData
      })

      if (error) {
        console.error('Error adding bank account:', error)
        return { success: false, message: 'Failed to add bank account' }
      }

      return data
    } catch (error) {
      console.error('Error in addBankAccount:', error)
      return { success: false, message: 'Failed to add bank account' }
    }
  }

  /**
   * Update bank account
   */
  static async updateBankAccount(userId: string, accountId: string, bankData: Partial<BankAccount>): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabaseServer.rpc('update_bank_account', {
        user_id_param: userId,
        account_id_param: accountId,
        bank_data: bankData
      })

      if (error) {
        console.error('Error updating bank account:', error)
        return { success: false, message: 'Failed to update bank account' }
      }

      return data
    } catch (error) {
      console.error('Error in updateBankAccount:', error)
      return { success: false, message: 'Failed to update bank account' }
    }
  }

  /**
   * Delete bank account
   */
  static async deleteBankAccount(userId: string, accountId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { data, error } = await supabaseServer.rpc('delete_bank_account', {
        user_id_param: userId,
        account_id_param: accountId
      })

      if (error) {
        console.error('Error deleting bank account:', error)
        return { success: false, message: 'Failed to delete bank account' }
      }

      return data
    } catch (error) {
      console.error('Error in deleteBankAccount:', error)
      return { success: false, message: 'Failed to delete bank account' }
    }
  }

  /**
   * Create deposit request
   */
  static async createDepositRequest(userId: string, depositData: {
    amount: number
    method: string
    bankAccountId?: string
    utr?: string
    reference?: string
    remarks?: string
  }): Promise<{ success: boolean; message: string; depositId?: string }> {
    try {
      const { data, error } = await supabaseServer.rpc('create_deposit_request', {
        user_id_param: userId,
        deposit_data: depositData
      })

      if (error) {
        console.error('Error creating deposit request:', error)
        return { success: false, message: 'Failed to create deposit request' }
      }

      return data
    } catch (error) {
      console.error('Error in createDepositRequest:', error)
      return { success: false, message: 'Failed to create deposit request' }
    }
  }

  /**
   * Create withdrawal request
   */
  static async createWithdrawalRequest(userId: string, withdrawalData: {
    amount: number
    bankAccountId: string
    reference?: string
    remarks?: string
    charges?: number
  }): Promise<{ success: boolean; message: string; withdrawalId?: string }> {
    try {
      const { data, error } = await supabaseServer.rpc('create_withdrawal_request', {
        user_id_param: userId,
        withdrawal_data: withdrawalData
      })

      if (error) {
        console.error('Error creating withdrawal request:', error)
        return { success: false, message: 'Failed to create withdrawal request' }
      }

      return data
    } catch (error) {
      console.error('Error in createWithdrawalRequest:', error)
      return { success: false, message: 'Failed to create withdrawal request' }
    }
  }
}