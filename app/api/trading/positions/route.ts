import { NextResponse } from "next/server"
import { closePositionWithFundManagement } from "./actions"

export async function POST(req: Request) {
  try {
    const { positionId, tradingAccountId } = await req.json()

    if (!positionId || !tradingAccountId) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const result = await closePositionWithFundManagement(positionId, tradingAccountId)
    
    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Position closure error:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
