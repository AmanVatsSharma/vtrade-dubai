// /**
//  * @file TradingDashboard.tsx
//  * @description The main, fully integrated component for the trading application.
//  * This file, formerly test.tsx, now correctly uses all the refactored hooks and components,
//  * including a dedicated Watchlist component, ensuring a seamless and efficient user experience.
//  */
// "use client"

// import { useState, useEffect } from "react"
// import { TrendingUp, Wallet, FileText, Eye, AlertCircle, Loader2, Target } from "lucide-react"
// import { useSession } from "next-auth/react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Card, CardContent } from "@/components/ui/card"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import { Label } from "@/components/ui/label"
// import { toast } from "@/hooks/use-toast"
// import { usePortfolio, useUserWatchlist, useOrders, usePositions, placeOrder } from "@/lib/hooks/use-trading-data"
// import { MarketDataProvider, useMarketData } from "@/lib/hooks/MarketDataProvider"
// import { OrderManagement } from "@/components/order-management"
// import { PositionTracking } from "@/components/position-tracking"
// import { Account } from "@/components/Account"
// import { Watchlist } from "@/components/watchlist" // Import the dedicated watchlist component
// import { OrderType } from "@prisma/client"
// import { OrderDialog } from "./OrderDialog"

// // Main component wrapped with the MarketDataProvider
// export default function TradingDashboard() {
//   const { data: session, status } = useSession()
//   const userId = session?.user?.id
//   const userName = session?.user?.name
//   const userEmail = session?.user?.email

//   // Fetch initial static data using the corrected hooks
//   const { portfolio, isLoading: portfolioLoading, isError: portfolioError, mutate: mutatePortfolio, ensure } = usePortfolio(userId, userName, userEmail)
//   const { watchlist, isLoading: watchlistLoading, isError: watchlistError, mutate: mutateWatchlist } = useUserWatchlist(userId)
//   const { orders, isLoading: ordersLoading, isError: ordersError, mutate: mutateOrders } = useOrders(userId)
//   const { positions, isLoading: positionsLoading, isError: positionsError, mutate: mutatePositions } = usePositions(userId)

//   // Ensure user and trading account exist on login
//   useEffect(() => {
//     if (status === "authenticated" && userId && ensure) {
//       ensure().catch(console.error)
//     }
//   }, [status, userId, ensure])

//   if (status === "loading" || (status === "authenticated" && portfolioLoading)) {
//     return (
//       <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
//         <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white mb-4">
//           <TrendingUp className="h-4 w-4" />
//         </div>
//         <h1 className="text-xl font-semibold text-gray-900 mb-2">TradingPro</h1>
//         <p className="text-sm text-gray-600 mb-6">Please Wait To Rock And Trade.</p>
//         <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
//       </div>
//     )
//   }

//   // Once authenticated, render the main app wrapped in the data provider
//   return (
//     <MarketDataProvider watchlist={watchlist} positions={positions}>
//       <DashboardContent
//         session={session}
//         portfolio={{ data: portfolio, isLoading: portfolioLoading, isError: portfolioError, mutate: mutatePortfolio }}
//         watchlist={{ data: watchlist, isLoading: watchlistLoading, isError: watchlistError, mutate: mutateWatchlist }}
//         orders={{ data: orders, isLoading: ordersLoading, isError: ordersError, mutate: mutateOrders }}
//         positions={{ data: positions, isLoading: positionsLoading, isError: positionsError, mutate: mutatePositions }}
//       />
//     </MarketDataProvider>
//   )
// }

// // The core UI component that consumes market data
// function DashboardContent({ session, portfolio, watchlist, orders, positions }: any) {
//   const [activeTab, setActiveTab] = useState("watchlist")
//   const [orderDialogOpen, setOrderDialogOpen] = useState(false)
//   const [selectedStock, setSelectedStock] = useState<any>(null)

//   const { quotes, isLoading: quotesLoading } = useMarketData()

//   const handleSelectStock = (stock: any) => {
//     setSelectedStock(stock)
//     setOrderDialogOpen(true)
//   }

//   const handlePlaceOrder = async (orderData: { type: "BUY" | "SELL", orderType: OrderType, quantity: number, price: number }) => {
//     if (!selectedStock?.id || !session?.user?.id) {
//       toast({ title: "Error", description: "No stock selected or user not logged in.", variant: "destructive" })
//       return
//     }

