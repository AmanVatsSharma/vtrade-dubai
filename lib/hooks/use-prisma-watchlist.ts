/**
 * @file use-prisma-watchlist.ts
 * @description Prisma-based watchlist management hooks using API routes with atomic transactions
 */

"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { toast } from "@/hooks/use-toast"

// Types
export interface WatchlistItemData {
  id: string
  watchlistItemId: string
  instrumentId: string
  symbol: string
  name: string
  ltp: number
  close: number
  segment?: string
  strikePrice?: number
  optionType?: string
  expiry?: string
  lotSize?: number
  notes?: string
  alertPrice?: number
  alertType?: string
  sortOrder: number
  createdAt: string
}

export interface WatchlistData {
  id: string
  name: string
  description?: string
  color: string
  isDefault: boolean
  isPrivate: boolean
  sortOrder: number
  items: WatchlistItemData[]
  createdAt: string
  updatedAt: string
}

export interface CreateWatchlistInput {
  name: string
  description?: string
  color?: string
  isDefault?: boolean
}

export interface UpdateWatchlistInput {
  name?: string
  description?: string
  color?: string
  isDefault?: boolean
  sortOrder?: number
}

export interface AddWatchlistItemInput {
  stockId: string
  notes?: string
  alertPrice?: number
  alertType?: string
}

export interface UpdateWatchlistItemInput {
  notes?: string
  alertPrice?: number | null
  alertType?: string | null
  sortOrder?: number
}

// Helper function to transform API data
const toNumber = (v: any): number => {
  if (v == null) return 0
  const parsed = parseFloat(v)
  return isNaN(parsed) ? 0 : parsed
}

const transformWatchlistData = (watchlists: any[]): WatchlistData[] => {
  if (!watchlists || !Array.isArray(watchlists)) return []

  return watchlists.map((watchlist) => {
    const items = watchlist.items?.map((item: any) => {
      const stock = item.stock
      return {
        id: stock.id,
        watchlistItemId: item.id,
        instrumentId: stock.instrumentId,
        symbol: stock.ticker,
        name: stock.name,
        ltp: toNumber(stock.ltp),
        close: toNumber(stock.close),
        segment: stock.segment,
        strikePrice: stock.strikePrice ? toNumber(stock.strikePrice) : undefined,
        optionType: stock.optionType,
        expiry: stock.expiry,
        lotSize: stock.lot_size,
        notes: item.notes,
        alertPrice: item.alertPrice ? toNumber(item.alertPrice) : undefined,
        alertType: item.alertType,
        sortOrder: item.sortOrder || 0,
        createdAt: item.createdAt,
      }
    }) || []

    return {
      id: watchlist.id,
      name: watchlist.name,
      description: watchlist.description,
      color: watchlist.color || "#3B82F6",
      isDefault: watchlist.isDefault || false,
      isPrivate: watchlist.isPrivate || false,
      sortOrder: watchlist.sortOrder || 0,
      items,
      createdAt: watchlist.createdAt,
      updatedAt: watchlist.updatedAt,
    }
  })
}

