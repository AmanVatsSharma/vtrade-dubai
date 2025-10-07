/**
 * Admin Fund Service
 * 
 * Handles all admin operations for fund management:
 * - Add funds to user manually
 * - Withdraw funds from user manually
 * - Approve/reject deposit requests
 * - Approve/reject withdrawal requests
 * - View all pending requests
 */

import { executeInTransaction } from "@/lib/services/utils/prisma-transaction"
import { prisma } from "@/lib/prisma"
import { TradingLogger } from "@/lib/services/logging/TradingLogger"
import { DepositStatus, WithdrawalStatus } from "@prisma/client"

console.log("💰 [ADMIN-FUND-SERVICE] Module loaded")

export interface AddFundsInput {
  userId: string
  amount: number
  description: string
  adminId: string
  adminName: string
}

export interface ApproveDepositInput {
  depositId: string
  adminId: string
  adminName: string
}

export interface RejectDepositInput {
  depositId: string
  reason: string
  adminId: string
  adminName: string
}

export interface ApproveWithdrawalInput {
  withdrawalId: string
  transactionId: string
  adminId: string
  adminName: string
}

export interface RejectWithdrawalInput {
  withdrawalId: string
  reason: string
  adminId: string
  adminName: string
}

export class AdminFundService {
  private logger: TradingLogger

  constructor(logger?: TradingLogger) {
    this.logger = logger || new TradingLogger({ clientId: 'ADMIN' })
    console.log("🏗️ [ADMIN-FUND-SERVICE] Service instance created")
  }

