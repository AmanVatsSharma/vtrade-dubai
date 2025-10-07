/**
 * @file use-trading-data.ts
 * @description Centralized hooks for fetching and managing all trading data.
 * This file has been heavily revised to implement a fully functional user-specific watchlist,
 * remove polling in favor of manual refetching, and ensure all GraphQL operations
 * align with the provided Prisma schema.
 */
"use client"

import { useQuery } from "@apollo/client/react"
import { gql } from "@apollo/client/core"
import client from "@/lib/graphql/apollo-client"
import { useMemo } from "react"
import { OrderSide, OrderType } from "@prisma/client"
import { Calculator } from "lucide-react"
import { createLoggerFromSession, LogLevel, LogCategory } from "@/lib/logger"

// --- Funds Management Functions ---
async function manageFunds(tradingAccountId: string, amount: number, type: 'BLOCK' | 'RELEASE' | 'CREDIT' | 'DEBIT') {
  try {
    const response = await fetch('/api/trading/funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tradingAccountId, amount, type })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to manage funds')
    }

    return true
  } catch (error) {
    console.error('Fund management error:', error)
    throw error
  }
}

function calculateMarginRequired(price: number, quantity: number, segment: string, orderType: string = 'CNC') {
  const baseValue = quantity * price

  if (segment === 'NSE') {
    return orderType === 'MIS' ? baseValue / 200 : baseValue / 50 // 200x leverage for MIS, 50x for CNC
  }

  if (segment === 'NFO') {
    return baseValue / 100 // 100x leverage for F&O
  }

  return baseValue // Full margin for others
}

// -----------------------------
// GraphQL Documents (Corrected for Supabase & Prisma Schema)
// -----------------------------

// --- User & Account ---
const GET_USER = gql`
  query GetUser($id: UUID!) {
    usersCollection(filter: { id: { eq: $id } }) {
      edges { node { id, email, name, role } }
    }
  }
`

const INSERT_USER = gql`
  mutation InsertUser($objects: [usersInsertInput!]!) {
    insertIntousersCollection(objects: $objects) {
      records { id, email, name }
    }
  }
`

const GET_ACCOUNT_BY_USER = gql`
  query GetAccountByUser($userId: UUID!) {
    trading_accountsCollection(filter: { userId: { eq: $userId } }) {
      edges {
        node { id, userId, balance, availableMargin, usedMargin, client_id }
      }
    }
  }
`

const GET_ACCOUNT_BY_ID = gql`
  query GetAccountById($id: UUID!) {
    trading_accountsCollection(filter: { id: { eq: $id } }, first: 1) {
      edges { node { id, balance, availableMargin, usedMargin } }
    }
  }
`

const INSERT_ACCOUNT = gql`
  mutation InsertAccount($objects: [trading_accountsInsertInput!]!) {
    insertIntotrading_accountsCollection(objects: $objects) {
      records { id, userId, balance, availableMargin }
    }
  }
`

// --- Positions ---
const GET_POSITIONS = gql`
  query GetPositions($tradingAccountId: UUID!) {
    positionsCollection(
      filter: { tradingAccountId: { eq: $tradingAccountId } }
      orderBy: [{ createdAt: DescNullsLast }]
    ) {
      edges {
        node {
          id, symbol, quantity, averagePrice, stopLoss, target, unrealizedPnL, dayPnL
          stock { 
            instrumentId, segment, strikePrice, optionType, expiry, lot_size
          }
        }
      }
    }
  }
`

const UPDATE_POSITION = gql`
  mutation UpdatePosition($id: UUID!, $set: positionsUpdateInput!) {
    updatepositionsCollection(set: $set, filter: { id: { eq: $id } }) {
      records { id, stopLoss, target , unrealizedPnL, dayPnL}
    }
  }
`

