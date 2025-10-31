"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Loader2, DollarSign, Package, Calculator } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { placeOrder } from "@/lib/hooks/use-trading-data"
import { OrderType } from "@prisma/client"
import { useMarketData } from "@/lib/hooks/MarketDataProvider"
import { useRealtimeOrders } from "@/lib/hooks/use-realtime-orders"
import { useRealtimePositions } from "@/lib/hooks/use-realtime-positions"
import { useRealtimeAccount } from "@/lib/hooks/use-realtime-account"
import { getMarketSession } from "@/lib/hooks/market-timing"

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
  const lotSize = clone.lot_size ?? clone.lotSize ?? (segment === 'NFO' ? clone.lotSize : undefined)

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
  const [price, setPrice] = useState<number | null>(null)
  const [currentOrderType, setCurrentOrderType] = useState("CNC")
  const [loading, setLoading] = useState(false)
  const [selectedStock, setSelectedStock] = useState<any>(() => normalizeStockData(stock))
  const [isMarket, setIsMarket] = useState(true)

  const { quotes } = useMarketData()
  const q = selectedStock ? quotes?.[selectedStock.instrumentId] : null

  // Get realtime hooks for immediate UI updates
  const userId = session?.user?.id
  const { optimisticUpdate: optimisticUpdateOrder, refresh: refreshOrders } = useRealtimeOrders(userId)
  const { optimisticAddPosition, refresh: refreshPositions } = useRealtimePositions(userId)
  const { optimisticBlockMargin, optimisticUpdateBalance, refresh: refreshAccount } = useRealtimeAccount(userId)

  useEffect(() => {
    const normalized = normalizeStockData(stock)
    setSelectedStock(normalized)
    if (normalized) {
      setPrice(normalized.ltp ?? null)
      if (normalized.segment === "NFO") {
        setCurrentOrderType("DELIVERY")
        setQuantity(normalized.lot_size || 1)
      } else {
        setQuantity(1)
        setCurrentOrderType("CNC")
      }
    }
  }, [stock])

  const availableMargin = portfolio?.account?.availableMargin || 0

  // Margin calculation logic - matches backend MarginCalculator
  const marginRequired = useMemo(() => {
    if (!selectedStock || !price || quantity <= 0) return 0
    const turnover = quantity * price

    // Calculate leverage based on segment and product type
    let leverage = 1
    const segment = (selectedStock.segment || selectedStock.exchange || "NSE").toUpperCase()
    const productType = currentOrderType.toUpperCase()

    if (segment === "NSE" || segment === "NSE_EQ") {
      if (productType === "MIS" || productType === "INTRADAY") {
        leverage = 200 // 0.5% margin
      } else if (productType === "CNC" || productType === "DELIVERY") {
        leverage = 50 // 2% margin
      }
    } else if (segment === "NFO" || segment === "FNO") {
      leverage = 100 // 1% margin
    } else if (segment === "MCX") {
      leverage = 50
    }

    const requiredMargin = Math.floor(turnover / leverage)
    return requiredMargin
  }, [selectedStock, quantity, price, currentOrderType])

  // Brokerage calculation - matches backend logic exactly
  const brokerage = useMemo(() => {
    if (!selectedStock || !price || quantity <= 0) return 0
    const turnover = quantity * price
    const segment = (selectedStock.segment || selectedStock.exchange || "NSE").toUpperCase()

    // NSE Equity: 0.03% or ₹20 per order, whichever is lower
    if (segment === "NSE" || segment === "NSE_EQ") {
      return Math.min(20, turnover * 0.0003)
    }
    
    // NFO F&O: Flat ₹20 per order
    if (segment === "NFO" || segment === "FNO") {
      return 20
    }
    
    // Default: ₹20 per order
    return 20
  }, [selectedStock, quantity, price])

  // Calculate additional charges (STT, transaction charges, GST, stamp duty)
  const additionalCharges = useMemo(() => {
    if (!selectedStock || !price || quantity <= 0) return 0
    const turnover = quantity * price
    const segment = (selectedStock.segment || selectedStock.exchange || "NSE").toUpperCase()
    const productType = currentOrderType.toUpperCase()

    // STT calculation
    let stt = 0
    if (segment === "NSE" && productType === "CNC") {
      stt = turnover * 0.001 // 0.1% on delivery
    } else if (segment === "NSE" && productType === "MIS") {
      stt = turnover * 0.00025 // 0.025% on intraday
    } else if (segment === "NFO") {
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

  const sessionStatus = getMarketSession()
  const isMarketBlocked = sessionStatus !== 'open'

  const handleSubmit = async () => {
    if (!selectedStock || quantity <= 0) {
      toast({ title: "Invalid Order", description: "Check quantity and price.", variant: "destructive" })
      return
    }

    if (!portfolio?.account?.id) {
      toast({ title: "Trading Account Missing", description: "No trading account available for this user.", variant: "destructive" })
      return
    }

    if (totalCost > availableMargin) {
      toast({
        title: "Insufficient Margin",
        description: `Need ₹${totalCost.toFixed(2)} (margin + charges) but only have ₹${availableMargin.toFixed(2)}`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Use dialog price directly (4th attempt - INSTANT execution)
      const orderPrice = price || selectedStock.ltp || 0
      
      if (!orderPrice || orderPrice <= 0) {
        toast({ 
          title: "Invalid Price", 
          description: "Cannot determine price for order. Please refresh and try again.", 
          variant: "destructive" 
        })
        setLoading(false)
        return
      }
      
      console.log("📤 [ORDER-DIALOG] Submitting order with price:", orderPrice)
      
      const instrumentId = selectedStock.instrumentId || (selectedStock.exchange && selectedStock.token != null
        ? `${selectedStock.exchange}-${selectedStock.token}`
        : undefined)

      // Create temporary order ID for optimistic update
      const tempOrderId = `temp-${Date.now()}`
      const timestamp = new Date().toISOString()
      
      // 1. IMMEDIATELY show pending order in UI (optimistic update)
      optimisticUpdateOrder({
        id: tempOrderId,
        symbol: selectedStock.symbol,
        quantity: orderSide === "BUY" ? quantity : -quantity,
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
      
      // 2. IMMEDIATELY block margin (optimistic update)
      optimisticBlockMargin(marginRequired)
      
      // 3. Show immediate feedback
      toast({ 
        title: "Order Submitted", 
        description: `${orderSide} ${quantity} ${selectedStock.symbol} @ ₹${orderPrice.toFixed(2)} - Processing...`,
        duration: 2000
      })
      
      // 4. Place actual order on backend
      const result = await placeOrder({
        tradingAccountId: portfolio.account.id,
        userId: session?.user?.id,
        userName: session?.user?.name,
        userEmail: session?.user?.email,
        stockId: selectedStock.stockId,
        symbol: selectedStock.symbol,
        quantity,
        price: orderPrice,
        orderType: isMarket ? OrderType.MARKET : OrderType.LIMIT,
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
      
      // 5. IMMEDIATELY refresh all data to get real order status
      setTimeout(async () => {
        await Promise.all([
          refreshOrders(),
          refreshPositions(),
          refreshAccount()
        ])
        console.log("🔄 [ORDER-DIALOG] Refreshed all data after order placement")
      }, 500)
      
      // 6. Schedule another refresh after 3 seconds for execution status
      setTimeout(async () => {
        await Promise.all([
          refreshOrders(),
          refreshPositions(),
          refreshAccount()
        ])
        console.log("🔄 [ORDER-DIALOG] Checked execution status")
      }, 3000)
      
      onOrderPlaced()
      onClose()
      
      // Monitor order execution for 10 seconds
      if (result.orderId) {
        setTimeout(async () => {
          try {
            // Check if order is still pending after 10 seconds
            const checkResponse = await fetch(`/api/trading/orders/status?orderId=${result.orderId}`)
            if (checkResponse.ok) {
              const statusData = await checkResponse.json()
              if (statusData.status === 'PENDING') {
                toast({
                  title: "Order Processing",
                  description: `Order ${selectedStock.symbol} is taking longer than expected. Check your orders tab.`,
                  variant: "default",
                  duration: 5000
                })
              } else if (statusData.status === 'REJECTED') {
                toast({
                  title: "Order Failed",
                  description: `Order ${selectedStock.symbol} failed: ${statusData.message || 'Unknown error'}`,
                  variant: "destructive",
                  duration: 7000
                })
              }
            }
          } catch (checkError) {
            console.warn("⚠️ [ORDER-DIALOG] Unable to check order status:", checkError)
          }
        }, 10000)
      }
      
    } catch (error: any) {
      console.error("❌ [ORDER-DIALOG] Order submission failed:", error)
      
      // Enhanced error messages
      let errorMessage = "Please try again."
      let errorTitle = "Failed to Place Order"
      
      if (error.message) {
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
      setLoading(false)
    }
  }

  const formatCurrency = (amt: number) =>
    `₹${(amt || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  if (!selectedStock) return null

  const Wrapper = drawer ? Drawer : ({ open, children }: any) => (open ? <>{children}</> : null)
  const Content = drawer ? DrawerContent : ({ children }: any) => <div className="p-4">{children}</div>
  const Header = drawer ? DrawerHeader : ({ children }: any) => <div className="p-4">{children}</div>
  const Title = drawer ? DrawerTitle : ({ children }: any) => <div className="p-4">{children}</div>

  return (
    <Wrapper open={isOpen} onOpenChange={onClose} >
      <Content className="bg-white dark:bg-gray-900 rounded-t-lg h-[85vh] flex flex-col">
        <Header className="flex-shrink-0">
          <Title className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Place Order
          </Title>
        </Header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                : 'Market Closed: Orders are allowed only between 09:15–15:30 IST.'}
            </div>
          )}

          {/* Buy / Sell */}
          <div className="flex gap-2">
            <Button
              onClick={() => setOrderSide("BUY")}
              className={`flex-1 rounded-full ${orderSide === "BUY" ? "bg-green-600 text-white" : "bg-gray-200"}`}
              disabled={isMarketBlocked}
            >
              Buy
            </Button>
            <Button
              onClick={() => setOrderSide("SELL")}
              className={`flex-1 rounded-full ${orderSide === "SELL" ? "bg-red-600 text-white" : "bg-gray-200"}`}
              disabled={isMarketBlocked}
            >
              Sell
            </Button>
          </div>

          {/* Order Type */}
          <Tabs value={currentOrderType} onValueChange={setCurrentOrderType}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="MIS" disabled={selectedStock.segment === "NFO"}>
                Intraday (MIS)
              </TabsTrigger>
              <TabsTrigger value="CNC">Delivery (CNC)</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* F&O Info */}
          {selectedStock.segment === "NFO" && (
            <div className="flex items-center justify-between p-2 rounded-md bg-yellow-50 border text-sm">
              <Package className="h-4 w-4 mr-1" />
              Lot Size: {selectedStock.lot_size}
              {selectedStock.expiry && <span className="ml-2">• Exp: {selectedStock.expiry}</span>}
            </div>
          )}

          {/* Qty / Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantity</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={selectedStock.segment === "NFO" ? selectedStock.lot_size : 1}
                step={selectedStock.segment === "NFO" ? selectedStock.lot_size : 1}
                // Enforce lot multiples for F&O
                onBlur={() => {
                  if (selectedStock.segment === "NFO" && selectedStock.lot_size) {
                    const lots = Math.max(1, Math.round(quantity / selectedStock.lot_size))
                    setQuantity(lots * selectedStock.lot_size)
                  }
                }}
              disabled={isMarketBlocked}
              />
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
              <span className="font-mono">₹{((price || 0) * quantity).toFixed(2)}</span>
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

        {/* Sticky Footer - Mobile Optimized */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t p-3 flex gap-2">
          <Button 
            onClick={handleSubmit} 
            disabled={loading || totalCost > availableMargin || isMarketBlocked} 
            className={`flex-1 h-12 text-base font-semibold ${totalCost > availableMargin ? 'opacity-50' : ''}`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Place ${orderSide} Order`}
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1 h-12 text-base">
            Cancel
          </Button>
        </div>
      </Content>
    </Wrapper>
  )
}
