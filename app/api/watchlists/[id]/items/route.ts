/**
 * @file route.ts
 * @description API endpoints for watchlist item management using Prisma transactions
 */

export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { z } from 'zod'
import { withAddWatchlistItemTransaction } from '@/lib/watchlist-transactions'

const addItemSchema = z.object({
  stockId: z.string().uuid().optional(), // Optional, kept for backward compatibility
  token: z.number(), // Required - token is the unique identifier
  symbol: z.string(),
  exchange: z.string(),
  segment: z.string(),
  name: z.string(),
  ltp: z.number().optional(),
  close: z.number().optional(),
  strikePrice: z.number().optional(),
  optionType: z.enum(['CE', 'PE']).optional(),
  expiry: z.string().optional(), // ISO date string or YYYYMMDD format
  lotSize: z.number().optional(),
  // Watchlist item specific fields
  notes: z.string().max(500).optional(),
  alertPrice: z.number().positive().optional(),
  alertType: z.enum(['ABOVE', 'BELOW', 'BOTH']).optional(),
})

// POST /api/watchlists/[id]/items - Add item to watchlist
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = addItemSchema.parse(body)

    // Add item to watchlist with atomic transaction
    // If token is provided without stockId, we'll create/find the Stock record
    const item = await withAddWatchlistItemTransaction(
      params.id,
      session.user.id,
      validatedData as any // Type will be validated by the transaction function
    )

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    
    console.error('Add watchlist item API error:', error)
    const statusCode = error instanceof Error && error.message.includes('already exists') ? 409 :
                       error instanceof Error && error.message.includes('not found') ? 404 : 500
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: statusCode })
  }
}
