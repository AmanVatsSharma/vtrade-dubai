/**
 * @file position-tracking.tsx
 * @description This component is updated to consume live quotes for real-time P&L calculation.
 */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Target, TrendingDown, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { closePosition, updateStopLoss, updateTarget } from "@/lib/hooks/use-trading-data"

// The base Position interface from the data hook
interface Position {
  id: string
  symbol: string
  quantity: number
  averagePrice: number
  instrumentId?: string
  stopLoss?: number
  target?: number
  stock: { instrumentId?: string }
}

// The Quote interface for live data
interface Quote {
  last_trade_price: number
}

interface PositionTrackingProps {
  positions: Position[]
  quotes: Record<string, Quote> // Live quotes passed as a prop
  onPositionUpdate: () => void
}

export function PositionTracking({ positions, quotes, onPositionUpdate }: PositionTrackingProps) {
  const [stopLossDialogOpen, setStopLossDialogOpen] = useState(false)
  const [targetDialogOpen, setTargetDialogOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [stopLossValue, setStopLossValue] = useState(0)
  const [targetValue, setTargetValue] = useState(0)
  const [loading, setLoading] = useState<string | null>(null)

  const handleClosePosition = async (positionId: string, symbol: string) => {
    try {
      setLoading(positionId)
      await closePosition(positionId)
      onPositionUpdate()
      toast({
        title: "Position Closed",
        description: `Market order placed to close ${symbol} position`,
      })
    } catch (error) {
      toast({
        title: "Close Failed",
        description: error instanceof Error ? error.message : "Failed to close position",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleUpdateStopLoss = async () => {
    if (!selectedPosition) return

    try {
      setLoading(selectedPosition.id)
      await updateStopLoss(selectedPosition.id, stopLossValue)
      onPositionUpdate()
      setStopLossDialogOpen(false)
      toast({
        title: "Stop Loss Updated",
        description: `Stop loss set to ₹${stopLossValue} for ${selectedPosition.symbol}`,
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update stop loss",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const handleUpdateTarget = async () => {
    if (!selectedPosition) return

    try {
      setLoading(selectedPosition.id)
      await updateTarget(selectedPosition.id, targetValue)
      onPositionUpdate()
      setTargetDialogOpen(false)
      toast({
        title: "Target Updated",
        description: `Target set to ₹${targetValue} for ${selectedPosition.symbol}`,
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update target",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const openStopLossDialog = (position: Position) => {
    setSelectedPosition(position)
    setStopLossValue(position.stopLoss || 0)
    setStopLossDialogOpen(true)
  }

  const openTargetDialog = (position: Position) => {
    setSelectedPosition(position)
    setTargetValue(position.target || 0)
    setTargetDialogOpen(true)
  }

  return (
    <>
      <div className="space-y-2">
        {positions.map((position) => {
          const quote = position.stock.instrumentId ? quotes[position.stock.instrumentId] : null
          const currentPrice = quote?.last_trade_price || position.averagePrice
          const unrealizedPnL = (currentPrice - position.averagePrice) * position.quantity
          const pnlPercentage =
            position.averagePrice !== 0
              ? ((currentPrice - position.averagePrice) / position.averagePrice) * 100
              : 0

          return (
            <Card
              key={position.id}
              className="bg-white border border-gray-200 shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200"
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 text-sm">{position.symbol}</h3>
                    <Badge
                      variant={position.quantity > 0 ? "default" : "destructive"}
                      className={`text-xs px-2 py-0.5 ${position.quantity > 0 ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}
                    >
                      {position.quantity > 0 ? "LONG" : "SHORT"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div
                        className={`font-mono font-semibold text-sm ${unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {unrealizedPnL >= 0 ? "+" : ""}₹{unrealizedPnL.toFixed(2)}
                      </div>
                      <div className={`text-xs ${unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ({pnlPercentage.toFixed(2)}%)
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-white border border-gray-200 rounded-md shadow-lg">
                        <DropdownMenuItem onClick={() => openStopLossDialog(position)} className="text-sm">
                          <TrendingDown className="h-3 w-3 mr-2" />
                          Set Stop Loss
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openTargetDialog(position)} className="text-sm">
                          <Target className="h-3 w-3 mr-2" />
                          Set Target
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleClosePosition(position.id, position.symbol)}
                          className="text-sm text-red-600"
                          disabled={loading === position.id}
                        >
                          <X className="h-3 w-3 mr-2" />
                          Close Position
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span className="font-mono">{Math.abs(position.quantity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Price:</span>
                      <span className="font-mono">₹{position.averagePrice.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Current:</span>
                      <span className="font-mono">₹{currentPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {(position.stopLoss || position.target) && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="flex gap-4 text-xs">
                      {position.stopLoss && (
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-red-500" />
                          <span className="text-gray-500">SL:</span>
                          <span className="font-mono text-red-600">₹{position.stopLoss}</span>
                        </div>
                      )}
                      {position.target && (
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-green-500" />
                          <span className="text-gray-500">Target:</span>
                          <span className="font-mono text-green-600">₹{position.target}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dialogs remain the same... */}
      <Dialog open={stopLossDialogOpen} onOpenChange={setStopLossDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-200 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Set Stop Loss
            </DialogTitle>
          </DialogHeader>
          {selectedPosition && (
            <div className="space-y-4">
               <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <h3 className="font-semibold text-gray-900">{selectedPosition.symbol}</h3>
                <div className="flex gap-4 mt-1 text-sm text-gray-600">
                  <span>{selectedPosition.quantity > 0 ? "LONG" : "SHORT"}</span>
                  <span>Avg: ₹{selectedPosition.averagePrice}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Stop Loss Price</Label>
                <Input
                  type="number"
                  value={stopLossValue}
                  onChange={(e) => setStopLossValue(Number(e.target.value))}
                  step="0.05"
                  placeholder="Enter stop loss price"
                  className="h-9 border-gray-300 focus:border-red-500 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateStopLoss}
                  disabled={loading === selectedPosition.id || !stopLossValue}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {loading === selectedPosition.id ? "Setting..." : "Set Stop Loss"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setStopLossDialogOpen(false)}
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-gray-200 rounded-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Target className="h-5 w-5 text-green-600" />
              Set Target
            </DialogTitle>
          </DialogHeader>
          {selectedPosition && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                <h3 className="font-semibold text-gray-900">{selectedPosition.symbol}</h3>
                <div className="flex gap-4 mt-1 text-sm text-gray-600">
                  <span>{selectedPosition.quantity > 0 ? "LONG" : "SHORT"}</span>
                  <span>Avg: ₹{selectedPosition.averagePrice}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm font-medium text-gray-700">Target Price</Label>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  step="0.05"
                  placeholder="Enter target price"
                  className="h-9 border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateTarget}
                  disabled={loading === selectedPosition.id || !targetValue}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {loading === selectedPosition.id ? "Setting..." : "Set Target"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTargetDialogOpen(false)}
                  className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}


// /**
//  * @file position-tracking.tsx
//  * @description Displays open trading positions and calculates real-time P&L.
//  * This file was already in good shape and required no major corrections.
//  */
// "use client"

// import { useState } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Card, CardContent } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
// import { Label } from "@/components/ui/label"
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
// import { MoreHorizontal, Target, TrendingDown, X, Loader2 } from "lucide-react"
// import { toast } from "@/hooks/use-toast"
// import { closePosition, updateStopLoss, updateTarget } from "@/lib/hooks/use-trading-data"

// interface Position {
//   id: string; symbol: string; quantity: number; averagePrice: number; instrumentId?: string; stopLoss?: number; target?: number;
// }
// interface Quote { last_trade_price: number }
// interface PositionTrackingProps {
//   positions: Position[]; quotes: Record<string, Quote>; onPositionUpdate: () => void;
// }

// export function PositionTracking({ positions, quotes, onPositionUpdate }: PositionTrackingProps) {
//   const [stopLossDialogOpen, setStopLossDialogOpen] = useState(false)
//   const [targetDialogOpen, setTargetDialogOpen] = useState(false)
//   const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
//   const [stopLossValue, setStopLossValue] = useState(0)
//   const [targetValue, setTargetValue] = useState(0)
//   const [loading, setLoading] = useState<string | null>(null)

//   const handleAction = async (action: 'close' | 'stoploss' | 'target', positionId: string, value?: number) => {
//     setLoading(positionId);
//     try {
//       if (action === 'close') await closePosition(positionId);
//       if (action === 'stoploss' && value) await updateStopLoss(positionId, value);
//       if (action === 'target' && value) await updateTarget(positionId, value);

//       onPositionUpdate();

//       if (action === 'stoploss') setStopLossDialogOpen(false);
//       if (action === 'target') setTargetDialogOpen(false);

//       toast({ title: `Position Action`, description: `Position ${action} request was successful.` });
//     } catch (error) {
//       toast({ title: `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`, description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
//     } finally {
//       setLoading(null);
//     }
//   }

//   const openDialog = (type: 'stoploss' | 'target', position: Position) => {
//     setSelectedPosition(position);
//     if (type === 'stoploss') {
//       setStopLossValue(position.stopLoss || 0);
//       setStopLossDialogOpen(true);
//     } else {
//       setTargetValue(position.target || 0);
//       setTargetDialogOpen(true);
//     }
//   }

//   if (positions.length === 0) {
//     return <div className="text-center py-10 text-gray-500">You have no open positions.</div>
//   }

//   return (
//     <>
//       <div className="space-y-2">
//         {positions.map((position) => {
//           const quote = position.instrumentId ? quotes[position.instrumentId] : null
//           const currentPrice = quote?.last_trade_price || position.averagePrice
//           const unrealizedPnL = (currentPrice - position.averagePrice) * position.quantity
//           const pnlPercentage = position.averagePrice !== 0 ? (unrealizedPnL / (Math.abs(position.quantity) * position.averagePrice)) * 100 : 0

//           return (
//             <Card key={position.id} className="bg-white border shadow-sm rounded-lg">
//               <CardContent className="p-3">
//                 <div className="flex items-center justify-between mb-2">
//                   <div className="flex items-center gap-2"><h3 className="font-semibold text-gray-900 text-sm">{position.symbol}</h3><Badge variant={position.quantity > 0 ? "default" : "destructive"} className={`text-xs px-2 py-0.5 ${position.quantity > 0 ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>{position.quantity > 0 ? "LONG" : "SHORT"}</Badge></div>
//                   <div className="flex items-center gap-1">
//                     <div className="text-right"><div className={`font-mono font-semibold text-sm ${unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"}`}>{unrealizedPnL >= 0 ? "+" : ""}₹{unrealizedPnL.toFixed(2)}</div><div className={`text-xs ${unrealizedPnL >= 0 ? "text-green-600" : "text-red-600"}`}>({pnlPercentage.toFixed(2)}%)</div></div>
//                     <DropdownMenu>
//                       <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
//                       <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openDialog('stoploss', position)}><TrendingDown className="h-3 w-3 mr-2 bg-white" />Set Stop Loss</DropdownMenuItem><DropdownMenuItem onClick={() => openDialog('target', position)}><Target className="h-3 w-3 mr-2" />Set Target</DropdownMenuItem><DropdownMenuItem onClick={() => handleAction('close', position.id)} className="text-red-600" disabled={loading === position.id}><X className="h-3 w-3 mr-2" />Close Position</DropdownMenuItem></DropdownMenuContent>
//                     </DropdownMenu>
//                   </div>

//                   <div className="text-right flex-shrink-0 ml-4">
//                     {/* Use the quotes prop to get the live price */}
//                     <div className="font-mono font-semibold text-gray-900">
//                       ₹{(quotes[position.instrumentId]?.last_trade_price || position.averagePrice).toFixed(2)}
//                     </div>
//                     <div className={`text-sm ${(quotes[position.instrumentId]?.last_trade_price - position.averagePrice) * position.quantity >= 0
//                         ? "text-green-600"
//                         : "text-red-600"
//                       }`}>
//                       {/* Calculate Unrealized P&L */}
//                       P&L: ₹{(((quotes[position.instrumentId]?.last_trade_price || position.averagePrice) - position.averagePrice) * position.quantity).toFixed(2)}
//                     </div>
//                   </div>




//                 </div>
//                 <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
//                   <div className="space-y-1"><div className="flex justify-between"><span>Quantity:</span><span className="font-mono">{Math.abs(position.quantity)}</span></div><div className="flex justify-between"><span>Avg Price:</span><span className="font-mono">₹{position.averagePrice.toFixed(2)}</span></div></div>
//                   <div className="space-y-1"><div className="flex justify-between"><span>Current:</span><span className="font-mono">₹{currentPrice.toFixed(2)}</span></div></div>
//                 </div>
//                 {(position.stopLoss || position.target) && (
//                   <div className="mt-2 pt-2 border-t flex gap-4 text-xs">
//                     {position.stopLoss && (<div className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" /><span className="text-gray-500">SL:</span><span className="font-mono text-red-600">₹{position.stopLoss}</span></div>)}
//                     {position.target && (<div className="flex items-center gap-1"><Target className="h-3 w-3 text-green-500" /><span className="text-gray-500">Target:</span><span className="font-mono text-green-600">₹{position.target}</span></div>)}
//                   </div>
//                 )}
//               </CardContent>
//             </Card>
//           )
//         })}
//       </div>
//       <Dialog open={stopLossDialogOpen} onOpenChange={setStopLossDialogOpen}>
//         <DialogContent className="sm:max-w-md bg-white">
//           <DialogHeader><DialogTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-600" />Set Stop Loss</DialogTitle></DialogHeader>
//           {selectedPosition && (<div className="space-y-4">
//             <div className="bg-gray-50 p-3 rounded-md border"><h3 className="font-semibold">{selectedPosition.symbol}</h3><div className="flex gap-4 mt-1 text-sm text-gray-600"><span>{selectedPosition.quantity > 0 ? "LONG" : "SHORT"}</span><span>Avg: ₹{selectedPosition.averagePrice}</span></div></div>
//             <div className="space-y-1"><Label>Stop Loss Price</Label><Input type="number" value={stopLossValue} onChange={(e) => setStopLossValue(Number(e.target.value))} step="0.05" /></div>
//             <div className="flex gap-2"><Button onClick={() => handleAction('stoploss', selectedPosition.id, stopLossValue)} disabled={loading === selectedPosition.id || !stopLossValue} className="flex-1 bg-red-600 hover:bg-red-700">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Stop Loss"}</Button><Button variant="outline" onClick={() => setStopLossDialogOpen(false)} className="flex-1">Cancel</Button></div>
//           </div>)}
//         </DialogContent>
//       </Dialog>
//       <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
//         <DialogContent className="sm:max-w-md bg-white">
//           <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-green-600" />Set Target</DialogTitle></DialogHeader>
//           {selectedPosition && (<div className="space-y-4">
//             <div className="bg-gray-50 p-3 rounded-md border"><h3 className="font-semibold">{selectedPosition.symbol}</h3><div className="flex gap-4 mt-1 text-sm text-gray-600"><span>{selectedPosition.quantity > 0 ? "LONG" : "SHORT"}</span><span>Avg: ₹{selectedPosition.averagePrice}</span></div></div>
//             <div className="space-y-1"><Label>Target Price</Label><Input type="number" value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))} step="0.05" /></div>
//             <div className="flex gap-2"><Button onClick={() => handleAction('target', selectedPosition.id, targetValue)} disabled={loading === selectedPosition.id || !targetValue} className="flex-1 bg-green-600 hover:bg-green-700">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Target"}</Button><Button variant="outline" onClick={() => setTargetDialogOpen(false)} className="flex-1">Cancel</Button></div>
//           </div>)}
//         </DialogContent>
//       </Dialog>
//     </>
//   )
// }
