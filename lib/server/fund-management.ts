import { supabaseServer } from "@/lib/supabase/supabase-server"

// RPC-backed funds management – using Supabase edge functions

export async function blockMargin(tradingAccountId: string, amount: number, idempotencyKey?: string) {
  console.log("🔒 [FUND-MGMT] Blocking margin:", {
    tradingAccountId,
    amount,
    idempotencyKey
  })
  
  const { error } = await supabaseServer.rpc('fn_block_margin', { 
    account_id: tradingAccountId, 
    p_amount: amount, 
    p_idem_key: idempotencyKey || null 
  })
  
  if (error) {
    console.error("❌ [FUND-MGMT] Block margin failed:", error)
    throw new Error(`blockMargin failed: ${error.message}`)
  }
  
  console.log("✅ [FUND-MGMT] Margin blocked successfully")
  return { success: true }
}

export async function releaseMargin(tradingAccountId: string, amount: number, idempotencyKey?: string) {
  console.log("🔓 [FUND-MGMT] Releasing margin:", {
    tradingAccountId,
    amount,
    idempotencyKey
  })
  
  const { error } = await supabaseServer.rpc('fn_release_margin', { 
    account_id: tradingAccountId, 
    p_amount: amount, 
    p_idem_key: idempotencyKey || null 
  })
  
  if (error) {
    console.error("❌ [FUND-MGMT] Release margin failed:", error)
    throw new Error(`releaseMargin failed: ${error.message}`)
  }
  
  console.log("✅ [FUND-MGMT] Margin released successfully")
  return { success: true }
}

export async function debit(tradingAccountId: string, amount: number, description?: string, idempotencyKey?: string) {
  console.log("💸 [FUND-MGMT] Debiting account:", {
    tradingAccountId,
    amount,
    description,
    idempotencyKey
  })
  
  const { error } = await supabaseServer.rpc('fn_debit', { 
    account_id: tradingAccountId, 
    p_amount: amount, 
    p_desc: description || null, 
    p_idem_key: idempotencyKey || null 
  })
  
  if (error) {
    console.error("❌ [FUND-MGMT] Debit failed:", error)
    throw new Error(`debit failed: ${error.message}`)
  }
  
  console.log("✅ [FUND-MGMT] Account debited successfully")
  return { success: true }
}

export async function credit(tradingAccountId: string, amount: number, description?: string, idempotencyKey?: string) {
  console.log("💰 [FUND-MGMT] Crediting account:", {
    tradingAccountId,
    amount,
    description,
    idempotencyKey
  })
  
  const { error } = await supabaseServer.rpc('fn_credit', { 
    account_id: tradingAccountId, 
    p_amount: amount, 
    p_desc: description || null, 
    p_idem_key: idempotencyKey || null 
  })
  
  if (error) {
    console.error("❌ [FUND-MGMT] Credit failed:", error)
    throw new Error(`credit failed: ${error.message}`)
  }
  
  console.log("✅ [FUND-MGMT] Account credited successfully")
  return { success: true }
}


