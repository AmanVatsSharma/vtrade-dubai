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
  if (!data?.watchlistCollection?.edges) return []
  
  return data.watchlistCollection.edges.map((edge: any) => {
    const node = edge.node
    const items = (node.watchlistItemCollection?.edges || []).map((itemEdge: any) => {
      // Read all fields directly from WatchlistItem (no Stock dependency)
      const item = itemEdge.node
      // Generate instrumentId from exchange and token
      const instrumentId = item.token && item.exchange 
        ? `${item.exchange}-${item.token}` 
        : `unknown-${item.id}`
      
      console.log('🔑 [GRAPHQL-TRANSFORM] WatchlistItem data extraction', {
        watchlistItemId: item.id,
        token: item.token,
        symbol: item.symbol,
        exchange: item.exchange,
      })
      
      return {
        id: item.id, // Use WatchlistItem.id as item identifier
        watchlistItemId: item.id,
        instrumentId,
        symbol: item.symbol || 'UNKNOWN', // Fallback for null/undefined
        name: item.name || 'Unknown', // Fallback for null/undefined
        exchange: item.exchange || 'NSE', // Fallback for null/undefined
        ltp: toNumber(item.ltp),
        close: toNumber(item.close),
        segment: item.segment || 'NSE', // Fallback for null/undefined
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
    })
    
    return {
      id: node.id,
      name: node.name,
      description: node.description,
      color: node.color || "#3B82F6",
      isDefault: node.isDefault || false,
      isPrivate: node.isPrivate || false,
      sortOrder: node.sortOrder || 0,
      items,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    }
  })
}

// Main Hook for All Watchlists
export function useEnhancedWatchlists(userId?: string) {
  const { data, loading, error, refetch } = useQuery(GET_ALL_WATCHLISTS, {
    variables: { userId: userId ?? "" },
    skip: !userId,
    errorPolicy: "all"
  })

  const watchlists = useMemo(() => transformWatchlistData(data), [data])

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
