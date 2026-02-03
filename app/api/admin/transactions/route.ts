/**
 * Admin Transactions API
 * Supports filtering, pagination, and updates.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAdminApi } from '@/lib/rbac/admin-api'
import { AppError } from '@/src/common/errors'

export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: '/api/admin/transactions',
      required: 'admin.funds.read',
      fallbackMessage: 'Failed to fetch transactions',
    },
    async (ctx) => {
      const { searchParams } = new URL(req.url)
      const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
      const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 200)
      const type = searchParams.get('type') as 'CREDIT' | 'DEBIT' | null
      const user = searchParams.get('user') // can be userId or clientId
      const userId = searchParams.get('userId')
      const clientId = searchParams.get('clientId')
      const qRaw = searchParams.get('q')
      const qAlt = searchParams.get('filter')
      const q = qRaw || qAlt || null
      const from = searchParams.get('from')
      const to = searchParams.get('to')
      const minAmount = searchParams.get('minAmount')
      const maxAmount = searchParams.get('maxAmount')
      const sortBy = searchParams.get('sortBy') || 'createdAt'
      const order = (searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'

      const skip = (page - 1) * limit

      ctx.logger.debug({ page, limit, type, user, userId, clientId, sortBy, order }, 'GET /api/admin/transactions - params')

      // Build WHERE clause
      const andFilters: any[] = []

      if (type === 'CREDIT' || type === 'DEBIT') {
        andFilters.push({ type })
      }

      if (from || to) {
        const createdAt: any = {}
        if (from) createdAt.gte = new Date(from)
        if (to) createdAt.lte = new Date(to)
        andFilters.push({ createdAt })
      }

      if (minAmount || maxAmount) {
        const amount: any = {}
        if (minAmount) amount.gte = Number(minAmount)
        if (maxAmount) amount.lte = Number(maxAmount)
        andFilters.push({ amount })
      }

      // User filters (by userId/clientId, or combined 'user' param)
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
      if (userFilters.length > 0) {
        andFilters.push({ OR: userFilters })
      }

      // Free text search
      if (q) {
        andFilters.push({
          OR: [
            { description: { contains: q, mode: 'insensitive' } },
            { tradingAccount: { user: { name: { contains: q, mode: 'insensitive' } } } },
            { tradingAccount: { user: { clientId: { contains: q, mode: 'insensitive' } } } },
          ],
        })
      }

      const where = andFilters.length > 0 ? { AND: andFilters } : {}

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where,
          orderBy: { [sortBy]: order } as any,
          skip,
          take: limit,
          include: {
            tradingAccount: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    clientId: true,
                  },
                },
              },
            },
          },
        }),
        prisma.transaction.count({ where }),
      ])

      ctx.logger.info({ count: transactions.length, total, page }, 'GET /api/admin/transactions - success')
      return NextResponse.json({ transactions, total, page, pages: Math.ceil(total / limit) }, { status: 200 })
    }
  )
}

export async function PATCH(req: Request) {
  return handleAdminApi(
    req,
    {
      route: '/api/admin/transactions',
      required: 'admin.funds.override',
      fallbackMessage: 'Failed to update transaction',
    },
    async (ctx) => {
      const body = await req.json()
      const { transactionId, amount, description, reconcile } = body

      if (!transactionId) {
        throw new AppError({ code: 'VALIDATION_ERROR', message: 'transactionId is required', statusCode: 400 })
      }

      const existing = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: { tradingAccount: true },
      })

      if (!existing) {
        throw new AppError({ code: 'NOT_FOUND', message: 'Transaction not found', statusCode: 404 })
      }

      const updates: any = {}
      if (typeof description === 'string') updates.description = description
      if (typeof amount === 'number' && !Number.isNaN(amount) && amount >= 0) {
        updates.amount = amount
      }

      if (reconcile && updates.amount !== undefined) {
        const delta = Number(updates.amount) - Number(existing.amount)
        const effect = existing.type === 'CREDIT' ? delta : -delta

        const result = await prisma.$transaction(async (tx) => {
          if (effect < 0) {
            const fresh = await tx.tradingAccount.findUnique({ where: { id: existing.tradingAccountId } })
            if (!fresh) throw new Error('Trading account not found')
            const newAvailable = Number(fresh.availableMargin) + effect
            if (newAvailable < 0) {
              throw new Error('Insufficient funds to reconcile this change')
            }
          }

          const updatedTx = await tx.transaction.update({
            where: { id: transactionId },
            data: updates,
          })

          const updatedAccount = await tx.tradingAccount.update({
            where: { id: existing.tradingAccountId },
            data: {
              balance: { increment: effect },
              availableMargin: { increment: effect },
            },
          })

          return { updatedTx, updatedAccount }
        })

        ctx.logger.info({ transactionId, reconcile: true }, 'PATCH /api/admin/transactions - reconciled')
        return NextResponse.json({ success: true, ...result }, { status: 200 })
      }

      const updatedTx = await prisma.transaction.update({
        where: { id: transactionId },
        data: updates,
      })

      ctx.logger.info({ transactionId, reconcile: false }, 'PATCH /api/admin/transactions - success')
      return NextResponse.json({ success: true, transaction: updatedTx }, { status: 200 })
    }
  )
}