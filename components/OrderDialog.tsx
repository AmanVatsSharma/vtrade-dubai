// /**
//  * @file OrderDialog.tsx
//  * @description A complex dialog component for placing new orders.
//  * It handles margin calculations, order type selection (MIS/CNC), lot size for F&O,
//  * and interacts with the trading data hook to place the order.
//  */
// "use client"

// import { useState, useEffect, useMemo } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import { Label } from "@/components/ui/label"
// import { Loader2, DollarSign, ArrowLeftRight, Package, Calculator } from "lucide-react"
// import { toast } from "@/hooks/use-toast"
// import { placeOrder } from "@/lib/hooks/use-trading-data"
// import { OrderType } from "@prisma/client"

// interface OrderDialogProps {
//   isOpen: boolean
//   onClose: () => void
//   stock: any | null
//   portfolio: any | null
//   onOrderPlaced: () => void
// }

// export function OrderDialog({ isOpen, onClose, stock, portfolio, onOrderPlaced }: OrderDialogProps) {
//   const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY")
//   const [quantity, setQuantity] = useState(1)
//   const [price, setPrice] = useState<number | null>(null)
//   const [currentOrderType, setCurrentOrderType] = useState('CNC')
//   const [loading, setLoading] = useState(false)
//   const [selectedStock, setSelectedStock] = useState(stock)

//   useEffect(() => {
//     setSelectedStock(stock)
//     if (stock) {
//       setPrice(stock.ltp)
//       if (stock.segment === 'NFO') {
//         setCurrentOrderType('DELIVERY')
//         setQuantity(stock.lot_size || 1)
//       } else {
//         setQuantity(1)
//         setCurrentOrderType('CNC')
//       }
//     }
//   }, [stock])

//   const availableMargin = portfolio?.account?.availableMargin || 0;

//   // Margin calculation logic
//   const marginRequired = useMemo(() => {
//     if (!selectedStock || !price || quantity <= 0) return 0;

//     const baseValue = quantity * price;

//     if (selectedStock.segment === 'NSE') {
//       if (currentOrderType === 'MIS') {
//         return baseValue / 200; // 200x margin
//       } else {
//         return baseValue / 50; // 50x margin
//       }
//     }

//     if (selectedStock.segment === 'NFO') {
//       return baseValue / 100; // 100x margin for F&O
//     }

//     return baseValue;
//   }, [selectedStock, quantity, price, currentOrderType]);


//   const handleSubmit = async () => {
//     if (!selectedStock || quantity <= 0 || (price !== null && price <= 0)) {
//       toast({
//         title: "Invalid Order",
//         description: "Please check your quantity and price.",
//         variant: "destructive",
//       })
//       return
//     }

//     if (marginRequired > availableMargin) {
//       toast({
//         title: "Insufficient Margin",
//         description: `You need ₹${marginRequired.toFixed(2)} but only have ₹${availableMargin.toFixed(2)} available.`,
//         variant: "destructive",
//       })
//       return
//     }

//     setLoading(true)

//     try {
//       await placeOrder({
//         tradingAccountId: portfolio.account.id,
//         stockId: selectedStock.id,
//         symbol: selectedStock.symbol,
//         quantity,
//         price,
//         orderType: price === null ? OrderType.MARKET : OrderType.LIMIT,
//         orderSide,
//         segment: selectedStock.segment,
//         productType: currentOrderType === 'MIS' ? 'INTRADAY' : 'DELIVERY',
//       })

//       toast({
//         title: "Order Placed",
//         description: `${quantity} shares of ${selectedStock.symbol} submitted successfully.`,
//       })
//       onOrderPlaced()
//       onClose()
//     } catch (error) {
//       console.error(error)
//       toast({
//         title: "Failed to Place Order",
//         description: "Something went wrong. Please try again.",
//         variant: "destructive",
//       })
//     } finally {
//       setLoading(false)
//     }
//   }

//   const formatCurrency = (amount: number) => `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

//   if (!selectedStock) return null

//   return (
//     <Dialog open={isOpen} onOpenChange={onClose}>
//       <DialogContent className="sm:max-w-md bg-white">
//         <DialogHeader>
//           <DialogTitle className="flex items-center gap-2">
//             <DollarSign className="h-5 w-5 text-green-600" />
//             Place Order
//           </DialogTitle>
//         </DialogHeader>

//         <div className="space-y-4">
//           <div className="bg-gray-50 p-3 rounded-md border flex justify-between items-center">
//             <div>
//               <h3 className="font-semibold text-gray-900">{selectedStock.symbol}</h3>
//               <p className="text-sm text-gray-600">{selectedStock.name}</p>
//             </div>
//             <div className="flex-shrink-0 text-right">
//               <span className="font-mono font-bold text-lg text-gray-900">
//                 ₹{selectedStock.ltp?.toFixed(2)}
//               </span>
//             </div>
//           </div>