//     try {
//       await placeOrder({
//         // tradingAccountId: portfolio.data.tradingAccountId,
//         userId: session.user.id,
//         userName: session.user.name,
//         userEmail: session.user.email,
//         symbol: selectedStock.symbol || selectedStock.ticker,
//         stockId: selectedStock.id,
//         instrumentId: selectedStock.instrumentId,
//         quantity: orderData.quantity, price: orderData.price,
//         orderType: orderData.orderType, orderSide: orderData.type, productType: "MIS",
//       })

//       toast({ title: "Order Submitted", description: `${orderData.type} order for ${orderData.quantity} of ${selectedStock.symbol || selectedStock.ticker} is pending.` })

//       setOrderDialogOpen(false)
//       setSelectedStock(null)
//       // Refetch data after placing an order
//       setTimeout(() => {
//         orders.mutate()
//         positions.mutate()
//         portfolio.mutate()
//       }, 1800);

//     } catch (error) {
//       toast({ title: "Order Failed", description: error instanceof Error ? error.message : "Failed to place order", variant: "destructive" })
//     }
//   }

//   const ErrorState = ({ retry, title }: { retry: () => void; title: string }) => (
//     <Card className="bg-white border"><CardContent className="p-8 text-center"><AlertCircle className="h-8 w-8 mx-auto text-red-500 mb-3" /><h3 className="text-lg font-semibold text-gray-900">Error Loading {title}</h3><p className="text-gray-600 mb-4">Something went wrong. Please try again.</p><Button onClick={retry} variant="outline" size="sm">Retry</Button></CardContent></Card>
//   )

//   const LoadingState = ({ count = 3 }) => (
//     <div className="space-y-2">{Array.from({ length: count }).map((_, i) => (<Card key={i} className="bg-white border"><CardContent className="p-3"><div className="animate-pulse space-y-2"><div className="h-4 bg-gray-200 rounded w-1/3"></div><div className="h-3 bg-gray-200 rounded w-1/2"></div></div></CardContent></Card>))}</div>
//   )

//   // const OrderDialog = () => {
//   //   const [orderSide, setOrderSide] = useState<"BUY" | "SELL">("BUY")
//   //   const [orderProductType, setOrderProductType] = useState<OrderType>('LIMIT')
//   //   const [quantity, setQuantity] = useState(1)
//   //   const [price, setPrice] = useState(selectedStock?.ltp || 0)
//   //   const [isPlacing, setIsPlacing] = useState(false)

//   //   const quote = selectedStock?.instrumentId ? quotes[selectedStock.instrumentId] : null
//   //   const ltp = quote?.last_trade_price || selectedStock?.ltp || 0

//   //   useEffect(() => {
//   //       if (selectedStock) {
//   //           setPrice(ltp)
//   //           setQuantity(1)
//   //           setOrderSide("BUY")
//   //           setOrderProductType("LIMIT")
//   //       }
//   //   }, [selectedStock])

//   //   const handleSubmit = async () => {
//   //     setIsPlacing(true)
//   //     await handlePlaceOrder({ type: orderSide, orderType: orderProductType, quantity, price })
//   //     setIsPlacing(false)
//   //   }

//   //   return (
//   //     <Dialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen}>
//   //       <DialogContent className="sm:max-w-md bg-white">
//   //         <DialogHeader><DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900"><Target className="h-5 w-5 text-blue-600" />Place Order</DialogTitle></DialogHeader>
//   //         {selectedStock && (<div className="space-y-4">
//   //             <div className="bg-gray-50 p-3 rounded-md border"><h3 className="font-semibold">{selectedStock.name}</h3><p className="text-sm text-gray-600">LTP: <span className="font-mono">₹{ltp.toFixed(2)}</span></p></div>
//   //             <div className="grid grid-cols-2 gap-2"><Button variant={orderSide === "BUY" ? "default" : "outline"} onClick={() => setOrderSide("BUY")} className="bg-blue-600 hover:bg-blue-700 text-white">BUY</Button><Button variant={orderSide === "SELL" ? "destructive" : "outline"} onClick={() => setOrderSide("SELL")} className="bg-red-600 hover:bg-red-700 text-white">SELL</Button></div>
//   //             <Tabs value={orderProductType} onValueChange={(v) => setOrderProductType(v as OrderType)} className="w-full"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="LIMIT">Limit</TabsTrigger><TabsTrigger value="MARKET">Market</TabsTrigger></TabsList></Tabs>
//   //             <div className="grid grid-cols-2 gap-3">
//   //               <div><Label>Quantity</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} min="1" /></div>
//   //               <div><Label>Price</Label><Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} step="0.05" disabled={orderProductType === 'MARKET'}/></div>
//   //             </div>
//   //             <Button onClick={handleSubmit} className={`w-full ${orderSide === "BUY" ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`} disabled={isPlacing}>{isPlacing ? <Loader2 className="h-4 w-4 animate-spin"/> : `Place ${orderSide} Order`}</Button>
//   //           </div>
//   //         )}
//   //       </DialogContent>
//   //     </Dialog>
//   //   )
//   // }

