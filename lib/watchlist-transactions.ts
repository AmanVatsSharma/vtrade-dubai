/**
 * @file watchlist-transactions.ts
 * @description Prisma transaction utilities for watchlist operations
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { withTransaction, PrismaTransactionClient } from "@/lib/database-transactions"

/**
 * Transaction wrapper for creating a watchlist
 */
export const withCreateWatchlistTransaction = async (
  userId: string,
  data: {
    name: string
    description?: string
    color?: string
    isDefault?: boolean
  }
) => {
  return withTransaction(async (tx) => {
    console.log("📋 Creating watchlist for user:", userId)

    // If setting as default, try to unset other default watchlists (best-effort; ignore if column doesn't exist)
    if (data.isDefault) {
      try {
        await tx.watchlist.updateMany({
          where: {
            userId,
            // @ts-expect-error: Column may not exist in DB yet
            isDefault: true,
          } as any,
          // @ts-expect-error: Column may not exist in DB yet
          data: { isDefault: false } as any,
        })
      } catch (e) {
        console.warn("⚠️ isDefault column not present yet; skipping unset of other defaults")
      }
    }

    // Create the watchlist (attempt enhanced fields; fall back to minimal if DB schema lacks columns)
    let watchlist
    try {
      watchlist = await tx.watchlist.create({
        data: {
          userId,
          name: data.name,
          // @ts-expect-error: Columns may not exist; Prisma will throw and we fallback
          description: data.description,
          // @ts-expect-error: Columns may not exist; Prisma will throw and we fallback
          color: data.color || "#3B82F6",
          // @ts-expect-error: Columns may not exist; Prisma will throw and we fallback
          isDefault: data.isDefault || false,
          // @ts-expect-error: Columns may not exist; Prisma will throw and we fallback
          sortOrder: 0,
        } as any,
        select: {
          id: true,
          userId: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              watchlistId: true,
              stockId: true,
              createdAt: true,
              stock: true,
            },
          },
        },
      })
    } catch (err) {
      console.warn("⚠️ Enhanced create failed; falling back to minimal watchlist create", err)
      watchlist = await tx.watchlist.create({
        data: {
          userId,
          name: data.name,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              watchlistId: true,
              stockId: true,
              createdAt: true,
              stock: true,
            },
          },
        },
      })
    }

    console.log("✅ Watchlist created:", watchlist.id)
    return watchlist
  })
}

/**
 * Transaction wrapper for updating a watchlist
 */
export const withUpdateWatchlistTransaction = async (
  watchlistId: string,
  userId: string,
  data: {
    name?: string
    description?: string
    color?: string
    isDefault?: boolean
    sortOrder?: number
  }
) => {
  return withTransaction(async (tx) => {
    console.log("📝 Updating watchlist:", watchlistId)

    // Verify ownership
    const watchlist = await tx.watchlist.findFirst({
      where: {
        id: watchlistId,
        userId,
      },
    })

    if (!watchlist) {
      throw new Error("Watchlist not found or access denied")
    }

    // If setting as default, unset other default watchlists (best-effort)
    if (data.isDefault) {
      try {
        await tx.watchlist.updateMany({
          where: {
            userId,
            // @ts-expect-error: Column may not exist in DB yet
            isDefault: true,
            NOT: { id: watchlistId },
          } as any,
          // @ts-expect-error: Column may not exist in DB yet
          data: { isDefault: false } as any,
        })
      } catch (e) {
        console.warn("⚠️ isDefault column not present yet; skipping unset of other defaults")
      }
    }

    // Update the watchlist (attempt enhanced fields; fall back to minimal)
    const updateData: any = { updatedAt: new Date() }
    if (data.name !== undefined) updateData.name = data.name
    // Opportunistically include enhanced fields
    if (data.description !== undefined) updateData.description = data.description
    if (data.color !== undefined) updateData.color = data.color
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    let updatedWatchlist
    try {
      updatedWatchlist = await tx.watchlist.update({
        where: { id: watchlistId },
        data: updateData,
        select: {
          id: true,
          userId: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              watchlistId: true,
              stockId: true,
              createdAt: true,
              stock: true,
            },
          },
        },
      })
    } catch (err) {
      console.warn("⚠️ Enhanced update failed; falling back to minimal update", err)
      updatedWatchlist = await tx.watchlist.update({
        where: { id: watchlistId },
        data: { name: data.name, updatedAt: new Date() },
        select: {
          id: true,
          userId: true,
          name: true,
          createdAt: true,
          updatedAt: true,
          items: {
            select: {
              id: true,
              watchlistId: true,
              stockId: true,
              createdAt: true,
              stock: true,
            },
          },
        },
      })
    }

    console.log("✅ Watchlist updated:", updatedWatchlist.id)
    return updatedWatchlist
  })
}

/**
 * Transaction wrapper for deleting a watchlist
 */
