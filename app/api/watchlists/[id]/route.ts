/**
 * @file route.ts
 * @description API endpoints for individual watchlist operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { supabaseServer } from '@/lib/supabase/supabase-server'
import { z } from 'zod'

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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: watchlist, error } = await supabaseServer
      .from('Watchlist')
      .select(`
        id,
        name,
        description,
        color,
        isDefault,
        isPrivate,
        sortOrder,
        createdAt,
        updatedAt,
        watchlistItemCollection (
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
        )
      `)
      .eq('id', params.id)
      .eq('userId', session.user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 })
      }
      console.error('Error fetching watchlist:', error)
      return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 })
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
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = updateWatchlistSchema.parse(body)

    // If setting as default, unset other default watchlists
    if (validatedData.isDefault) {
      await supabaseServer
        .from('Watchlist')
        .update({ isDefault: false })
        .eq('userId', session.user.id)
        .neq('id', params.id)
    }

    const { data: watchlist, error } = await supabaseServer
      .from('Watchlist')
      .update({
        ...validatedData,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('userId', session.user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 })
      }
      console.error('Error updating watchlist:', error)
      return NextResponse.json({ error: 'Failed to update watchlist' }, { status: 500 })
    }

    return NextResponse.json({ watchlist })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    
    console.error('Update watchlist API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/watchlists/[id] - Delete watchlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if watchlist exists and belongs to user
    const { data: existingWatchlist, error: checkError } = await supabaseServer
      .from('Watchlist')
      .select('id, isDefault')
      .eq('id', params.id)
      .eq('userId', session.user.id)
      .single()

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 })
      }
      console.error('Error checking watchlist:', checkError)
      return NextResponse.json({ error: 'Failed to check watchlist' }, { status: 500 })
    }

    // Delete the watchlist (cascade will handle items)
    const { error } = await supabaseServer
      .from('Watchlist')
      .delete()
      .eq('id', params.id)
      .eq('userId', session.user.id)

    if (error) {
      console.error('Error deleting watchlist:', error)
      return NextResponse.json({ error: 'Failed to delete watchlist' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete watchlist API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
