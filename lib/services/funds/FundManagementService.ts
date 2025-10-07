/**
 * Fund Management Service
 * 
 * Core service for managing trading account funds:
 * - Margin blocking and releasing
 * - Debit and credit operations
 * - Balance management
 * - Transaction logging
 * 
 * All operations are atomic using Prisma transactions
 */

import { executeInTransaction } from "@/lib/services/utils/prisma-transaction"
import { TradingAccountRepository } from "@/lib/repositories/TradingAccountRepository"
import { TransactionRepository } from "@/lib/repositories/TransactionRepository"
import { TradingLogger } from "@/lib/services/logging/TradingLogger"
import { TransactionType } from "@prisma/client"

console.log("💰 [FUND-MGMT-SERVICE] Module loaded")

export interface FundOperationResult {
  success: boolean
  newBalance: number
  newAvailableMargin: number
  newUsedMargin: number
  transactionId: string
}

export class FundManagementService {
  private accountRepo: TradingAccountRepository
  private transactionRepo: TransactionRepository
  private logger: TradingLogger

  constructor(logger?: TradingLogger) {
    this.accountRepo = new TradingAccountRepository()
    this.transactionRepo = new TransactionRepository()
    this.logger = logger || new TradingLogger()
    
    console.log("🏗️ [FUND-MGMT-SERVICE] Service instance created")
  }

  /**
   * Block margin for an order
   * Reduces available margin and increases used margin
   */
  async blockMargin(
    tradingAccountId: string,
    amount: number,
    description: string = "Margin blocked for order"
  ): Promise<FundOperationResult> {
    console.log("🔒 [FUND-MGMT-SERVICE] Blocking margin:", {
      tradingAccountId,
      amount,
      description
    })

    await this.logger.logFunds("MARGIN_BLOCK_START", `Blocking ${amount} margin`, {
      tradingAccountId,
      amount
    })

    try {
      const result = await executeInTransaction(async (tx) => {
        // Check if account has sufficient margin
        const account = await this.accountRepo.findById(tradingAccountId, tx)
        
        if (!account) {
          console.error("❌ [FUND-MGMT-SERVICE] Account not found:", tradingAccountId)
          throw new Error("Trading account not found")
        }

        if (account.availableMargin < amount) {
          console.error("❌ [FUND-MGMT-SERVICE] Insufficient margin:", {
            required: amount,
            available: account.availableMargin
          })
          throw new Error(`Insufficient margin. Required: ₹${amount}, Available: ₹${account.availableMargin}`)
        }

        console.log("✅ [FUND-MGMT-SERVICE] Sufficient margin available")

        // Block margin
        const updatedAccount = await this.accountRepo.blockMargin(tradingAccountId, amount, tx)

        // Create transaction record
        const transaction = await this.transactionRepo.create(
          {
            tradingAccountId,
            amount,
            type: TransactionType.DEBIT,
            description
          },
          tx
        )

        console.log("✅ [FUND-MGMT-SERVICE] Margin blocked successfully")

        return {
          success: true,
          newBalance: updatedAccount.balance,
          newAvailableMargin: updatedAccount.availableMargin,
          newUsedMargin: updatedAccount.usedMargin,
          transactionId: transaction.id
        }
      })

      await this.logger.logFunds("MARGIN_BLOCKED", `Blocked ${amount} margin successfully`, {
        tradingAccountId,
        amount,
        result
      })

      console.log("🎉 [FUND-MGMT-SERVICE] Margin block operation completed:", result)
      return result

    } catch (error: any) {
      console.error("❌ [FUND-MGMT-SERVICE] Margin block failed:", error)
      await this.logger.error("MARGIN_BLOCK_FAILED", error.message, error, {
        tradingAccountId,
        amount
      })
      throw error
    }
  }

  /**
   * Release margin after order completion or cancellation
   * Increases available margin and decreases used margin
   */
  async releaseMargin(
    tradingAccountId: string,
    amount: number,
    description: string = "Margin released"
  ): Promise<FundOperationResult> {
    console.log("🔓 [FUND-MGMT-SERVICE] Releasing margin:", {
      tradingAccountId,
      amount,
      description
    })

    await this.logger.logFunds("MARGIN_RELEASE_START", `Releasing ${amount} margin`, {
      tradingAccountId,
      amount
    })

    try {
      const result = await executeInTransaction(async (tx) => {
        // Release margin
        const updatedAccount = await this.accountRepo.releaseMargin(tradingAccountId, amount, tx)

        // Create transaction record
        const transaction = await this.transactionRepo.create(
          {
            tradingAccountId,
            amount,
            type: TransactionType.CREDIT,
            description
          },
          tx
        )

        console.log("✅ [FUND-MGMT-SERVICE] Margin released successfully")

        return {
          success: true,
          newBalance: updatedAccount.balance,
          newAvailableMargin: updatedAccount.availableMargin,
          newUsedMargin: updatedAccount.usedMargin,
          transactionId: transaction.id
        }
      })

      await this.logger.logFunds("MARGIN_RELEASED", `Released ${amount} margin successfully`, {
        tradingAccountId,
        amount,
        result
      })

      console.log("🎉 [FUND-MGMT-SERVICE] Margin release operation completed:", result)
      return result

    } catch (error: any) {
      console.error("❌ [FUND-MGMT-SERVICE] Margin release failed:", error)
      await this.logger.error("MARGIN_RELEASE_FAILED", error.message, error, {
        tradingAccountId,
        amount
      })
      throw error
    }
  }

