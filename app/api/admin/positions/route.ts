import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createOrderExecutionService } from '@/lib/services/order/OrderExecutionService'
import { createTradingLogger } from '@/lib/services/logging/TradingLogger'

// GET /api/admin/positions
export async function GET(req: Request) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
    if (clientId) userFilters.push({ tradingAccount: { user: { clientId: { contains: clientId, mode: 'insensitive' } } } })
    if (user) {
      userFilters.push({ tradingAccount: { user: { id: user } } })
      userFilters.push({ tradingAccount: { user: { clientId: { contains: user, mode: 'insensitive' } } } })
      userFilters.push({ tradingAccount: { user: { name: { contains: user, mode: 'insensitive' } } } })
    }
    if (userFilters.length > 0) andFilters.push({ OR: userFilters })

    if (q) {
      andFilters.push({
        OR: [
          { symbol: { contains: q, mode: 'insensitive' } },
          { tradingAccount: { user: { name: { contains: q, mode: 'insensitive' } } } },
          { tradingAccount: { user: { clientId: { contains: q, mode: 'insensitive' } } } },
        ]
      })
    }

    const where = andFilters.length > 0 ? { AND: andFilters } : {}

    const [positions, total] = await Promise.all([
      prisma.position.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
        include: {
          tradingAccount: {
            include: {
              user: { select: { id: true, name: true, clientId: true } }
            }
          }
        }
      }),
      prisma.position.count({ where })
    ])

    return NextResponse.json({ positions, total, page, pages: Math.ceil(total / limit) }, { status: 200 })
  } catch (error: any) {
    console.error('❌ [API-ADMIN-POSITIONS] GET error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/admin/positions
export async function PATCH(req: Request) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      console.error('❌ [API-ADMIN-POSITIONS] Unauthorized role attempting PATCH:', role)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { positionId, updates, action } = body as {
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
    }

    if (!positionId) {
      return NextResponse.json({ error: 'positionId is required' }, { status: 400 })
    }

    const existing = await prisma.position.findUnique({ where: { id: positionId } })
    if (!existing) return NextResponse.json({ error: 'Position not found' }, { status: 404 })

    const data: any = {}

    if (action === 'close') {
      data.quantity = 0
    }

    if (updates) {
      if (updates.quantity !== undefined) {
        if (!Number.isFinite(updates.quantity) || updates.quantity < 0) {
          return NextResponse.json({ error: 'quantity must be a non-negative number' }, { status: 400 })
        }
        data.quantity = updates.quantity
      }
      if (updates.averagePrice !== undefined) {
        if (!Number.isFinite(updates.averagePrice) || updates.averagePrice < 0) {
          return NextResponse.json({ error: 'averagePrice must be a non-negative number' }, { status: 400 })
        }
        data.averagePrice = updates.averagePrice
      }
      if (updates.stopLoss !== undefined) {
        if (updates.stopLoss !== null && (!Number.isFinite(updates.stopLoss) || updates.stopLoss < 0)) {
          return NextResponse.json({ error: 'stopLoss must be null or a non-negative number' }, { status: 400 })
        }
        data.stopLoss = updates.stopLoss
      }
      if (updates.target !== undefined) {
        if (updates.target !== null && (!Number.isFinite(updates.target) || updates.target < 0)) {
          return NextResponse.json({ error: 'target must be null or a non-negative number' }, { status: 400 })
        }
        data.target = updates.target
      }
      if (updates.symbol !== undefined) {
        if (typeof updates.symbol !== 'string' || updates.symbol.trim().length === 0) {
          return NextResponse.json({ error: 'symbol must be a non-empty string' }, { status: 400 })
        }
        data.symbol = updates.symbol.trim().toUpperCase()
      }
      if (updates.unrealizedPnL !== undefined) {
        if (!Number.isFinite(updates.unrealizedPnL)) {
          return NextResponse.json({ error: 'unrealizedPnL must be a number' }, { status: 400 })
        }
        data.unrealizedPnL = updates.unrealizedPnL
      }
      if (updates.dayPnL !== undefined) {
        if (!Number.isFinite(updates.dayPnL)) {
          return NextResponse.json({ error: 'dayPnL must be a number' }, { status: 400 })
        }
        data.dayPnL = updates.dayPnL
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const updated = await prisma.position.update({ where: { id: positionId }, data })
    return NextResponse.json({ success: true, position: updated }, { status: 200 })
  } catch (error: any) {
    console.error('❌ [API-ADMIN-POSITIONS] PATCH error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/positions
// Create a position by placing an opening order under admin control (auto-creates order and transactions)
export async function POST(req: Request) {
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      console.error('❌ [API-ADMIN-POSITIONS] Unauthorized role attempting POST:', role)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      lotSize
    } = body || {}

    // Basic validations
    if (!tradingAccountId || !stockId || !symbol || !quantity || !orderType || !orderSide || !productType || !segment) {
      return NextResponse.json({
        error: 'Missing required fields',
        code: 'VALIDATION_ERROR'
      }, { status: 400 })
    }

    if (orderType === 'LIMIT' && (price === undefined || price === null || Number(price) <= 0)) {
      return NextResponse.json({ error: 'LIMIT orders must include positive price', code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    const logger = createTradingLogger({
      userId: session.user.id,
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
  } catch (error: any) {
    console.error('❌ [API-ADMIN-POSITIONS] POST error', error)
    return NextResponse.json({ error: error.message, code: 'SERVER_ERROR' }, { status: 500 })
  }
}