const DELETE_POSITION = gql`
  mutation DeletePosition($id: UUID!) {
    deleteFrompositionsCollection(filter: { id: { eq: $id } }) {
      affectedCount
    }
  }
`
const GET_POSITION_BY_SYMBOL = gql`
  query GetPositionBySymbol($tradingAccountId: UUID!, $symbol: String!) {
    positionsCollection(filter: { tradingAccountId: { eq: $tradingAccountId }, symbol: { eq: $symbol } }) {
      edges { node { id, quantity, averagePrice } }
    }
  }
`
const INSERT_POSITION = gql`
  mutation InsertPosition($objects: [positionsInsertInput!]!) {
    insertIntopositionsCollection(objects: $objects) {
      records { id, symbol, quantity }
    }
  }
`

// --- Orders ---
const GET_ORDERS = gql`
  query GetOrders($tradingAccountId: UUID!) {
    ordersCollection(
      filter: { tradingAccountId: { eq: $tradingAccountId } }
      orderBy: [{ createdAt: DescNullsLast }]
    ) {
      edges {
        node {
          id, symbol, quantity, orderType, orderSide, price, filledQuantity, averagePrice, productType, status, createdAt, executedAt
        }
      }
    }
  }
`
const INSERT_ORDER = gql`
  mutation InsertOrder($objects: [ordersInsertInput!]!) {
    insertIntoordersCollection(objects: $objects) {
      records { id, symbol, status }
    }
  }
`
const UPDATE_ORDER = gql`
  mutation UpdateOrder($id: UUID!, $set: ordersUpdateInput!) {
    updateordersCollection(set: $set, filter: { id: { eq: $id } }) {
      records { id, status }
    }
  }
`
const DELETE_ORDER = gql`
  mutation DeleteOrder($id: UUID!) {
    deleteFromordersCollection(filter: { id: { eq: $id } }) {
      affectedCount
    }
  }
`

// --- Stock Search ---
const SEARCH_STOCKS = gql`
  query SearchStocks($query: String!) {
    stockCollection(
      filter: { and: [
        { isActive: { eq: true } },
        { or: [ { name: { ilike: $query } }, { ticker: { ilike: $query } }, { symbol: { ilike: $query } } ] }
      ]},
      first: 10
    ) {
      edges {
        node { id, instrumentId, ticker, name, ltp, change, changePercent, sector, exchange, segment, strikePrice, optionType, expiry, lot_size }
      }
    }
  }
`

const SEARCH_STOCKS_EQUITY = gql`
  query SearchStocksEquity($query: String!) {
    stockCollection(
      filter: { and: [
        { isActive: { eq: true } },
        { or: [ { name: { ilike: $query } }, { ticker: { ilike: $query } }, { symbol: { ilike: $query } } ] },
        { or: [ { segment: { eq: "NSE" } }, { segment: { eq: "NSE_EQ" } } ] }
      ]},
      first: 20
    ) {
      edges { node { id, instrumentId, ticker, name, ltp, change, changePercent, exchange, segment, lot_size } }
    }
  }
`

const SEARCH_STOCKS_FUTURES = gql`
  query SearchStocksFutures($query: String!) {
    stockCollection(
      filter: { and: [
        { isActive: { eq: true } },
        { or: [ { name: { ilike: $query } }, { ticker: { ilike: $query } }, { symbol: { ilike: $query } } ] },
        { segment: { eq: "NFO" } },
        { optionType: { is: NULL } }
      ]},
      first: 20
    ) {
      edges { node { id, instrumentId, ticker, name, ltp, change, changePercent, exchange, segment, expiry, lot_size } }
    }
  }
`

const SEARCH_STOCKS_OPTIONS = gql`
  query SearchStocksOptions($query: String!) {
    stockCollection(
      filter: { and: [
        { isActive: { eq: true } },
        { or: [ { name: { ilike: $query } }, { ticker: { ilike: $query } }, { symbol: { ilike: $query } } ] },
        { segment: { eq: "NFO" } },
        { optionType: { is: NOT_NULL } }
      ]},
      first: 20
    ) {
      edges { node { id, instrumentId, ticker, name, ltp, change, changePercent, exchange, segment, strikePrice, optionType, expiry, lot_size } }
    }
  }
`

