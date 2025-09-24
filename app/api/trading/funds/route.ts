import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase/supabase-server'

/**
 * Updates trading account funds atomically
 * @param {string} tradingAccountId - Trading account ID
 * @param {number} amount - Amount to update (positive for credit, negative for debit)
 * @param {string} type - Type of update ('BLOCK' | 'RELEASE' | 'CREDIT' | 'DEBIT')
 */
async function updateFunds(tradingAccountId: string, amount: number, type: 'BLOCK' | 'RELEASE' | 'CREDIT' | 'DEBIT') {
  console.log("💼 [FUNDS-UPDATE] Starting fund update operation:", { tradingAccountId, amount, type })
  
  console.log("🔍 [FUNDS-UPDATE] Fetching current account state...")
  const { data: account, error: fetchError } = await supabaseServer
    .from('trading_accounts')
    .select('balance, availableMargin, usedMargin')
    .eq('id', tradingAccountId)
    .single()

  if (fetchError || !account) {
    console.error("❌ [FUNDS-UPDATE] Failed to fetch account:", fetchError)
    throw new Error(`Failed to fetch account: ${fetchError?.message}`)
  }

  console.log("📊 [FUNDS-UPDATE] Current account state:", account)

  let updates = {}
  
  switch (type) {
    case 'BLOCK':
      console.log("🔒 [FUNDS-UPDATE] Processing BLOCK operation...")
      if (account.availableMargin < amount) {
        console.error("❌ [FUNDS-UPDATE] Insufficient available margin:", { available: account.availableMargin, required: amount })
        throw new Error('Insufficient available margin')
      }
      updates = {
        availableMargin: account.availableMargin - amount,
        usedMargin: account.usedMargin + amount
      }
      break
      
    case 'RELEASE':
      console.log("🔓 [FUNDS-UPDATE] Processing RELEASE operation...")
      updates = {
        availableMargin: account.availableMargin + amount,
        usedMargin: account.usedMargin - amount
      }
      break
      
    case 'CREDIT':
      console.log("💰 [FUNDS-UPDATE] Processing CREDIT operation...")
      updates = {
        balance: account.balance + amount,
        availableMargin: account.availableMargin + amount
      }
      break
      
    case 'DEBIT':
      console.log("💸 [FUNDS-UPDATE] Processing DEBIT operation...")
      if (account.availableMargin < amount) {
        console.error("❌ [FUNDS-UPDATE] Insufficient available margin for debit:", { available: account.availableMargin, required: amount })
        throw new Error('Insufficient available margin')
      }
      updates = {
        balance: account.balance - amount,
        availableMargin: account.availableMargin - amount
      }
      break
  }

  console.log("📝 [FUNDS-UPDATE] Calculated updates:", updates)

  console.log("💾 [FUNDS-UPDATE] Applying account updates...")
  const { error: updateError } = await supabaseServer
    .from('trading_accounts')
    .update(updates)
    .eq('id', tradingAccountId)

  if (updateError) {
    console.error("❌ [FUNDS-UPDATE] Failed to update account:", updateError)
    throw new Error(`Failed to update funds: ${updateError.message}`)
  }
  console.log("✅ [FUNDS-UPDATE] Account updated successfully")

  // Log the transaction
  console.log("📋 [FUNDS-UPDATE] Creating transaction log...")
  const transactionData = {
    tradingAccountId,
    amount: type === 'BLOCK' || type === 'DEBIT' ? -amount : amount,
    type: type === 'BLOCK' || type === 'RELEASE' ? 'MARGIN' : type,
    description: `${type} operation`
  }
  console.log("📋 [FUNDS-UPDATE] Transaction data:", transactionData)
  
  await supabaseServer.from('transactions').insert(transactionData)
  console.log("✅ [FUNDS-UPDATE] Transaction logged successfully")
  
  console.log("🎉 [FUNDS-UPDATE] Fund update operation completed successfully")
}

export async function POST(req: Request) {
  console.log("🌐 [API-FUNDS] POST request received")
  
  try {
    const body = await req.json()
    console.log("📝 [API-FUNDS] Request body:", body)
    
    const { tradingAccountId, amount, type } = body

    if (!tradingAccountId || !amount || !type) {
      console.error("❌ [API-FUNDS] Missing required fields:", { tradingAccountId, amount, type })
      return new NextResponse('Missing required fields', { status: 400 })
    }

    console.log("💰 [API-FUNDS] Processing fund operation:", { tradingAccountId, amount, type })
    await updateFunds(tradingAccountId, amount, type)
    console.log("✅ [API-FUNDS] Fund operation completed successfully")
    
    const result = { success: true }
    console.log("🎉 [API-FUNDS] Fund operation result:", result)
    
    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('❌ [API-FUNDS] Fund management error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.log("📤 [API-FUNDS] Sending error response:", errorMessage)
    
    return new NextResponse(
      JSON.stringify({ error: errorMessage }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
