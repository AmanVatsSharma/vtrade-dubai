/**
 * @file route.ts
 * @description API endpoints for individual watchlist operations using Prisma transactions
 */

export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import {
  getWatchlistById,
  withUpdateWatchlistTransaction,
  withDeleteWatchlistTransaction,
} from '@/lib/watchlist-transactions'

const updateWatchlistSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

// GET /api/watchlists/[id] - Get specific watchlist
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const watchlist = await getWatchlistById(params.id, session.user.id)

    if (!watchlist) {
      return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 })
    }

    return NextResponse.json({ watchlist })
  } catch (error) {
    console.error('Get watchlist API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/watchlists/[id] - Update watchlist
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateWatchlistSchema.parse(body)

    // Update watchlist with atomic transaction
    const watchlist = await withUpdateWatchlistTransaction(
      params.id,
      session.user.id,
      validatedData
    )

    return NextResponse.json({ watchlist })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    
    console.error('Update watchlist API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: error instanceof Error && error.message.includes('not found') ? 404 : 500 })
  }
}

// DELETE /api/watchlists/[id] - Delete watchlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete watchlist with atomic transaction
    await withDeleteWatchlistTransaction(params.id, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete watchlist API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: error instanceof Error && error.message.includes('not found') ? 404 : 500 })
  }
}
