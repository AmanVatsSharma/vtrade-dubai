/**
 * Orders List API
 * 
 * Returns list of orders for a user (for real-time polling)
 */

export const runtime = 'nodejs';
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    
    // Get session for security
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Ensure user can only fetch their own data
    if (userId && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Get trading account
    const tradingAccount = await prisma.tradingAccount.findUnique({
      where: { userId: session.user.id }
    })
    
    if (!tradingAccount) {
      return NextResponse.json({ orders: [] })
    }
    
    // Fetch orders (last 100, sorted by newest first)
    const orders = await prisma.order.findMany({
      where: {
        tradingAccountId: tradingAccount.id
      },
      include: {
        Stock: {
          select: {
            symbol: true,
            name: true,
            ltp: true,
            instrumentId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    })
    
    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        id: order.id,
        symbol: order.symbol,
        quantity: order.quantity,
        orderType: order.orderType,
        orderSide: order.orderSide,
        price: order.price ? Number(order.price) : null,
        averagePrice: order.averagePrice ? Number(order.averagePrice) : null,
        filledQuantity: order.filledQuantity,
        productType: order.productType,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        executedAt: order.executedAt?.toISOString() || null,
        stock: order.Stock
      }))
    })
  } catch (error: any) {
    console.error('❌ [API-ORDERS-LIST] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch orders'
    }, { status: 500 })
  }
}
