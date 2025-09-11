/**
 * @file position-tracking.tsx
 * @description Premium Position Tracking UI:
 *  - Reorder.Group (vertical reorder) via drag handle only
 *  - Inner motion div => horizontal swipe to reveal Close action
 *  - Glassmorphism + polished UI
 */
"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Target, TrendingDown, X, Loader2, GripVertical } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { closePosition, updateStopLoss, updateTarget } from "@/lib/hooks/use-trading-data"
import { Reorder, motion } from "framer-motion"

interface Position {
  id: string;
  symbol: string;
  quantity: number;
  averagePrice: number;
  instrumentId?: string;
  stopLoss?: number;
  target?: number;
  segment?: string;
  expiry?: string;
  strikePrice?: number;
  optionType?: string;
  lotSize?: number;
  unrealizedPnL?: number;
}
interface Quote { last_trade_price: number }
interface PositionTrackingProps {
  positions: Position[];
  quotes: Record<string, Quote>;
  onPositionUpdate: () => void;
}

export function PositionTracking({ positions, quotes, onPositionUpdate }: PositionTrackingProps) {
  // Sync local items with incoming positions (keeps reorder state consistent)
  const [items, setItems] = useState<Position[]>(positions)
  useEffect(() => setItems(positions), [positions])

  const [stopLossDialogOpen, setStopLossDialogOpen] = useState(false)
  const [targetDialogOpen, setTargetDialogOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [stopLossValue, setStopLossValue] = useState<number | "">("")
  const [targetValue, setTargetValue] = useState<number | "">("")
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (action: 'close' | 'stoploss' | 'target', positionId: string, value?: number) => {
    setLoading(positionId)
    try {
      if (action === 'close') await closePosition(positionId, { user: { id: "current-user", clientId: "client-123" } })
      if (action === 'stoploss' && value !== undefined) await updateStopLoss(positionId, value)
      if (action === 'target' && value !== undefined) await updateTarget(positionId, value)

      onPositionUpdate()

      if (action === 'stoploss') setStopLossDialogOpen(false)
      if (action === 'target') setTargetDialogOpen(false)

      toast({ title: `Position Action`, description: `Position ${action} request was successful.` })
    } catch (error) {
      toast({
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`,
        description: error instanceof Error ? error.message : "An unknown error occurred.",
        variant: "destructive"
      })
    } finally {
      setLoading(null)
    }
  }

  const openDialog = (type: 'stoploss' | 'target', position: Position) => {
    setSelectedPosition(position)
    if (type === 'stoploss') {
      setStopLossValue(position.stopLoss ?? "")
      setStopLossDialogOpen(true)
    } else {
      setTargetValue(position.target ?? "")
      setTargetDialogOpen(true)
    }
  }

  if (!items || items.length === 0) {
    return <div className="text-center py-10 text-gray-400">You have no open positions.</div>
  }

  return (
    <>
      <Reorder.Group axis="y" values={items} onReorder={(next) => setItems(next)} className="space-y-3 pb-28">
        {items.map((position) => {
          const quote = position.instrumentId ? quotes[position.instrumentId] : undefined;
          const isFutures = position.segment === "NFO" && !position.optionType;
          const isOption = position.segment === "NFO" && !!position.optionType;

          // numeric safety
          const avg = Number(position.averagePrice ?? 0)
          const qty = Number(position.quantity ?? 0)
          const currentPrice = Number(quote?.last_trade_price ?? avg)
          let displayPnL = 0
          let displayPnLPercent = 0
          if (qty === 0) {
            displayPnL = Number(position.unrealizedPnL ?? 0)
            displayPnLPercent = avg !== 0 ? (displayPnL / avg) * 100 : 0
          } else {
            displayPnL = (currentPrice - avg) * qty
            displayPnLPercent = avg !== 0 ? (displayPnL / (Math.abs(qty) * avg)) * 100 : 0
          }

          const positive = displayPnL >= 0

          return (
            <Reorder.Item key={position.id} value={position} className="relative">
              {/* Background close action (revealed when swipe left) */}
              <div className="absolute inset-0 rounded-xl flex items-center justify-end pr-4 pointer-events-none">
                <div className="w-full h-full rounded-xl bg-gradient-to-r from-red-50 to-red-100 flex items-center justify-end pr-4">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleAction("close", position.id)}
                    className="bg-red-600 hover:bg-red-700 text-white pointer-events-auto"
                  >
                    <X className="h-4 w-4 mr-1" /> Close
                  </Button>
                </div>
              </div>

              {/* Row: Left = drag handle (vertical reorder via handle), Right = swipeable card */}
              <div className="flex items-stretch gap-3">
                {/* Drag Handle - grabbing this will reorder vertically */}
                <div
                  className="flex items-center px-2 rounded-lg bg-white/6 backdrop-blur-md hover:bg-white/8 cursor-grab active:cursor-grabbing select-none"
                  title="Drag to reorder"
                >
                  <GripVertical className="h-5 w-5 text-gray-400" />
                </div>

                {/* Foreground swipeable layer - stops propagation so parent/Reorder doesn't start on horizontal swipe */}
                <motion.div
                  drag="x"
                  dragConstraints={{ left: -140, right: 0 }}
                  dragElastic={0.18}
                  onDragEnd={(e, info) => {
                    if (info.offset.x < -90) {
                      handleAction("close", position.id)
                    }
                  }}
                  onPointerDown={(e) => {
                    // prevent starting vertical reorder when user intends to swipe horizontally
                    e.stopPropagation()
                  }}
                  className="relative z-10 w-full"
                >
                  <Card
                    className={`rounded-xl transition-transform duration-150 transform hover:-translate-y-0.5
                      bg-white/6 backdrop-blur-sm border border-white/8 shadow-md`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <div>
                            <h3 className={`font-semibold text-sm ${qty === 0 ? 'text-gray-400' : 'text-white'}`}>
                              {position.symbol}
                            </h3>
                            <div className="flex gap-2 mt-1 items-center">
                              {isFutures && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">FUT</span>}
                              {isOption && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">OPT</span>}
                              {qty === 0 ? (
                                <Badge className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700">CLOSED</Badge>
                              ) : (
                                <Badge className={`text-xs px-2 py-0.5 ${qty > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                  {qty > 0 ? 'LONG' : 'SHORT'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="text-right">
                            <div className={`font-mono font-semibold text-sm ${positive ? 'text-green-400' : 'text-red-400'}`}>
                              {positive ? '+' : ''}₹{displayPnL.toFixed(2)}
                            </div>
                            <div className={`text-xs ${positive ? 'text-green-300' : 'text-red-300'}`}>
                              ({displayPnLPercent.toFixed(2)}%)
                            </div>
                            {qty === 0 && (
                              <div className="text-xs text-gray-300 font-medium mt-1">
                                Booked • {new Date().toLocaleDateString()}
                              </div>
                            )}
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4 text-gray-300" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openDialog('stoploss', position)}>
                                <TrendingDown className="h-4 w-4 mr-2" /> Set Stop Loss
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDialog('target', position)}>
                                <Target className="h-4 w-4 mr-2" /> Set Target
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAction('close', position.id)}
                                className="text-red-600"
                                disabled={loading === position.id}
                              >
                                <X className="h-4 w-4 mr-2" /> Close Position
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* F&O small meta */}
                      {(isFutures || isOption) && (
                        <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-300">
                          {position.expiry && <span className="bg-white/6 px-2 py-0.5 rounded">Exp: {new Date(position.expiry).toLocaleDateString()}</span>}
                          {isOption && position.strikePrice !== undefined && <span className="bg-white/6 px-2 py-0.5 rounded">Strike: ₹{position.strikePrice}</span>}
                          {isOption && position.optionType && <span className="bg-white/6 px-2 py-0.5 rounded">{position.optionType}</span>}
                          {position.lotSize && <span className="bg-white/6 px-2 py-0.5 rounded">Lot: {position.lotSize}</span>}
                        </div>
                      )}

                      {/* Price grid */}
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-300 mt-3">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Quantity:</span>
                            <span className="font-mono">{Math.abs(qty)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Avg Price:</span>
                            <span className="font-mono">₹{avg.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span>Current:</span>
                            <span className="font-mono">₹{currentPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* SL / Target */}
                      {(position.stopLoss !== undefined || position.target !== undefined) && (
                        <div className="mt-3 pt-3 border-t border-white/6 flex gap-4 text-xs text-gray-300">
                          {position.stopLoss !== undefined && (
                            <div className="flex items-center gap-1">
                              <TrendingDown className="h-4 w-4 text-red-400" />
                              <span className="text-gray-300">SL:</span>
                              <span className="font-mono text-red-300">₹{Number(position.stopLoss).toFixed(2)}</span>
                            </div>
                          )}
                          {position.target !== undefined && (
                            <div className="flex items-center gap-1">
                              <Target className="h-4 w-4 text-green-400" />
                              <span className="text-gray-300">Target:</span>
                              <span className="font-mono text-green-300">₹{Number(position.target).toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </Reorder.Item>
          )
        })}
      </Reorder.Group>

      {/* Stop Loss Dialog */}
      <Dialog open={stopLossDialogOpen} onOpenChange={setStopLossDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" /> Set Stop Loss
            </DialogTitle>
          </DialogHeader>
          {selectedPosition && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md border">
                <h3 className="font-semibold">{selectedPosition.symbol}</h3>
                <div className="flex gap-4 mt-1 text-sm text-gray-600">
                  <span>{selectedPosition.quantity > 0 ? "LONG" : "SHORT"}</span>
                  <span>Avg: ₹{Number(selectedPosition.averagePrice).toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Stop Loss Price</Label>
                <Input
                  type="number"
                  value={stopLossValue}
                  onChange={(e) => setStopLossValue(e.target.value === "" ? "" : Number(e.target.value))}
                  step="0.05"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction('stoploss', selectedPosition.id, Number(stopLossValue))}
                  disabled={loading === selectedPosition.id || stopLossValue === "" || Number.isNaN(Number(stopLossValue))}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {loading === selectedPosition.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Stop Loss"}
                </Button>
                <Button variant="outline" onClick={() => setStopLossDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Target Dialog */}
      <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" /> Set Target
            </DialogTitle>
          </DialogHeader>
          {selectedPosition && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md border">
                <h3 className="font-semibold">{selectedPosition.symbol}</h3>
                <div className="flex gap-4 mt-1 text-sm text-gray-600">
                  <span>{selectedPosition.quantity > 0 ? "LONG" : "SHORT"}</span>
                  <span>Avg: ₹{Number(selectedPosition.averagePrice).toFixed(2)}</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Target Price</Label>
                <Input
                  type="number"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value === "" ? "" : Number(e.target.value))}
                  step="0.05"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleAction('target', selectedPosition.id, Number(targetValue))}
                  disabled={loading === selectedPosition.id || targetValue === "" || Number.isNaN(Number(targetValue))}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading === selectedPosition.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Target"}
                </Button>
                <Button variant="outline" onClick={() => setTargetDialogOpen(false)} className="flex-1">
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

export default PositionTracking