// --- Watchlist (Corrected & Implemented) ---
const GET_USER_WATCHLIST = gql`
  query GetUserWatchlist($userId: UUID!) {
    watchlistCollection(filter: { userId: { eq: $userId } }, first: 1) {
      edges {
        node {
          id
          name
          watchlistItemCollection {
            edges {
              node {
                id # This is the watchlistItemId
                stock {
                  id, instrumentId, exchange, ticker, name, ltp, close, segment, strikePrice, optionType, expiry, lot_size
                }
              }
            }
          }
        }
      }
    }
  }
`

const CREATE_WATCHLIST = gql`
    mutation CreateWatchlist($userId: UUID!, $name: String!) {
        insertIntoWatchlistCollection(objects: [{ userId: $userId, name: $name }]) {
            records { id }
        }
    }
`

const ADD_WATCHLIST_ITEM = gql`
  mutation AddWatchlistItem($watchlistId: UUID!, $stockId: UUID!) {
    insertIntoWatchlistItemCollection(objects: [{ watchlistId: $watchlistId, stockId: $stockId }]) {
      records { id }
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
const UPDATE_TRADING_ACCOUNT = gql`
  mutation UpdateTradingAccount($id: UUID!, $set: trading_accountsUpdateInput!) {
    updatetrading_accountsCollection(
      filter: { id: { eq: $id } }
      set: $set
    ) {
      affectedCount
      records {
        id
        balance
        availableMargin
        usedMargin
      }
    }
  }
`;




const INSERT_TRANSACTION = gql`
  mutation InsertTransaction($object: TransactionInsertInput!) {
    insertIntotransactionsCollection(objects: [$object]) {
      records {
        id
      }
    }
  }
`;

const GET_TRANSACTIONS = gql`
  query GetTransactions($tradingAccountId: UUID!) {
    transactionsCollection(
      filter: { tradingAccountId: { eq: $tradingAccountId } }
      orderBy: [{ createdAt: DescNullsLast }]
      first: 100
    ) {
      edges {
        node {
          id
          amount
          type
          description
          createdAt
        }
      }
    }
  }
`

// --- Combined Orders & Positions Query ---
const GET_ORDERS_AND_POSITIONS = gql`
  query GetOrdersAndPositions($tradingAccountId: UUID!) {
    ordersCollection(
      filter: { tradingAccountId: { eq: $tradingAccountId } }
      orderBy: [{ createdAt: DescNullsLast }]
    ) {
      edges {
        node {
          id, symbol, quantity, orderType, orderSide, price, filledQuantity, averagePrice, productType, status, createdAt, executedAt
        }
      }
    }
    positionsCollection(
      filter: { tradingAccountId: { eq: $tradingAccountId } }
      orderBy: [{ createdAt: DescNullsLast }]
    ) {
      edges {
        node {
          id, symbol, quantity, averagePrice, stopLoss, target, unrealizedPnL, dayPnL
          stock {
            instrumentId, segment, strikePrice, optionType, expiry, lot_size
          }
        }
      }
    }
  }
`

const GET_POSITION_BY_ID = gql`
  query GetPositionById($id: UUID!) {
    positionsCollection(filter: { id: { eq: $id } }, first: 1) {
      edges {
        node {
          id
          tradingAccountId
          symbol
          quantity
          averagePrice
          stock { instrumentId, segment }
          unrealizedPnL
          dayPnL
          stopLoss
          target
        }
      }
    }
  }
`

// Latest executed order for a symbol to infer productType for margin reversal
const GET_LAST_EXECUTED_ORDER_FOR_SYMBOL = gql`
  query GetLastExecutedOrderForSymbol($tradingAccountId: UUID!, $symbol: String!) {
    ordersCollection(
      filter: { and: [
        { tradingAccountId: { eq: $tradingAccountId } },
        { symbol: { eq: $symbol } },
        { status: { eq: EXECUTED } }
      ]}
      orderBy: [{ createdAt: DescNullsLast }]
      first: 1
    ) {
      edges {
        node { id, productType }
      }
    }
  }
