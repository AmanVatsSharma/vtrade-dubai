import { supabase } from './supabase-client'

/**
 * Calculates the required margin for a position
 */
export function calculateMarginRequired(price: number, quantity: number, segment: string, orderType: string = 'CNC') {
  const baseValue = quantity * price

  if (segment === 'NSE') {
    return orderType === 'MIS' ? baseValue / 200 : baseValue / 50 // 200x leverage for MIS, 50x for CNC
  }

  if (segment === 'NFO') {
    return baseValue / 100 // 100x leverage for F&O
  }

  return baseValue // Full margin for others
}

/**
 * Server-side function to manage funds for a position
 */
export async function manageFundsForPosition(
  tradingAccountId: string, 
  amount: number, 
  action: 'BLOCK' | 'RELEASE'
) {
  try {
    const response = await fetch('/api/trading/funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tradingAccountId,
        amount,
        type: action
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to manage funds')
    }

    return true
  } catch (error) {
    console.error('Fund management error:', error)
    throw error
  }
}

/**
 * Updates position and manages associated funds
 */
export async function updatePositionWithFunds(
  positionId: string, 
  tradingAccountId: string,
  updates: any,
  shouldReleaseMargin: boolean = false
) {
  try {
    // Get current position details first
    const { data: position, error: positionError } = await supabase
      .from('positions')
      .select('*')
      .eq('id', positionId)
      .single()

    if (positionError || !position) {
      throw new Error('Failed to fetch position details')
    }

    // If we're closing the position, calculate margin to release
    if (shouldReleaseMargin) {
      const marginToRelease = calculateMarginRequired(
        position.averagePrice,
        position.quantity,
        position.segment || 'NSE',
        position.productType
      )

      // Release the blocked margin
      await manageFundsForPosition(tradingAccountId, marginToRelease, 'RELEASE')
    }

    // Update the position
    const { error: updateError } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', positionId)

    if (updateError) {
      throw new Error('Failed to update position')
    }

    return true
  } catch (error) {
    console.error('Position update error:', error)
    throw error
  }
}