//           <div className="flex justify-center gap-2">
//             <Button
//               onClick={() => setOrderSide("BUY")}
//               className={`flex-1 rounded-full ${orderSide === "BUY" ? 'bg-green-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
//             >
//               Buy
//             </Button>
//             <Button
//               onClick={() => setOrderSide("SELL")}
//               className={`flex-1 rounded-full ${orderSide === "SELL" ? 'bg-red-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
//             >
//               Sell
//             </Button>
//           </div>

//           <Tabs value={currentOrderType} onValueChange={setCurrentOrderType}>
//             <TabsList className="grid w-full grid-cols-2">
//               <TabsTrigger value="MIS" disabled={selectedStock.segment === 'NFO'}>Intraday (MIS)</TabsTrigger>
//               <TabsTrigger value="CNC">Delivery (CNC)</TabsTrigger>
//             </TabsList>
//             <TabsContent value="MIS" className="mt-4">
//               <p className="text-sm text-gray-500">MIS orders are for intraday trades and require less margin.</p>
//             </TabsContent>
//             <TabsContent value="CNC" className="mt-4">
//               <p className="text-sm text-gray-500">CNC orders are for holding positions longer than one day.</p>
//             </TabsContent>
//           </Tabs>

//           {selectedStock.segment === 'NFO' && (
//             <div className="flex items-center justify-between p-2 rounded-md bg-yellow-50 border border-yellow-200">
//               <span className="text-sm text-yellow-800 font-medium">
//                 <Package className="h-4 w-4 inline mr-2"/>
//                 F&O orders must be in lots. Lot Size: {selectedStock.lot_size}
//               </span>
//             </div>
//           )}

//           <div className="grid grid-cols-2 gap-3">
//             <div className="space-y-1">
//               <Label>Quantity</Label>
//               <Input
//                 type="number"
//                 value={quantity}
//                 onChange={(e) => setQuantity(Number(e.target.value))}
//                 min={selectedStock.segment === 'NFO' ? selectedStock.lot_size : 1}
//                 step={selectedStock.segment === 'NFO' ? selectedStock.lot_size : 1}
//               />
//             </div>
//             <div className="space-y-1">
//               <Label>Price</Label>
//               <Input
//                 type="number"
//                 value={price !== null ? price : ''}
//                 onChange={(e) => setPrice(Number(e.target.value))}
//                 placeholder="Market Price"
//                 step="0.05"
//               />
//             </div>
//           </div>

//           <div className="flex items-center justify-between font-mono text-sm">
//             <span className="text-gray-600">Available Margin</span>
//             <span className="font-semibold text-green-600">
//               {formatCurrency(availableMargin)}
//             </span>
//           </div>
//           <div className="flex items-center justify-between font-mono text-sm">
//             <span className="text-gray-600 flex items-center gap-1">
//               <Calculator className="h-4 w-4"/>
//               Margin Required
//             </span>
//             <span className="font-semibold text-gray-900">
//               {formatCurrency(marginRequired)}
//             </span>
//           </div>

//         </div>
//         <div className="flex gap-2 mt-4">
//           <Button
//             onClick={handleSubmit}
//             disabled={loading}
//             className="flex-1"
//           >
//             {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place Order"}
//           </Button>
//           <Button variant="outline" onClick={onClose} className="flex-1">
//             Cancel
//           </Button>
//         </div>
//       </DialogContent>
//     </Dialog>
//   )
// }


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

interface OrderDialogProps {
  isOpen: boolean
  onClose: () => void
  stock: any | null
  portfolio: any | null
  onOrderPlaced: () => void
  drawer?: boolean // 👈 flag to render drawer instead of modal
}

