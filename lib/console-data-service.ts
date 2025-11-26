/**
 * Console Data Service
 * Handles all console-related data operations using Prisma atomic transactions
 * This is a wrapper around the new ConsoleService for backward compatibility
 */

import { ConsoleService } from './services/console/ConsoleService'

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
  bankAccount?: {
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
    requireOtpOnLogin?: boolean
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
   * Now uses Prisma-based ConsoleService instead of RPC
   */
  static async getConsoleData(userId: string): Promise<ConsoleData | null> {
    console.log('🔄 [CONSOLE-DATA-SERVICE] Fetching console data via new Prisma service')
    try {
      const data = await ConsoleService.getConsoleData(userId)
      console.log('✅ [CONSOLE-DATA-SERVICE] Console data fetched successfully')
      return data
    } catch (error) {
      console.error('❌ [CONSOLE-DATA-SERVICE] Error in getConsoleData:', error)
      return null
    }
  }

  /**
   * Update user profile
   * Now uses Prisma-based ConsoleService instead of RPC
   */
  static async updateUserProfile(userId: string, profileData: Partial<UserProfile>): Promise<{ success: boolean; message: string }> {
    console.log('🔄 [CONSOLE-DATA-SERVICE] Updating user profile via new Prisma service')
    try {
      const result = await ConsoleService.updateUserProfile(userId, profileData)
      console.log('✅ [CONSOLE-DATA-SERVICE] User profile updated successfully')
      return result
    } catch (error) {
      console.error('❌ [CONSOLE-DATA-SERVICE] Error in updateUserProfile:', error)
      return { success: false, message: 'Failed to update profile' }
    }
  }

  /**
   * Add bank account
   * Now uses Prisma-based ConsoleService instead of RPC
   */
  static async addBankAccount(userId: string, bankData: Omit<BankAccount, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string; accountId?: string }> {
    console.log('🔄 [CONSOLE-DATA-SERVICE] Adding bank account via new Prisma service')
    try {
      const result = await ConsoleService.addBankAccount(userId, bankData)
      console.log('✅ [CONSOLE-DATA-SERVICE] Bank account added successfully')
      return result
    } catch (error) {
      console.error('❌ [CONSOLE-DATA-SERVICE] Error in addBankAccount:', error)
      return { success: false, message: 'Failed to add bank account' }
    }
  }

  /**
   * Update bank account
   * Now uses Prisma-based ConsoleService instead of RPC
   */
  static async updateBankAccount(userId: string, accountId: string, bankData: Partial<BankAccount>): Promise<{ success: boolean; message: string }> {
    console.log('🔄 [CONSOLE-DATA-SERVICE] Updating bank account via new Prisma service')
    try {
      const result = await ConsoleService.updateBankAccount(userId, accountId, bankData)
      console.log('✅ [CONSOLE-DATA-SERVICE] Bank account updated successfully')
      return result
    } catch (error) {
      console.error('❌ [CONSOLE-DATA-SERVICE] Error in updateBankAccount:', error)
      return { success: false, message: 'Failed to update bank account' }
    }
  }

  /**
   * Delete bank account
   * Now uses Prisma-based ConsoleService instead of RPC
   */
  static async deleteBankAccount(userId: string, accountId: string): Promise<{ success: boolean; message: string }> {
    console.log('🔄 [CONSOLE-DATA-SERVICE] Deleting bank account via new Prisma service')
    try {
      const result = await ConsoleService.deleteBankAccount(userId, accountId)
      console.log('✅ [CONSOLE-DATA-SERVICE] Bank account deleted successfully')
      return result
    } catch (error) {
      console.error('❌ [CONSOLE-DATA-SERVICE] Error in deleteBankAccount:', error)
      return { success: false, message: 'Failed to delete bank account' }
    }
  }

  /**
   * Create deposit request
   * Now uses Prisma-based ConsoleService instead of RPC
   */
  static async createDepositRequest(userId: string, depositData: {
    amount: number
    method: string
    bankAccountId?: string
    utr?: string
    reference?: string
    remarks?: string
    screenshotUrl?: string
    screenshotKey?: string
  }): Promise<{ success: boolean; message: string; depositId?: string }> {
    console.log('🔄 [CONSOLE-DATA-SERVICE] Creating deposit request via new Prisma service')
    try {
      const result = await ConsoleService.createDepositRequest(userId, depositData)
      console.log('✅ [CONSOLE-DATA-SERVICE] Deposit request created successfully')
      return result
    } catch (error) {
      console.error('❌ [CONSOLE-DATA-SERVICE] Error in createDepositRequest:', error)
      return { success: false, message: 'Failed to create deposit request' }
    }
  }

  /**
   * Create withdrawal request
   * Now uses Prisma-based ConsoleService instead of RPC
   */
  static async createWithdrawalRequest(userId: string, withdrawalData: {
    amount: number
    bankAccountId: string
    reference?: string
    remarks?: string
    charges?: number
  }): Promise<{ success: boolean; message: string; withdrawalId?: string }> {
    console.log('🔄 [CONSOLE-DATA-SERVICE] Creating withdrawal request via new Prisma service')
    try {
      const result = await ConsoleService.createWithdrawalRequest(userId, withdrawalData)
      console.log('✅ [CONSOLE-DATA-SERVICE] Withdrawal request created successfully')
      return result
    } catch (error) {
      console.error('❌ [CONSOLE-DATA-SERVICE] Error in createWithdrawalRequest:', error)
      return { success: false, message: 'Failed to create withdrawal request' }
    }
  }
}