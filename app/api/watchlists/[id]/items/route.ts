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
  stockId: z.string().optional(), // Optional, kept for backward compatibility (no UUID validation - not used in transaction)
  token: z.number().optional(), // Optional - will be extracted from instrumentId if missing
  symbol: z.string().optional(), // Optional - will be extracted or defaulted
  exchange: z.string().optional(), // Optional - will be extracted or defaulted
  segment: z.string().optional(), // Optional - will be extracted or defaulted
  name: z.string().optional(), // Optional - will be extracted or defaulted
  ltp: z.number().optional(),
  close: z.number().optional(),
  strikePrice: z.number().optional(),
  optionType: z.enum(['CE', 'PE']).optional(),
  expiry: z.string().optional(), // ISO date string or YYYYMMDD format
  lotSize: z.number().optional(),
  instrumentId: z.string().optional(), // Can be used to extract token if missing
  // Additional fields that may be sent but not required
  ticker: z.string().optional(),
  last_price: z.number().optional(),
  change: z.number().optional(),
  changePercent: z.number().optional(),
  id: z.string().optional(), // May be sent but not used
  // Watchlist item specific fields
  notes: z.string().max(500).optional(),
  alertPrice: z.number().positive().optional(),
  alertType: z.enum(['ABOVE', 'BELOW', 'BOTH']).optional(),
}).refine((data) => {
  // Either token or stockId or instrumentId must be provided
  return data.token !== undefined || data.stockId !== undefined || data.instrumentId !== undefined
}, {
  message: "Either token, stockId, or instrumentId must be provided"
})

// POST /api/watchlists/[id]/items - Add item to watchlist
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: any = null
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    body = await request.json()
    console.log('📥 [WATCHLIST-API] Received request body:', JSON.stringify(body, null, 2))
    
    let validatedData = addItemSchema.parse(body)

    // Map last_price to ltp if ltp is not provided
    if (validatedData.ltp === undefined && validatedData.last_price !== undefined) {
      validatedData.ltp = validatedData.last_price
      console.log(`✅ [WATCHLIST-API] Mapped last_price to ltp: ${validatedData.ltp}`)
    }

    // Extract token and other fields from instrumentId if missing
    if (validatedData.instrumentId) {
      try {
        // Parse instrumentId format: "EXCHANGE-TOKEN" or "EXCHANGE_SEGMENT-TOKEN"
        const parts = validatedData.instrumentId.split('-')
        const exchangePart = parts[0] // e.g., "NSE", "NSE_EQ", "MCX_FO"
        const lastPart = parts[parts.length - 1]
        const parsedToken = parseInt(lastPart, 10)
        
        if (!isNaN(parsedToken) && parsedToken > 0) {
          validatedData.token = parsedToken
          console.log(`✅ [WATCHLIST-API] Extracted token ${parsedToken} from instrumentId ${validatedData.instrumentId}`)
        }
        
        // Extract exchange and segment from instrumentId if missing
        if (!validatedData.exchange && exchangePart) {
          // Normalize exchange: "NSE_EQ" -> "NSE", "MCX_FO" -> "MCX_FO"
          if (exchangePart.includes('MCX')) {
            validatedData.exchange = 'MCX_FO'
            validatedData.segment = validatedData.segment || 'MCX_FO'
          } else if (exchangePart.includes('NSE')) {
            validatedData.exchange = exchangePart.includes('_FO') ? 'NSE_FO' : 'NSE'
            validatedData.segment = validatedData.segment || validatedData.exchange
          } else if (exchangePart.includes('BSE')) {
            validatedData.exchange = exchangePart.includes('_FO') ? 'BSE_FO' : 'BSE'
            validatedData.segment = validatedData.segment || validatedData.exchange
          } else {
            validatedData.exchange = exchangePart
            validatedData.segment = validatedData.segment || exchangePart
          }
          console.log(`✅ [WATCHLIST-API] Extracted exchange/segment from instrumentId: ${validatedData.exchange}/${validatedData.segment}`)
        }
      } catch (e) {
        console.warn(`⚠️ [WATCHLIST-API] Failed to extract data from instrumentId:`, e)
      }
    }

    // Provide defaults for required fields if missing
    if (!validatedData.symbol) {
      validatedData.symbol = validatedData.name || 'UNKNOWN'
      console.log(`⚠️ [WATCHLIST-API] Missing symbol, using default: ${validatedData.symbol}`)
    }
    
    if (!validatedData.exchange) {
      validatedData.exchange = 'NSE'
      validatedData.segment = validatedData.segment || 'NSE'
      console.log(`⚠️ [WATCHLIST-API] Missing exchange, using default: NSE`)
    }
    
    if (!validatedData.segment) {
      validatedData.segment = validatedData.exchange
      console.log(`⚠️ [WATCHLIST-API] Missing segment, using exchange: ${validatedData.segment}`)
    }
    
    if (!validatedData.name) {
      validatedData.name = validatedData.symbol || 'Unknown Instrument'
      console.log(`⚠️ [WATCHLIST-API] Missing name, using symbol: ${validatedData.name}`)
    }

    // Validate that we have token or stockId after extraction attempt
    if (!validatedData.token && !validatedData.stockId) {
      console.error('❌ [WATCHLIST-API] Missing token and stockId after extraction:', validatedData)
      return NextResponse.json({ 
        error: 'Token or stockId is required. Could not extract token from instrumentId.',
        received: {
          hasToken: !!validatedData.token,
          hasStockId: !!validatedData.stockId,
          hasInstrumentId: !!validatedData.instrumentId,
          instrumentId: validatedData.instrumentId
        }
      }, { status: 400 })
    }
    
    console.log('✅ [WATCHLIST-API] Validated data:', {
      token: validatedData.token,
      stockId: validatedData.stockId,
      symbol: validatedData.symbol,
      exchange: validatedData.exchange,
      segment: validatedData.segment,
      name: validatedData.name
    })

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
      console.error('❌ [WATCHLIST-API] Validation error:', {
        errors: error.errors,
        receivedBody: body
      })
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: error.errors,
        received: body
      }, { status: 400 })
    }
    
    console.error('❌ [WATCHLIST-API] Add watchlist item error:', error)
    const statusCode = error instanceof Error && error.message.includes('already exists') ? 409 :
                       error instanceof Error && error.message.includes('not found') ? 404 : 500
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: statusCode })
  }
}
