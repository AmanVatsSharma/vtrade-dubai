/**
 * @file use-order-form.ts
 * @module lib/hooks
 * @description Custom hook for managing order form state, calculations, and submission logic.
 * @author BharatERP
 * @created 2026-02-02
 */

import { useState, useEffect, useMemo, useRef } from "react"
import { toast } from "@/hooks/use-toast"
import { placeOrder } from "@/lib/hooks/use-trading-data"
import { useMarketData } from "@/lib/hooks/MarketDataProvider"
import { useRealtimeOrders } from "@/lib/hooks/use-realtime-orders"
import { useRealtimePositions } from "@/lib/hooks/use-realtime-positions"
import { useRealtimeAccount } from "@/lib/hooks/use-realtime-account"
import { getSegmentMarketSession } from "@/lib/hooks/market-timing"

export interface OrderFormProps {
  stock: any | null
  portfolio: any | null
  onOrderPlaced: () => void
  onClose: () => void
  session?: any
}

function normalizeStockData(raw: any | null) {
  if (!raw) return null

  const clone: any = { ...raw }

  const deriveTokenFromInstrument = (instrumentId?: string | null): number | undefined => {
    if (!instrumentId) return undefined
    const parts = instrumentId.split('-')
    const last = parts[parts.length - 1]
    const maybe = Number(last)
    return Number.isFinite(maybe) ? maybe : undefined
  }

  const token = clone.token ?? deriveTokenFromInstrument(clone.instrumentId)
  const exchange = (clone.exchange || clone.segment || 'NSE')?.toString().toUpperCase()
  const segment = (clone.segment || clone.exchange || 'NSE')?.toString().toUpperCase()
  const instrumentId = clone.instrumentId || (exchange && token != null ? `${exchange}-${token}` : undefined)
  const lotSize = clone.lot_size ?? clone.lotSize ?? ((segment === 'NFO' || segment === 'FNO' || segment === 'NSE_FO' || segment === 'MCX' || segment === 'MCX_FO') ? clone.lotSize : undefined)

  return {
    ...clone,
    stockId: clone.stockId ?? clone.id ?? null,
    token,
    exchange,
    segment,
    instrumentId,
    lot_size: lotSize,
    lotSize,
    ltp: clone.ltp != null ? Number(clone.ltp) : undefined,
    close: clone.close != null ? Number(clone.close) : undefined,
    strikePrice: clone.strikePrice ?? clone.strike_price ?? undefined,
    optionType: clone.optionType ?? clone.option_type ?? undefined,
    name: clone.name || clone.symbol,
    watchlistItemId: clone.watchlistItemId ?? clone.id ?? null
  }
}