//   const renderContent = () => {
//     switch (activeTab) {
//       case "watchlist":
//         return watchlist.isError ? <ErrorState retry={watchlist.mutate} title="Watchlist" /> :
//           (watchlist.isLoading || (watchlist.data?.items.length > 0 && quotesLoading)) ? <LoadingState count={5} /> :
//             <Watchlist watchlist={watchlist.data} quotes={quotes} onSelectStock={handleSelectStock} onUpdate={watchlist.mutate} />

//       case "orders":
//         return orders.isError ? <ErrorState retry={orders.mutate} title="Orders" /> :
//           orders.isLoading ? <LoadingState /> :
//             (<div className="space-y-4 pb-20"><h2 className="text-xl font-semibold text-gray-900">Orders</h2><OrderManagement orders={orders.data} onOrderUpdate={orders.mutate} /></div>)

//       case "positions":
//         const totalPnL = positions.data?.reduce((sum: number, pos: any) => {
//           const quote = quotes[pos.stock?.instrumentId ?? pos.averagePrice];
//           const ltp = quote?.last_trade_price ?? pos.averagePrice;
//           return sum + (ltp - pos.averagePrice) * pos.quantity;
//         }, 0) || 0;
//         return positions.isError ? <ErrorState retry={positions.mutate} title="Positions" /> :
//           positions.isLoading ? <LoadingState count={2} /> :
//             (<div className="space-y-4 pb-20">
//               <h2 className="text-xl font-semibold text-gray-900">Positions</h2>
//               <Card><CardContent className="p-4">
//                 <p className="text-sm text-gray-600">Total P&L</p>
//                 <p className={`text-2xl font-semibold font-mono ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>{totalPnL >= 0 ? "+" : ""}₹{totalPnL.toFixed(2)}</p>
//               </CardContent></Card>
//               <PositionTracking positions={positions.data} quotes={quotes} onPositionUpdate={() => { positions.mutate(); portfolio.mutate() }} />
//             </div>)

//       case "account":
//         return portfolio.isError ? <ErrorState retry={portfolio.mutate} title="Account Details" /> :
//           portfolio.isLoading ? <LoadingState /> :
//             portfolio.data ? <Account portfolio={portfolio.data} user={session?.user} /> : <div>No account data.</div>

//       default: return null
//     }
//   }

//   const renderIndex = (instrumentId: string, name: string) => {
//     const quote = quotes[instrumentId]
//     if (quotesLoading || !quote) return <div className="text-center w-24"><Loader2 className="h-4 w-4 animate-spin mx-auto text-gray-500" /></div>
//     return (
//       <div className="text-center w-24">
//         <span className="text-xs font-semibold text-gray-700">{name}</span>
//         <p className="text-sm font-mono font-bold text-gray-900">{quote.last_trade_price.toFixed(2)}</p>
//       </div>
//     )
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 font-sans">
//       <header className="bg-white border-b sticky top-0 z-40">
//         <div className="flex h-16 items-center justify-between px-4 max-w-4xl mx-auto">
//           <div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white"><TrendingUp className="h-4 w-4" /></div><h1 className="text-lg font-semibold">TradingPro</h1></div>
//           <div className="hidden sm:flex items-center gap-4">{renderIndex('NSE_EQ-26000', 'NIFTY 50')}{renderIndex('NSE_EQ-26009', 'BANK NIFTY')}</div>
//         </div>
//       </header>

