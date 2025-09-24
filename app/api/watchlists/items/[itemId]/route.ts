/**
 * @file route.ts
 * @description API endpoints for individual watchlist item operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { supabaseServer } from '@/lib/supabase/supabase-server'
import { z } from 'zod'

const updateItemSchema = z.object({
  notes: z.string().max(500).optional(),
  alertPrice: z.number().positive().optional(),
  alertType: z.enum(['ABOVE', 'BELOW', 'BOTH']).optional(),
  sortOrder: z.number().optional(),
})

// GET /api/watchlists/items/[itemId] - Get specific watchlist item
export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: item, error } = await supabaseServer
      .from('WatchlistItem')
      .select(`
        id,
        notes,
        alertPrice,
        alertType,
        sortOrder,
        createdAt,
        updatedAt,
        watchlist!inner (
          id,
          userId
        ),
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
      .eq('id', params.itemId)
      .eq('watchlist.userId', session.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      console.error('Error fetching watchlist item:', error)
      return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 })
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateItemSchema.parse(body)

    // Update the item
    const { data: item, error } = await supabaseServer
      .from('WatchlistItem')
      .update({
        ...validatedData,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', params.itemId)
      .select(`
        id,
        notes,
        alertPrice,
        alertType,
        sortOrder,
        createdAt,
        updatedAt,
        watchlist!inner (
          id,
          userId
        ),
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
      .eq('watchlist.userId', session.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      console.error('Error updating watchlist item:', error)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    
    console.error('Update watchlist item API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/watchlists/items/[itemId] - Remove item from watchlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the item
    const { error } = await supabaseServer
      .from('WatchlistItem')
      .delete()
      .eq('id', params.itemId)
      .select(`
        watchlist!inner (
          userId
        )
      `)
      .eq('watchlist.userId', session.user.id)

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      console.error('Error deleting watchlist item:', error)
      return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete watchlist item API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