export function useOrderForm({ stock, portfolio, onOrderPlaced, onClose, session }: OrderFormProps) {
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY")
  const [quantity, setQuantity] = useState(1)
  const [lots, setLots] = useState(1)
  const [price, setPrice] = useState<number | null>(null)
  const [currentOrderType, setCurrentOrderType] = useState("CNC")
  const [selectedStock, setSelectedStock] = useState<any>(() => normalizeStockData(stock))
  const [isMarket, setIsMarket] = useState(true)
  const [riskConfig, setRiskConfig] = useState<{
    leverage: number
    brokerageFlat: number | null
    brokerageRate: number | null
    brokerageCap: number | null
  } | null>(null)
  const submittingRef = useRef(false)

  const { quotes } = useMarketData()
  const q = selectedStock ? quotes?.[selectedStock.instrumentId] : null

  // Get realtime hooks for immediate UI updates
  const userId = session?.user?.id
  const { 
    optimisticUpdate: optimisticUpdateOrder, 
    resolveOptimisticOrder,
    rejectOptimisticOrder,
    refresh: refreshOrders
  } = useRealtimeOrders(userId)
  const { optimisticAddPosition, refresh: refreshPositions } = useRealtimePositions(userId)
  const { optimisticBlockMargin, optimisticReleaseMargin, optimisticUpdateBalance, refresh: refreshAccount } = useRealtimeAccount(userId)

  useEffect(() => {
    const normalized = normalizeStockData(stock)
    setSelectedStock(normalized)
    if (normalized) {
      setPrice(normalized.ltp ?? null)
      if (normalized.segment === "NFO" || normalized.segment === "FNO" || normalized.segment === "NSE_FO" || normalized.segment === "MCX" || normalized.segment === "MCX_FO") {
        setCurrentOrderType("DELIVERY")
        const baseLot = normalized.lot_size || 1
        setLots(1)
        setQuantity(baseLot)
      } else {
        setQuantity(1)
        setLots(1)
        setCurrentOrderType("CNC")
      }
    }
  }, [stock])

  // Derived helpers
  const segmentUpper = (selectedStock?.segment || selectedStock?.exchange || "NSE")?.toUpperCase()
  const isDerivatives = segmentUpper === "NFO" || segmentUpper === "FNO" || segmentUpper === "NSE_FO" || segmentUpper === "MCX" || segmentUpper === "MCX_FO"
  const lotSize = selectedStock?.lot_size || 1
  const units = isDerivatives ? Math.max(1, lots) * lotSize : quantity

  // Fetch risk config from server to mirror backend
  useEffect(() => {
    let ignore = false
    async function load() {
      if (!selectedStock) return
      const prod = currentOrderType.toUpperCase()
      const seg = segmentUpper
      try {
        const res = await fetch(`/api/risk/config?segment=${encodeURIComponent(seg)}&productType=${encodeURIComponent(prod)}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`Failed to load risk config ${res.status}`)
        const data = await res.json()
        if (!ignore && data?.success && data?.data) {
          setRiskConfig({
            leverage: Number(data.data.leverage) || 1,
            brokerageFlat: data.data.brokerageFlat ?? null,
            brokerageRate: data.data.brokerageRate ?? null,
            brokerageCap: data.data.brokerageCap ?? null
          })
        }
      } catch (e) {
        // Silent fail; UI will fallback to defaults
        if (!ignore) setRiskConfig(null)
      }
    }
    load()
    return () => { ignore = true }
  }, [selectedStock, currentOrderType, segmentUpper])

  const availableMargin = portfolio?.account?.availableMargin || 0

  // Margin calculation logic - matches backend MarginCalculator
  const marginRequired = useMemo(() => {
    if (!selectedStock || !price || units <= 0) return 0
    const turnover = units * price

    // Calculate leverage based on segment and product type
    let leverage = riskConfig?.leverage ?? (() => {
      const productType = currentOrderType.toUpperCase()
      if (segmentUpper === "NSE" || segmentUpper === "NSE_EQ") {
        if (productType === "MIS" || productType === "INTRADAY") return 200
        if (productType === "CNC" || productType === "DELIVERY") return 50
      } else if (segmentUpper === "NFO" || segmentUpper === "FNO") {
        return 100
      } else if (segmentUpper === "MCX") {
        return 50
      }
      return 1
    })()

    const requiredMargin = Math.floor(turnover / leverage)
    return requiredMargin
  }, [selectedStock, units, price, currentOrderType, riskConfig, segmentUpper])

  // Brokerage calculation - matches backend logic exactly
  const brokerage = useMemo(() => {
    if (!selectedStock || !price || units <= 0) return 0
    const turnover = units * price
    const segment = segmentUpper

    // Prefer DB-configured brokerage
    if (riskConfig) {
      if (riskConfig.brokerageFlat != null) {
        return Number(riskConfig.brokerageFlat)
      }
      if (riskConfig.brokerageRate != null) {
        const rate = Number(riskConfig.brokerageRate)
        let br = turnover * rate
        if (riskConfig.brokerageCap != null) {
          br = Math.min(br, Number(riskConfig.brokerageCap))
        }
        return br
      }
    }

    // Fallbacks mirroring MarginCalculator defaults
    if (segment === "NSE" || segment === "NSE_EQ") {
      return Math.min(20, turnover * 0.0003)
    }
    if (segment === "NFO" || segment === "FNO") {
      return 20
    }
    // MCX and others default to flat 20
    return 20
  }, [selectedStock, units, price, riskConfig, segmentUpper])

  // Calculate additional charges (STT, transaction charges, GST, stamp duty)
  const additionalCharges = useMemo(() => {
    if (!selectedStock || !price || units <= 0) return 0
    const turnover = units * price
    const segment = segmentUpper
    const productType = currentOrderType.toUpperCase()

    // STT calculation
    let stt = 0
    if (segment === "NSE" && productType === "CNC") {
      stt = turnover * 0.001 // 0.1% on delivery
    } else if (segment === "NSE" && productType === "MIS") {
      stt = turnover * 0.00025 // 0.025% on intraday
    } else if (segment === "NFO" || segment === "NSE_FO") {
      stt = turnover * 0.0001 // 0.01% on F&O
    }

    // Transaction charges
    const transactionCharges = turnover * 0.0000325 // 0.00325%
    
    // GST on brokerage and transaction charges
    const gst = (brokerage + transactionCharges) * 0.18 // 18% GST
    
    // Stamp duty
    const stampDuty = turnover * 0.00003 // 0.003%

    return Math.floor(stt + transactionCharges + gst + stampDuty)
  }, [selectedStock, quantity, price, currentOrderType, brokerage, segmentUpper])

  const totalCharges = brokerage + additionalCharges
  const totalCost = marginRequired + totalCharges

  // Get segment-aware market session
  const { session: sessionStatus, reason: sessionReason } = getSegmentMarketSession(segmentUpper)
  const allowDevOrders = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_ALLOW_DEV_ORDERS === 'true'
  const isMarketBlocked = !allowDevOrders && sessionStatus !== 'open'

  const handleSubmit = async () => {
    if (submittingRef.current) return
    submittingRef.current = true

    if (!selectedStock) {
      toast({ title: "Select a Stock", description: "Please pick a stock first.", variant: "destructive" })
      submittingRef.current = false
      return
    }

    if (!portfolio?.account?.id) {
      toast({ title: "Trading Account Missing", description: "No trading account available for this user.", variant: "destructive" })
      submittingRef.current = false
      return
    }

    if (!session?.user?.id) {
      toast({ title: "Not Signed In", description: "Please sign in to place orders.", variant: "destructive" })
      submittingRef.current = false
      return
    }

    if (!allowDevOrders && sessionStatus !== 'open') {
      // Show segment-specific error message
      const errorMessage = sessionReason || 
        (segmentUpper.includes('MCX') 
          ? "MCX orders are allowed between 09:00–23:55 IST."
          : "NSE orders are allowed between 09:15–15:30 IST.")
      
      toast({
        title: "Market Closed",
        description: errorMessage,
        variant: "destructive"
      })
      submittingRef.current = false
      return
    }

    if (units <= 0) {
      toast({ title: "Invalid Order", description: "Check quantity and price.", variant: "destructive" })
      submittingRef.current = false
      return
    }

    if (totalCost > availableMargin) {
      toast({
        title: "Insufficient Margin",
        description: `Need ₹${totalCost.toFixed(2)} (margin + charges) but only have ₹${availableMargin.toFixed(2)}`,
        variant: "destructive",
      })
      submittingRef.current = false
      return
    }

    const orderPrice = price || selectedStock.ltp || 0
    if (!orderPrice || orderPrice <= 0) {
      toast({ 
        title: "Invalid Price", 
        description: "Cannot determine price for order. Please refresh and try again.", 
        variant: "destructive" 
      })
      submittingRef.current = false
      return
    }

    const instrumentId = selectedStock.instrumentId || (selectedStock.exchange && selectedStock.token != null
      ? `${selectedStock.exchange}-${selectedStock.token}`
      : undefined)
    const tempOrderId = `temp-${Date.now()}`
    const timestamp = new Date().toISOString()

    try {
      optimisticUpdateOrder({
        id: tempOrderId,
        symbol: selectedStock.symbol,
        quantity: orderSide === "BUY" ? units : -units,
        orderType: isMarket ? "MARKET" : "LIMIT",
        orderSide,
        price: orderPrice,
        averagePrice: orderPrice,
        filledQuantity: 0,
        productType: currentOrderType === "MIS" ? "INTRADAY" : "DELIVERY",
        status: "PENDING",
        createdAt: timestamp,
        executedAt: null,
        stock: selectedStock
      })
    } catch (e) {
      console.error("❌ [ORDER-DIALOG] Optimistic order update failed:", e)
    }

    try { 
      optimisticBlockMargin(marginRequired)
    } catch (e) {
      console.error("❌ [ORDER-DIALOG] Optimistic margin block failed:", e)
    }

    toast({ 
      title: "Order Submitted", 
      description: `${orderSide} ${Math.abs(units)} ${selectedStock.symbol} @ ₹${orderPrice.toFixed(2)} - Processing...`,
      duration: 2000
    })

    onOrderPlaced()
    onClose()

    const finalizeOrder = async () => {
      try {
        const result = await placeOrder({
          tradingAccountId: portfolio.account.id,
          userId: session?.user?.id,
          userName: session?.user?.name,
          userEmail: session?.user?.email,
          stockId: selectedStock.stockId,
          symbol: selectedStock.symbol,
          quantity: units,
          price: orderPrice,
          orderType: isMarket ? "MARKET" : "LIMIT",
          orderSide,
          segment: selectedStock.segment,
          exchange: selectedStock.exchange,
          productType: currentOrderType === "MIS" ? "INTRADAY" : "DELIVERY",
          instrumentId,
          token: selectedStock.token,
          name: selectedStock.name,
          ltp: selectedStock.ltp,
          close: selectedStock.close,
          strikePrice: selectedStock.strikePrice,
          optionType: selectedStock.optionType,
          expiry: selectedStock.expiry,
          lotSize: selectedStock.lot_size,
          watchlistItemId: selectedStock.watchlistItemId,
          session
        })

        console.log("✅ [ORDER-DIALOG] Order submitted successfully:", result)
        const backendOrderId = result?.orderId ?? null
        if (backendOrderId) {
          resolveOptimisticOrder(tempOrderId, {
            id: backendOrderId,
            status: result.executionScheduled ? "PENDING" : "EXECUTED",
            executedAt: result.executionScheduled ? null : new Date().toISOString(),
            filledQuantity: result.executionScheduled ? 0 : units
          })
        } else {
          resolveOptimisticOrder(tempOrderId)
        }

        Promise.allSettled([
          refreshOrders(),
          refreshPositions(),
          refreshAccount()
        ]).catch(() => {})

        toast({
          title: "Order Confirmed",
          description: backendOrderId
            ? `Order #${backendOrderId.slice(0, 8)} placed successfully.`
            : `${selectedStock.symbol} order accepted.`,
          duration: 3500
        })
      } catch (error: any) {
        console.error("❌ [ORDER-DIALOG] Backend order placement failed:", error)
        rejectOptimisticOrder(tempOrderId, error?.message)
        try { optimisticReleaseMargin(marginRequired) } catch {}
        Promise.allSettled([
          refreshOrders(),
          refreshAccount()
        ]).catch(() => {})

        let errorMessage = "Please try again."
        let errorTitle = "Failed to Place Order"
        
        if (error?.message) {
          if (error.message.includes("Insufficient funds")) {
            errorTitle = "Insufficient Funds"
            errorMessage = error.message
          } else if (error.message.includes("Stock not found")) {
            errorTitle = "Stock Not Available"
            errorMessage = "Please refresh the stock data and try again."
          } else if (error.message.includes("Invalid price")) {
            errorTitle = "Invalid Price"
            errorMessage = "Cannot determine valid price. Please refresh and try again."
          } else if (error.message.includes("timeout") || error.message.includes("timed out")) {
            errorTitle = "Order Timeout"
            errorMessage = "Order took too long to process. Please check your orders tab."
          } else if (error.message.includes("network") || error.message.includes("fetch")) {
            errorTitle = "Network Error"
            errorMessage = "Please check your connection and try again."
          } else {
            errorMessage = error.message
          }
        }
        
        toast({ 
          title: errorTitle, 
          description: errorMessage, 
          variant: "destructive",
          duration: 7000
        })
      } finally {
        submittingRef.current = false
      }
    }

    finalizeOrder()
  }

  return {
    orderSide,
    setOrderSide,
    quantity,
    setQuantity,
    lots,
    setLots,
    price,
    setPrice,
    currentOrderType,
    setCurrentOrderType,
    selectedStock,
    isMarket,
    setIsMarket,
    riskConfig,
    quotes: q,
    availableMargin,
    marginRequired,
    brokerage,
    additionalCharges,
    totalCost,
    isMarketBlocked,
    sessionStatus,
    sessionReason,
    allowDevOrders,
    isDerivatives,
    lotSize,
    units,
    handleSubmit
  }
}
