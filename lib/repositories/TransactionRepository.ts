/**
 * Transaction Repository
 * 
 * Handles all transaction-related database operations:
 * - Creating transaction records
 * - Querying transaction history
 * - Transaction analytics
 */

import { prisma } from "@/lib/prisma"
import { Prisma, TransactionType } from "@prisma/client"

console.log("💳 [TRANSACTION-REPO] Module loaded")

export interface CreateTransactionData {
  tradingAccountId: string
  amount: number
  type: TransactionType
  description: string
  orderId?: string
  positionId?: string
}

export class TransactionRepository {
  
  /**
   * Create a transaction record
   */
  async create(
    data: CreateTransactionData,
    tx?: Prisma.TransactionClient
  ) {
    console.log("💳 [TRANSACTION-REPO] Creating transaction:", {
      accountId: data.tradingAccountId,
      amount: data.amount,
      type: data.type,
      description: data.description
    })

    const client = tx || prisma

    const transaction = await client.transaction.create({
      data: {
        tradingAccountId: data.tradingAccountId,
        amount: data.amount,
        type: data.type,
        description: data.description,
        orderId: data.orderId,
        positionId: data.positionId,
        createdAt: new Date()
      }
    })

    console.log("✅ [TRANSACTION-REPO] Transaction created:", transaction.id)
    return transaction
  }

  /**
   * Update a transaction (attach context like orderId/positionId or adjust fields)
   */
  async update(
    id: string,
    updates: Partial<Pick<CreateTransactionData, 'description' | 'orderId' | 'positionId' | 'amount'>>,
    tx?: Prisma.TransactionClient
  ) {
    console.log("🔄 [TRANSACTION-REPO] Updating transaction:", { id, updates })

    const client = tx || prisma

    const transaction = await client.transaction.update({
      where: { id },
      data: {
        ...updates
      }
    })

    console.log("✅ [TRANSACTION-REPO] Transaction updated:", id)
    return transaction
  }

  /**
   * Update multiple transactions matching a condition
   */
  async updateMany(
    where: Prisma.TransactionWhereInput,
    updates: Partial<Pick<CreateTransactionData, 'description' | 'orderId' | 'positionId' | 'amount'>>,
    tx?: Prisma.TransactionClient
  ) {
    console.log("🔄 [TRANSACTION-REPO] Updating multiple transactions:", { where, updates })

    const client = tx || prisma

    const result = await client.transaction.updateMany({
      where,
      data: {
        ...updates
      }
    })

    console.log(`✅ [TRANSACTION-REPO] Updated ${result.count} transactions`)
    return result
  }

  /**
   * Get transactions for an account
   */
  async findByAccountId(
    tradingAccountId: string,
    limit: number = 100,
    offset: number = 0,
    tx?: Prisma.TransactionClient
  ) {
    console.log("🔍 [TRANSACTION-REPO] Finding transactions:", {
      tradingAccountId,
      limit,
      offset
    })

    const client = tx || prisma

    const transactions = await client.transaction.findMany({
      where: { tradingAccountId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    console.log(`✅ [TRANSACTION-REPO] Found ${transactions.length} transactions`)
    return transactions
  }

  /**
   * Get transaction by ID
   */
  async findById(id: string, tx?: Prisma.TransactionClient) {
    console.log("🔍 [TRANSACTION-REPO] Finding transaction by ID:", id)

    const client = tx || prisma
    const transaction = await client.transaction.findUnique({
      where: { id },
      include: {
        tradingAccount: {
          select: {
            id: true,
            userId: true,
            balance: true
          }
        }
      }
    })

    if (transaction) {
      console.log("✅ [TRANSACTION-REPO] Transaction found")
    } else {
      console.log("⚠️ [TRANSACTION-REPO] Transaction not found")
    }

    return transaction
  }

  /**
   * Get transaction summary for an account
   */
  async getAccountSummary(
    tradingAccountId: string,
    startDate?: Date,
    endDate?: Date,
    tx?: Prisma.TransactionClient
  ) {
    console.log("📊 [TRANSACTION-REPO] Getting transaction summary:", {
      tradingAccountId,
      startDate,
      endDate
    })

    const client = tx || prisma

    const where: Prisma.TransactionWhereInput = {
      tradingAccountId
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = startDate
      if (endDate) where.createdAt.lte = endDate
    }

    const [credits, debits, totalCount] = await Promise.all([
      client.transaction.aggregate({
        where: { ...where, type: 'CREDIT' },
        _sum: { amount: true },
        _count: true
      }),
      client.transaction.aggregate({
        where: { ...where, type: 'DEBIT' },
        _sum: { amount: true },
        _count: true
      }),
      client.transaction.count({ where })
    ])

    const summary = {
      totalCredits: Number(credits._sum.amount || 0),
      totalDebits: Number(debits._sum.amount || 0),
      creditCount: credits._count,
      debitCount: debits._count,
      totalTransactions: totalCount,
      netAmount: Number(credits._sum.amount || 0) - Number(debits._sum.amount || 0)
    }

    console.log("✅ [TRANSACTION-REPO] Summary calculated:", summary)
    return summary
  }

  /**
   * Get recent transactions
   */
  async getRecent(
    tradingAccountId: string,
    limit: number = 10,
    tx?: Prisma.TransactionClient
  ) {
    console.log("📋 [TRANSACTION-REPO] Getting recent transactions:", {
      tradingAccountId,
      limit
    })

    const client = tx || prisma

    const transactions = await client.transaction.findMany({
      where: { tradingAccountId },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    console.log(`✅ [TRANSACTION-REPO] Found ${transactions.length} recent transactions`)
    return transactions
  }

  /**
   * Get transactions by type
   */
  async findByType(
    tradingAccountId: string,
    type: TransactionType,
    limit: number = 100,
    tx?: Prisma.TransactionClient
  ) {
    console.log("🔍 [TRANSACTION-REPO] Finding transactions by type:", {
      tradingAccountId,
      type,
      limit
    })

    const client = tx || prisma

    const transactions = await client.transaction.findMany({
      where: {
        tradingAccountId,
        type
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    console.log(`✅ [TRANSACTION-REPO] Found ${transactions.length} ${type} transactions`)
    return transactions
  }
}

/**
 * Create repository instance
 */
export function createTransactionRepository(): TransactionRepository {
  console.log("🏭 [TRANSACTION-REPO] Creating repository instance")
  return new TransactionRepository()
}

console.log("✅ [TRANSACTION-REPO] Module initialized")