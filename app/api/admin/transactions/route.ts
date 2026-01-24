/**
 * Admin Transactions API
 * Supports filtering, pagination, and updates.
 */
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminPermissions } from '@/lib/rbac/admin-guard'

export async function GET(req: Request) {
  try {
    const authResult = await requireAdminPermissions(req, 'admin.funds.read')
    if (!authResult.ok) return authResult.response
    const session = authResult.session
    console.log('✅ [API-ADMIN-TRANSACTIONS] Admin authenticated:', session.user.email)

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
    if (clientId) userFilters.push({ tradingAccount: { user: { clientId: { contains: clientId, mode: 'insensitive' } } } })
    if (user) {
      userFilters.push({ tradingAccount: { user: { id: user } } })
      userFilters.push({ tradingAccount: { user: { clientId: { contains: user, mode: 'insensitive' } } } })
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
        ]
      })
    }

    const where = andFilters.length > 0 ? { AND: andFilters } : {}

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
        include: {
          tradingAccount: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  clientId: true
                }
              }
            }
          }
        }
      }),
      prisma.transaction.count({ where })
    ])

    return NextResponse.json({ transactions, total, page, pages: Math.ceil(total / limit) }, { status: 200 })
  } catch (error: any) {
    console.error('❌ [API-ADMIN-TRANSACTIONS] GET error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const authResult = await requireAdminPermissions(req, 'admin.funds.override')
    if (!authResult.ok) return authResult.response

    const body = await req.json()
    const { transactionId, amount, description, reconcile } = body

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 })
    }

    // Load existing transaction
    const existing = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { tradingAccount: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Prepare updates
    const updates: any = {}
    if (typeof description === 'string') updates.description = description
    if (typeof amount === 'number' && !Number.isNaN(amount) && amount >= 0) {
      updates.amount = amount
    }

    // If reconciling, adjust the trading account by delta to keep ledger aligned
    if (reconcile && updates.amount !== undefined) {
      const delta = Number(updates.amount) - Number(existing.amount)
      const effect = existing.type === 'CREDIT' ? delta : -delta

      const result = await prisma.$transaction(async (tx) => {
        // Ensure sufficient funds when decreasing credits or increasing debits
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
          data: updates
        })

        const updatedAccount = await tx.tradingAccount.update({
          where: { id: existing.tradingAccountId },
          data: {
            balance: { increment: effect },
            availableMargin: { increment: effect }
          }
        })

        return { updatedTx, updatedAccount }
      })

      return NextResponse.json({ success: true, ...result }, { status: 200 })
    }

    const updatedTx = await prisma.transaction.update({
      where: { id: transactionId },
      data: updates
    })

    return NextResponse.json({ success: true, transaction: updatedTx }, { status: 200 })
  } catch (error: any) {
    console.error('❌ [API-ADMIN-TRANSACTIONS] PATCH error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}