export function OrderDialog({ isOpen, onClose, stock, portfolio, onOrderPlaced, drawer }: OrderDialogProps) {
  const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY")
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState<number | null>(null)
  const [currentOrderType, setCurrentOrderType] = useState("CNC")
  const [loading, setLoading] = useState(false)
  const [selectedStock, setSelectedStock] = useState(stock)
  const [isMarket, setIsMarket] = useState(true)

  const { quotes } = useMarketData()
  const q = selectedStock ? quotes?.[selectedStock.instrumentId] : null

  useEffect(() => {
    setSelectedStock(stock)
    if (stock) {
      setPrice(stock.ltp)
      if (stock.segment === "NFO") {
        setCurrentOrderType("DELIVERY")
        setQuantity(stock.lot_size || 1)
      } else {
        setQuantity(1)
        setCurrentOrderType("CNC")
      }
    }
  }, [stock])

  const availableMargin = portfolio?.account?.availableMargin || 0

  // Margin calculation logic
  const marginRequired = useMemo(() => {
    if (!selectedStock || !price || quantity <= 0) return 0
    const baseValue = quantity * price

    if (selectedStock.segment === "NSE") {
      return currentOrderType === "MIS" ? baseValue / 200 : baseValue / 50
    }
    if (selectedStock.segment === "NFO") {
      return baseValue / 100
    }
    return baseValue
  }, [selectedStock, quantity, price, currentOrderType])

  // Brokerage calculation (realistic, like Kite)
  const brokerage = useMemo(() => {
    if (!selectedStock || !price || quantity <= 0) return 0
    const baseValue = quantity * price
    // Equity: 0.03% or ₹20 max per order
    // F&O: ₹20 per lot
    if (selectedStock.segment === "NSE") {
      return Math.min(20, baseValue * 0.0003)
    }
    if (selectedStock.segment === "NFO") {
      return (selectedStock.lot_size || 1) * 20
    }
    return 0
  }, [selectedStock, quantity, price])

  const totalCost = marginRequired + brokerage

  const handleSubmit = async () => {
    if (!selectedStock || quantity <= 0) {
      toast({ title: "Invalid Order", description: "Check quantity and price.", variant: "destructive" })
      return
    }

    if (totalCost > availableMargin) {
      toast({
        title: "Insufficient Margin",
        description: `Need ₹${totalCost.toFixed(2)} (margin + brokerage) but only have ₹${availableMargin.toFixed(2)}`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await placeOrder({
        tradingAccountId: portfolio.account.id,
        stockId: selectedStock.id,
        symbol: selectedStock.symbol,
        quantity,
        price: isMarket ? null : price,
        orderType: isMarket ? OrderType.MARKET : OrderType.LIMIT,
        orderSide,
        segment: selectedStock.segment,
        productType: currentOrderType === "MIS" ? "INTRADAY" : "DELIVERY",
        instrumentId: selectedStock.instrumentId,
        session: { user: { id: "current-user", clientId: "client-123" } }, // TODO: Get from actual session
      })
      toast({ title: "Order Placed", description: `${quantity} ${selectedStock.symbol} submitted.` })
      onOrderPlaced()
      onClose()
    } catch (error) {
      console.error(error)
      toast({ title: "Failed to Place Order", description: "Please try again.", variant: "destructive" })
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

          {/* Buy / Sell */}
          <div className="flex gap-2">
            <Button
              onClick={() => setOrderSide("BUY")}
              className={`flex-1 rounded-full ${orderSide === "BUY" ? "bg-green-600 text-white" : "bg-gray-200"}`}
            >
              Buy
            </Button>
            <Button
              onClick={() => setOrderSide("SELL")}
              className={`flex-1 rounded-full ${orderSide === "SELL" ? "bg-red-600 text-white" : "bg-gray-200"}`}
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
              />
            </div>
            <div>
              <Label>Price</Label>
              <Input
                type="number"
                value={isMarket ? "" : price ?? ""}
                onChange={(e) => setPrice(Number(e.target.value))}
                placeholder="Market"
                disabled={isMarket}
                step="0.05"
              />
              <Button
                size="sm"
                variant="ghost"
                className="mt-1 text-xs"
                onClick={() => setIsMarket(!isMarket)}
              >
                {isMarket ? "Switch to Limit" : "Switch to Market"}
              </Button>
            </div>
          </div>

          {/* Market Depth */}
          {q?.depth && (
            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <p className="font-bold text-green-600">Bids</p>
                {q.depth.buy.slice(0, 5).map((b: any, i: number) => (
                  <p key={i}>₹{b.price} × {b.qty}</p>
                ))}
              </div>
              <div>
                <p className="font-bold text-red-600">Asks</p>
                {q.depth.sell.slice(0, 5).map((a: any, i: number) => (
                  <p key={i}>₹{a.price} × {a.qty}</p>
                ))}
              </div>
            </div>
          )}

          {/* Compact Margin & Brokerage (like Kite) */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Value</span>
                <span className="font-mono">₹{((price || 0) * quantity).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Margin</span>
                <span className="font-mono">₹{marginRequired.toFixed(2)}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Brokerage</span>
                <span className="font-mono">₹{brokerage.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="font-mono">₹{totalCost.toFixed(2)}</span>
              </div>
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
            disabled={loading || totalCost > availableMargin} 
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
