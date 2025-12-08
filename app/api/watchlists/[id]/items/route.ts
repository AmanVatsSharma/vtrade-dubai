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
  token: z.number().optional(), // Optional - will be extracted from instrumentId if missing
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
  instrumentId: z.string().optional(), // Can be used to extract token if missing
  // Watchlist item specific fields
  notes: z.string().max(500).optional(),
  alertPrice: z.number().positive().optional(),
  alertType: z.enum(['ABOVE', 'BELOW', 'BOTH']).optional(),
}).refine((data) => {
  // Either token or stockId must be provided
  return data.token !== undefined || data.stockId !== undefined
}, {
  message: "Either token or stockId must be provided"
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
    let validatedData = addItemSchema.parse(body)

    // Extract token from instrumentId if token is missing
    if (!validatedData.token && validatedData.instrumentId) {
      try {
        // Parse token from instrumentId format: "EXCHANGE-TOKEN" or "EXCHANGE_SEGMENT-TOKEN"
        const parts = validatedData.instrumentId.split('-')
        const lastPart = parts[parts.length - 1]
        const parsedToken = parseInt(lastPart, 10)
        if (!isNaN(parsedToken) && parsedToken > 0) {
          validatedData.token = parsedToken
          console.log(`✅ [WATCHLIST-API] Extracted token ${parsedToken} from instrumentId ${validatedData.instrumentId}`)
        }
      } catch (e) {
        console.warn(`⚠️ [WATCHLIST-API] Failed to extract token from instrumentId:`, e)
      }
    }

    // Validate that we have token or stockId after extraction attempt
    if (!validatedData.token && !validatedData.stockId) {
      return NextResponse.json({ 
        error: 'Token or stockId is required. Could not extract token from instrumentId.' 
      }, { status: 400 })
    }

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
