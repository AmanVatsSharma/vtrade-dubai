/**
 * @file use-enhanced-watchlist.ts
 * @description Enterprise-grade watchlist management hooks with multiple watchlist support
 */

"use client"

import { useState, useCallback, useMemo } from "react"
import { useQuery, useMutation } from "@apollo/client/react"
import { gql } from "@apollo/client/core"
import client from "@/lib/graphql/apollo-client"
import { toast } from "@/hooks/use-toast"

// GraphQL Queries and Mutations for Enhanced Watchlist
const GET_ALL_WATCHLISTS = gql`
  query GetAllWatchlists($userId: UUID!) {
    watchlistCollection(
      filter: { userId: { eq: $userId } }
      orderBy: [{ sortOrder: AscNullsLast }, { createdAt: AscNullsLast }]
    ) {
      edges {
        node {
          id
          name
          description
          color
          isDefault
          isPrivate
          sortOrder
          createdAt
          updatedAt
          watchlistItemCollection {
            edges {
              node {
                id
                token
                symbol
                exchange
                segment
                name
                ltp
                close
                strikePrice
                optionType
                expiry
                lotSize
                notes
                alertPrice
                alertType
                sortOrder
                createdAt
              }
            }
          }
        }
      }
    }
  }
`

const GET_WATCHLIST_BY_ID = gql`
  query GetWatchlistById($id: UUID!) {
    watchlistCollection(filter: { id: { eq: $id } }, first: 1) {
      edges {
        node {
          id
          name
          description
          color
          isDefault
          isPrivate
          sortOrder
          createdAt
          updatedAt
          watchlistItemCollection {
            edges {
              node {
                id
                token
                symbol
                exchange
                segment
                name
                ltp
                close
                strikePrice
                optionType
                expiry
                lotSize
                notes
                alertPrice
                alertType
                sortOrder
                createdAt
              }
            }
          }
        }
      }
    }
  }
`

const CREATE_WATCHLIST = gql`
  mutation CreateWatchlist($userId: UUID!, $name: String!, $description: String, $color: String, $isDefault: Boolean) {
    insertIntoWatchlistCollection(objects: [{
      userId: $userId,
      name: $name,
      description: $description,
      color: $color,
      isDefault: $isDefault,
      sortOrder: 0
    }]) {
      records { id, name, color }
    }
  }
`

const UPDATE_WATCHLIST = gql`
  mutation UpdateWatchlist($id: UUID!, $set: WatchlistUpdateInput!) {
    updateWatchlistCollection(set: $set, filter: { id: { eq: $id } }) {
      records { id, name, description, color, isDefault, sortOrder }
    }
  }
`

const DELETE_WATCHLIST = gql`
  mutation DeleteWatchlist($id: UUID!) {
    deleteFromWatchlistCollection(filter: { id: { eq: $id } }) {
      affectedCount
    }
  }
`

const ADD_WATCHLIST_ITEM = gql`
  mutation AddWatchlistItem($watchlistId: UUID!, $stockId: UUID!, $notes: String, $alertPrice: Decimal, $alertType: String) {
    insertIntoWatchlistItemCollection(objects: [{
      watchlistId: $watchlistId,
      stockId: $stockId,
      notes: $notes,
      alertPrice: $alertPrice,
      alertType: $alertType,
      sortOrder: 0
    }]) {
      records { id }
    }
  }
`

const UPDATE_WATCHLIST_ITEM = gql`
  mutation UpdateWatchlistItem($id: UUID!, $set: WatchlistItemUpdateInput!) {
    updateWatchlistItemCollection(set: $set, filter: { id: { eq: $id } }) {
      records { id, notes, alertPrice, alertType, sortOrder }
    }
  }
`

const REMOVE_WATCHLIST_ITEM = gql`
  mutation RemoveWatchlistItem($id: UUID!) {
    deleteFromWatchlistItemCollection(filter: { id: { eq: $id } }) {
      affectedCount
    }
  }
`

const REORDER_WATCHLIST_ITEMS = gql`
  mutation ReorderWatchlistItems($items: [WatchlistItemReorderInput!]!) {
    updateWatchlistItemCollection(set: { sortOrder: $sortOrder }, filter: { id: { eq: $id } }) {
      records { id, sortOrder }
    }
  }
`

