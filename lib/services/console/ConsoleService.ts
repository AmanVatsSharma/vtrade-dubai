/**
 * Console Service - Prisma-Based Implementation
 * 
 * This service handles all console-related data operations using Prisma with atomic transactions.
 * It replaces the old RPC-based approach with direct Prisma queries for better performance,
 * type safety, and transaction support.
 * 
 * Features:
 * - Atomic transactions for data consistency
 * - Comprehensive error handling
 * - Detailed logging for debugging
 * - Type-safe operations
 * 
 * @module ConsoleService
 */

import { prisma } from '@/lib/prisma'
import { executeInTransaction } from '@/lib/services/utils/prisma-transaction'
import { Prisma, DepositStatus, WithdrawalStatus } from '@prisma/client'

console.log('🚀 [CONSOLE-SERVICE] Module initializing...')

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BankAccountData {
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

export interface DepositData {
  id: string
  amount: number
  method: string
  status: DepositStatus
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

export interface WithdrawalData {
  id: string
  amount: number
  status: WithdrawalStatus
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

export interface UserProfileData {
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
  bankAccounts: BankAccountData[]
  deposits: DepositData[]
  withdrawals: WithdrawalData[]
  transactions: any[]
  positions: any[]
  orders: any[]
  userProfile?: UserProfileData
  summary: {
    totalDeposits: number
    totalWithdrawals: number
    pendingDeposits: number
    pendingWithdrawals: number
    totalBankAccounts: number
  }
}

// ============================================================================
// CONSOLE SERVICE CLASS
// ============================================================================

export class ConsoleService {
  /**
   * Get all console data for a user
   * This is the main method that aggregates all user data for the console dashboard
   * 
   * @param userId - The user ID to fetch data for
   * @returns Complete console data or null if error
   */
  static async getConsoleData(userId: string): Promise<ConsoleData | null> {
    console.log('📊 [CONSOLE-SERVICE] Fetching console data for user:', userId)
    
    try {
      // Fetch all data in parallel for performance
      const [user, tradingAccount, bankAccounts, deposits, withdrawals, transactions, positions, orders, userProfile] = 
        await Promise.all([
          // Fetch user with KYC
          prisma.user.findUnique({
            where: { id: userId },
            include: {
              kyc: true
            }
          }),
          
          // Fetch trading account
          prisma.tradingAccount.findUnique({
            where: { userId }
          }),
          
          // Fetch bank accounts
          prisma.bankAccount.findMany({
            where: { userId, isActive: true },
            orderBy: [
              { isDefault: 'desc' },
              { createdAt: 'desc' }
            ]
          }),
          
          // Fetch deposits
          prisma.deposit.findMany({
            where: { userId },
            include: {
              bankAccount: {
                select: {
                  bankName: true,
                  accountNumber: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to last 50 deposits
          }),
          
          // Fetch withdrawals
          prisma.withdrawal.findMany({
            where: { userId },
            include: {
              bankAccount: {
                select: {
                  bankName: true,
                  accountNumber: true,
                  ifscCode: true
                }
              }
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to last 50 withdrawals
          }),
          
          // Fetch transactions
          tradingAccount ? prisma.transaction.findMany({
            where: { tradingAccountId: tradingAccount.id },
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit to last 100 transactions
          }) : Promise.resolve([]),
          
          // Fetch positions
          tradingAccount ? prisma.position.findMany({
            where: { 
              tradingAccountId: tradingAccount.id,
              quantity: { not: 0 }
            },
            include: {
              Stock: true
            },
            orderBy: { createdAt: 'desc' }
          }) : Promise.resolve([]),
          
          // Fetch orders
          tradingAccount ? prisma.order.findMany({
            where: { tradingAccountId: tradingAccount.id },
            include: {
              Stock: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // Limit to last 50 orders
          }) : Promise.resolve([]),
          
          // Fetch user profile
          prisma.userProfile.findUnique({
            where: { userId }
          })
        ])

      console.log('✅ [CONSOLE-SERVICE] Data fetched successfully', {
        userFound: !!user,
        tradingAccountFound: !!tradingAccount,
        bankAccountsCount: bankAccounts.length,
        depositsCount: deposits.length,
        withdrawalsCount: withdrawals.length,
        transactionsCount: transactions.length,
        positionsCount: positions.length,
        ordersCount: orders.length,
        profileFound: !!userProfile
      })

      if (!user) {
        console.error('❌ [CONSOLE-SERVICE] User not found:', userId)
        return null
      }

      // Calculate summary statistics
      const totalDeposits = deposits
        .filter(d => d.status === DepositStatus.COMPLETED)
        .reduce((sum, d) => sum + Number(d.amount), 0)
      
      const totalWithdrawals = withdrawals
        .filter(w => w.status === WithdrawalStatus.COMPLETED)
        .reduce((sum, w) => sum + Number(w.amount), 0)
      
      const pendingDeposits = deposits.filter(
        d => d.status === DepositStatus.PENDING || d.status === DepositStatus.PROCESSING
      ).length
      
      const pendingWithdrawals = withdrawals.filter(
        w => w.status === WithdrawalStatus.PENDING || w.status === WithdrawalStatus.PROCESSING
      ).length

      console.log('📈 [CONSOLE-SERVICE] Summary calculated:', {
        totalDeposits,
        totalWithdrawals,
        pendingDeposits,
        pendingWithdrawals
      })

      // Format and return the complete console data
      const consoleData: ConsoleData = {
        user: {
          id: user.id,
          name: user.name || undefined,
          email: user.email || undefined,
          phone: user.phone || undefined,
          clientId: user.clientId || undefined,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt.toISOString(),
          kycStatus: user.kyc?.status || 'PENDING'
        },
        tradingAccount: tradingAccount ? {
          id: tradingAccount.id,
          balance: Number(tradingAccount.balance),
          availableMargin: Number(tradingAccount.availableMargin),
          usedMargin: Number(tradingAccount.usedMargin),
          clientId: tradingAccount.clientId || undefined,
          createdAt: tradingAccount.createdAt.toISOString()
        } : {
          id: '',
          balance: 0,
          availableMargin: 0,
          usedMargin: 0,
          createdAt: new Date().toISOString()
        },
        bankAccounts: bankAccounts.map(ba => ({
          id: ba.id,
          bankName: ba.bankName,
          accountNumber: ba.accountNumber,
          ifscCode: ba.ifscCode,
          accountHolderName: ba.accountHolderName,
          accountType: ba.accountType as 'savings' | 'current',
          isDefault: ba.isDefault,
          isActive: ba.isActive,
          createdAt: ba.createdAt.toISOString()
        })),
        deposits: deposits.map(d => ({
          id: d.id,
          amount: Number(d.amount),
          method: d.method,
          status: d.status,
          utr: d.utr || undefined,
          reference: d.reference || undefined,
          remarks: d.remarks || undefined,
          processedAt: d.processedAt?.toISOString(),
          createdAt: d.createdAt.toISOString(),
          bankAccount: d.bankAccount || undefined
        })),
        withdrawals: withdrawals.map(w => ({
          id: w.id,
          amount: Number(w.amount),
          status: w.status,
          reference: w.reference || undefined,
          remarks: w.remarks || undefined,
          charges: Number(w.charges),
          processedAt: w.processedAt?.toISOString(),
          createdAt: w.createdAt.toISOString(),
          bankAccount: {
            bankName: w.bankAccount.bankName,
            accountNumber: w.bankAccount.accountNumber,
            ifscCode: w.bankAccount.ifscCode
          }
        })),
        transactions: transactions.map(t => ({
          id: t.id,
          amount: Number(t.amount),
          type: t.type,
          description: t.description,
          createdAt: t.createdAt.toISOString()
        })),
        positions: positions.map(p => ({
          id: p.id,
          symbol: p.symbol,
          quantity: p.quantity,
          averagePrice: Number(p.averagePrice),
          unrealizedPnL: Number(p.unrealizedPnL),
          dayPnL: Number(p.dayPnL),
          stopLoss: p.stopLoss ? Number(p.stopLoss) : undefined,
          target: p.target ? Number(p.target) : undefined,
          createdAt: p.createdAt.toISOString(),
          stock: p.Stock
        })),
        orders: orders.map(o => ({
          id: o.id,
          symbol: o.symbol,
          quantity: o.quantity,
          orderType: o.orderType,
          orderSide: o.orderSide,
          price: o.price ? Number(o.price) : undefined,
          filledQuantity: o.filledQuantity,
          averagePrice: o.averagePrice ? Number(o.averagePrice) : undefined,
          productType: o.productType,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
          executedAt: o.executedAt?.toISOString(),
          stock: o.Stock
        })),
        userProfile: userProfile ? {
          id: userProfile.id,
          firstName: userProfile.firstName || undefined,
          lastName: userProfile.lastName || undefined,
          dateOfBirth: userProfile.dateOfBirth?.toISOString(),
          gender: userProfile.gender || undefined,
          address: userProfile.address || undefined,
          city: userProfile.city || undefined,
          state: userProfile.state || undefined,
          pincode: userProfile.pincode || undefined,
          panNumber: userProfile.panNumber || undefined,
          aadhaarNumber: userProfile.aadhaarNumber || undefined,
          occupation: userProfile.occupation || undefined,
          annualIncome: userProfile.annualIncome ? Number(userProfile.annualIncome) : undefined,
          riskProfile: userProfile.riskProfile || undefined,
          investmentExperience: userProfile.investmentExperience || undefined,
          createdAt: userProfile.createdAt.toISOString()
        } : undefined,
        summary: {
          totalDeposits,
          totalWithdrawals,
          pendingDeposits,
          pendingWithdrawals,
          totalBankAccounts: bankAccounts.length
        }
      }

      console.log('✅ [CONSOLE-SERVICE] Console data prepared successfully')
      return consoleData

    } catch (error) {
      console.error('❌ [CONSOLE-SERVICE] Error fetching console data:', error)
      console.error('🔍 [CONSOLE-SERVICE] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
      return null
    }
  }

  /**
   * Update user profile
   * Uses atomic transaction to ensure data consistency
   * 
   * @param userId - The user ID
   * @param profileData - Profile data to update
   * @returns Success response with message
   */
  static async updateUserProfile(
    userId: string,
    profileData: Partial<UserProfileData>
  ): Promise<{ success: boolean; message: string }> {
    console.log('📝 [CONSOLE-SERVICE] Updating user profile:', { userId, fields: Object.keys(profileData) })

    try {
      await executeInTransaction(async (tx) => {
        console.log('🔄 [CONSOLE-SERVICE] Starting profile update transaction')

        // Check if profile exists
        const existingProfile = await tx.userProfile.findUnique({
          where: { userId }
        })

        if (existingProfile) {
          console.log('🔄 [CONSOLE-SERVICE] Updating existing profile')
          await tx.userProfile.update({
            where: { userId },
            data: {
              ...profileData,
              updatedAt: new Date()
            }
          })
        } else {
          console.log('🔄 [CONSOLE-SERVICE] Creating new profile')
          await tx.userProfile.create({
            data: {
              userId,
              ...profileData
            }
          })
        }

        console.log('✅ [CONSOLE-SERVICE] Profile update transaction completed')
      })

      console.log('✅ [CONSOLE-SERVICE] User profile updated successfully')
      return { success: true, message: 'Profile updated successfully' }

    } catch (error) {
      console.error('❌ [CONSOLE-SERVICE] Error updating user profile:', error)
      console.error('🔍 [CONSOLE-SERVICE] Error details:', {
        userId,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
      return { success: false, message: 'Failed to update profile' }
    }
  }

  /**
   * Add bank account
   * Uses atomic transaction with validation
   * 
   * @param userId - The user ID
   * @param bankData - Bank account data
   * @returns Success response with account ID
   */
  static async addBankAccount(
    userId: string,
    bankData: Omit<BankAccountData, 'id' | 'createdAt'>
  ): Promise<{ success: boolean; message: string; accountId?: string }> {
    console.log('🏦 [CONSOLE-SERVICE] Adding bank account:', { userId, bankName: bankData.bankName })

    try {
      let accountId: string | undefined

      await executeInTransaction(async (tx) => {
        console.log('🔄 [CONSOLE-SERVICE] Starting add bank account transaction')

        // If this is the default account, unset other defaults
        if (bankData.isDefault) {
          console.log('🔄 [CONSOLE-SERVICE] Unsetting other default accounts')
          await tx.bankAccount.updateMany({
            where: { userId, isDefault: true },
            data: { isDefault: false }
          })
        }

        // Create the new bank account
        console.log('🔄 [CONSOLE-SERVICE] Creating new bank account')
        const account = await tx.bankAccount.create({
          data: {
            userId,
            ...bankData
          }
        })

        accountId = account.id
        console.log('✅ [CONSOLE-SERVICE] Bank account created:', accountId)
      })

      console.log('✅ [CONSOLE-SERVICE] Bank account added successfully')
      return { success: true, message: 'Bank account added successfully', accountId }

    } catch (error) {
      console.error('❌ [CONSOLE-SERVICE] Error adding bank account:', error)
      console.error('🔍 [CONSOLE-SERVICE] Error details:', {
        userId,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
      return { success: false, message: 'Failed to add bank account' }
    }
  }

  /**
   * Update bank account
   * Uses atomic transaction to maintain data consistency
   * 
   * @param userId - The user ID
   * @param accountId - The bank account ID to update
   * @param bankData - Updated bank account data
   * @returns Success response
   */
  static async updateBankAccount(
    userId: string,
    accountId: string,
    bankData: Partial<BankAccountData>
  ): Promise<{ success: boolean; message: string }> {
    console.log('🏦 [CONSOLE-SERVICE] Updating bank account:', { userId, accountId, fields: Object.keys(bankData) })

    try {
      await executeInTransaction(async (tx) => {
        console.log('🔄 [CONSOLE-SERVICE] Starting update bank account transaction')

        // Verify the account belongs to the user
        const account = await tx.bankAccount.findFirst({
          where: { id: accountId, userId }
        })

        if (!account) {
          throw new Error('Bank account not found or does not belong to user')
        }

        // If setting as default, unset other defaults
        if (bankData.isDefault) {
          console.log('🔄 [CONSOLE-SERVICE] Unsetting other default accounts')
          await tx.bankAccount.updateMany({
            where: { userId, isDefault: true, id: { not: accountId } },
            data: { isDefault: false }
          })
        }

        // Update the bank account
        console.log('🔄 [CONSOLE-SERVICE] Updating bank account')
        await tx.bankAccount.update({
          where: { id: accountId },
          data: {
            ...bankData,
            updatedAt: new Date()
          }
        })

        console.log('✅ [CONSOLE-SERVICE] Bank account update transaction completed')
      })

      console.log('✅ [CONSOLE-SERVICE] Bank account updated successfully')
      return { success: true, message: 'Bank account updated successfully' }

    } catch (error) {
      console.error('❌ [CONSOLE-SERVICE] Error updating bank account:', error)
      console.error('🔍 [CONSOLE-SERVICE] Error details:', {
        userId,
        accountId,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
      return { success: false, message: error instanceof Error ? error.message : 'Failed to update bank account' }
    }
  }

  /**
   * Delete (deactivate) bank account
   * Soft delete by setting isActive to false
   * 
   * @param userId - The user ID
   * @param accountId - The bank account ID to delete
   * @returns Success response
   */
  static async deleteBankAccount(
    userId: string,
    accountId: string
  ): Promise<{ success: boolean; message: string }> {
    console.log('🗑️ [CONSOLE-SERVICE] Deleting bank account:', { userId, accountId })

    try {
      await executeInTransaction(async (tx) => {
        console.log('🔄 [CONSOLE-SERVICE] Starting delete bank account transaction')

        // Verify the account belongs to the user
        const account = await tx.bankAccount.findFirst({
          where: { id: accountId, userId }
        })

        if (!account) {
          throw new Error('Bank account not found or does not belong to user')
        }

        // Check if there are any pending withdrawals using this account
        const pendingWithdrawals = await tx.withdrawal.count({
          where: {
            bankAccountId: accountId,
            status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] }
          }
        })

        if (pendingWithdrawals > 0) {
          throw new Error('Cannot delete bank account with pending withdrawals')
        }

        // Soft delete by setting isActive to false
        console.log('🔄 [CONSOLE-SERVICE] Deactivating bank account')
        await tx.bankAccount.update({
          where: { id: accountId },
          data: { 
            isActive: false,
            isDefault: false,
            updatedAt: new Date()
          }
        })

        console.log('✅ [CONSOLE-SERVICE] Bank account delete transaction completed')
      })

      console.log('✅ [CONSOLE-SERVICE] Bank account deleted successfully')
      return { success: true, message: 'Bank account deleted successfully' }

    } catch (error) {
      console.error('❌ [CONSOLE-SERVICE] Error deleting bank account:', error)
      console.error('🔍 [CONSOLE-SERVICE] Error details:', {
        userId,
        accountId,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
      return { success: false, message: error instanceof Error ? error.message : 'Failed to delete bank account' }
    }
  }

  /**
   * Create deposit request
   * Uses atomic transaction to create deposit and log transaction
   * 
   * @param userId - The user ID
   * @param depositData - Deposit request data
   * @returns Success response with deposit ID
   */
  static async createDepositRequest(
    userId: string,
    depositData: {
      amount: number
      method: string
      bankAccountId?: string
      utr?: string
      reference?: string
      remarks?: string
    }
  ): Promise<{ success: boolean; message: string; depositId?: string }> {
    console.log('💰 [CONSOLE-SERVICE] Creating deposit request:', { userId, amount: depositData.amount, method: depositData.method })

    try {
      let depositId: string | undefined

      await executeInTransaction(async (tx) => {
        console.log('🔄 [CONSOLE-SERVICE] Starting create deposit transaction')

        // Get trading account
        const tradingAccount = await tx.tradingAccount.findUnique({
          where: { userId }
        })

        if (!tradingAccount) {
          throw new Error('Trading account not found')
        }

        // Create deposit record
        console.log('🔄 [CONSOLE-SERVICE] Creating deposit record')
        const deposit = await tx.deposit.create({
          data: {
            userId,
            tradingAccountId: tradingAccount.id,
            bankAccountId: depositData.bankAccountId,
            amount: depositData.amount,
            method: depositData.method.toLowerCase(),
            status: DepositStatus.PENDING,
            utr: depositData.utr,
            reference: depositData.reference,
            remarks: depositData.remarks
          }
        })

        depositId = deposit.id
        console.log('✅ [CONSOLE-SERVICE] Deposit record created:', depositId)
      })

      console.log('✅ [CONSOLE-SERVICE] Deposit request created successfully')
      return { success: true, message: 'Deposit request created successfully', depositId }

    } catch (error) {
      console.error('❌ [CONSOLE-SERVICE] Error creating deposit request:', error)
      console.error('🔍 [CONSOLE-SERVICE] Error details:', {
        userId,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
      return { success: false, message: error instanceof Error ? error.message : 'Failed to create deposit request' }
    }
  }

  /**
   * Create withdrawal request
   * Uses atomic transaction with balance validation
   * 
   * @param userId - The user ID
   * @param withdrawalData - Withdrawal request data
   * @returns Success response with withdrawal ID
   */
  static async createWithdrawalRequest(
    userId: string,
    withdrawalData: {
      amount: number
      bankAccountId: string
      reference?: string
      remarks?: string
      charges?: number
    }
  ): Promise<{ success: boolean; message: string; withdrawalId?: string }> {
    console.log('💸 [CONSOLE-SERVICE] Creating withdrawal request:', { userId, amount: withdrawalData.amount })

    try {
      let withdrawalId: string | undefined

      await executeInTransaction(async (tx) => {
        console.log('🔄 [CONSOLE-SERVICE] Starting create withdrawal transaction')

        // Get trading account
        const tradingAccount = await tx.tradingAccount.findUnique({
          where: { userId }
        })

        if (!tradingAccount) {
          throw new Error('Trading account not found')
        }

        // Validate available balance
        const totalAmount = withdrawalData.amount + (withdrawalData.charges || 0)
        if (tradingAccount.availableMargin < totalAmount) {
          throw new Error('Insufficient available balance for withdrawal')
        }

        // Verify bank account belongs to user
        const bankAccount = await tx.bankAccount.findFirst({
          where: { 
            id: withdrawalData.bankAccountId,
            userId,
            isActive: true
          }
        })

        if (!bankAccount) {
          throw new Error('Bank account not found or inactive')
        }

        // Create withdrawal record
        console.log('🔄 [CONSOLE-SERVICE] Creating withdrawal record')
        const withdrawal = await tx.withdrawal.create({
          data: {
            userId,
            tradingAccountId: tradingAccount.id,
            bankAccountId: withdrawalData.bankAccountId,
            amount: withdrawalData.amount,
            charges: withdrawalData.charges || 0,
            status: WithdrawalStatus.PENDING,
            reference: withdrawalData.reference,
            remarks: withdrawalData.remarks
          }
        })

        withdrawalId = withdrawal.id
        console.log('✅ [CONSOLE-SERVICE] Withdrawal record created:', withdrawalId)
      })

      console.log('✅ [CONSOLE-SERVICE] Withdrawal request created successfully')
      return { success: true, message: 'Withdrawal request created successfully', withdrawalId }

    } catch (error) {
      console.error('❌ [CONSOLE-SERVICE] Error creating withdrawal request:', error)
      console.error('🔍 [CONSOLE-SERVICE] Error details:', {
        userId,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
      return { success: false, message: error instanceof Error ? error.message : 'Failed to create withdrawal request' }
    }
  }
}

console.log('✅ [CONSOLE-SERVICE] Module initialized successfully')