//       <main className="px-4 pt-4 max-w-4xl mx-auto">{renderContent()}</main>

//       <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-50">
//         <div className="grid grid-cols-4 gap-1 p-2 max-w-4xl mx-auto">
//           {[{ id: "watchlist", icon: Eye, label: "Watchlist" }, { id: "orders", icon: FileText, label: "Orders" }, { id: "positions", icon: TrendingUp, label: "Positions" }, { id: "account", icon: Wallet, label: "Account" }].map((item) => (<Button key={item.id} variant="ghost" className={`flex flex-col h-14 text-xs rounded-md ${activeTab === item.id ? "text-blue-600 bg-blue-50" : "text-gray-600"}`} onClick={() => setActiveTab(item.id)}><item.icon className="h-5 w-5 mb-1" /><span>{item.label}</span></Button>))}
//         </div>
//       </div>
//       <OrderDialog
//         isOpen={orderDialogOpen}
//         onClose={() => setOrderDialogOpen(false)}
//         stock={setSelectedStock}
//         portfolio={portfolio}
//         onOrderPlaced={() => {
//           refreshOrders()
//           refreshPositions()
//           refreshPortfolio()
//         }}
//       />
//     </div>
//   )
// }



"use client"

import { useState, useMemo } from "react"
import { TrendingUp, Wallet, FileText, Eye, Loader2, RefreshCcw } from "lucide-react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { usePortfolio, useUserWatchlist, useOrdersAndPositions } from "@/lib/hooks/use-trading-data"
import { MarketDataProvider, useMarketData } from "@/lib/hooks/MarketDataProvider"
import { OrderManagement } from "@/components/order-management"
import { PositionTracking } from "@/components/position-tracking"
import { Account } from "@/components/Account"
import { Watchlist } from "@/components/watchlist"
import { OrderDialog } from "@/components/OrderDialog"

export default function TradingDashboardWrapper() {
  const { data: session } = useSession()
  const userId = session?.user?.id as string | undefined

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white mb-4">
          <TrendingUp className="h-4 w-4" />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">MarketPulse360</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Please wait to rock and trade..</p>
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <MarketDataProvider userId={userId}>
      <TradingDashboard userId={userId} session={session}/>
    </MarketDataProvider>
  )
}

