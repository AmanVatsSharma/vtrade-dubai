/**
 * @file route.ts
 * @description API endpoints for enhanced watchlist management
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { supabaseServer } from '@/lib/supabase/supabase-server'
import { z } from 'zod'

// Validation schemas
const createWatchlistSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  isDefault: z.boolean().optional(),
})

const updateWatchlistSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(200).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().optional(),
})

// GET /api/watchlists - Get all watchlists for user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: watchlists, error } = await supabaseServer
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
      .eq('userId', session.user.id)
      .order('sortOrder', { ascending: true })
      .order('createdAt', { ascending: true })

    if (error) {
      console.error('Error fetching watchlists:', error)
      return NextResponse.json({ error: 'Failed to fetch watchlists' }, { status: 500 })
    }

    return NextResponse.json({ watchlists })
  } catch (error) {
    console.error('Watchlists API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/watchlists - Create new watchlist
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = createWatchlistSchema.parse(body)

    // If setting as default, unset other default watchlists
    if (validatedData.isDefault) {
      await supabaseServer
        .from('Watchlist')
        .update({ isDefault: false })
        .eq('userId', session.user.id)
    }

    const { data: watchlist, error } = await supabaseServer
      .from('Watchlist')
      .insert({
        userId: session.user.id,
        name: validatedData.name,
        description: validatedData.description,
        color: validatedData.color || '#3B82F6',
        isDefault: validatedData.isDefault || false,
        sortOrder: 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating watchlist:', error)
      return NextResponse.json({ error: 'Failed to create watchlist' }, { status: 500 })
    }

    return NextResponse.json({ watchlist }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    
    console.error('Create watchlist API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
