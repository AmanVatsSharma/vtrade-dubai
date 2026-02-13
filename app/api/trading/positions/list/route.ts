/**
 * @file route.ts
 * @module api/trading/positions/list
 * @description Positions list endpoint (open + closed) for dashboard streaming.
 * @author BharatERP
 * @created 2025-11-06
 */

/**
 * Positions List API
 *
 * Returns list of positions (open and closed) for a user so that the
 * dashboard can highlight booked profits after the quantity reaches zero.
 */

export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { withApiTelemetry } from "@/lib/observability/api-telemetry"
import { getPositionPnLSettings } from "@/lib/server/position-pnl-settings"
import { isRedisEnabled, redisMGet } from "@/lib/redis/redis-client"

type ApiPositionPayload = {
  id: string
  symbol: string
  quantity: number
  averagePrice: number
  unrealizedPnL: number
  realizedPnL: number
  bookedPnL: number
  dayPnL: number
  stopLoss: number | null
  target: number | null
  createdAt: string
  status: "OPEN" | "CLOSED"
  isClosed: boolean
  currentPrice: number
  currentValue: number
  investedValue: number
  stock: {
    symbol: string | null
    name: string | null
    ltp: number | null
    instrumentId: string | null
    segment: string | null
  } | null
}

export async function GET(req: Request) {
  try {
    const { result } = await withApiTelemetry(req, { name: "trading_positions_list" }, async () => {
      const { searchParams } = new URL(req.url)
      const userId = searchParams.get("userId")

      // Get session for security
      const session = await auth()
      if (!session?.user) {
        console.warn("⚠️ [API-POSITIONS-LIST] Unauthorized access attempt")
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      // Ensure user can only fetch their own data
      if (userId && userId !== session.user.id) {
        console.warn("🚫 [API-POSITIONS-LIST] Forbidden request", {
          sessionUserId: session.user.id,
          requestedUserId: userId
        })
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }

      // Get trading account
      const tradingAccount = await prisma.tradingAccount.findUnique({
        where: { userId: session.user.id }
      })

      if (!tradingAccount) {
        const pnl = await getPositionPnLSettings()
        return NextResponse.json({ success: true, positions: [], meta: { pnlMode: pnl.mode, workerHealthy: pnl.workerHealthy } })
      }

      const pnlSettings = await getPositionPnLSettings()

      // Fetch all positions (open + closed) so UI can show booked profits
      const positions = await prisma.position.findMany({
        where: {
          tradingAccountId: tradingAccount.id
        },
        include: {
          Stock: {
            select: {
              symbol: true,
              name: true,
              ltp: true,
              instrumentId: true,
              segment: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      })

      const openPositions: ApiPositionPayload[] = []
      const closedPositions: ApiPositionPayload[] = []

      // Optional: overlay PnL from Redis cache for smoother server-side PnL mode.
      const redisPnLByPositionId = new Map<string, { unrealizedPnL: number; dayPnL: number; currentPrice?: number; updatedAtMs: number }>()
      if (isRedisEnabled()) {
        try {
          const maxAgeMs = Math.max(1000, Number(process.env.REDIS_POSITIONS_PNL_MAX_AGE_MS || 15_000))
          const keys = positions.map((p) => `positions:pnl:${p.id}`)
          const values = await redisMGet(keys)
          values.forEach((raw, idx) => {
            if (!raw) return
            try {
              const parsed = JSON.parse(raw) as any
              const updatedAtMs = Number(parsed?.updatedAtMs)
              if (!Number.isFinite(updatedAtMs) || Date.now() - updatedAtMs > maxAgeMs) return
              const unrealizedPnL = Number(parsed?.unrealizedPnL)
              const dayPnL = Number(parsed?.dayPnL)
              if (!Number.isFinite(unrealizedPnL) || !Number.isFinite(dayPnL)) return
              const currentPrice = parsed?.currentPrice != null ? Number(parsed.currentPrice) : undefined
              const positionId = positions[idx]?.id
              if (!positionId) return
              redisPnLByPositionId.set(positionId, { unrealizedPnL, dayPnL, currentPrice, updatedAtMs })
            } catch {
              // ignore parse errors
            }
          })
        } catch {
          // Best-effort overlay only
        }
      }

      positions.forEach((position) => {
        const isClosed = position.quantity === 0
        const averagePrice = Number(position.averagePrice)
        const bookedPnL = Number(position.unrealizedPnL ?? 0)
        const livePnL = Number(position.dayPnL ?? 0)
        const redisPnL = redisPnLByPositionId.get(position.id) || null

        const mappedPosition: ApiPositionPayload = {
          id: position.id,
          symbol: position.symbol,
          quantity: position.quantity,
          averagePrice,
          unrealizedPnL: redisPnL ? redisPnL.unrealizedPnL : Number(position.unrealizedPnL),
          realizedPnL: bookedPnL,
          bookedPnL,
          dayPnL: redisPnL ? redisPnL.dayPnL : livePnL,
          stopLoss: position.stopLoss ? Number(position.stopLoss) : null,
          target: position.target ? Number(position.target) : null,
          createdAt: position.createdAt.toISOString(),
          status: isClosed ? "CLOSED" : "OPEN",
          isClosed,
          currentPrice: redisPnL?.currentPrice || position.Stock?.ltp || averagePrice,
          currentValue: (redisPnL?.currentPrice || position.Stock?.ltp || averagePrice) * position.quantity,
          investedValue: averagePrice * position.quantity,
          stock: position.Stock
            ? {
                symbol: position.Stock.symbol ?? null,
                name: position.Stock.name ?? null,
                ltp: position.Stock.ltp ?? null,
                instrumentId: position.Stock.instrumentId ?? null,
                segment: position.Stock.segment ?? null
              }
            : null
        }

        if (isClosed) {
          closedPositions.push(mappedPosition)
        } else {
          openPositions.push(mappedPosition)
        }
      })

      const orderedPositions = [...openPositions, ...closedPositions]

      return NextResponse.json({
        success: true,
        positions: orderedPositions,
        meta: {
          pnlMode: pnlSettings.mode,
          workerHealthy: pnlSettings.workerHealthy,
        }
      })
    })

    return result
  } catch (error: any) {
    console.error("❌ [API-POSITIONS-LIST] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch positions"
      },
      { status: 500 }
    )
  }
}
