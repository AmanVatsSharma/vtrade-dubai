import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { Database } from "@/types/supabase"

/**
 * Server-side Supabase client
 * Use this in API routes and Server Components
 */
export async function getServerSupabase() {
  const supabase = createServerComponentClient<Database>({
    cookies: () => cookies()
  })
  return supabase
}

/**
 * Close a position and properly handle the fund management
 */
export async function closePositionWithFundManagement(
  positionId: string,
  tradingAccountId: string
) {
  const supabase = await getServerSupabase()

  // Start a Supabase transaction
  const { data: position, error: positionError } = await supabase
    .from("positions")
    .select("*")
    .eq("id", positionId)
    .single()

  if (positionError || !position) {
    throw new Error(`Failed to fetch position: ${positionError?.message}`)
  }

  // Calculate margin to release
  const marginToRelease = Math.abs(position.quantity * position.averagePrice)
  
  // Update trading account - release margin
  const { error: accountError } = await supabase
    .from("trading_accounts")
    .update({
      availableMargin: supabase.rpc("increment", { 
        row_id: tradingAccountId,
        amount: marginToRelease,
        column_name: "availableMargin"
      }),
      usedMargin: supabase.rpc("decrement", {
        row_id: tradingAccountId,
        amount: marginToRelease,
        column_name: "usedMargin"
      })
    })
    .eq("id", tradingAccountId)

  if (accountError) {
    throw new Error(`Failed to update account margins: ${accountError.message}`)
  }

  // Log the transaction
  const { error: transactionError } = await supabase
    .from("transactions")
    .insert({
      tradingAccountId,
      amount: marginToRelease,
      type: "MARGIN",
      description: `Released margin for closed position ${position.symbol}`
    })

  if (transactionError) {
    throw new Error(`Failed to log transaction: ${transactionError.message}`)
  }

  // Close the position by setting quantity to 0 and storing the final P&L
  const { error: closeError } = await supabase
    .from("positions")
    .update({
      quantity: 0,
      unrealizedPnL: position.unrealizedPnL, // Store the final P&L
      dayPnL: position.dayPnL // Store the final day P&L
    })
    .eq("id", positionId)

  if (closeError) {
    throw new Error(`Failed to close position: ${closeError.message}`)
  }

  return {
    success: true,
    marginReleased: marginToRelease,
    position: position
  }
}