export const withDeleteWatchlistTransaction = async (
  watchlistId: string,
  userId: string
) => {
  return withTransaction(async (tx) => {
    console.log("🗑️ Deleting watchlist:", watchlistId)

    // Verify ownership
    const watchlist = await tx.watchlist.findFirst({
      where: {
        id: watchlistId,
        userId,
      },
    })

    if (!watchlist) {
      throw new Error("Watchlist not found or access denied")
    }

    // Delete the watchlist (cascade will handle items)
    await tx.watchlist.delete({
      where: { id: watchlistId },
    })

    console.log("✅ Watchlist deleted:", watchlistId)
    return { success: true }
  })
}

/**
 * Transaction wrapper for adding an item to watchlist (with token support)
 */
export const withAddWatchlistItemTransaction = async (
  watchlistId: string,
  userId: string,
  data: {
    stockId?: string
    token?: number
    symbol?: string
    name?: string
    exchange?: string
    segment?: string
    strikePrice?: number
    optionType?: string
    expiry?: string
    lotSize?: number
    notes?: string
    alertPrice?: number
    alertType?: string
  }
) => {
  return withTransaction(async (tx) => {
    console.log("➕ Adding item to watchlist:", watchlistId, { token: data.token, stockId: data.stockId })

    // Verify watchlist ownership
    const watchlist = await tx.watchlist.findFirst({
      where: {
        id: watchlistId,
        userId,
      },
    })

    if (!watchlist) {
      throw new Error("Watchlist not found or access denied")
    }

    let finalStockId = data.stockId

    // If token is provided, find or create Stock record
    if (data.token && !finalStockId) {
      console.log("🔍 [WATCHLIST-TX] Looking up stock by token:", data.token)
      
      // First, try to find existing stock by token
      const existingStock = await tx.stock.findFirst({
        where: {
          // @ts-expect-error: token column may not exist yet
          token: data.token,
        } as any,
      })

      if (existingStock) {
        console.log("✅ [WATCHLIST-TX] Found existing stock:", existingStock.id)
        finalStockId = existingStock.id
      } else {
        console.log("➕ [WATCHLIST-TX] Creating new stock record with token:", data.token)
        
        // Create new Stock record with token data (hybrid storage)
        const newStock = await tx.stock.create({
          data: {
            instrumentId: `${data.exchange}-${data.token}`,
            symbol: data.symbol || 'UNKNOWN',
            exchange: data.exchange || 'NSE',
            ticker: data.symbol || 'UNKNOWN',
            name: data.name || data.symbol || 'Unknown',
            segment: data.segment || 'NSE',
            ltp: 0,
            // @ts-expect-error: token column may not exist yet
            token: data.token,
            // @ts-expect-error: F&O fields may not exist yet
            strikePrice: data.strikePrice,
            // @ts-expect-error: F&O fields may not exist yet
            optionType: data.optionType as any,
            // @ts-expect-error: F&O fields may not exist yet
            expiry: data.expiry,
            // @ts-expect-error: F&O fields may not exist yet
            lot_size: data.lotSize,
          } as any,
        })
        
        console.log("✅ [WATCHLIST-TX] Created new stock:", newStock.id)
        finalStockId = newStock.id
      }
    }

    if (!finalStockId) {
      throw new Error("Could not determine stockId")
    }

    // Check if stock already exists in watchlist
    const existingItem = await tx.watchlistItem.findFirst({
      where: {
        watchlistId,
        stockId: finalStockId,
      },
    })

    if (existingItem) {
      throw new Error("Stock already exists in watchlist")
    }

    // Verify stock exists and get token
    const stock = await tx.stock.findUnique({
      where: { id: finalStockId },
      select: {
        id: true,
        // @ts-expect-error: token column may not exist yet
        token: true,
      } as any,
    })

    if (!stock) {
      throw new Error("Stock not found")
    }

    // Determine final token: prefer data.token, fallback to stock.token
    const finalToken = data.token ?? (stock as any).token
    
    console.log("🔑 [WATCHLIST-TX] Token for WatchlistItem:", {
      providedToken: data.token,
      stockToken: (stock as any).token,
      finalToken,
    })

    // Add item to watchlist (attempt enhanced fields; fall back to minimal)
    let item
    try {
      item = await tx.watchlistItem.create({
        data: {
          watchlistId,
          stockId: finalStockId, // Fix: use finalStockId instead of data.stockId
          // @ts-expect-error: token column may not exist yet
          token: finalToken, // Store token directly in WatchlistItem
          // @ts-expect-error: Columns may not exist; Prisma will throw and we fallback
          notes: data.notes,
          // @ts-expect-error: Columns may not exist; Prisma will throw and we fallback
          alertPrice: data.alertPrice,
          // @ts-expect-error: Columns may not exist; Prisma will throw and we fallback
          alertType: data.alertType || "ABOVE",
          // @ts-expect-error: Columns may not exist; Prisma will throw and we fallback
          sortOrder: 0,
        } as any,
        select: {
          id: true,
          watchlistId: true,
          stockId: true,
          // @ts-expect-error: token column may not exist yet
          token: true,
          createdAt: true,
          stock: true,
        } as any,
      })
    } catch (err) {
      console.warn("⚠️ Enhanced item create failed; falling back to minimal create", err)
      item = await tx.watchlistItem.create({
        data: {
          watchlistId,
          stockId: finalStockId, // Fix: use finalStockId
          // @ts-expect-error: token column may not exist yet
          token: finalToken, // Still try to store token even in fallback
        } as any,
        select: {
          id: true,
          watchlistId: true,
          stockId: true,
          // @ts-expect-error: token column may not exist yet
          token: true,
          createdAt: true,
          stock: true,
        } as any,
      })
    }

    console.log("✅ Item added to watchlist:", item.id, { token: (item as any).token })
    return item
  })
}

