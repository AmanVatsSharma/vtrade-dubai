/**
 * Order Status API
 * 
 * Returns the status of a specific order for monitoring
 */

export const runtime = 'nodejs';
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')
    
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }
    
    // Get session for security
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Fetch order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        TradingAccount: {
          select: {
            userId: true
          }
        }
      }
    })
    
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    
    // Security check - ensure user owns this order
    if (order.TradingAccount.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: order.status,
      symbol: order.symbol,
      quantity: order.quantity,
      price: order.price ? Number(order.price) : null,
      averagePrice: order.averagePrice ? Number(order.averagePrice) : null,
      filledQuantity: order.filledQuantity,
      createdAt: order.createdAt.toISOString(),
      executedAt: order.executedAt?.toISOString() || null,
      message: order.status === 'REJECTED' ? 'Order was rejected' : 
               order.status === 'PENDING' ? 'Order is pending execution' :
               order.status === 'EXECUTED' ? 'Order executed successfully' : 
               'Order status unknown'
    })
  } catch (error: any) {
    console.error('❌ [API-ORDER-STATUS] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch order status'
    }, { status: 500 })
  }
}