  /**
   * Debit amount from account (for charges, fees, etc.)
   * Reduces both balance and available margin
   */
  async debit(
    tradingAccountId: string,
    amount: number,
    description: string = "Debit"
  ): Promise<FundOperationResult> {
    console.log("💸 [FUND-MGMT-SERVICE] Debiting account:", {
      tradingAccountId,
      amount,
      description
    })

    await this.logger.logFunds("DEBIT_START", `Debiting ${amount}`, {
      tradingAccountId,
      amount
    })

    try {
      const result = await executeInTransaction(async (tx) => {
        // Check if account has sufficient balance
        const account = await this.accountRepo.findById(tradingAccountId, tx)
        
        if (!account) {
          console.error("❌ [FUND-MGMT-SERVICE] Account not found:", tradingAccountId)
          throw new Error("Trading account not found")
        }

        if (account.availableMargin < amount) {
          console.error("❌ [FUND-MGMT-SERVICE] Insufficient funds:", {
            required: amount,
            available: account.availableMargin
          })
          throw new Error(`Insufficient funds. Required: ₹${amount}, Available: ₹${account.availableMargin}`)
        }

        console.log("✅ [FUND-MGMT-SERVICE] Sufficient funds available")

        // Debit account
        const updatedAccount = await this.accountRepo.debit(tradingAccountId, amount, tx)

        // Create transaction record
        const transaction = await this.transactionRepo.create(
          {
            tradingAccountId,
            amount,
            type: TransactionType.DEBIT,
            description
          },
          tx
        )

        console.log("✅ [FUND-MGMT-SERVICE] Debit completed successfully")

        return {
          success: true,
          newBalance: updatedAccount.balance,
          newAvailableMargin: updatedAccount.availableMargin,
          newUsedMargin: updatedAccount.usedMargin,
          transactionId: transaction.id
        }
      })

      await this.logger.logFunds("DEBIT_COMPLETED", `Debited ${amount} successfully`, {
        tradingAccountId,
        amount,
        result
      })

      console.log("🎉 [FUND-MGMT-SERVICE] Debit operation completed:", result)
      return result

    } catch (error: any) {
      console.error("❌ [FUND-MGMT-SERVICE] Debit failed:", error)
      await this.logger.error("DEBIT_FAILED", error.message, error, {
        tradingAccountId,
        amount
      })
      throw error
    }
  }

  /**
   * Credit amount to account (for deposits, P&L, etc.)
   * Increases both balance and available margin
   */
  async credit(
    tradingAccountId: string,
    amount: number,
    description: string = "Credit"
  ): Promise<FundOperationResult> {
    console.log("💰 [FUND-MGMT-SERVICE] Crediting account:", {
      tradingAccountId,
      amount,
      description
    })

    await this.logger.logFunds("CREDIT_START", `Crediting ${amount}`, {
      tradingAccountId,
      amount
    })

    try {
      const result = await executeInTransaction(async (tx) => {
        // Credit account
        const updatedAccount = await this.accountRepo.credit(tradingAccountId, amount, tx)

        // Create transaction record
        const transaction = await this.transactionRepo.create(
          {
            tradingAccountId,
            amount,
            type: TransactionType.CREDIT,
            description
          },
          tx
        )

        console.log("✅ [FUND-MGMT-SERVICE] Credit completed successfully")

        return {
          success: true,
          newBalance: updatedAccount.balance,
          newAvailableMargin: updatedAccount.availableMargin,
          newUsedMargin: updatedAccount.usedMargin,
          transactionId: transaction.id
        }
      })

      await this.logger.logFunds("CREDIT_COMPLETED", `Credited ${amount} successfully`, {
        tradingAccountId,
        amount,
        result
      })

      console.log("🎉 [FUND-MGMT-SERVICE] Credit operation completed:", result)
      return result

    } catch (error: any) {
      console.error("❌ [FUND-MGMT-SERVICE] Credit failed:", error)
      await this.logger.error("CREDIT_FAILED", error.message, error, {
        tradingAccountId,
        amount
      })
      throw error
    }
  }

  /**
   * Get account balance and margin information
   */
  async getAccountFunds(tradingAccountId: string) {
    console.log("📊 [FUND-MGMT-SERVICE] Getting account funds:", tradingAccountId)

    const account = await this.accountRepo.findById(tradingAccountId)
    
    if (!account) {
      console.error("❌ [FUND-MGMT-SERVICE] Account not found:", tradingAccountId)
      throw new Error("Trading account not found")
    }

    const funds = {
      balance: account.balance,
      availableMargin: account.availableMargin,
      usedMargin: account.usedMargin,
      totalMargin: account.balance
    }

    console.log("✅ [FUND-MGMT-SERVICE] Account funds retrieved:", funds)
    return funds
  }
}

/**
 * Create fund management service instance
 */
export function createFundManagementService(logger?: TradingLogger): FundManagementService {
  console.log("🏭 [FUND-MGMT-SERVICE] Creating service instance")
  return new FundManagementService(logger)
}

console.log("✅ [FUND-MGMT-SERVICE] Module initialized")