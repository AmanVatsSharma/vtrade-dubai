/**
 * Positions List API
 * 
 * Returns list of positions for a user (for real-time polling)
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
      return NextResponse.json({ positions: [] })
    }
    
    // Fetch open positions only
    const positions = await prisma.position.findMany({
      where: {
        tradingAccountId: tradingAccount.id,
        quantity: {
          not: 0
        }
      },
      include: {
        Stock: {
          select: {
            symbol: true,
            name: true,
            ltp: true,
            instrumentId: true,
            segment: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      positions: positions.map(position => ({
        id: position.id,
        symbol: position.symbol,
        quantity: position.quantity,
        averagePrice: Number(position.averagePrice),
        unrealizedPnL: Number(position.unrealizedPnL),
        dayPnL: Number(position.dayPnL),
        stopLoss: position.stopLoss ? Number(position.stopLoss) : null,
        target: position.target ? Number(position.target) : null,
        createdAt: position.createdAt.toISOString(),
        stock: position.Stock,
        // Calculate current value
        currentPrice: position.Stock?.ltp || Number(position.averagePrice),
        currentValue: position.quantity * (position.Stock?.ltp || Number(position.averagePrice)),
        investedValue: position.quantity * Number(position.averagePrice)
      }))
    })
  } catch (error: any) {
    console.error('❌ [API-POSITIONS-LIST] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch positions'
    }, { status: 500 })
  }
}