// Main Hook for All Watchlists
export function useEnhancedWatchlists(userId?: string) {
  const [watchlists, setWatchlists] = useState<WatchlistData[]>([])
  // Initial-only loading flag. Once we have loaded at least once, this stays false.
  const [isLoading, setIsLoading] = useState(false)
  // Refreshing flag used when we refetch while existing data is present
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchWatchlists = useCallback(async () => {
    if (!userId) return

    // Distinguish initial load vs refresh
    if (hasLoadedOnce) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

    // Timeout + abort for robust error handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    try {
      console.info('[useEnhancedWatchlists] Fetching watchlists', { userId, hasLoadedOnce })
      const response = await fetch('/api/watchlists', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        cache: 'no-store'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch watchlists')
      }

      const data = await response.json()
      const transformed = transformWatchlistData(data.watchlists)
      setWatchlists(transformed)
      if (!hasLoadedOnce) setHasLoadedOnce(true)
      console.info('[useEnhancedWatchlists] Watchlists updated', { count: transformed.length })
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        console.error('⏱️ [useEnhancedWatchlists] Fetch aborted (timeout)')
      } else {
        console.error('❌ [useEnhancedWatchlists] Error fetching watchlists:', err)
      }
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      clearTimeout(timeoutId)
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [userId, hasLoadedOnce])

  useEffect(() => {
    fetchWatchlists()
  }, [fetchWatchlists])

  const createWatchlist = useCallback(async (input: CreateWatchlistInput) => {
    if (!userId) throw new Error("User ID required")

    try {
      const response = await fetch('/api/watchlists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create watchlist')
      }

      const data = await response.json()
      await fetchWatchlists()
      
      toast({ 
        title: "Watchlist Created", 
        description: `"${input.name}" has been created successfully.` 
      })
      
      return data.watchlist
    } catch (error) {
      console.error("Error creating watchlist:", error)
      toast({
        title: "Failed to Create Watchlist",
        description: error instanceof Error ? error.message : "Could not create watchlist.",
        variant: "destructive",
      })
      throw error
    }
  }, [userId, fetchWatchlists])

  const updateWatchlist = useCallback(async (id: string, input: UpdateWatchlistInput) => {
    try {
      const response = await fetch(`/api/watchlists/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update watchlist')
      }

      await fetchWatchlists()
      toast({ title: "Watchlist Updated", description: "Watchlist has been updated successfully." })
    } catch (error) {
      console.error("Error updating watchlist:", error)
      toast({
        title: "Failed to Update Watchlist",
        description: error instanceof Error ? error.message : "Could not update watchlist.",
        variant: "destructive",
      })
      throw error
    }
  }, [fetchWatchlists])

  const deleteWatchlist = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/watchlists/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete watchlist')
      }

      await fetchWatchlists()
      toast({ title: "Watchlist Deleted", description: "Watchlist has been deleted successfully." })
    } catch (error) {
      console.error("Error deleting watchlist:", error)
      toast({
        title: "Failed to Delete Watchlist",
        description: error instanceof Error ? error.message : "Could not delete watchlist.",
        variant: "destructive",
      })
      throw error
    }
  }, [fetchWatchlists])

  return {
    watchlists,
    // Keep previous data during refetches; only block UI on first load
    isLoading,
    isRefreshing,
    isError: !!error,
    error,
    refetch: fetchWatchlists,
    createWatchlist,
    updateWatchlist,
    deleteWatchlist,
  }
}

// Hook for Single Watchlist Operations
export function useWatchlistItems(watchlistId?: string) {
  const addItem = useCallback(async (input: AddWatchlistItemInput) => {
    if (!watchlistId) throw new Error("Watchlist ID required")

    try {
      const response = await fetch(`/api/watchlists/${watchlistId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add item')
      }

      toast({ title: "Stock Added", description: "Successfully added to watchlist." })
    } catch (error) {
      console.error("Error adding item:", error)
      toast({
        title: "Failed to Add Stock",
        description: error instanceof Error ? error.message : "Could not add stock to watchlist.",
        variant: "destructive",
      })
      throw error
    }
  }, [watchlistId])

  const updateItem = useCallback(async (itemId: string, input: UpdateWatchlistItemInput) => {
    try {
      const response = await fetch(`/api/watchlists/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update item')
      }

      toast({ title: "Item Updated", description: "Watchlist item has been updated successfully." })
    } catch (error) {
      console.error("Error updating item:", error)
      toast({
        title: "Failed to Update Item",
        description: error instanceof Error ? error.message : "Could not update watchlist item.",
        variant: "destructive",
      })
      throw error
    }
  }, [])

  const removeItem = useCallback(async (itemId: string) => {
    try {
      const response = await fetch(`/api/watchlists/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove item')
      }

      toast({ title: "Stock Removed", description: "Successfully removed from watchlist." })
    } catch (error) {
      console.error("Error removing item:", error)
      toast({
        title: "Failed to Remove Stock",
        description: error instanceof Error ? error.message : "Could not remove stock from watchlist.",
        variant: "destructive",
      })
      throw error
    }
  }, [])

  return {
    addItem,
    updateItem,
    removeItem,
  }
}

// Hook for Watchlist Item Management
export function useWatchlistItem(itemId?: string) {
  const updateItem = useCallback(async (input: UpdateWatchlistItemInput) => {
    if (!itemId) throw new Error("Item ID required")

    try {
      const response = await fetch(`/api/watchlists/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update item')
      }

      toast({ title: "Item Updated", description: "Watchlist item has been updated successfully." })
    } catch (error) {
      console.error("Error updating item:", error)
      toast({
        title: "Failed to Update Item",
        description: error instanceof Error ? error.message : "Could not update watchlist item.",
        variant: "destructive",
      })
      throw error
    }
  }, [itemId])

  const removeItem = useCallback(async () => {
    if (!itemId) throw new Error("Item ID required")

    try {
      const response = await fetch(`/api/watchlists/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove item')
      }

      toast({ title: "Stock Removed", description: "Successfully removed from watchlist." })
    } catch (error) {
      console.error("Error removing item:", error)
      toast({
        title: "Failed to Remove Stock",
        description: error instanceof Error ? error.message : "Could not remove stock from watchlist.",
        variant: "destructive",
      })
      throw error
    }
  }, [itemId])

  return {
    updateItem,
    removeItem,
  }
}

// Utility function for quick stock addition
export async function addStockToWatchlist(
  stockId: string,
  watchlistId?: string | null,
  options?: {
    notes?: string
    alertPrice?: number
    alertType?: string
  }
) {
  try {
    let finalWatchlistId = watchlistId

    if (!finalWatchlistId) {
      // Get all watchlists to find default
      const response = await fetch('/api/watchlists')
      if (!response.ok) {
        throw new Error('Failed to fetch watchlists')
      }

      const data = await response.json()
      const watchlists = transformWatchlistData(data.watchlists)
      const defaultWatchlist = watchlists.find(w => w.isDefault)

      if (defaultWatchlist) {
        finalWatchlistId = defaultWatchlist.id
      } else if (watchlists.length > 0) {
        finalWatchlistId = watchlists[0].id
      } else {
        // Create default watchlist
        const createResponse = await fetch('/api/watchlists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: "My Watchlist",
            isDefault: true
          }),
        })

        if (!createResponse.ok) {
          throw new Error('Failed to create default watchlist')
        }

        const createData = await createResponse.json()
        finalWatchlistId = createData.watchlist.id
      }
    }

    if (!finalWatchlistId) {
      throw new Error("Could not find or create a watchlist.")
    }

    // Add item to watchlist
    const response = await fetch(`/api/watchlists/${finalWatchlistId}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stockId,
        notes: options?.notes,
        alertPrice: options?.alertPrice,
        alertType: options?.alertType || "ABOVE",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to add stock to watchlist')
    }

    return response.json()
  } catch (error) {
    console.error("Error adding stock to watchlist:", error)
    throw error
  }
}