/**
 * Transaction wrapper for updating a watchlist item
 */
export const withUpdateWatchlistItemTransaction = async (
  itemId: string,
  userId: string,
  data: {
    notes?: string
    alertPrice?: number | null
    alertType?: string | null
    sortOrder?: number
  }
) => {
  return withTransaction(async (tx) => {
    console.log("📝 Updating watchlist item:", itemId)

    // Verify item exists and user has access
    const item = await tx.watchlistItem.findFirst({
      where: {
        id: itemId,
        watchlist: {
          userId,
        },
      },
    })

    if (!item) {
      throw new Error("Watchlist item not found or access denied")
    }

    // Prepare update data - handle null values for clearing alerts
    const updateData: any = { updatedAt: new Date() }
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
    if (data.alertPrice !== undefined) updateData.alertPrice = data.alertPrice
    if (data.alertType !== undefined) updateData.alertType = data.alertType

    let updatedItem
    try {
      updatedItem = await tx.watchlistItem.update({
        where: { id: itemId },
        data: updateData,
        select: {
          id: true,
          watchlistId: true,
          stockId: true,
          // @ts-expect-error: token column may not exist yet
          token: true,
          createdAt: true,
          stock: true,
        } as any,
      })
    } catch (err) {
      console.warn("⚠️ Enhanced item update failed; falling back to minimal update", err)
      updatedItem = await tx.watchlistItem.update({
        where: { id: itemId },
        data: { /* minimal update */ },
        select: {
          id: true,
          watchlistId: true,
          stockId: true,
          // @ts-expect-error: token column may not exist yet
          token: true,
          createdAt: true,
          stock: true,
        } as any,
      })
    }

    console.log("✅ Watchlist item updated:", updatedItem.id)
    return updatedItem
  })
}

/**
 * Transaction wrapper for removing an item from watchlist
 */
export const withRemoveWatchlistItemTransaction = async (
  itemId: string,
  userId: string
) => {
  return withTransaction(async (tx) => {
    console.log("🗑️ Removing item from watchlist:", itemId)

    // Verify item exists and user has access
    const item = await tx.watchlistItem.findFirst({
      where: {
        id: itemId,
        watchlist: {
          userId,
        },
      },
    })

    if (!item) {
      throw new Error("Watchlist item not found or access denied")
    }

    // Delete the item
    await tx.watchlistItem.delete({
      where: { id: itemId },
    })

    console.log("✅ Watchlist item removed:", itemId)
    return { success: true }
  })
}

/**
 * Get all watchlists for a user with items
 */
export const getAllWatchlists = async (userId: string) => {
  console.log("🔎 Fetching all watchlists via Prisma", { userId })
  const results = await prisma.watchlist.findMany({
    where: { userId },
    select: {
      id: true,
      userId: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          watchlistId: true,
          stockId: true,
          // @ts-expect-error: token column may not exist yet
          token: true,
          createdAt: true,
          stock: true,
        } as any,
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  console.log("✅ Prisma returned watchlists", { count: results.length })
  return results
}

/**
 * Get a single watchlist by ID
 */
export const getWatchlistById = async (watchlistId: string, userId: string) => {
  return prisma.watchlist.findFirst({
    where: { id: watchlistId, userId },
    select: {
      id: true,
      userId: true,
      name: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          watchlistId: true,
          stockId: true,
          // @ts-expect-error: token column may not exist yet
          token: true,
          createdAt: true,
          stock: true,
        } as any,
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}

/**
 * Get a single watchlist item by ID
 */
export const getWatchlistItemById = async (itemId: string, userId: string) => {
  return prisma.watchlistItem.findFirst({
    where: {
      id: itemId,
      watchlist: {
        userId,
      },
    },
    include: {
      stock: true,
      watchlist: true,
    },
  })
}