  /**
   * Add funds to user manually (admin operation)
   */
  async addFundsToUser(input: AddFundsInput) {
    console.log("💰 [ADMIN-FUND-SERVICE] Admin adding funds to user:", {
      userId: input.userId,
      amount: input.amount,
      adminId: input.adminId
    })

    await this.logger.logFunds(
      "ADMIN_ADD_FUNDS_START",
      `Admin ${input.adminName} adding ₹${input.amount} to user ${input.userId}`,
      { ...input }
    )

    try {
      const result = await executeInTransaction(async (tx) => {
        // Get user's trading account
        const user = await tx.user.findUnique({
          where: { id: input.userId },
          include: { tradingAccount: true }
        })

        if (!user) {
          throw new Error("User not found")
        }

        if (!user.tradingAccount) {
          throw new Error("User has no trading account")
        }

        const tradingAccountId = user.tradingAccount.id

        // Update trading account balance
        const updatedAccount = await tx.tradingAccount.update({
          where: { id: tradingAccountId },
          data: {
            balance: { increment: input.amount },
            availableMargin: { increment: input.amount }
          }
        })

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            tradingAccountId,
            amount: input.amount,
            type: 'CREDIT',
            description: `Admin Credit: ${input.description} (by ${input.adminName})`
          }
        })

        // Create deposit record for tracking
        const deposit = await tx.deposit.create({
          data: {
            userId: input.userId,
            tradingAccountId,
            amount: input.amount,
            method: 'admin_credit',
            status: DepositStatus.COMPLETED,
            remarks: input.description,
            processedAt: new Date()
          }
        })

        console.log("✅ [ADMIN-FUND-SERVICE] Funds added successfully")

        return {
          success: true,
          newBalance: updatedAccount.balance,
          newAvailableMargin: updatedAccount.availableMargin,
          transactionId: transaction.id,
          depositId: deposit.id
        }
      })

      await this.logger.logFunds(
        "ADMIN_ADD_FUNDS_COMPLETED",
        `Admin successfully added ₹${input.amount} to user ${input.userId}`,
        { ...input, result }
      )

      console.log("🎉 [ADMIN-FUND-SERVICE] Add funds operation completed:", result)
      return result

    } catch (error: any) {
      console.error("❌ [ADMIN-FUND-SERVICE] Add funds failed:", error)
      await this.logger.error("ADMIN_ADD_FUNDS_FAILED", error.message, error, { ...input })
      throw error
    }
  }

  /**
   * Withdraw funds from user manually (admin operation)
   */
  async withdrawFundsFromUser(input: AddFundsInput) {
    console.log("💸 [ADMIN-FUND-SERVICE] Admin withdrawing funds from user:", {
      userId: input.userId,
      amount: input.amount,
      adminId: input.adminId
    })

    await this.logger.logFunds(
      "ADMIN_WITHDRAW_FUNDS_START",
      `Admin ${input.adminName} withdrawing ₹${input.amount} from user ${input.userId}`,
      { ...input }
    )

    try {
      const result = await executeInTransaction(async (tx) => {
        // Get user's trading account
        const user = await tx.user.findUnique({
          where: { id: input.userId },
          include: { tradingAccount: true }
        })

        if (!user) {
          throw new Error("User not found")
        }

        if (!user.tradingAccount) {
          throw new Error("User has no trading account")
        }

        const tradingAccountId = user.tradingAccount.id

        // Check if user has sufficient balance
        if (user.tradingAccount.availableMargin < input.amount) {
          throw new Error(`Insufficient funds. Available: ₹${user.tradingAccount.availableMargin}, Required: ₹${input.amount}`)
        }

        // Update trading account balance
        const updatedAccount = await tx.tradingAccount.update({
          where: { id: tradingAccountId },
          data: {
            balance: { decrement: input.amount },
            availableMargin: { decrement: input.amount }
          }
        })

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            tradingAccountId,
            amount: input.amount,
            type: 'DEBIT',
            description: `Admin Debit: ${input.description} (by ${input.adminName})`
          }
        })

        // Create withdrawal record for tracking
        const withdrawal = await tx.withdrawal.create({
          data: {
            userId: input.userId,
            tradingAccountId,
            amount: input.amount,
            status: WithdrawalStatus.COMPLETED,
            remarks: input.description,
            processedAt: new Date(),
            bankAccountId: user.tradingAccount.id // Dummy, admin withdrawal
          }
        })

        console.log("✅ [ADMIN-FUND-SERVICE] Funds withdrawn successfully")

        return {
          success: true,
          newBalance: updatedAccount.balance,
          newAvailableMargin: updatedAccount.availableMargin,
          transactionId: transaction.id,
          withdrawalId: withdrawal.id
        }
      })

      await this.logger.logFunds(
        "ADMIN_WITHDRAW_FUNDS_COMPLETED",
        `Admin successfully withdrew ₹${input.amount} from user ${input.userId}`,
        { ...input, result }
      )

      console.log("🎉 [ADMIN-FUND-SERVICE] Withdraw funds operation completed:", result)
      return result

    } catch (error: any) {
      console.error("❌ [ADMIN-FUND-SERVICE] Withdraw funds failed:", error)
      await this.logger.error("ADMIN_WITHDRAW_FUNDS_FAILED", error.message, error, { ...input })
      throw error
    }
  }

  /**
   * Get all pending deposit requests
   */
  async getPendingDeposits() {
    console.log("📋 [ADMIN-FUND-SERVICE] Fetching pending deposits")

    const deposits = await prisma.deposit.findMany({
      where: {
        status: { in: [DepositStatus.PENDING, DepositStatus.PROCESSING] }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            clientId: true
          }
        },
        tradingAccount: {
          select: {
            id: true,
            balance: true,
            availableMargin: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`✅ [ADMIN-FUND-SERVICE] Found ${deposits.length} pending deposits`)
    return deposits
  }

  /**
   * Get all pending withdrawal requests
   */
  async getPendingWithdrawals() {
    console.log("📋 [ADMIN-FUND-SERVICE] Fetching pending withdrawals")

    const withdrawals = await prisma.withdrawal.findMany({
      where: {
        status: { in: [WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING] }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            clientId: true
          }
        },
        tradingAccount: {
          select: {
            id: true,
            balance: true,
            availableMargin: true
          }
        },
        bankAccount: true
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`✅ [ADMIN-FUND-SERVICE] Found ${withdrawals.length} pending withdrawals`)
    return withdrawals
  }

  /**
   * Approve deposit request
   */
  async approveDeposit(input: ApproveDepositInput) {
    console.log("✅ [ADMIN-FUND-SERVICE] Approving deposit:", input.depositId)

    await this.logger.logFunds(
      "ADMIN_APPROVE_DEPOSIT_START",
      `Admin ${input.adminName} approving deposit ${input.depositId}`,
      { ...input }
    )

    try {
      const result = await executeInTransaction(async (tx) => {
        // Get deposit details
        const deposit = await tx.deposit.findUnique({
          where: { id: input.depositId },
          include: {
            user: true,
            tradingAccount: true
          }
        })

        if (!deposit) {
          throw new Error("Deposit not found")
        }

        if (deposit.status !== DepositStatus.PENDING) {
          throw new Error(`Cannot approve ${deposit.status} deposit`)
        }

        // Update trading account balance
        const updatedAccount = await tx.tradingAccount.update({
          where: { id: deposit.tradingAccountId },
          data: {
            balance: { increment: Number(deposit.amount) },
            availableMargin: { increment: Number(deposit.amount) }
          }
        })

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            tradingAccountId: deposit.tradingAccountId,
            amount: deposit.amount,
            type: 'CREDIT',
            description: `Deposit approved - ${deposit.method} (${deposit.utr || 'No UTR'})`
          }
        })

        // Update deposit status
        await tx.deposit.update({
          where: { id: input.depositId },
          data: {
            status: DepositStatus.COMPLETED,
            processedAt: new Date(),
            remarks: deposit.remarks ? `${deposit.remarks} | Approved by ${input.adminName}` : `Approved by ${input.adminName}`
          }
        })

        console.log("✅ [ADMIN-FUND-SERVICE] Deposit approved successfully")

        return {
          success: true,
          amount: Number(deposit.amount),
          newBalance: updatedAccount.balance,
          newAvailableMargin: updatedAccount.availableMargin,
          transactionId: transaction.id
        }
      })

      await this.logger.logFunds(
        "ADMIN_APPROVE_DEPOSIT_COMPLETED",
        `Admin successfully approved deposit ${input.depositId}`,
        { ...input, result }
      )

      console.log("🎉 [ADMIN-FUND-SERVICE] Approve deposit completed:", result)
      return result

    } catch (error: any) {
      console.error("❌ [ADMIN-FUND-SERVICE] Approve deposit failed:", error)
      await this.logger.error("ADMIN_APPROVE_DEPOSIT_FAILED", error.message, error, { ...input })
      throw error
    }
  }

  /**
   * Reject deposit request
   */
  async rejectDeposit(input: RejectDepositInput) {
    console.log("❌ [ADMIN-FUND-SERVICE] Rejecting deposit:", input.depositId)

    await this.logger.logFunds(
      "ADMIN_REJECT_DEPOSIT_START",
      `Admin ${input.adminName} rejecting deposit ${input.depositId}`,
      { ...input }
    )

    try {
      const deposit = await prisma.deposit.update({
        where: { id: input.depositId },
        data: {
          status: DepositStatus.FAILED,
          remarks: `Rejected by ${input.adminName}: ${input.reason}`
        }
      })

      await this.logger.logFunds(
        "ADMIN_REJECT_DEPOSIT_COMPLETED",
        `Admin rejected deposit ${input.depositId}: ${input.reason}`,
        { ...input }
      )

      console.log("✅ [ADMIN-FUND-SERVICE] Deposit rejected")
      return { success: true, depositId: deposit.id }

    } catch (error: any) {
      console.error("❌ [ADMIN-FUND-SERVICE] Reject deposit failed:", error)
      await this.logger.error("ADMIN_REJECT_DEPOSIT_FAILED", error.message, error, { ...input })
      throw error
    }
  }

  /**
   * Approve withdrawal request
   */
  async approveWithdrawal(input: ApproveWithdrawalInput) {
    console.log("✅ [ADMIN-FUND-SERVICE] Approving withdrawal:", input.withdrawalId)

    await this.logger.logFunds(
      "ADMIN_APPROVE_WITHDRAWAL_START",
      `Admin ${input.adminName} approving withdrawal ${input.withdrawalId}`,
      { ...input }
    )

    try {
      const result = await executeInTransaction(async (tx) => {
        // Get withdrawal details
        const withdrawal = await tx.withdrawal.findUnique({
          where: { id: input.withdrawalId },
          include: {
            user: true,
            tradingAccount: true,
            bankAccount: true
          }
        })

        if (!withdrawal) {
          throw new Error("Withdrawal not found")
        }

        if (withdrawal.status !== WithdrawalStatus.PENDING) {
          throw new Error(`Cannot approve ${withdrawal.status} withdrawal`)
        }

        // Check if user has sufficient balance
        const withdrawalAmount = Number(withdrawal.amount) + Number(withdrawal.charges)
        if (withdrawal.tradingAccount.availableMargin < withdrawalAmount) {
          throw new Error("Insufficient funds in user account")
        }

        // Update trading account balance
        const updatedAccount = await tx.tradingAccount.update({
          where: { id: withdrawal.tradingAccountId },
          data: {
            balance: { decrement: withdrawalAmount },
            availableMargin: { decrement: withdrawalAmount }
          }
        })

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            tradingAccountId: withdrawal.tradingAccountId,
            amount: withdrawalAmount,
            type: 'DEBIT',
            description: `Withdrawal approved - ${withdrawal.bankAccount.bankName} (${input.transactionId})`
          }
        })

        // Update withdrawal status
        await tx.withdrawal.update({
          where: { id: input.withdrawalId },
          data: {
            status: WithdrawalStatus.COMPLETED,
            processedAt: new Date(),
            reference: input.transactionId,
            remarks: withdrawal.remarks ? `${withdrawal.remarks} | Approved by ${input.adminName}` : `Approved by ${input.adminName}`
          }
        })

        console.log("✅ [ADMIN-FUND-SERVICE] Withdrawal approved successfully")

        return {
          success: true,
          amount: withdrawalAmount,
          newBalance: updatedAccount.balance,
          newAvailableMargin: updatedAccount.availableMargin,
          transactionId: transaction.id
        }
      })

      await this.logger.logFunds(
        "ADMIN_APPROVE_WITHDRAWAL_COMPLETED",
        `Admin successfully approved withdrawal ${input.withdrawalId}`,
        { ...input, result }
      )

      console.log("🎉 [ADMIN-FUND-SERVICE] Approve withdrawal completed:", result)
      return result

    } catch (error: any) {
      console.error("❌ [ADMIN-FUND-SERVICE] Approve withdrawal failed:", error)
      await this.logger.error("ADMIN_APPROVE_WITHDRAWAL_FAILED", error.message, error, { ...input })
      throw error
    }
  }

  /**
   * Reject withdrawal request
   */
  async rejectWithdrawal(input: RejectWithdrawalInput) {
    console.log("❌ [ADMIN-FUND-SERVICE] Rejecting withdrawal:", input.withdrawalId)

    await this.logger.logFunds(
      "ADMIN_REJECT_WITHDRAWAL_START",
      `Admin ${input.adminName} rejecting withdrawal ${input.withdrawalId}`,
      { ...input }
    )

    try {
      const withdrawal = await prisma.withdrawal.update({
        where: { id: input.withdrawalId },
        data: {
          status: WithdrawalStatus.FAILED,
          remarks: `Rejected by ${input.adminName}: ${input.reason}`
        }
      })

      await this.logger.logFunds(
        "ADMIN_REJECT_WITHDRAWAL_COMPLETED",
        `Admin rejected withdrawal ${input.withdrawalId}: ${input.reason}`,
        { ...input }
      )

      console.log("✅ [ADMIN-FUND-SERVICE] Withdrawal rejected")
      return { success: true, withdrawalId: withdrawal.id }

    } catch (error: any) {
      console.error("❌ [ADMIN-FUND-SERVICE] Reject withdrawal failed:", error)
      await this.logger.error("ADMIN_REJECT_WITHDRAWAL_FAILED", error.message, error, { ...input })
      throw error
    }
  }
}

/**
 * Create admin fund service instance
 */
export function createAdminFundService(logger?: TradingLogger): AdminFundService {
  console.log("🏭 [ADMIN-FUND-SERVICE] Creating service instance")
  return new AdminFundService(logger)
}

console.log("✅ [ADMIN-FUND-SERVICE] Module initialized")