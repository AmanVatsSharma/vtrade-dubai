/**
 * Trading Account API
 * 
 * Returns trading account details for a user (for real-time polling)
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { withApiTelemetry } from '@/lib/observability/api-telemetry'

export async function GET(req: Request) {
  try {
    const { result } = await withApiTelemetry(req, { name: 'trading_account_get' }, async () => {
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
        return NextResponse.json({
          success: true,
          account: null
        })
      }
      
      return NextResponse.json({
        success: true,
        account: {
          id: tradingAccount.id,
          userId: tradingAccount.userId,
          balance: tradingAccount.balance,
          availableMargin: tradingAccount.availableMargin,
          usedMargin: tradingAccount.usedMargin,
          clientId: tradingAccount.clientId,
          createdAt: tradingAccount.createdAt.toISOString(),
          updatedAt: tradingAccount.updatedAt.toISOString()
        }
      })
    })

    return result
  } catch (error: any) {
    console.error('❌ [API-ACCOUNT] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch trading account'
    }, { status: 500 })
  }
}
