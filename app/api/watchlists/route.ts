/**
 * @file route.ts
 * @description API endpoints for enhanced watchlist management using Prisma transactions
 */

export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import {
  getAllWatchlists,
  withCreateWatchlistTransaction,
} from '@/lib/watchlist-transactions'

// Validation schemas
const createWatchlistSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  isDefault: z.boolean().optional(),
})

// GET /api/watchlists - Get all watchlists for user
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const watchlists = await getAllWatchlists(session.user.id)

    return NextResponse.json({ watchlists })
  } catch (error) {
    console.error('Watchlists API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/watchlists - Create new watchlist
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createWatchlistSchema.parse(body)

    // Create watchlist with atomic transaction
    const watchlist = await withCreateWatchlistTransaction(
      session.user.id,
      validatedData
    )

    return NextResponse.json({ watchlist }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    
    console.error('Create watchlist API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}
