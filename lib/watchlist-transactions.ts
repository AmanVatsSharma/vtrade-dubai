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
            isDefault: true,
          },
          data: { isDefault: false },
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
          description: data.description,
          color: data.color || "#3B82F6",
          isDefault: data.isDefault || false,
          sortOrder: 0,
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
            isDefault: true,
            NOT: { id: watchlistId },
          },
          data: { isDefault: false },
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
    stockId?: string // Optional, kept for backward compatibility
    token: number // Required - token is the unique identifier
    symbol: string
    exchange: string
    segment: string
    name: string
    ltp?: number
    close?: number
    strikePrice?: number
    optionType?: string
    expiry?: string // ISO date string or YYYYMMDD format
    lotSize?: number
    notes?: string
    alertPrice?: number
    alertType?: string
  }
) => {
  return withTransaction(async (tx) => {
    console.log("➕ [WATCHLIST-TX] Adding item to watchlist:", watchlistId, { 
      token: data.token, 
      symbol: data.symbol,
      exchange: data.exchange 
    })

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

    // Check if item with same token already exists in watchlist
    const existingItem = await tx.watchlistItem.findFirst({
      where: {
        watchlistId,
        token: data.token,
      },
    })

    if (existingItem) {
      throw new Error("Instrument already exists in watchlist")
    }

    // Convert expiry string to DateTime if provided
    let expiryDate: Date | null = null
    if (data.expiry) {
      try {
        // Handle YYYYMMDD format
        if (/^\d{8}$/.test(data.expiry)) {
          const year = parseInt(data.expiry.substring(0, 4), 10)
          const month = parseInt(data.expiry.substring(4, 6), 10) - 1 // Month is 0-indexed
          const day = parseInt(data.expiry.substring(6, 8), 10)
          expiryDate = new Date(year, month, day)
        } else {
          // Handle ISO string format
          expiryDate = new Date(data.expiry)
        }
        
        if (isNaN(expiryDate.getTime())) {
          console.warn("⚠️ [WATCHLIST-TX] Invalid expiry date format, ignoring:", data.expiry)
          expiryDate = null
        }
      } catch (error) {
        console.warn("⚠️ [WATCHLIST-TX] Error parsing expiry date:", error)
        expiryDate = null
      }
    }

    // Create WatchlistItem with all instrument data stored directly
    // Note: Using 'as any' because Prisma client needs to be regenerated after schema update
    const item = await tx.watchlistItem.create({
      data: {
        watchlistId,
        stockId: data.stockId || undefined, // Optional, for backward compatibility
        token: data.token,
        symbol: data.symbol,
        exchange: data.exchange,
        segment: data.segment,
        name: data.name,
        ltp: data.ltp ?? 0,
        close: data.close ?? 0,
        strikePrice: data.strikePrice,
        optionType: data.optionType as any,
        expiry: expiryDate,
        lotSize: data.lotSize,
        notes: data.notes,
        alertPrice: data.alertPrice,
        alertType: data.alertType || "ABOVE",
        sortOrder: 0,
      } as any,
      select: {
        id: true,
        watchlistId: true,
        token: true,
        symbol: true,
        exchange: true,
        segment: true,
        name: true,
        ltp: true,
        close: true,
        strikePrice: true,
        optionType: true,
        expiry: true,
        lotSize: true,
        notes: true,
        alertPrice: true,
        alertType: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      } as any,
    })

    console.log("✅ [WATCHLIST-TX] Item added to watchlist:", item.id, { 
      token: (item as any).token,
      symbol: (item as any).symbol,
      exchange: (item as any).exchange 
    })
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

    // Update WatchlistItem (no Stock dependency)
    const updatedItem = await tx.watchlistItem.update({
      where: { id: itemId },
      data: updateData,
      select: {
        id: true,
        watchlistId: true,
        stockId: true,
        token: true,
        symbol: true,
        exchange: true,
        segment: true,
        name: true,
        ltp: true,
        close: true,
        strikePrice: true,
        optionType: true,
        expiry: true,
        lotSize: true,
        notes: true,
        alertPrice: true,
        alertType: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      } as any,
    })

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
  console.log("🔎 [WATCHLIST-TX] Fetching all watchlists via Prisma", { userId })
  const results = await prisma.watchlist.findMany({
    where: { userId },
    select: {
      id: true,
      userId: true,
      name: true,
      description: true,
      color: true,
      isDefault: true,
      isPrivate: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          watchlistId: true,
          stockId: true, // Optional, kept for backward compatibility
          token: true,
          symbol: true,
          exchange: true,
          segment: true,
          name: true,
          ltp: true,
          close: true,
          strikePrice: true,
          optionType: true,
          expiry: true,
          lotSize: true,
          notes: true,
          alertPrice: true,
          alertType: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        } as any,
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })
  console.log("✅ [WATCHLIST-TX] Prisma returned watchlists", { count: results.length })
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
      description: true,
      color: true,
      isDefault: true,
      isPrivate: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      items: {
        select: {
          id: true,
          watchlistId: true,
          stockId: true, // Optional, kept for backward compatibility
          token: true,
          symbol: true,
          exchange: true,
          segment: true,
          name: true,
          ltp: true,
          close: true,
          strikePrice: true,
          optionType: true,
          expiry: true,
          lotSize: true,
          notes: true,
          alertPrice: true,
          alertType: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
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
    select: {
      id: true,
      watchlistId: true,
      stockId: true,
      token: true,
      symbol: true,
      exchange: true,
      segment: true,
      name: true,
      ltp: true,
      close: true,
      strikePrice: true,
      optionType: true,
      expiry: true,
      lotSize: true,
      notes: true,
      alertPrice: true,
      alertType: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
      watchlist: {
        select: {
          id: true,
          name: true,
          userId: true,
        },
      },
    } as any,
  })
}