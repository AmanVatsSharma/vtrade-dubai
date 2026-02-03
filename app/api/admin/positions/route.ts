/**
 * @file route.ts
 * @module admin-console
 * @description Admin positions API (list, patch, and admin-controlled position creation)
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createOrderExecutionService } from '@/lib/services/order/OrderExecutionService'
import { createTradingLogger } from '@/lib/services/logging/TradingLogger'
import { handleAdminApi } from '@/lib/rbac/admin-api'
import { AppError } from '@/src/common/errors'

// GET /api/admin/positions
export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: '/api/admin/positions',
      required: 'admin.positions.read',
      fallbackMessage: 'Failed to fetch positions',
    },
    async (ctx) => {
      const { searchParams } = new URL(req.url)
      const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
      const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 200)
      const user = searchParams.get('user')
      const userId = searchParams.get('userId')
      const clientId = searchParams.get('clientId')
      const symbol = searchParams.get('symbol')
      const qRaw = searchParams.get('q')
      const qAlt = searchParams.get('filter')
      const q = qRaw || qAlt || null
      const openOnly = (searchParams.get('openOnly') || '').toLowerCase() === 'true'
      const from = searchParams.get('from')
      const to = searchParams.get('to')
      const sortBy = searchParams.get('sortBy') || 'createdAt'
      const order = (searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'

      const skip = (page - 1) * limit

      const andFilters: any[] = []

      if (openOnly) {
        andFilters.push({ quantity: { not: 0 } })
      }
      if (symbol) {
        andFilters.push({ symbol: { contains: symbol, mode: 'insensitive' } })
      }
      if (from || to) {
        const createdAt: any = {}
        if (from) createdAt.gte = new Date(from)
        if (to) createdAt.lte = new Date(to)
        andFilters.push({ createdAt })
      }

      const userFilters: any[] = []
      if (userId) userFilters.push({ tradingAccount: { user: { id: userId } } })
      if (clientId) {
        userFilters.push({
          tradingAccount: { user: { clientId: { contains: clientId, mode: 'insensitive' } } },
        })
      }
      if (user) {
        userFilters.push({ tradingAccount: { user: { id: user } } })
        userFilters.push({
          tradingAccount: { user: { clientId: { contains: user, mode: 'insensitive' } } },
        })
        userFilters.push({ tradingAccount: { user: { name: { contains: user, mode: 'insensitive' } } } })
      }
      if (userFilters.length > 0) andFilters.push({ OR: userFilters })

      if (q) {
        andFilters.push({
          OR: [
            { symbol: { contains: q, mode: 'insensitive' } },
            { tradingAccount: { user: { name: { contains: q, mode: 'insensitive' } } } },
            { tradingAccount: { user: { clientId: { contains: q, mode: 'insensitive' } } } },
          ],
        })
      }

      const where = andFilters.length > 0 ? { AND: andFilters } : {}

      const [positions, total] = await Promise.all([
        prisma.position.findMany({
          where,
          orderBy: { [sortBy]: order } as any,
          skip,
          take: limit,
          include: {
            tradingAccount: {
              include: {
                user: { select: { id: true, name: true, clientId: true } },
              },
            },
          },
        }),
        prisma.position.count({ where }),
      ])

      ctx.logger.info({ count: positions.length, total, page }, 'GET /api/admin/positions - success')
      return NextResponse.json({ positions, total, page, pages: Math.ceil(total / limit) }, { status: 200 })
    }
  )
}

// PATCH /api/admin/positions
export async function PATCH(req: Request) {
  return handleAdminApi(
    req,
    {
      route: '/api/admin/positions',
      required: 'admin.positions.manage',
      fallbackMessage: 'Failed to update position',
    },
    async (ctx) => {

      const body = await req.json()
      const { positionId, updates, action, options } = body as {
      positionId: string
      updates?: {
        quantity?: number
        averagePrice?: number
        stopLoss?: number | null
        target?: number | null
        symbol?: string
        unrealizedPnL?: number
        dayPnL?: number
      }
      action?: 'close'
      options?: {
        cascadeToOrders?: boolean
        cascadeToTransactions?: boolean
        manageFunds?: boolean
        valueDelta?: number
      }
    }

      if (!positionId) {
        throw new AppError({ code: 'VALIDATION_ERROR', message: 'positionId is required', statusCode: 400 })
      }

      const existing = await prisma.position.findUnique({ 
      where: { id: positionId },
      include: {
        tradingAccount: true
      }
    })
      if (!existing) throw new AppError({ code: 'NOT_FOUND', message: 'Position not found', statusCode: 404 })

      const data: any = {}

    if (action === 'close') {
      data.quantity = 0
    }

      if (updates) {
      if (updates.quantity !== undefined) {
        if (!Number.isFinite(updates.quantity) || updates.quantity < 0) {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'quantity must be a non-negative number',
            statusCode: 400,
          })
        }
        data.quantity = updates.quantity
      }
      if (updates.averagePrice !== undefined) {
        if (!Number.isFinite(updates.averagePrice) || updates.averagePrice < 0) {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'averagePrice must be a non-negative number',
            statusCode: 400,
          })
        }
        data.averagePrice = updates.averagePrice
      }
      if (updates.stopLoss !== undefined) {
        if (updates.stopLoss !== null && (!Number.isFinite(updates.stopLoss) || updates.stopLoss < 0)) {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'stopLoss must be null or a non-negative number',
            statusCode: 400,
          })
        }
        data.stopLoss = updates.stopLoss
      }
      if (updates.target !== undefined) {
        if (updates.target !== null && (!Number.isFinite(updates.target) || updates.target < 0)) {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'target must be null or a non-negative number',
            statusCode: 400,
          })
        }
        data.target = updates.target
      }
      if (updates.symbol !== undefined) {
        if (typeof updates.symbol !== 'string' || updates.symbol.trim().length === 0) {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'symbol must be a non-empty string',
            statusCode: 400,
          })
        }
        data.symbol = updates.symbol.trim().toUpperCase()
      }
      if (updates.unrealizedPnL !== undefined) {
        if (!Number.isFinite(updates.unrealizedPnL)) {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'unrealizedPnL must be a number',
            statusCode: 400,
          })
        }
        data.unrealizedPnL = updates.unrealizedPnL
      }
      if (updates.dayPnL !== undefined) {
        if (!Number.isFinite(updates.dayPnL)) {
          throw new AppError({
            code: 'VALIDATION_ERROR',
            message: 'dayPnL must be a number',
            statusCode: 400,
          })
        }
        data.dayPnL = updates.dayPnL
      }
    }

      if (Object.keys(data).length === 0) {
        throw new AppError({ code: 'VALIDATION_ERROR', message: 'No updates provided', statusCode: 400 })
      }

    // Handle cascading updates and fund management in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update position
      const updatedPosition = await tx.position.update({ 
        where: { id: positionId }, 
        data 
      })

      // Cascade to orders if requested
      if (options?.cascadeToOrders && updates) {
        const orderUpdates: any = {}
        if (updates.symbol !== undefined) orderUpdates.symbol = updates.symbol
        if (updates.quantity !== undefined) orderUpdates.quantity = updates.quantity
        if (updates.averagePrice !== undefined) orderUpdates.averagePrice = updates.averagePrice

        if (Object.keys(orderUpdates).length > 0) {
          await tx.order.updateMany({
            where: { positionId },
            data: orderUpdates
          })
          ctx.logger.debug({ positionId }, "PATCH /api/admin/positions - cascaded updates to orders")
        }
      }

      // Cascade to transactions if requested
      if (options?.cascadeToTransactions && updates) {
        // Update transaction amounts if quantity or averagePrice changed
        if (updates.quantity !== undefined || updates.averagePrice !== undefined) {
          const newValue = (updates.quantity ?? updatedPosition.quantity) * (updates.averagePrice ?? updatedPosition.averagePrice)
          const oldValue = existing.quantity * existing.averagePrice
          const amountDelta = newValue - oldValue

          if (amountDelta !== 0) {
            // Find related transactions:
            // 1. Transactions directly linked to position (positionId)
            // 2. Transactions linked via orders that belong to this position (order.positionId = positionId)
            const relatedOrderIds = (await tx.order.findMany({
              where: { positionId },
              select: { id: true }
            })).map((o) => o.id)

            // Get all related transactions
            const relatedTransactions = await tx.transaction.findMany({
              where: {
                OR: [
                  { positionId }, // Directly linked to position
                  ...(relatedOrderIds.length > 0 ? [{ orderId: { in: relatedOrderIds } }] : []) // Linked via orders
                ]
              }
            })

            ctx.logger.debug(
              { positionId, count: relatedTransactions.length },
              "PATCH /api/admin/positions - related transactions found"
            )

            // Only update transactions that represent position value (not margin/charges)
            // Margin and charge transactions should remain as historical records
            // We'll update transactions that are directly linked to position or represent position value adjustments
            for (const txn of relatedTransactions) {
              // Skip margin/charge transactions (they have specific descriptions or are DEBITs for orders)
              const isMarginOrCharge = txn.description?.toLowerCase().includes('margin') || 
                                       txn.description?.toLowerCase().includes('charge') ||
                                       (txn.type === 'DEBIT' && txn.orderId && !txn.positionId)
              
              if (!isMarginOrCharge && oldValue > 0) {
                const currentAmount = Number(txn.amount)
                const proportionalDelta = (currentAmount / oldValue) * amountDelta
                const newAmount = Math.max(0, currentAmount + proportionalDelta) // Ensure non-negative

                await tx.transaction.update({
                  where: { id: txn.id },
                  data: { amount: newAmount }
                })
              }
            }
            ctx.logger.debug({ positionId }, "PATCH /api/admin/positions - cascaded updates to transactions")
          }
        }
      }

      // Manage funds if requested
      if (options?.manageFunds && options.valueDelta !== undefined && options.valueDelta !== 0) {
        const tradingAccount = await tx.tradingAccount.findUnique({
          where: { id: existing.tradingAccountId }
        })

        if (!tradingAccount) {
          throw new Error('Trading account not found')
        }

        // Check if we have sufficient funds for debit
        if (options.valueDelta < 0) {
          const newAvailable = Number(tradingAccount.availableMargin) + options.valueDelta
          if (newAvailable < 0) {
            throw new Error('Insufficient funds to adjust position value')
          }
        }

        // Update trading account balance and available margin
        await tx.tradingAccount.update({
          where: { id: existing.tradingAccountId },
          data: {
            balance: { increment: options.valueDelta },
            availableMargin: { increment: options.valueDelta }
          }
        })

        // Create a transaction record for the fund adjustment
        await tx.transaction.create({
          data: {
            tradingAccountId: existing.tradingAccountId,
            positionId: positionId,
            type: options.valueDelta > 0 ? 'CREDIT' : 'DEBIT',
            amount: Math.abs(options.valueDelta),
            description: `Position adjustment: ${existing.symbol} - ${options.valueDelta > 0 ? 'Credit' : 'Debit'} for value change`
          }
        })

        ctx.logger.debug({ positionId, valueDelta: options.valueDelta }, "PATCH /api/admin/positions - adjusted funds")
      }

      return updatedPosition
    })

      return NextResponse.json({ success: true, position: result }, { status: 200 })
    }
  )
}

// POST /api/admin/positions
// Create a position by placing an opening order under admin control (auto-creates order and transactions)
export async function POST(req: Request) {
  return handleAdminApi(
    req,
    {
      route: '/api/admin/positions',
      required: 'admin.positions.manage',
      fallbackMessage: 'Failed to create position',
    },
    async (ctx) => {

      const body = await req.json()
      const {
        tradingAccountId,
        stockId,
        instrumentId,
        symbol,
        quantity,
        price,
        orderType,
        orderSide,
        productType,
        segment,
        lotSize,
      } = body || {}

    // Basic validations
    if (!tradingAccountId || !stockId || !symbol || !quantity || !orderType || !orderSide || !productType || !segment) {
        throw new AppError({ code: 'VALIDATION_ERROR', message: 'Missing required fields', statusCode: 400 })
    }

    if (orderType === 'LIMIT' && (price === undefined || price === null || Number(price) <= 0)) {
        throw new AppError({
          code: 'VALIDATION_ERROR',
          message: 'LIMIT orders must include positive price',
          statusCode: 400,
        })
    }

    const logger = createTradingLogger({
      userId: ctx.session.user.id,
      tradingAccountId,
      symbol
    })

    const svc = createOrderExecutionService(logger)
    const result = await svc.placeOrder({
      tradingAccountId,
      stockId,
      instrumentId: instrumentId || '',
      symbol,
      quantity: Number(quantity),
      price: price != null ? Number(price) : undefined,
      orderType,
      orderSide,
      productType,
      segment,
      lotSize: lotSize ? Number(lotSize) : undefined
    })

    return NextResponse.json(result, { status: 200 })
    }
  )
}
