/**
 * @file route.ts
 * @module admin-console
 * @description Admin orders API (list + patch operations)
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAdminApi } from '@/lib/rbac/admin-api'
import { AppError } from '@/src/common/errors'

// GET /api/admin/orders
export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: '/api/admin/orders',
      required: 'admin.orders.read',
      fallbackMessage: 'Failed to fetch orders',
    },
    async (ctx) => {
      const { searchParams } = new URL(req.url)
      const page = Math.max(parseInt(searchParams.get('page') || '1'), 1)
      const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50'), 1), 200)
      const user = searchParams.get('user')
      const userId = searchParams.get('userId')
      const clientId = searchParams.get('clientId')
      const symbol = searchParams.get('symbol')
      const status = searchParams.get('status') // PENDING, EXECUTED, CANCELLED
      const side = searchParams.get('side') // BUY, SELL
      const type = searchParams.get('type') // MARKET, LIMIT
      const qRaw = searchParams.get('q')
      const qAlt = searchParams.get('filter')
      const q = qRaw || qAlt || null
      const from = searchParams.get('from')
      const to = searchParams.get('to')
      const sortBy = searchParams.get('sortBy') || 'createdAt'
      const order = (searchParams.get('order') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'

      const skip = (page - 1) * limit

      const andFilters: any[] = []

      if (symbol) andFilters.push({ symbol: { contains: symbol, mode: 'insensitive' } })
      if (status) andFilters.push({ status })
      if (side) andFilters.push({ orderSide: side })
      if (type) andFilters.push({ orderType: type })
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
            { productType: { contains: q, mode: 'insensitive' } },
            { tradingAccount: { user: { name: { contains: q, mode: 'insensitive' } } } },
            { tradingAccount: { user: { clientId: { contains: q, mode: 'insensitive' } } } },
          ],
        })
      }

      const where = andFilters.length > 0 ? { AND: andFilters } : {}

      const [orders, total] = await Promise.all([
        prisma.order.findMany({
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
        prisma.order.count({ where }),
      ])

      ctx.logger.info({ count: orders.length, total, page }, 'GET /api/admin/orders - success')
      return NextResponse.json({ orders, total, page, pages: Math.ceil(total / limit) }, { status: 200 })
    }
  )
}

// PATCH /api/admin/orders
export async function PATCH(req: Request) {
  return handleAdminApi(
    req,
    {
      route: '/api/admin/orders',
      required: 'admin.orders.manage',
      fallbackMessage: 'Failed to update order',
    },
    async () => {
      const body = await req.json()
      const { orderId, updates, action } = body as {
        orderId: string
        updates?: {
          quantity?: number
          price?: number | null
          productType?: string
          orderType?: 'MARKET' | 'LIMIT'
          orderSide?: 'BUY' | 'SELL'
          status?: 'PENDING' | 'EXECUTED' | 'CANCELLED'
          filledQuantity?: number
          averagePrice?: number | null
          executedAt?: string | null
        }
        action?: 'cancel' | 'execute'
      }

      if (!orderId) {
        throw new AppError({ code: 'VALIDATION_ERROR', message: 'orderId is required', statusCode: 400 })
      }

      const existing = await prisma.order.findUnique({ where: { id: orderId } })
      if (!existing) throw new AppError({ code: 'NOT_FOUND', message: 'Order not found', statusCode: 404 })

      const data: any = {}

      if (action === 'cancel') {
        data.status = 'CANCELLED'
      }
      if (action === 'execute') {
        data.status = 'EXECUTED'
        data.filledQuantity = existing.quantity
        data.averagePrice = existing.price ?? existing.averagePrice ?? 0
        data.executedAt = new Date()
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
        if (updates.price !== undefined) {
          if (updates.price !== null && (!Number.isFinite(updates.price) || updates.price < 0)) {
            throw new AppError({
              code: 'VALIDATION_ERROR',
              message: 'price must be null or a non-negative number',
              statusCode: 400,
            })
          }
          data.price = updates.price
        }
        if (updates.productType !== undefined) {
          if (typeof updates.productType !== 'string' || updates.productType.trim().length === 0) {
            throw new AppError({
              code: 'VALIDATION_ERROR',
              message: 'productType must be a non-empty string',
              statusCode: 400,
            })
          }
          data.productType = updates.productType.trim().toUpperCase()
        }
        if (updates.orderType !== undefined) {
          data.orderType = updates.orderType
        }
        if (updates.orderSide !== undefined) {
          data.orderSide = updates.orderSide
        }
        if (updates.status !== undefined) {
          data.status = updates.status
        }
        if (updates.filledQuantity !== undefined) {
          if (!Number.isFinite(updates.filledQuantity) || updates.filledQuantity < 0) {
            throw new AppError({
              code: 'VALIDATION_ERROR',
              message: 'filledQuantity must be a non-negative number',
              statusCode: 400,
            })
          }
          data.filledQuantity = updates.filledQuantity
        }
        if (updates.averagePrice !== undefined) {
          if (updates.averagePrice !== null && (!Number.isFinite(updates.averagePrice) || updates.averagePrice < 0)) {
            throw new AppError({
              code: 'VALIDATION_ERROR',
              message: 'averagePrice must be null or a non-negative number',
              statusCode: 400,
            })
          }
          data.averagePrice = updates.averagePrice
        }
        if (updates.executedAt !== undefined) {
          data.executedAt = updates.executedAt ? new Date(updates.executedAt) : null
        }
      }

      if (Object.keys(data).length === 0) {
        throw new AppError({ code: 'VALIDATION_ERROR', message: 'No updates provided', statusCode: 400 })
      }

      const updated = await prisma.order.update({ where: { id: orderId }, data })
      return NextResponse.json({ success: true, order: updated }, { status: 200 })
    }
  )
}
