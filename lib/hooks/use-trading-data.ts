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
          id, symbol, quantity, averagePrice, stopLoss, target
          stock { instrumentId }
        }
      }
    }
  }
`

const UPDATE_POSITION = gql`
  mutation UpdatePosition($id: UUID!, $set: positionsUpdateInput!) {
    updatepositionsCollection(set: $set, filter: { id: { eq: $id } }) {
      records { id, stopLoss, target }
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
      filter: { and: [{ isActive: { eq: true } }, { or: [{ name: { ilike: $query } }, { ticker: { ilike: $query } }] }] },
      first: 10
    ) {
      edges {
        node { id, instrumentId, ticker, name, ltp, change, changePercent, sector, exchange }
      }
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
                  id, instrumentId, exchange, ticker, name, ltp, close
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
  mutation UpdateTradingAccount($id: UUID!, $set: TradingAccountUpdateInput!) {
    updateTradingAccount(by: { id: $id }, set: $set) {
      id
      balance
      availableMargin
      usedMargin
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

  const positions = useMemo(() => data?.positionsCollection?.edges?.map((e: any) => ({ ...e.node, averagePrice: toNumber(e.node.averagePrice), stopLoss: e.node.stopLoss != null ? toNumber(e.node.stopLoss) : undefined, target: e.node.target != null ? toNumber(e.node.target) : undefined, instrumentId: e.node.Stock?.instrumentId })) ?? [], [data])

  return { positions, isLoading: loading || !tradingAccountId, isError: !!error, error, mutate: refetch }
}

// -----------------------------
// Action Functions
// -----------------------------

export async function searchStocks(query: string) {
  try {
    const { data } = await client.query({ query: SEARCH_STOCKS, variables: { query: `%${query}%` }, fetchPolicy: "network-only" })
    return data?.stockCollection?.edges?.map((e: any) => ({ ...e.node, ltp: toNumber(e.node.ltp), change: toNumber(e.node.change), changePercent: toNumber(e.node.changePercent) })) ?? []
  } catch (error) {
    console.error("Search error:", error)
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

  await client.mutate({ mutation: ADD_WATCHLIST_ITEM, variables: { watchlistId: finalWatchlistId, stockId } });
}

export async function removeStockFromWatchlist(watchlistItemId: string) {
  await client.mutate({ mutation: REMOVE_WATCHLIST_ITEM, variables: { id: watchlistItemId } });
}


// export async function placeOrder(orderData: {
//   // tradingAccountId: string,
//   userId: string,
//   userName?: string | null,
//   userEmail?: string | null,
//   symbol: string,
//   stockId: string,
//   instrumentId: string,
//   quantity: number,
//   price: number,
//   orderType: OrderType,
//   orderSide: OrderSide,
//   productType?: string
// }) {
//   try {
//     const { tradingAccountId } = await ensureUserAndAccount(client, orderData.userId, orderData.userName, orderData.userEmail)
// console.log("Using tradingAccountId:", tradingAccountId);

// console.log("Placing order:", orderData);
//     const orderId = generateUUID()
//     let executionPrice = orderData.price
//     const requiredMargin = orderData.quantity * executionPrice * (orderData.productType === "MIS" ? 0.1 : 1); // 10% for MIS, 100% for CNC

//     const { data: acctData } = await client.query({ query: GET_ACCOUNT_BY_USER, variables: { userId: tradingAccountId }, fetchPolicy: "network-only" })
//     const account = acctData?.trading_accountsCollection?.edges?.[0]?.node
//     if (!account) throw new Error("Trading account not found.")
//     if (toNumber(account.availableMargin) < requiredMargin) {
//       throw new Error("Insufficient available margin to place this order.")
//     }
// console.log("Account before order:", account);

//     // Simple Brokerage Calculator 
//     const brokerage = Math.min(20, 0.0003 * orderData.quantity * executionPrice); // Max ₹20 or 0.03%
//     const totalCost = (orderData.orderSide === "BUY" ? requiredMargin : 0) + brokerage;

// console.log(`Order requires margin: ₹${requiredMargin.toFixed(2)}, brokerage: ₹${brokerage.toFixed(2)}, total cost: ₹${totalCost.toFixed(2)}`);
//     // For MARKET orders, fetch the latest LTP
//     if (orderData.orderType === "MARKET") {
//       const res = await fetch(`/api/quotes?q=${orderData.instrumentId}&mode=ltp`)
//       const quoteData = await res.json()
//       if (quoteData.status === "success" && quoteData.data[orderData.instrumentId]) {
//         executionPrice = toNumber(quoteData.data[orderData.instrumentId].last_trade_price)
//       } else {
//         throw new Error("Could not fetch LTP for market order execution.")
//       }
//     }
// console.log("Execution price determined:", executionPrice);

//     // Insert order with PENDING status
//     await client.mutate({
//       mutation: INSERT_ORDER,
//       variables: {
//         objects: [{
//           id: orderId,
//           tradingAccountId: tradingAccountId,
//           symbol: orderData.symbol,
//           stockId: orderData.stockId,
//           quantity: orderData.quantity,
//           price: orderData.orderType === 'LIMIT' ? executionPrice.toFixed(2) : null,
//           orderType: orderData.orderType,
//           orderSide: orderData.orderSide,
//           productType: orderData.productType ?? "MIS",
//           status: "PENDING"
//         }]
//       }
//     })
// console.log("Order inserted with ID:", orderId);

//     // Simulate order execution after a short delay
//     setTimeout(async () => {
//       try {
//         await client.mutate({
//           mutation: UPDATE_ORDER,
//           variables: {
//             id: orderId,
//             set: {
//               status: "EXECUTED",
//               filledQuantity: orderData.quantity,
//               averagePrice: executionPrice.toFixed(2),
//               executedAt: new Date().toISOString()
//             }
//           }
//         })
//         // Deduct funds and brokerage from account and create a position
//         await client.mutate({
//           mutation: UPDATE_TRADING_ACCOUNT,
//           variables: {
//             id: tradingAccountId,
//             set: {
//               availableMargin: account.availableMargin - totalCost,
//               usedMargin: account.usedMargin + (orderData.orderSide === "BUY" ? requiredMargin : 0),
//               balance: account.balance - brokerage
//             },
//           },
//         });

//         await client.mutate({
//           mutation: INSERT_TRANSACTION,
//           variables: {
//             object: {
//               tradingAccountId: tradingAccountId,
//               amount: brokerage,
//               type: 'DEBIT',
//               description: `Brokerage for order #${orderId}`,
//             },
//           },
//         });

//         await createOrUpdatePosition(client, {
//           tradingAccountId: tradingAccountId,
//           symbol: orderData.symbol,
//           stockId: orderData.stockId,
//           quantity: orderData.quantity,
//           orderSide: orderData.orderSide,
//           price: executionPrice.toFixed(2)
//         })
//       } catch (executionError) { console.error("Error during simulated order execution:", executionError) }
//     }, 3000) // Reduced delay for faster feedback

//     return { success: true, orderId }
//   } catch (error: any) {
//     console.error("Error placing order:", JSON.stringify(error, null, 2))
//     throw new Error(error.message || "Failed to place order.")
//   }
// }

export async function placeOrder(orderData: { userId: string, userName?: string | null, userEmail?: string | null, symbol: string, stockId: string, instrumentId: string, quantity: number, price: number, orderType: OrderType, orderSide: OrderSide, productType?: string }) {
    try {
        const { tradingAccountId } = await ensureUserAndAccount(client, orderData.userId, orderData.userName, orderData.userEmail)
        const orderId = generateUUID()
        let executionPrice = orderData.price

        if (orderData.orderType === "MARKET") {
            const res = await fetch(`/api/quotes?q=${orderData.instrumentId}&mode=ltp`)
            const quoteData = await res.json()
            if (quoteData.status === "success" && quoteData.data[orderData.instrumentId]) {
                executionPrice = toNumber(quoteData.data[orderData.instrumentId].last_trade_price)
            } else {
                throw new Error("Could not fetch LTP for market order execution.")
            }
        }

        await client.mutate({ mutation: INSERT_ORDER, variables: { objects: [{ id: orderId, tradingAccountId, symbol: orderData.symbol, stockId: orderData.stockId, quantity: orderData.quantity, price: orderData.orderType === 'LIMIT' ? executionPrice.toFixed(2) : null, orderType: orderData.orderType, orderSide: orderData.orderSide, productType: orderData.productType ?? "MIS", status: "PENDING" }] } })

        setTimeout(async () => {
            try {
                await client.mutate({ mutation: UPDATE_ORDER, variables: { id: orderId, set: { status: "EXECUTED", filledQuantity: orderData.quantity, averagePrice: executionPrice.toFixed(2), executedAt: new Date().toISOString() } } })
                await createOrUpdatePosition(client, { tradingAccountId, symbol: orderData.symbol, stockId: orderData.stockId, quantity: orderData.quantity, orderSide: orderData.orderSide, price: executionPrice.toFixed(2) })
            } catch (executionError) { console.error("Error during simulated order execution:", executionError) }
        }, 1500) // Reduced delay for faster feedback

        return { success: true, orderId }
    } catch (error: any) {
        console.error("Error placing order:", JSON.stringify(error, null, 2))
        throw new Error(error.message || "Failed to place order.")
    }
}

export async function cancelOrder(orderId: string) {
  try {
    await client.mutate({ mutation: UPDATE_ORDER, variables: { id: orderId, set: { status: "CANCELLED" } } })
  } catch (error) {
    console.error("Error cancelling order:", error); throw new Error("Failed to cancel order.")
  }
}
export async function modifyOrder(orderId: string, updates: { price?: number; quantity?: number }) {
  try {
    const setPayload: any = {};
    if (updates.price !== undefined) setPayload.price = updates.price.toFixed(2);
    if (updates.quantity !== undefined) setPayload.quantity = updates.quantity;
    await client.mutate({ mutation: UPDATE_ORDER, variables: { id: orderId, set: setPayload } })
  } catch (error) {
    console.error("Error modifying order:", error); throw new Error("Failed to modify order.")
  }
}
export async function deleteOrder(orderId: string) {
  try {
    await client.mutate({ mutation: DELETE_ORDER, variables: { id: orderId } })
  } catch (error) {
    console.error("Error deleting order:", error); throw new Error("Failed to delete order.")
  }
}
export async function closePosition(positionId: string) {
  try {
    // In a real scenario, this would create a market order to square off.
    // For this app's logic, we directly delete the position record.
    await client.mutate({ mutation: DELETE_POSITION, variables: { id: positionId } })
  } catch (error) {
    console.error("Error closing position:", error); throw new Error("Failed to close position.")
  }
}
export async function updateStopLoss(positionId: string, stopLoss: number) {
  try {
    await client.mutate({ mutation: UPDATE_POSITION, variables: { id: positionId, set: { stopLoss: stopLoss.toFixed(2) } } })
  } catch (error) {
    console.error("Error updating stop loss:", error); throw new Error("Failed to update stop loss.")
  }
}
export async function updateTarget(positionId: string, target: number) {
  try {
    await client.mutate({ mutation: UPDATE_POSITION, variables: { id: positionId, set: { target: target.toFixed(2) } } })
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
