/**
 * @file route.ts
 * @module admin-console
 * @description API endpoint to fetch related orders and transactions for a position
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminPermissions } from '@/lib/rbac/admin-guard'

export async function GET(
  req: Request,
  { params }: { params: { positionId: string } }
) {
  try {
    const authResult = await requireAdminPermissions(req, 'admin.positions.read')
    if (!authResult.ok) return authResult.response

    const { positionId } = params

    console.log("🔍 [API-ADMIN-POSITIONS-RELATED] Fetching related data for position:", positionId)

    // Fetch position with trading account
    const position = await prisma.position.findUnique({
      where: { id: positionId },
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
    })

    if (!position) {
      return NextResponse.json({ error: 'Position not found' }, { status: 404 })
    }

    // Fetch related orders
    const orders = await prisma.order.findMany({
      where: {
        positionId: positionId
      },
      orderBy: {
        createdAt: 'desc'
      },
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
    })

    // Fetch related transactions:
    // 1. Transactions directly linked to position (positionId)
    // 2. Transactions linked via orders that belong to this position
    const relatedOrderIds = orders.map(o => o.id)
    
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { positionId: positionId }, // Directly linked to position
          ...(relatedOrderIds.length > 0 ? [{ orderId: { in: relatedOrderIds } }] : []) // Linked via orders
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
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
        },
        order: {
          select: {
            id: true,
            symbol: true,
            orderSide: true,
            orderType: true
          }
        }
      }
    })

    console.log("✅ [API-ADMIN-POSITIONS-RELATED] Found:", {
      orders: orders.length,
      transactions: transactions.length
    })

    return NextResponse.json({
      position,
      orders,
      transactions
    }, { status: 200 })
  } catch (error: any) {
    console.error('❌ [API-ADMIN-POSITIONS-RELATED] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
