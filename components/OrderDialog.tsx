"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Loader2, DollarSign, Package, Calculator, X } from "lucide-react"
import { AnimatedBuySellSwitcher } from "@/components/trading/AnimatedBuySellSwitcher"
import { toast } from "@/hooks/use-toast"
import { placeOrder } from "@/lib/hooks/use-trading-data"
import { useMarketData } from "@/lib/hooks/MarketDataProvider"
import { useRealtimeOrders } from "@/lib/hooks/use-realtime-orders"
import { useRealtimePositions } from "@/lib/hooks/use-realtime-positions"
import { useRealtimeAccount } from "@/lib/hooks/use-realtime-account"
import { getSegmentMarketSession } from "@/lib/hooks/market-timing"

interface OrderDialogProps {
  isOpen: boolean
  onClose: () => void
  stock: any | null
  portfolio: any | null
  onOrderPlaced: () => void
  drawer?: boolean // 👈 flag to render drawer instead of modal
  session?: any // Pass session data for logging
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

export function OrderDialog({ isOpen, onClose, stock, portfolio, onOrderPlaced, drawer, session }: OrderDialogProps) {
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
  }, [selectedStock, quantity, price, currentOrderType, brokerage])

  const totalCharges = brokerage + additionalCharges
  const totalCost = marginRequired + totalCharges

  // Get segment-aware market session
  const segmentUpper: string = (selectedStock?.segment || selectedStock?.exchange || "NSE").toUpperCase()
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

  const formatCurrency = (amt: number) =>
    `₹${(amt || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (!selectedStock) return null

  const Wrapper = drawer ? Drawer : ({ open, children }: any) => (open ? <>{children}</> : null)
  const Content = drawer ? DrawerContent : ({ children }: any) => <div className="p-4">{children}</div>
  const Header = drawer ? DrawerHeader : ({ children }: any) => <div className="p-4">{children}</div>
  const Title = drawer ? DrawerTitle : ({ children }: any) => <div className="p-4">{children}</div>

  return (
    <Wrapper open={isOpen} onOpenChange={onClose} direction="bottom">
      <Content className="bg-white dark:bg-gray-900 rounded-t-lg h-[85vh] sm:h-[90vh] flex flex-col">
        <Header className="flex-shrink-0 pb-2">
          <Title className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-lg sm:text-xl font-semibold">Place Order</span>
          </Title>
        </Header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Stock Info */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{selectedStock.symbol}</h3>
                {selectedStock.segment === "NFO" && !selectedStock.optionType && (
                  <span className="bg-blue-100 text-blue-700 rounded px-2 py-0.5 text-xs">FUT</span>
                )}
                {selectedStock.segment === "NFO" && selectedStock.optionType && (
                  <span className="bg-yellow-100 text-yellow-700 rounded px-2 py-0.5 text-xs">OPT</span>
                )}
              </div>
              <p className="text-xs text-gray-500">{selectedStock.name}</p>
              {selectedStock.segment === "NFO" && (
                <div className="flex flex-wrap gap-2 mt-1 text-xs">
                  {selectedStock.expiry && <span className="bg-gray-100 rounded px-2 py-0.5">Exp: {new Date(selectedStock.expiry).toLocaleDateString()}</span>}
                  {selectedStock.optionType && selectedStock.strikePrice !== undefined && <span className="bg-gray-100 rounded px-2 py-0.5">Strike: ₹{selectedStock.strikePrice}</span>}
                  {selectedStock.optionType && <span className="bg-gray-100 rounded px-2 py-0.5">{selectedStock.optionType}</span>}
                  {selectedStock.lot_size && <span className="bg-gray-100 rounded px-2 py-0.5">Lot: {selectedStock.lot_size}</span>}
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="font-mono font-bold text-lg">
                ₹{selectedStock.ltp?.toFixed(2)}
              </span>
              {/* {q && (
                <p className={`text-xs ${q.change >= 0 ? "text-green-600" : "text-red-600"}`}>{q.change.toFixed(2)} ({q.change_percent.toFixed(2)}%)</p>
              )} */}
            </div>
          </div>

          {/* Market session banner */}
          {isMarketBlocked && (
            <div className="p-2 rounded-md border text-xs bg-yellow-50 border-yellow-200 text-yellow-800">
              {sessionStatus === 'pre-open'
                ? 'Pre-Open (09:00–09:15 IST): Orders are temporarily blocked.'
                : segmentUpper.includes('MCX')
                  ? 'Market Closed: MCX orders are allowed between 09:00–23:55 IST.'
                  : 'Market Closed: NSE orders are allowed between 09:15–15:30 IST.'}
            </div>
          )}
          {/* Dev override banner */}
          {!isMarketBlocked && sessionStatus !== 'open' && allowDevOrders && (
            <div className="p-2 rounded-md border text-xs bg-blue-50 border-blue-200 text-blue-800">
              Dev override active: Orders are enabled outside market hours (testing).
            </div>
          )}


          {/* Order Type */}
          <Tabs value={currentOrderType} onValueChange={setCurrentOrderType}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="MIS" disabled={selectedStock.segment === "NFO" || selectedStock.segment === "FNO" || selectedStock.segment === "NSE_FO"}>
                Intraday (MIS)
              </TabsTrigger>
              <TabsTrigger value="CNC">Delivery (CNC)</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Derivatives Info */}
          {isDerivatives && (
            <div className="flex items-center justify-between p-2 rounded-md bg-yellow-50 border text-sm">
              <Package className="h-4 w-4 mr-1" />
              Lot Size: {lotSize}
              {selectedStock.expiry && <span className="ml-2">• Exp: {selectedStock.expiry}</span>}
            </div>
          )}

          {/* Qty / Price - Responsive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              {isDerivatives ? (
                <>
                  <Label>Lots</Label>
                  <Input
                    type="number"
                    value={lots}
                    onChange={(e) => setLots(Math.max(1, Number(e.target.value)))}
                    min={1}
                    step={1}
                    disabled={isMarketBlocked}
                  />
                  <div className="text-[11px] text-gray-500 mt-1">
                    {lots} lot{lots > 1 ? 's' : ''} → {units} units
                  </div>
                </>
              ) : (
                <>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min={1}
                    step={1}
                    disabled={isMarketBlocked}
                  />
                </>
              )}
            </div>
            <div>
              <Label>Price</Label>
              <Input
                type="number"
                value={isMarket ? "" : price ?? ""}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="Market"
                disabled={isMarket || isMarketBlocked}
                step="0.05"
              />
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 text-xs"
                onClick={() => setIsMarket(!isMarket)}
                disabled={isMarketBlocked}
              >
                {isMarket ? "Switch to Limit" : "Switch to Market"}
              </Button>
            </div>
          </div>

          {/* Market Depth */}
          {(q as any)?.depth && (
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <p className="font-bold text-green-600">Bids</p>
                {(q as any).depth.buy.slice(0, 5).map((b: any, i: number) => (
                  <p key={i}>₹{b.price} × {b.qty}</p>
                ))}
              </div>
              <div>
                <p className="font-bold text-red-600">Asks</p>
                {(q as any).depth.sell.slice(0, 5).map((a: any, i: number) => (
                  <p key={i}>₹{a.price} × {a.qty}</p>
                ))}
              </div>
            </div>
          )}

          {/* Compact Margin & Charges breakdown (like Kite) */}
          <div className="space-y-2 text-xs bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Value</span>
              <span className="font-mono">₹{((price || 0) * units).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Required Margin</span>
              <span className="font-mono font-semibold">₹{marginRequired.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Brokerage</span>
                <span className="font-mono">₹{brokerage.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Other Charges</span>
                <span className="font-mono">₹{additionalCharges.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>(STT, Txn, GST, Stamp)</span>
              </div>
            </div>
            <div className="flex justify-between font-semibold border-t pt-2">
              <span>Total Required</span>
              <span className="font-mono">₹{totalCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Available Margin - Compact */}
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Available</span>
            <span className={`font-semibold ${totalCost > availableMargin ? 'text-red-600' : 'text-green-600'}`}>
              ₹{availableMargin.toFixed(2)}
            </span>
          </div>
          {totalCost > availableMargin && (
            <div className="text-xs text-red-600 text-center py-1">
              Insufficient margin
            </div>
          )}
        </div>

        {/* Sticky Footer - Professional Animated Switcher */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4 space-y-2 sm:space-y-3">
          {/* Close Button - Top Right */}
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close order panel"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
            </button>
          </div>
          
          {/* Animated Buy/Sell Switcher */}
          <AnimatedBuySellSwitcher
            orderSide={orderSide}
            onSideChange={setOrderSide}
            onPlaceOrder={handleSubmit}
            loading={false}
            disabled={totalCost > availableMargin || isMarketBlocked}
          />
          
          {/* Helper Text - Responsive */}
          <p className="text-[10px] sm:text-xs text-center text-gray-500 dark:text-gray-400 px-2">
            {orderSide === "BUY" 
              ? "Tap Buy to place order • Tap Sell to switch" 
              : "Tap Sell to place order • Tap Buy to switch"}
          </p>
        </div>
      </Content>
    </Wrapper>
  )
}