// Types
interface WatchlistItemData {
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
  token?: number // Instrument token from Vayu API (prefer WatchlistItem.token, fallback to Stock.token)
}

interface WatchlistData {
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

interface CreateWatchlistInput {
  name: string
  description?: string
  color?: string
  isDefault?: boolean
}

interface UpdateWatchlistInput {
  name?: string
  description?: string
  color?: string
  isDefault?: boolean
  sortOrder?: number
}

interface AddWatchlistItemInput {
  stockId: string
  notes?: string
  alertPrice?: number
  alertType?: string
}

interface UpdateWatchlistItemInput {
  notes?: string
  alertPrice?: number
  alertType?: string
  sortOrder?: number
}

// Helper function to transform GraphQL data
const toNumber = (v: any): number => {
  if (v == null) return 0
  const parsed = parseFloat(v)
  return isNaN(parsed) ? 0 : parsed
}

const transformWatchlistData = (data: any): WatchlistData[] => {
  try {
    console.log('🔄 [GRAPHQL-TRANSFORM] Starting transformWatchlistData', {
      hasData: !!data,
      hasCollection: !!data?.watchlistCollection,
      edgesCount: data?.watchlistCollection?.edges?.length || 0,
    })

    if (!data?.watchlistCollection?.edges) {
      console.log('⚠️ [GRAPHQL-TRANSFORM] No watchlistCollection.edges, returning empty array')
      return []
    }

    if (!Array.isArray(data.watchlistCollection.edges)) {
      console.error('❌ [GRAPHQL-TRANSFORM] edges is not an array:', typeof data.watchlistCollection.edges)
      return []
    }

    const transformed = data.watchlistCollection.edges
      .map((edge: any, index: number) => {
        try {
          console.log(`📦 [GRAPHQL-TRANSFORM] Processing edge ${index + 1}/${data.watchlistCollection.edges.length}`)
          
          const node = edge?.node
          if (!node) {
            console.warn(`⚠️ [GRAPHQL-TRANSFORM] Edge ${index + 1} has null/undefined node, skipping`)
            return null
          }

          if (!node.id) {
            console.warn(`⚠️ [GRAPHQL-TRANSFORM] Edge ${index + 1} node missing id, skipping`, { node })
            return null
          }

          // Filter out null/undefined items before mapping to prevent React Error #310
          const itemEdges = node.watchlistItemCollection?.edges || []
          console.log(`📋 [GRAPHQL-TRANSFORM] Processing ${itemEdges.length} items for watchlist ${node.id}`)

          const items = itemEdges
            .filter((itemEdge: any, itemIndex: number) => {
              if (!itemEdge?.node) {
                console.warn(`⚠️ [GRAPHQL-TRANSFORM] Item ${itemIndex + 1} has null node, filtering out`)
                return false
              }
              return true
            })
            .map((itemEdge: any, itemIndex: number) => {
              try {
                // Read all fields directly from WatchlistItem (no Stock dependency)
                const item = itemEdge.node
                if (!item) {
                  console.error(`❌ [GRAPHQL-TRANSFORM] Item ${itemIndex + 1} node is null after filter check`)
                  return null
                }

                if (!item.id) {
                  console.warn(`⚠️ [GRAPHQL-TRANSFORM] Item ${itemIndex + 1} missing id, skipping:`, {
                    item,
                    watchlistId: node.id,
                  })
                  return null
                }

                // Generate instrumentId from exchange and token
                let instrumentId: string
                try {
                  instrumentId = item.token && item.exchange
                    ? `${item.exchange}-${item.token}`
                    : `unknown-${item.id}`
                } catch (err) {
                  console.error(`❌ [GRAPHQL-TRANSFORM] Error generating instrumentId for item ${itemIndex + 1}:`, err)
                  instrumentId = `unknown-${item.id}`
                }

                const transformedItem = {
                  id: item.id,
                  watchlistItemId: item.id,
                  instrumentId,
                  symbol: item.symbol || 'UNKNOWN',
                  name: item.name || 'Unknown',
                  exchange: item.exchange || 'NSE',
                  ltp: toNumber(item.ltp),
                  close: toNumber(item.close),
                  segment: item.segment || 'NSE',
                  strikePrice: item.strikePrice ? toNumber(item.strikePrice) : undefined,
                  optionType: item.optionType,
                  expiry: item.expiry,
                  lotSize: item.lotSize,
                  notes: item.notes,
                  alertPrice: item.alertPrice ? toNumber(item.alertPrice) : undefined,
                  alertType: item.alertType,
                  sortOrder: item.sortOrder || 0,
                  createdAt: item.createdAt,
                  token: item.token ? Number(item.token) : undefined,
                }

                console.log(`✅ [GRAPHQL-TRANSFORM] Item ${itemIndex + 1} transformed:`, {
                  id: transformedItem.id,
                  symbol: transformedItem.symbol,
                  instrumentId: transformedItem.instrumentId,
                })

                return transformedItem
              } catch (itemError: any) {
                console.error(`❌ [GRAPHQL-TRANSFORM] Error transforming item ${itemIndex + 1}:`, {
                  error: itemError.message,
                  stack: itemError.stack,
                  itemEdge,
                })
                return null
              }
            })
            .filter((item: any) => item != null) // Remove any null entries from map

          console.log(`✅ [GRAPHQL-TRANSFORM] Watchlist ${node.id} transformed with ${items.length} items`)

          return {
            id: node.id,
            name: node.name || 'Unnamed Watchlist',
            description: node.description || undefined,
            color: node.color || "#3B82F6",
            isDefault: node.isDefault || false,
            isPrivate: node.isPrivate || false,
            sortOrder: node.sortOrder || 0,
            items: items || [], // Ensure items is always an array
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
          }
        } catch (edgeError: any) {
          console.error(`❌ [GRAPHQL-TRANSFORM] Error processing edge ${index + 1}:`, {
            error: edgeError.message,
            stack: edgeError.stack,
            edge,
          })
          return null
        }
      })
      .filter((watchlist: any) => watchlist != null) // Remove any null entries from edges map

    console.log(`✅ [GRAPHQL-TRANSFORM] Transform complete: ${transformed.length} watchlists`)
    return transformed
  } catch (error: any) {
    console.error('❌ [GRAPHQL-TRANSFORM] Fatal error in transformWatchlistData:', {
      error: error.message,
      stack: error.stack,
      data,
    })
    return [] // Return empty array on error to prevent crash
  }
}

// Main Hook for All Watchlists
export function useEnhancedWatchlists(userId?: string) {
  const { data, loading, error, refetch } = useQuery(GET_ALL_WATCHLISTS, {
    variables: { userId: userId ?? "" },
    skip: !userId,
    errorPolicy: "all"
  })

  const watchlists = useMemo(() => {
    try {
      console.log('🔄 [HOOK] useEnhancedWatchlists useMemo triggered', {
        hasData: !!data,
        userId,
      })
      const result = transformWatchlistData(data)
      console.log('✅ [HOOK] useEnhancedWatchlists transformed:', {
        watchlistsCount: result.length,
      })
      return result
    } catch (error: any) {
      console.error('❌ [HOOK] useEnhancedWatchlists useMemo error:', {
        error: error.message,
        stack: error.stack,
        data,
      })
      return [] // Return empty array on error to prevent crash
    }
  }, [data, userId])

  const [createWatchlistMutation] = useMutation(CREATE_WATCHLIST)
  const [updateWatchlistMutation] = useMutation(UPDATE_WATCHLIST)
  const [deleteWatchlistMutation] = useMutation(DELETE_WATCHLIST)

  const createWatchlist = useCallback(async (input: CreateWatchlistInput) => {
    if (!userId) throw new Error("User ID required")
    
    try {
      const { data: result } = await createWatchlistMutation({
        variables: {
          userId,
          name: input.name,
          description: input.description,
          color: input.color || "#3B82F6",
          isDefault: input.isDefault || false,
        }
      })
      
      await refetch()
      toast({ title: "Watchlist Created", description: `"${input.name}" has been created successfully.` })
      return result?.insertIntoWatchlistCollection?.records?.[0] || null
    } catch (error) {
      console.error("Error creating watchlist:", error)
      toast({
        title: "Failed to Create Watchlist",
        description: error instanceof Error ? error.message : "Could not create watchlist.",
        variant: "destructive",
      })
      throw error
    }
  }, [userId, createWatchlistMutation, refetch])

  const updateWatchlist = useCallback(async (id: string, input: UpdateWatchlistInput) => {
    try {
      await updateWatchlistMutation({
        variables: { id, set: input }
      })
      
      await refetch()
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
  }, [updateWatchlistMutation, refetch])

  const deleteWatchlist = useCallback(async (id: string) => {
    try {
      await deleteWatchlistMutation({
        variables: { id }
      })
      
      await refetch()
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
  }, [deleteWatchlistMutation, refetch])

  return {
    watchlists,
    isLoading: loading,
    isError: !!error,
    error,
    refetch,
    createWatchlist,
    updateWatchlist,
    deleteWatchlist,
  }
}

// Hook for Single Watchlist Operations
export function useWatchlistItems(watchlistId?: string) {
  const [addItemMutation] = useMutation(ADD_WATCHLIST_ITEM)
  const [updateItemMutation] = useMutation(UPDATE_WATCHLIST_ITEM)
  const [removeItemMutation] = useMutation(REMOVE_WATCHLIST_ITEM)

  const addItem = useCallback(async (input: AddWatchlistItemInput) => {
    if (!watchlistId) throw new Error("Watchlist ID required")
    
    try {
      await addItemMutation({
        variables: {
          watchlistId,
          stockId: input.stockId,
          notes: input.notes,
          alertPrice: input.alertPrice,
          alertType: input.alertType || "ABOVE",
        }
      })
      
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
  }, [watchlistId, addItemMutation])

  const updateItem = useCallback(async (itemId: string, input: UpdateWatchlistItemInput) => {
    try {
      await updateItemMutation({
        variables: { id: itemId, set: input }
      })
      
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
  }, [updateItemMutation])

  const removeItem = useCallback(async (itemId: string) => {
    try {
      await removeItemMutation({
        variables: { id: itemId }
      })
      
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
  }, [removeItemMutation])

  return {
    addItem,
    updateItem,
    removeItem,
  }
}

// Hook for Watchlist Item Management
export function useWatchlistItem(itemId?: string) {
  const [updateItemMutation] = useMutation(UPDATE_WATCHLIST_ITEM)
  const [removeItemMutation] = useMutation(REMOVE_WATCHLIST_ITEM)

  const updateItem = useCallback(async (input: UpdateWatchlistItemInput) => {
    if (!itemId) throw new Error("Item ID required")
    
    try {
      await updateItemMutation({
        variables: { id: itemId, set: input }
      })
      
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
  }, [itemId, updateItemMutation])

  const removeItem = useCallback(async () => {
    if (!itemId) throw new Error("Item ID required")
    
    try {
      await removeItemMutation({
        variables: { id: itemId }
      })
      
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
  }, [itemId, removeItemMutation])

  return {
    updateItem,
    removeItem,
  }
}

// Utility function for quick stock addition
export async function addStockToWatchlist(
  userId: string, 
  stockId: string, 
  watchlistId?: string | null,
  options?: {
    notes?: string
    alertPrice?: number
    alertType?: string
  }
) {
  let finalWatchlistId = watchlistId
  
  if (!finalWatchlistId) {
    // Get default watchlist or create one
    const { data: watchlistsData } = await client.query({
      query: GET_ALL_WATCHLISTS,
      variables: { userId }
    })
    
    const watchlists = transformWatchlistData(watchlistsData)
    const defaultWatchlist = watchlists.find(w => w.isDefault)
    
    if (defaultWatchlist) {
      finalWatchlistId = defaultWatchlist.id
    } else {
      // Create default watchlist
      const { data: newWatchlist } = await client.mutate({
        mutation: CREATE_WATCHLIST,
        variables: {
          userId,
          name: "My Watchlist",
          isDefault: true
        }
      })
      finalWatchlistId = newWatchlist?.insertIntoWatchlistCollection?.records?.[0]?.id || null
    }
  }

  if (!finalWatchlistId) {
    throw new Error("Could not find or create a watchlist.")
  }

  await client.mutate({
    mutation: ADD_WATCHLIST_ITEM,
    variables: {
      watchlistId: finalWatchlistId,
      stockId,
      notes: options?.notes,
      alertPrice: options?.alertPrice,
      alertType: options?.alertType || "ABOVE",
    }
  })
}

// Export types for use in components
export type {
  WatchlistData,
  WatchlistItemData,
  CreateWatchlistInput,
  UpdateWatchlistInput,
  AddWatchlistItemInput,
  UpdateWatchlistItemInput,
}
