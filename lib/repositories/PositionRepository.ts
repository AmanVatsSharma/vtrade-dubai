/**
 * Position Repository
 * 
 * Handles all database operations for positions:
 * - Creating and updating positions
 * - Position queries
 * - P&L calculations
 * - Position analytics
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

console.log("📊 [POSITION-REPO] Module loaded")

export interface CreatePositionData {
  tradingAccountId: string
  stockId: string
  symbol: string
  quantity: number
  averagePrice: number
}

export interface UpdatePositionData {
  quantity?: number
  averagePrice?: number
  unrealizedPnL?: number
  dayPnL?: number
  stopLoss?: number | null
  target?: number | null
}

export class PositionRepository {
  
  /**
   * Create a new position
   */
  async create(
    data: CreatePositionData,
    tx?: Prisma.TransactionClient
  ) {
    console.log("📊 [POSITION-REPO] Creating position:", {
      symbol: data.symbol,
      quantity: data.quantity,
      averagePrice: data.averagePrice
    })

    const client = tx || prisma

    const position = await client.position.create({
      data: {
        tradingAccountId: data.tradingAccountId,
        stockId: data.stockId,
        symbol: data.symbol,
        quantity: data.quantity,
        averagePrice: data.averagePrice,
        unrealizedPnL: 0,
        dayPnL: 0,
        createdAt: new Date()
      },
      include: {
        Stock: {
          select: {
            instrumentId: true,
            segment: true,
            lot_size: true,
            strikePrice: true,
            optionType: true,
            expiry: true
          }
        }
      }
    })

    console.log("✅ [POSITION-REPO] Position created:", position.id)
    return position
  }

  /**
   * Update position
   */
  async update(
    positionId: string,
    data: UpdatePositionData,
    tx?: Prisma.TransactionClient
  ) {
    console.log("🔄 [POSITION-REPO] Updating position:", {
      positionId,
      updates: data
    })

    const client = tx || prisma

    const position = await client.position.update({
      where: { id: positionId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        Stock: {
          select: {
            instrumentId: true,
            segment: true
          }
        }
      }
    })

    console.log("✅ [POSITION-REPO] Position updated:", positionId)
    return position
  }

  /**
   * Find position by ID
   */
  async findById(
    positionId: string,
    tx?: Prisma.TransactionClient
  ) {
    console.log("🔍 [POSITION-REPO] Finding position by ID:", positionId)

    const client = tx || prisma

    const position = await client.position.findUnique({
      where: { id: positionId },
      include: {
        tradingAccount: {
          select: {
            id: true,
            userId: true,
            balance: true,
            availableMargin: true
          }
        },
        Stock: {
          select: {
            instrumentId: true,
            symbol: true,
            segment: true,
            lot_size: true,
            strikePrice: true,
            optionType: true,
            expiry: true
          }
        }
      }
    })

    if (position) {
      console.log("✅ [POSITION-REPO] Position found")
    } else {
      console.log("⚠️ [POSITION-REPO] Position not found")
    }

    return position
  }

  /**
   * Find position by symbol
   */
  async findBySymbol(
    tradingAccountId: string,
    symbol: string,
    tx?: Prisma.TransactionClient
  ) {
    console.log("🔍 [POSITION-REPO] Finding position by symbol:", {
      tradingAccountId,
      symbol
    })

    const client = tx || prisma

    const position = await client.position.findFirst({
      where: {
        tradingAccountId,
        symbol,
        quantity: { not: 0 } // Only active positions
      },
      include: {
        Stock: {
          select: {
            instrumentId: true,
            segment: true,
            lot_size: true
          }
        }
      }
    })

    if (position) {
      console.log("✅ [POSITION-REPO] Position found")
    } else {
      console.log("⚠️ [POSITION-REPO] No position found for symbol")
    }

    return position
  }

  /**
   * Find all active positions for account
   */
  async findActive(
    tradingAccountId: string,
    tx?: Prisma.TransactionClient
  ) {
    console.log("🔍 [POSITION-REPO] Finding active positions:", tradingAccountId)

    const client = tx || prisma

    const positions = await client.position.findMany({
      where: {
        tradingAccountId,
        quantity: { not: 0 }
      },
      include: {
        Stock: {
          select: {
            instrumentId: true,
            symbol: true,
            segment: true,
            lot_size: true,
            strikePrice: true,
            optionType: true,
            expiry: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`✅ [POSITION-REPO] Found ${positions.length} active positions`)
    return positions
  }

  /**
   * Find all positions (including closed)
   */
  async findAll(
    tradingAccountId: string,
    limit: number = 100,
    offset: number = 0,
    tx?: Prisma.TransactionClient
  ) {
    console.log("🔍 [POSITION-REPO] Finding all positions:", {
      tradingAccountId,
      limit,
      offset
    })

    const client = tx || prisma

    const positions = await client.position.findMany({
      where: { tradingAccountId },
      include: {
        Stock: {
          select: {
            instrumentId: true,
            symbol: true,
            segment: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    console.log(`✅ [POSITION-REPO] Found ${positions.length} positions`)
    return positions
  }

  /**
   * Upsert position (create or update based on existing position)
   */
  async upsert(
    tradingAccountId: string,
    stockId: string,
    symbol: string,
    quantityDelta: number,
    price: number,
    tx?: Prisma.TransactionClient
  ) {
    console.log("🔄 [POSITION-REPO] Upserting position:", {
      tradingAccountId,
      symbol,
      quantityDelta,
      price
    })

    const client = tx || prisma

    // Find existing position
    const existingPosition = await this.findBySymbol(tradingAccountId, symbol, client)

    if (existingPosition) {
      console.log("📝 [POSITION-REPO] Updating existing position")
      
      const newQuantity = existingPosition.quantity + quantityDelta
      
      // If position is being closed
      if (newQuantity === 0) {
        console.log("🔒 [POSITION-REPO] Closing position (quantity = 0)")
        return this.update(
          existingPosition.id,
          {
            quantity: 0,
            stopLoss: null,
            target: null
          },
          client
        )
      }
      
      // Calculate new average price
      const existingValue = Number(existingPosition.averagePrice) * Math.abs(existingPosition.quantity)
      const newValue = price * Math.abs(quantityDelta)
      const totalValue = existingValue + newValue
      const totalQuantity = Math.abs(existingPosition.quantity) + Math.abs(quantityDelta)
      const newAveragePrice = totalValue / totalQuantity

      console.log("📊 [POSITION-REPO] New average price calculated:", {
        newQuantity,
        newAveragePrice
      })

      return this.update(
        existingPosition.id,
        {
          quantity: newQuantity,
          averagePrice: newAveragePrice
        },
        client
      )
    } else {
      console.log("📝 [POSITION-REPO] Creating new position")
      return this.create(
        {
          tradingAccountId,
          stockId,
          symbol,
          quantity: quantityDelta,
          averagePrice: price
        },
        client
      )
    }
  }

  /**
   * Close position (set quantity to 0)
   */
  async close(
    positionId: string,
    realizedPnL: number,
    tx?: Prisma.TransactionClient
  ) {
    console.log("🔒 [POSITION-REPO] Closing position:", {
      positionId,
      realizedPnL
    })

    return this.update(
      positionId,
      {
        quantity: 0,
        unrealizedPnL: realizedPnL,
        dayPnL: realizedPnL,
        stopLoss: null,
        target: null
      },
      tx
    )
  }

  /**
   * Delete position
   */
  async delete(
    positionId: string,
    tx?: Prisma.TransactionClient
  ) {
    console.log("🗑️ [POSITION-REPO] Deleting position:", positionId)

    const client = tx || prisma

    await client.position.delete({
      where: { id: positionId }
    })

    console.log("✅ [POSITION-REPO] Position deleted")
  }

  /**
   * Get position statistics
   */
  async getStatistics(
    tradingAccountId: string,
    tx?: Prisma.TransactionClient
  ) {
    console.log("📊 [POSITION-REPO] Getting position statistics:", tradingAccountId)

    const client = tx || prisma

    const positions = await client.position.findMany({
      where: { tradingAccountId }
    })

    const active = positions.filter(p => p.quantity !== 0)
    const closed = positions.filter(p => p.quantity === 0)
    
    const totalUnrealizedPnL = active.reduce((sum, p) => sum + Number(p.unrealizedPnL), 0)
    const totalRealizedPnL = closed.reduce((sum, p) => sum + Number(p.unrealizedPnL), 0)
    
    const profitable = positions.filter(p => Number(p.unrealizedPnL) > 0).length
    const losing = positions.filter(p => Number(p.unrealizedPnL) < 0).length

    const stats = {
      total: positions.length,
      active: active.length,
      closed: closed.length,
      totalUnrealizedPnL,
      totalRealizedPnL,
      profitable,
      losing,
      winRate: positions.length > 0 ? (profitable / positions.length) * 100 : 0
    }

    console.log("✅ [POSITION-REPO] Statistics calculated:", stats)
    return stats
  }
}

/**
 * Create repository instance
 */
export function createPositionRepository(): PositionRepository {
  console.log("🏭 [POSITION-REPO] Creating repository instance")
  return new PositionRepository()
}

console.log("✅ [POSITION-REPO] Module initialized")