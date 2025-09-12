import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/supabase-server'

/**
 * Updates trading account funds atomically
 * @param {string} tradingAccountId - Trading account ID
 * @param {number} amount - Amount to update (positive for credit, negative for debit)
 * @param {string} type - Type of update ('BLOCK' | 'RELEASE' | 'CREDIT' | 'DEBIT')
 */
async function updateFunds(tradingAccountId: string, amount: number, type: 'BLOCK' | 'RELEASE' | 'CREDIT' | 'DEBIT') {
  const { data: account, error: fetchError } = await supabaseServer
    .from('trading_accounts')
    .select('balance, availableMargin, usedMargin')
    .eq('id', tradingAccountId)
    .single()

  if (fetchError || !account) {
    throw new Error(`Failed to fetch account: ${fetchError?.message}`)
  }

  let updates = {}
  
  switch (type) {
    case 'BLOCK':
      if (account.availableMargin < amount) {
        throw new Error('Insufficient available margin')
      }
      updates = {
        availableMargin: account.availableMargin - amount,
        usedMargin: account.usedMargin + amount
      }
      break
      
    case 'RELEASE':
      updates = {
        availableMargin: account.availableMargin + amount,
        usedMargin: account.usedMargin - amount
      }
      break
      
    case 'CREDIT':
      updates = {
        balance: account.balance + amount,
        availableMargin: account.availableMargin + amount
      }
      break
      
    case 'DEBIT':
      if (account.availableMargin < amount) {
        throw new Error('Insufficient available margin')
      }
      updates = {
        balance: account.balance - amount,
        availableMargin: account.availableMargin - amount
      }
      break
  }

  const { error: updateError } = await supabaseServer
    .from('trading_accounts')
    .update(updates)
    .eq('id', tradingAccountId)

  if (updateError) {
    throw new Error(`Failed to update funds: ${updateError.message}`)
  }

  // Log the transaction
  await supabaseServer.from('transactions').insert({
    tradingAccountId,
    amount: type === 'BLOCK' || type === 'DEBIT' ? -amount : amount,
    type: type === 'BLOCK' || type === 'RELEASE' ? 'MARGIN' : type,
    description: `${type} operation`
  })
}

export async function POST(req: Request) {
  try {
    const { tradingAccountId, amount, type } = await req.json()

    if (!tradingAccountId || !amount || !type) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    await updateFunds(tradingAccountId, amount, type)
    
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Fund management error:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
