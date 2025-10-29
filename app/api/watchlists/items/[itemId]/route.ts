/**
 * @file route.ts
 * @description API endpoints for individual watchlist item operations using Prisma transactions
 */

export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import {
  getWatchlistItemById,
  withUpdateWatchlistItemTransaction,
  withRemoveWatchlistItemTransaction,
} from '@/lib/watchlist-transactions'

const updateItemSchema = z.object({
  notes: z.string().max(500).optional(),
  alertPrice: z.number().positive().optional().nullable(),
  alertType: z.enum(['ABOVE', 'BELOW', 'BOTH']).optional().nullable(),
  sortOrder: z.number().optional(),
})

// GET /api/watchlists/items/[itemId] - Get specific watchlist item
export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const item = await getWatchlistItemById(params.itemId, session.user.id)

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Get watchlist item API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/watchlists/items/[itemId] - Update watchlist item
export async function PUT(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateItemSchema.parse(body)

    // Update item with atomic transaction
    const item = await withUpdateWatchlistItemTransaction(
      params.itemId,
      session.user.id,
      validatedData
    )

    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    
    console.error('Update watchlist item API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: error instanceof Error && error.message.includes('not found') ? 404 : 500 })
  }
}

// DELETE /api/watchlists/items/[itemId] - Remove item from watchlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete item with atomic transaction
    await withRemoveWatchlistItemTransaction(params.itemId, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete watchlist item API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: error instanceof Error && error.message.includes('not found') ? 404 : 500 })
  }
}
