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

    // If setting as default, unset other default watchlists
    if (data.isDefault) {
      await tx.watchlist.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    // Create the watchlist
    const watchlist = await tx.watchlist.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        color: data.color || "#3B82F6",
        isDefault: data.isDefault || false,
        sortOrder: 0,
      },
      include: {
        items: {
          include: {
            stock: true,
          },
        },
      },
    })

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

    // If setting as default, unset other default watchlists
    if (data.isDefault) {
      await tx.watchlist.updateMany({
        where: {
          userId,
          isDefault: true,
          NOT: {
            id: watchlistId,
          },
        },
        data: {
          isDefault: false,
        },
      })
    }

    // Update the watchlist
    const updatedWatchlist = await tx.watchlist.update({
      where: { id: watchlistId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        items: {
          include: {
            stock: true,
          },
        },
      },
    })

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
 * Transaction wrapper for adding an item to watchlist
 */
export const withAddWatchlistItemTransaction = async (
  watchlistId: string,
  userId: string,
  data: {
    stockId: string
    notes?: string
    alertPrice?: number
    alertType?: string
  }
) => {
  return withTransaction(async (tx) => {
    console.log("➕ Adding item to watchlist:", watchlistId)

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

    // Check if stock already exists in watchlist
    const existingItem = await tx.watchlistItem.findFirst({
      where: {
        watchlistId,
        stockId: data.stockId,
      },
    })

    if (existingItem) {
      throw new Error("Stock already exists in watchlist")
    }

    // Verify stock exists
    const stock = await tx.stock.findUnique({
      where: { id: data.stockId },
    })

    if (!stock) {
      throw new Error("Stock not found")
    }

    // Add item to watchlist
    const item = await tx.watchlistItem.create({
      data: {
        watchlistId,
        stockId: data.stockId,
        notes: data.notes,
        alertPrice: data.alertPrice,
        alertType: data.alertType || "ABOVE",
        sortOrder: 0,
      },
      include: {
        stock: true,
      },
    })

    console.log("✅ Item added to watchlist:", item.id)
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
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder
    
    // Handle alert price and type (can be null to clear)
    if (data.alertPrice !== undefined) {
      updateData.alertPrice = data.alertPrice
    }
    if (data.alertType !== undefined) {
      updateData.alertType = data.alertType
    }

    // Update the item
    const updatedItem = await tx.watchlistItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        stock: true,
      },
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
  return prisma.watchlist.findMany({
    where: { userId },
    include: {
      items: {
        include: {
          stock: true,
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' },
        ],
      },
    },
    orderBy: [
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ],
  })
}

/**
 * Get a single watchlist by ID
 */
export const getWatchlistById = async (watchlistId: string, userId: string) => {
  return prisma.watchlist.findFirst({
    where: {
      id: watchlistId,
      userId,
    },
    include: {
      items: {
        include: {
          stock: true,
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' },
        ],
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