`

// -----------------------------
// Helper functions
// -----------------------------

const toNumber = (v: any): number => {
  if (v == null) return 0
  const parsed = parseFloat(v)
  return isNaN(parsed) ? 0 : parsed
}

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}


async function ensureUserAndAccount(
  apolloClient: any,
  userId: string,
  userName?: string | null,
  userEmail?: string | null,
  defaultFunding = 250000
): Promise<{ tradingAccountId: string }> {
  try {
    const { data: userRes } = await apolloClient.query({ query: GET_USER, variables: { id: userId }, fetchPolicy: "network-only" })
    if ((userRes?.usersCollection?.edges?.length ?? 0) === 0) {
      await apolloClient.mutate({ mutation: INSERT_USER, variables: { objects: [{ id: userId, email: userEmail, name: userName, isActive: true, role: "USER" }] } })
    }

    const { data: acctRes } = await apolloClient.query({ query: GET_ACCOUNT_BY_USER, variables: { userId }, fetchPolicy: "network-only" })
    const acctNode = acctRes?.trading_accountsCollection?.edges?.[0]?.node
    if (acctNode?.id) {
      return { tradingAccountId: acctNode.id }
    }

    const accountId = generateUUID()
    await apolloClient.mutate({ mutation: INSERT_ACCOUNT, variables: { objects: [{ id: accountId, userId, balance: defaultFunding, availableMargin: defaultFunding, usedMargin: 0 }] } })
    return { tradingAccountId: accountId }
  } catch (error) {
    console.error("Error in ensureUserAndAccount:", error)
    throw new Error("Failed to initialize user account")
  }
}

async function createOrUpdatePosition(apolloClient: any, executedOrder: { tradingAccountId: string, symbol: string, quantity: number, orderSide: "BUY" | "SELL", price: string, stockId?: string | null }) {
  const { data } = await apolloClient.query({ query: GET_POSITION_BY_SYMBOL, variables: { tradingAccountId: executedOrder.tradingAccountId, symbol: executedOrder.symbol }, fetchPolicy: "network-only" })
  const existingPosition = data.positionsCollection?.edges?.[0]?.node
  const orderPrice = parseFloat(executedOrder.price)

  if (existingPosition) {
    const currentQty = Number(existingPosition.quantity)
    const currentAvgPrice = toNumber(existingPosition.averagePrice)
    const orderQty = executedOrder.orderSide === "BUY" ? executedOrder.quantity : -executedOrder.quantity
    const newQty = currentQty + orderQty

    if (newQty === 0) {
      await apolloClient.mutate({ mutation: DELETE_POSITION, variables: { id: existingPosition.id } })
    } else {
      const newAvgPrice = (currentAvgPrice * Math.abs(currentQty) + orderPrice * Math.abs(orderQty)) / (Math.abs(currentQty) + Math.abs(orderQty));
      await apolloClient.mutate({ mutation: UPDATE_POSITION, variables: { id: existingPosition.id, set: { quantity: newQty, averagePrice: newAvgPrice.toFixed(2) } } })
    }
  } else {
    const quantity = executedOrder.orderSide === "BUY" ? executedOrder.quantity : -executedOrder.quantity
    await apolloClient.mutate({ mutation: INSERT_POSITION, variables: { objects: [{ id: generateUUID(), tradingAccountId: executedOrder.tradingAccountId, symbol: executedOrder.symbol, quantity: quantity, averagePrice: orderPrice.toFixed(2), stockId: executedOrder.stockId, }] } })
  }
}

// -----------------------------
// Data Hooks
// -----------------------------

export function usePortfolio(userId?: string, userName?: string | null, userEmail?: string | null) {
  const { data, refetch, loading, error } = useQuery(GET_ACCOUNT_BY_USER, { variables: { userId: userId ?? "" }, skip: !userId, errorPolicy: "all" })

  async function ensure() {
    if (!userId) return
    if (!data?.trading_accountsCollection?.edges?.[0]?.node) {
      await ensureUserAndAccount(client, userId, userName, userEmail)
      await refetch()
    }
  }

  const account = data?.trading_accountsCollection?.edges?.[0]?.node
  const balance = toNumber(account?.balance)
  const usedMargin = toNumber(account?.usedMargin)
  const availableMargin = toNumber(account?.availableMargin)
  const totalValue = balance || (availableMargin + usedMargin)
  const client_id = account?.client_id || ""
  return {
    portfolio: account ? { account: { id: account.id, totalValue, availableMargin, usedMargin, balance, client_id } } : null,
    isLoading: loading, isError: !!error, error, mutate: refetch, ensure
  }
}

export function useUserWatchlist(userId?: string) {
  const tradingAccountId = useAccountId(userId)
  const { data, loading, error, refetch } = useQuery(GET_USER_WATCHLIST, { variables: { userId: userId ?? "" }, skip: !userId, errorPolicy: "all" });

  const watchlist = useMemo(() => {
    const wlNode = data?.watchlistCollection?.edges?.[0]?.node;
    if (!wlNode) return { id: null, name: 'My Watchlist', items: [] };

    const items = wlNode.watchlistItemCollection.edges.map((e: any) => ({
      watchlistItemId: e.node.id,
      id: e.node.stock.id,
      instrumentId: e.node.stock.instrumentId,
      symbol: e.node.stock.ticker,
      name: e.node.stock.name,
      ltp: toNumber(e.node.stock.ltp),
      close: toNumber(e.node.stock.close),
      exchange: e.node.stock.exchange,
      segment: e.node.stock.segment,
      strikePrice: e.node.stock.strikePrice != null ? toNumber(e.node.stock.strikePrice) : undefined,
      optionType: e.node.stock.optionType,
      expiry: e.node.stock.expiry,
      lotSize: e.node.stock.lot_size,
    }));

    return { id: wlNode.id, name: wlNode.name, items };
  }, [data]);

  return {
    watchlist, isLoading: loading, isError: !!error, error, mutate: refetch,
  };
}


function useAccountId(userId?: string) {
  const { data } = useQuery(GET_ACCOUNT_BY_USER, { variables: { userId: userId ?? "" }, skip: !userId })
  return data?.trading_accountsCollection?.edges?.[0]?.node?.id as string | undefined
}

export function useOrders(userId?: string) {
  const tradingAccountId = useAccountId(userId)
  const { data, loading, error, refetch } = useQuery(GET_ORDERS, { variables: { tradingAccountId: tradingAccountId ?? "" }, skip: !tradingAccountId, errorPolicy: "all" })

  const orders = useMemo(() => data?.ordersCollection?.edges?.map((e: any) => ({ ...e.node, price: e.node.price != null ? toNumber(e.node.price) : null, averagePrice: e.node.averagePrice != null ? toNumber(e.node.averagePrice) : null })) ?? [], [data])

  return { orders, isLoading: loading || !tradingAccountId, isError: !!error, error, mutate: refetch }
}

export function usePositions(userId?: string) {
  const tradingAccountId = useAccountId(userId)
  const { data, loading, error, refetch } = useQuery(GET_POSITIONS, { variables: { tradingAccountId: tradingAccountId ?? "" }, skip: !tradingAccountId, errorPolicy: "all" })

  const positions = useMemo(() => data?.positionsCollection?.edges?.map((e: any) => ({ 
    ...e.node, 
    averagePrice: toNumber(e.node.averagePrice), 
    stopLoss: e.node.stopLoss != null ? toNumber(e.node.stopLoss) : undefined, 
    target: e.node.target != null ? toNumber(e.node.target) : undefined, 
    unrealizedPnL: e.node.unrealizedPnL != null ? toNumber(e.node.unrealizedPnL) : 0,
    dayPnL: e.node.dayPnL != null ? toNumber(e.node.dayPnL) : 0,
    instrumentId: e.node.stock?.instrumentId,
    segment: e.node.stock?.segment,
    strikePrice: e.node.stock?.strikePrice != null ? toNumber(e.node.stock.strikePrice) : undefined,
    optionType: e.node.stock?.optionType,
    expiry: e.node.stock?.expiry,
    lotSize: e.node.stock?.lot_size
  })) ?? [], [data])

  return { positions, isLoading: loading || !tradingAccountId, isError: !!error, error, mutate: refetch }
}

export function useOrdersAndPositions(userId?: string) {
  const tradingAccountId = useAccountId(userId)
  const { data, loading, error, refetch } = useQuery(GET_ORDERS_AND_POSITIONS, {
    variables: { tradingAccountId: tradingAccountId ?? "" },
    skip: !tradingAccountId,
    errorPolicy: "all"
  })

  const orders = useMemo(() => data?.ordersCollection?.edges?.map((e: any) => ({
    ...e.node,
    price: e.node.price != null ? toNumber(e.node.price) : null,
    averagePrice: e.node.averagePrice != null ? toNumber(e.node.averagePrice) : null
  })) ?? [], [data])

  const positions = useMemo(() => data?.positionsCollection?.edges?.map((e: any) => ({
    ...e.node,
    averagePrice: toNumber(e.node.averagePrice),
    stopLoss: e.node.stopLoss != null ? toNumber(e.node.stopLoss) : undefined,
    target: e.node.target != null ? toNumber(e.node.target) : undefined,
    instrumentId: e.node.stock?.instrumentId,
    segment: e.node.stock?.segment,
    strikePrice: e.node.stock?.strikePrice != null ? toNumber(e.node.stock.strikePrice) : undefined,
    optionType: e.node.stock?.optionType,
    expiry: e.node.stock?.expiry,
    lotSize: e.node.stock?.lot_size
  })) ?? [], [data])

  return {
    orders,
    positions,
    isLoading: loading || !tradingAccountId,
    isError: !!error,
    error,
    mutate: refetch
  }
}

export function useTransactions(tradingAccountId?: string) {
  const { data, loading, error, refetch } = useQuery(GET_TRANSACTIONS, { variables: { tradingAccountId: tradingAccountId ?? "" }, skip: !tradingAccountId, errorPolicy: "all" })
  const transactions = useMemo(() => {
    try {
      return data?.transactionsCollection?.edges?.map((e: any) => e.node) ?? []
    } catch {
      return []
    }
  }, [data])
  return { transactions, isLoading: loading, isError: !!error, error, mutate: refetch }
}

// -----------------------------
// Action Functions
// -----------------------------

export async function searchStocks(query: string) {
  try {
    const { data } = await client.query({ query: SEARCH_STOCKS, variables: { query: `%${query}%` }, fetchPolicy: "network-only" })
    return data?.stockCollection?.edges?.map((e: any) => ({
      ...e.node,
      ltp: toNumber(e.node.ltp),
      change: toNumber(e.node.change),
      changePercent: toNumber(e.node.changePercent),
      strikePrice: e.node.strikePrice != null ? toNumber(e.node.strikePrice) : undefined,
      optionType: e.node.optionType,
      expiry: e.node.expiry,
      segment: e.node.segment,
      lotSize: e.node.lot_size,
    })) ?? []
  } catch (error) {
    console.error("Search error:", error)
    return []
  }
}

export async function searchEquities(query: string) {
  try {
    const { data } = await client.query({ query: SEARCH_STOCKS_EQUITY, variables: { query: `%${query}%` }, fetchPolicy: "network-only" })
    return data?.stockCollection?.edges?.map((e: any) => ({
      ...e.node,
      ltp: toNumber(e.node.ltp),
      change: toNumber(e.node.change),
      changePercent: toNumber(e.node.changePercent),
      lotSize: e.node.lot_size,
    })) ?? []
  } catch (error) {
    console.error("Equity search error:", error)
    return []
  }
}

export async function searchFutures(query: string) {
  try {
    const { data } = await client.query({ query: SEARCH_STOCKS_FUTURES, variables: { query: `%${query}%` }, fetchPolicy: "network-only" })
    return data?.stockCollection?.edges?.map((e: any) => ({
      ...e.node,
      ltp: toNumber(e.node.ltp),
      change: toNumber(e.node.change),
      changePercent: toNumber(e.node.changePercent),
      lotSize: e.node.lot_size,
    })) ?? []
  } catch (error) {
    console.error("Futures search error:", error)
    return []
  }
}

export async function searchOptions(query: string) {
  try {
    const { data } = await client.query({ query: SEARCH_STOCKS_OPTIONS, variables: { query: `%${query}%` }, fetchPolicy: "network-only" })
    return data?.stockCollection?.edges?.map((e: any) => ({
      ...e.node,
      ltp: toNumber(e.node.ltp),
      change: toNumber(e.node.change),
      changePercent: toNumber(e.node.changePercent),
      strikePrice: e.node.strikePrice != null ? toNumber(e.node.strikePrice) : undefined,
      optionType: e.node.optionType,
      expiry: e.node.expiry,
      lotSize: e.node.lot_size,
    })) ?? []
  } catch (error) {
    console.error("Options search error:", error)
    return []
  }
}

export async function addStockToWatchlist(userId: string, stockId: string, watchlistId?: string | null) {
  let finalWatchlistId = watchlistId;
  if (!finalWatchlistId) {
    const { data: wlData } = await client.query({ query: GET_USER_WATCHLIST, variables: { userId } });
    finalWatchlistId = wlData?.watchlistCollection?.edges?.[0]?.node?.id;
    if (!finalWatchlistId) {
      const { data: newWl } = await client.mutate({ mutation: CREATE_WATCHLIST, variables: { userId, name: "My Watchlist" } });
      finalWatchlistId = newWl?.insertIntowatchlistCollection?.records?.[0]?.id;
    }
  }

  if (!finalWatchlistId) throw new Error("Could not find or create a watchlist.");

  await client.mutate({ mutation: ADD_WATCHLIST_ITEM, variables: { watchlistId: finalWatchlistId, stockId: stockId } });
}

export async function removeStockFromWatchlist(watchlistItemId: string) {
  await client.mutate({ mutation: REMOVE_WATCHLIST_ITEM, variables: { id: watchlistItemId } });
}


function computeCharges(segment: string | undefined, turnover: number) {
  const isEquity = segment === 'NSE' || segment === 'NSE_EQ'
  const isFno = segment === 'NFO'
  let brokerage = 0
  if (isEquity) {
    brokerage = Math.min(20, 0.0003 * turnover) // 0.03% or ₹20 cap
  } else if (isFno) {
    brokerage = 20 // flat per order
  } else {
    brokerage = Math.min(20, 0.0003 * turnover)
  }
  const gst = 0.18 * brokerage
  const totalCharges = brokerage + gst
  return { brokerage, gst, totalCharges }
}

function computeRequiredMargin(segment: string | undefined, turnover: number, productType?: string) {
  const isEquity = segment === 'NSE' || segment === 'NSE_EQ'
  const isFno = segment === 'NFO'
  if (productType === 'INTRADAY' || productType === 'MIS') {
    if (isEquity) return turnover * 0.1 // 10% for MIS equity
    if (isFno) return turnover * 0.2 // simplistic F&O margin
    return turnover * 0.1
  }
  // Delivery
  return turnover
}

export async function placeOrder(orderData: { userId?: string, userName?: string | null, userEmail?: string | null, tradingAccountId?: string, symbol: string, stockId: string, instrumentId: string, quantity: number, price: number | null, orderType: OrderType, orderSide: OrderSide, productType?: string, segment?: string, session?: any }) {
    const logger = orderData.session ? createLoggerFromSession(orderData.session, orderData.tradingAccountId) : null
    
    try {
        await logger?.logSystemEvent("ORDER_START", `Starting order placement for ${orderData.symbol}`)
        
        // Normalize product type to backend-expected values
        const normalizedProductType = (() => {
          const pt = (orderData.productType || '').toUpperCase()
          if (pt === 'INTRADAY' || pt === 'MIS') return 'MIS'
          if (pt === 'DELIVERY' || pt === 'CNC') return 'DELIVERY'
          return orderData.productType
        })()

        // Call server-side order placement API
        const response = await fetch('/api/trading/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tradingAccountId: orderData.tradingAccountId,
                userId: orderData.userId,
                userName: orderData.userName,
                userEmail: orderData.userEmail,
                stockId: orderData.stockId,
                instrumentId: orderData.instrumentId,
                symbol: orderData.symbol,
                quantity: orderData.quantity,
                price: orderData.price,
                orderType: orderData.orderType,
                orderSide: orderData.orderSide,
                productType: normalizedProductType ?? "MIS",
                segment: orderData.segment
            })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to place order')
        }

        const result = await response.json()
        
        await logger?.logSystemEvent("ORDER_PLACED", `Order ${result.orderId} placed successfully for ${orderData.symbol}`)

        return { success: true, orderId: result.orderId }
    } catch (error: any) {
        await logger?.logError(error, "Order placement", orderData)
        console.error("Error placing order:", JSON.stringify(error, null, 2))
        throw new Error(error.message || "Failed to place order.")
    }
}

export async function cancelOrder(orderId: string) {
  try {
    const response = await fetch('/api/trading/orders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to cancel order')
    }
    return await response.json()
  } catch (error) {
    console.error("Error cancelling order:", error); throw new Error("Failed to cancel order.")
  }
}
export async function modifyOrder(orderId: string, updates: { price?: number; quantity?: number }) {
  try {
    const response = await fetch('/api/trading/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, ...updates })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to modify order')
    }
    return await response.json()
  } catch (error) {
    console.error("Error modifying order:", error); throw new Error("Failed to modify order.")
  }
}
export async function deleteOrder(orderId: string) {
  try {
    const response = await fetch('/api/trading/orders', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete order')
    }
    return await response.json()
  } catch (error) {
    console.error("Error deleting order:", error); throw new Error("Failed to delete order.")
  }
}
export async function closePosition(positionId: string, session?: any, exitPrice?: number) {
  const logger = session ? createLoggerFromSession(session) : null
  
  try {
    await logger?.logSystemEvent("POSITION_CLOSE_START", `Starting position close for ${positionId}`)
    
    const response = await fetch('/api/trading/positions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        positionId, 
        tradingAccountId: session?.user?.tradingAccountId,
        exitPrice  // Pass exit price if provided
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to close position')
    }

    const result = await response.json()
    await logger?.logSystemEvent("POSITION_CLOSE_COMPLETE", `Position ${positionId} closed successfully`)
    
    return result
  } catch (error) {
    await logger?.logError(error as Error, "Position closure", { positionId })
    console.error("Error closing position:", error); 
    throw new Error("Failed to close position.")
  }
}
export async function updateStopLoss(positionId: string, stopLoss: number) {
  try {
    const response = await fetch('/api/trading/positions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId, updates: { stopLoss } })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update stop loss')
    }
    return await response.json()
  } catch (error) {
    console.error("Error updating stop loss:", error); throw new Error("Failed to update stop loss.")
  }
}
export async function updateTarget(positionId: string, target: number) {
  try {
    const response = await fetch('/api/trading/positions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ positionId, updates: { target } })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update target')
    }
    return await response.json()
  } catch (error) {
    console.error("Error updating target:", error); throw new Error("Failed to update target.")
  }
}


interface FundTransferPayload {
  tradingAccountId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
}

export async function addFunds(payload: FundTransferPayload) {
  try {
    // This assumes your backend handles the balance update based on the transaction.
    // You might need a more direct mutation to update the balance on the client side.
    await client.mutate({ mutation: INSERT_TRANSACTION, variables: { object: payload } });
  } catch (error) {
    console.error("Error adding funds:", error);
    throw new Error("Failed to add funds.");
  }
}

export async function withdrawFunds(payload: FundTransferPayload) {
  try {
    await client.mutate({ mutation: INSERT_TRANSACTION, variables: { object: payload } });
  } catch (error) {
    console.error("Error withdrawing funds:", error);
    throw new Error("Failed to withdraw funds.");
  }
}