function TradingDashboard({ userId, session }: { userId: string, session: any }) {
  const [currentTab, setCurrentTab] = useState<"watchlist" | "orders" | "positions" | "account">("watchlist")
  const [orderDialogOpen, setOrderDialogOpen] = useState(false)
  const [selectedStockForOrder, setSelectedStockForOrder] = useState<any | null>(null)

  const { portfolio, isLoading: isPortfolioLoading, mutate: refreshPortfolio } = usePortfolio(userId)
  const { watchlist: watchlistData, isLoading: isWatchlistLoading, mutate: refetchWatchlist } = useUserWatchlist(userId)
  const { orders, positions, isLoading: isOrdersPositionsLoading, isError: isOrdersPositionsError, mutate: refreshOrdersPositions } = useOrdersAndPositions(userId)
  const { quotes, isLoading: isQuotesLoading } = useMarketData()

  // Handle select stock
  const handleSelectStock = (stock: any) => {
    setSelectedStockForOrder(stock)
    setOrderDialogOpen(true)
  }

  // Refresh all
  const handleRefreshAllData = () => {
    refreshPortfolio()
    refetchWatchlist()
    refreshOrdersPositions()
    toast({ title: "Refreshed", description: "Trading data updated." })
  }

  // Total & Day’s MTM
  const { totalPnL, dayPnL } = useMemo(() => {
    if (!positions?.length) return { totalPnL: 0, dayPnL: 0 }
    let total = 0, day = 0
    positions.forEach((pos: any) => {
      const q = quotes?.[pos.stock?.instrumentId]
      const ltp = q?.last_trade_price ?? pos.averagePrice
      const diff = (ltp - pos.averagePrice) * pos.quantity
      total += diff
      day += (ltp - (pos.prevClosePrice ?? pos.averagePrice)) * pos.quantity
    })
    return { totalPnL: total, dayPnL: day }
  }, [positions, quotes])

  // Index bar with % change
  const renderIndex = (name: string, instrumentId: string) => {
    const q = quotes?.[instrumentId]
    if (isQuotesLoading || !q) return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    const change = ((q.last_trade_price - q.prev_close_price) / q.prev_close_price) * 100
    return (
      <div className="text-center w-28">
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{name}</span>
        <p className={`text-xsm font-mono font-bold ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
          ₹{q.last_trade_price.toFixed(2)} 
          {/* ({change.toFixed(2)}%) */}
        </p>
      </div>
    )
  }

  const anyLoading = isPortfolioLoading || isWatchlistLoading || isOrdersPositionsLoading || isQuotesLoading

  const renderContent = () => {
    if (anyLoading) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p>Loading your trading data...</p>
        </div>
      )
    }

    switch (currentTab) {
      case "watchlist":
        return <Watchlist watchlist={watchlistData} quotes={quotes} onSelectStock={handleSelectStock} onUpdate={refetchWatchlist} />
      case "orders":
        return <OrderManagement orders={orders} onOrderUpdate={refreshOrdersPositions} />
      case "positions":
        return (
          <div className="space-y-4 pb-20">
            <div className="grid grid-cols-2 gap-4">
              <Card><CardContent className="p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Day’s MTM</p>
                <p className={`text-lg font-semibold ${dayPnL >= 0 ? "text-green-600" : "text-red-600"}`}>{dayPnL >= 0 ? "+" : ""}₹{dayPnL.toFixed(2)}</p>
              </CardContent></Card>
              <Card><CardContent className="p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total P&L</p>
                <p className={`text-lg font-semibold ${totalPnL >= 0 ? "text-green-600" : "text-red-600"}`}>{totalPnL >= 0 ? "+" : ""}₹{totalPnL.toFixed(2)}</p>
              </CardContent></Card>
            </div>
            <PositionTracking positions={positions} quotes={quotes} onPositionUpdate={refreshOrdersPositions} />
          </div>
        )
      case "account":
        return <Account portfolio={portfolio} user={session?.user} onUpdate={handleRefreshAllData} />
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      <header className="bg-white dark:bg-gray-800 border-b sticky top-0 z-40">
        <div className="flex h-16 items-center justify-between px-4 max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
              <TrendingUp className="h-4 w-4" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">MarketPulse360</h1>
          </div>
          <div className="flex items-center gap-4">
            {renderIndex("NIFTY 50", "NSE_EQ-26000")}
            {renderIndex("BANK NIFTY", "NSE_EQ-26009")}
            {/* <Button size="sm" variant="outline" onClick={handleRefreshAllData}>
              <RefreshCcw className="h-4 w-4 mr-1" /> Refresh
            </Button> */}
          </div>
        </div>
      </header>

      <main className="px-4 pt-4 max-w-4xl mx-auto">
        {renderContent()}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t z-50">
        <div className="grid grid-cols-4 gap-1 p-2 max-w-4xl mx-auto">
            {[{ id: "watchlist", icon: Eye, label: "Watchlist" },
              { id: "orders", icon: FileText, label: "Orders" },
              { id: "positions", icon: TrendingUp, label: "Positions" },
              { id: "account", icon: Wallet, label: "Account" },
            ].map(({ id, icon: Icon, label }) => (
              <Button
                key={id}
                onClick={() => setCurrentTab(id as any)}
                variant="ghost"
                className={`flex flex-col items-center justify-center gap-2 rounded-xl py-3 px-1 transition-all duration-150 shadow-sm ${currentTab === id ? "text-blue-700 bg-blue-50 font-semibold shadow-lg" : "text-gray-500 hover:text-blue-600"}`}
                style={{ minWidth: 0, minHeight: 0, borderRadius: 16 }}
              >
                <Icon className="h-5 w-5 mt-1" style={{ minWidth: 28, minHeight: 28 }} />
                <span className="text-sm font-medium tracking-wide" style={{ letterSpacing: 0.2 }}>{label}</span>
              </Button>
            ))}
        </div>
      </div>

      <OrderDialog
        isOpen={orderDialogOpen}
        onClose={() => { setOrderDialogOpen(false); setSelectedStockForOrder(null) }}
        stock={selectedStockForOrder}
        portfolio={portfolio}
        drawer // 👈 tells OrderDialog to render as bottom drawer
        onOrderPlaced={() => {
          refreshOrdersPositions(); refreshPortfolio()
        }}
      />
    </div>
  )
}
