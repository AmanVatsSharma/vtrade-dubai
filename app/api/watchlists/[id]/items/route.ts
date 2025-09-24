/**
 * @file route.ts
 * @description API endpoints for watchlist item management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { supabaseServer } from '@/lib/supabase/supabase-server'
import { z } from 'zod'

const addItemSchema = z.object({
  stockId: z.string().uuid(),
  notes: z.string().max(500).optional(),
  alertPrice: z.number().positive().optional(),
  alertType: z.enum(['ABOVE', 'BELOW', 'BOTH']).optional(),
})

const updateItemSchema = z.object({
  notes: z.string().max(500).optional(),
  alertPrice: z.number().positive().optional(),
  alertType: z.enum(['ABOVE', 'BELOW', 'BOTH']).optional(),
  sortOrder: z.number().optional(),
})

// POST /api/watchlists/[id]/items - Add item to watchlist
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = addItemSchema.parse(body)

    // Verify watchlist exists and belongs to user
    const { data: watchlist, error: watchlistError } = await supabaseServer
      .from('Watchlist')
      .select('id')
      .eq('id', params.id)
      .eq('userId', session.user.id)
      .single()

    if (watchlistError) {
      if (watchlistError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 })
      }
      console.error('Error checking watchlist:', watchlistError)
      return NextResponse.json({ error: 'Failed to verify watchlist' }, { status: 500 })
    }

    // Check if stock already exists in watchlist
    const { data: existingItem, error: checkError } = await supabaseServer
      .from('WatchlistItem')
      .select('id')
      .eq('watchlistId', params.id)
      .eq('stockId', validatedData.stockId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing item:', checkError)
      return NextResponse.json({ error: 'Failed to check existing item' }, { status: 500 })
    }

    if (existingItem) {
      return NextResponse.json({ error: 'Stock already exists in watchlist' }, { status: 409 })
    }

    // Add item to watchlist
    const { data: item, error } = await supabaseServer
      .from('WatchlistItem')
      .insert({
        watchlistId: params.id,
        stockId: validatedData.stockId,
        notes: validatedData.notes,
        alertPrice: validatedData.alertPrice,
        alertType: validatedData.alertType || 'ABOVE',
        sortOrder: 0,
      })
      .select(`
        id,
        notes,
        alertPrice,
        alertType,
        sortOrder,
        createdAt,
        stock (
          id,
          instrumentId,
          exchange,
          ticker,
          name,
          ltp,
          close,
          segment,
          strikePrice,
          optionType,
          expiry,
          lot_size
        )
      `)
      .single()

    if (error) {
      console.error('Error adding item to watchlist:', error)
      return NextResponse.json({ error: 'Failed to add item to watchlist' }, { status: 500 })
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    
    console.error('Add watchlist item API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
