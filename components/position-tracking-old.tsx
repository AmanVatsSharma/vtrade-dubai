"use client"

import { useState, useMemo, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform, useAnimation } from "framer-motion"
import { 
  TrendingUp, TrendingDown, Target, X, Loader2, AlertTriangle,
  Activity, DollarSign, Clock, Zap, Shield, AlertCircle,
  ChevronDown, Percent, Hash, BarChart3, Sparkles, 
  ArrowUpRight, ArrowDownRight, Minus, Plus
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { closePosition, updateStopLoss, updateTarget } from "@/lib/hooks/use-trading-data"
import { cn } from "@/lib/utils"

// Types
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
  unrealizedPnL: number;
}

interface Quote { 
  last_trade_price: number 
}

interface PositionTrackingProps {
  positions: Position[];
  quotes: Record<string, Quote>;
  onPositionUpdate: () => void;
  tradingAccountId?: string;
}

// Position filters
const POSITION_FILTERS = [
  { id: 'all', label: 'All', icon: BarChart3 },
  { id: 'long', label: 'Long', icon: TrendingUp },
  { id: 'short', label: 'Short', icon: TrendingDown },
  { id: 'profit', label: 'Profit', icon: ArrowUpRight },
  { id: 'loss', label: 'Loss', icon: ArrowDownRight },
  { id: 'today', label: "Today's", icon: Clock },
] as const

type FilterType = typeof POSITION_FILTERS[number]['id']

export function PositionTracking({ positions, quotes, onPositionUpdate, tradingAccountId }: PositionTrackingProps) {
  const [stopLossDialogOpen, setStopLossDialogOpen] = useState(false)
  const [targetDialogOpen, setTargetDialogOpen] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [stopLossValue, setStopLossValue] = useState(0)
  const [targetValue, setTargetValue] = useState(0)
  const [loading, setLoading] = useState<string | null>(null)

  const handleAction = async (action: 'close' | 'stoploss' | 'target', positionId: string, value?: number) => {
    setLoading(positionId);
    try {
      if (action === 'close') {
        if (!tradingAccountId) throw new Error('Missing trading account')
        await closePosition(positionId, { user: { id: "current-user", clientId: "client-123", tradingAccountId } });
      }
      if (action === 'stoploss' && value) await updateStopLoss(positionId, value);
      if (action === 'target' && value) await updateTarget(positionId, value);

      onPositionUpdate();

      if (action === 'stoploss') setStopLossDialogOpen(false);
      if (action === 'target') setTargetDialogOpen(false);

      toast({ title: `Position Action`, description: `Position ${action} request was successful.` });
    } catch (error) {
      toast({ title: `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`, description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  }

  const openDialog = (type: 'stoploss' | 'target', position: Position) => {
    setSelectedPosition(position);
    if (type === 'stoploss') {
      setStopLossValue(position.stopLoss || 0);
      setStopLossDialogOpen(true);
    } else {
      setTargetValue(position.target || 0);
      setTargetDialogOpen(true);
    }
  }

  if (positions.length === 0) {
    return <div className="text-center py-10 text-gray-500">You have no open positions.</div>
  }

  return (
    <>
      <div className="space-y-2 pb-20">
        {positions.map((position) => {
          const quote = position.instrumentId ? quotes[position.instrumentId] : null;
          const isFutures = position.segment === "NFO" && !position.optionType;
          const isOption = position.segment === "NFO" && !!position.optionType;

          // If position is closed (quantity === 0), show booked P&L from unrealizedPnL
          let displayPnL: number;
          let displayPnLPercent: number;
          let currentPrice: number;
          if (position.quantity === 0) {
            displayPnL = position.unrealizedPnL ?? 0;
            displayPnLPercent = position.averagePrice !== 0 ? (displayPnL / position.averagePrice) * 100 : 0;
            currentPrice = position.averagePrice; // For closed, just show avg price
          } else {
            currentPrice = quote?.last_trade_price || position.averagePrice;
            displayPnL = (currentPrice - position.averagePrice) * position.quantity;
            displayPnLPercent = position.averagePrice !== 0 ? (displayPnL / (Math.abs(position.quantity) * position.averagePrice)) * 100 : 0;
          }

          return (
            <Card 
              key={position.id} 
              className={`border shadow-sm rounded-lg transition-all duration-200 ${
                position.quantity === 0 
                  ? 'bg-gray-50 opacity-85 hover:opacity-100' 
                  : 'bg-white hover:shadow-md'
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold text-sm ${position.quantity === 0 ? 'text-gray-600' : 'text-gray-900'}`}>
                      {position.symbol}
                    </h3>
                    {isFutures && <span className="bg-blue-100 text-blue-700 rounded px-2 py-0.5 text-xs">FUT</span>}
                    {isOption && <span className="bg-yellow-100 text-yellow-700 rounded px-2 py-0.5 text-xs">OPT</span>}
                    {position.quantity === 0 ? (
                      <Badge className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5">CLOSED</Badge>
                    ) : (
                      <Badge variant={position.quantity > 0 ? "default" : "destructive"} className={`text-xs px-2 py-0.5 ${position.quantity > 0 ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>
                        {position.quantity > 0 ? "LONG" : "SHORT"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-right">
                      <div className={`font-mono font-semibold text-sm ${
                        position.quantity === 0
                          ? displayPnL >= 0 ? "text-green-500" : "text-red-500"
                          : displayPnL >= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {Number(displayPnL || 0) >= 0 ? "+" : ""}₹{Number(displayPnL || 0).toFixed(2)}
                      </div>
                      <div className={`text-xs ${
                        position.quantity === 0
                          ? displayPnL >= 0 ? "text-green-500" : "text-red-500"
                          : displayPnL >= 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        ({displayPnLPercent.toFixed(2)}%)
                      </div>
                      {position.quantity === 0 && (
                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                          Booked P&L • {new Date().toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openDialog('stoploss', position)}><TrendingDown className="h-3 w-3 mr-2" />Set Stop Loss</DropdownMenuItem><DropdownMenuItem onClick={() => openDialog('target', position)}><Target className="h-3 w-3 mr-2" />Set Target</DropdownMenuItem><DropdownMenuItem onClick={() => handleAction('close', position.id)} className="text-red-600" disabled={loading === position.id}><X className="h-3 w-3 mr-2" />Close Position</DropdownMenuItem></DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {/* F&O Details */}
                {(isFutures || isOption) && (
                  <div className="flex flex-wrap gap-2 mb-2 text-xs">
                    {position.expiry && <span className="bg-gray-100 rounded px-2 py-0.5">Exp: {new Date(position.expiry).toLocaleDateString()}</span>}
                    {isOption && position.strikePrice !== undefined && <span className="bg-gray-100 rounded px-2 py-0.5">Strike: ₹{position.strikePrice}</span>}
                    {isOption && position.optionType && <span className="bg-gray-100 rounded px-2 py-0.5">{position.optionType}</span>}
                    {position.lotSize && <span className="bg-gray-100 rounded px-2 py-0.5">Lot: {position.lotSize}</span>}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                  <div className="space-y-1"><div className="flex justify-between"><span>Quantity:</span><span className="font-mono">{Math.abs(position.quantity)}</span></div><div className="flex justify-between"><span>Avg Price:</span><span className="font-mono">₹{position.averagePrice.toFixed(2)}</span></div></div>
                  <div className="space-y-1"><div className="flex justify-between"><span>Current:</span><span className="font-mono">₹{currentPrice.toFixed(2)}</span></div></div>
                </div>
                {(position.stopLoss || position.target) && (
                  <div className="mt-2 pt-2 border-t flex gap-4 text-xs">
                    {position.stopLoss && (<div className="flex items-center gap-1"><TrendingDown className="h-3 w-3 text-red-500" /><span className="text-gray-500">SL:</span><span className="font-mono text-red-600">₹{position.stopLoss}</span></div>)}
                    {position.target && (<div className="flex items-center gap-1"><Target className="h-3 w-3 text-green-500" /><span className="text-gray-500">Target:</span><span className="font-mono text-green-600">₹{position.target}</span></div>)}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
      <Dialog open={stopLossDialogOpen} onOpenChange={setStopLossDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-600" />Set Stop Loss</DialogTitle></DialogHeader>
          {selectedPosition && (<div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-md border">
              <h3 className="font-semibold">{selectedPosition.symbol}</h3>
              <div className="flex gap-4 mt-1 text-sm text-gray-600">
                <span>{selectedPosition.quantity > 0 ? "LONG" : "SHORT"}</span>
                <span>Avg: ₹{selectedPosition.averagePrice}</span>
              </div>
              {(selectedPosition.segment === "NFO") && (
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  {selectedPosition.expiry && <span className="bg-gray-100 rounded px-2 py-0.5">Exp: {new Date(selectedPosition.expiry).toLocaleDateString()}</span>}
                  {selectedPosition.optionType && selectedPosition.strikePrice !== undefined && <span className="bg-gray-100 rounded px-2 py-0.5">Strike: ₹{selectedPosition.strikePrice}</span>}
                  {selectedPosition.optionType && <span className="bg-gray-100 rounded px-2 py-0.5">{selectedPosition.optionType}</span>}
                  {selectedPosition.lotSize && <span className="bg-gray-100 rounded px-2 py-0.5">Lot: {selectedPosition.lotSize}</span>}
                </div>
              )}
            </div>
            <div className="space-y-1"><Label>Stop Loss Price</Label><Input type="number" value={stopLossValue} onChange={(e) => setStopLossValue(Number(e.target.value))} step="0.05" /></div>
            <div className="flex gap-2"><Button onClick={() => handleAction('stoploss', selectedPosition.id, stopLossValue)} disabled={loading === selectedPosition.id || !stopLossValue} className="flex-1 bg-red-600 hover:bg-red-700">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Stop Loss"}</Button><Button variant="outline" onClick={() => setStopLossDialogOpen(false)} className="flex-1">Cancel</Button></div>
          </div>)}
        </DialogContent>
      </Dialog>
      <Dialog open={targetDialogOpen} onOpenChange={setTargetDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-green-600" />Set Target</DialogTitle></DialogHeader>
          {selectedPosition && (<div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-md border">
              <h3 className="font-semibold">{selectedPosition.symbol}</h3>
              <div className="flex gap-4 mt-1 text-sm text-gray-600">
                <span>{selectedPosition.quantity > 0 ? "LONG" : "SHORT"}</span>
                <span>Avg: ₹{selectedPosition.averagePrice}</span>
              </div>
              {(selectedPosition.segment === "NFO") && (
                <div className="flex flex-wrap gap-2 mt-2 text-xs">
                  {selectedPosition.expiry && <span className="bg-gray-100 rounded px-2 py-0.5">Exp: {new Date(selectedPosition.expiry).toLocaleDateString()}</span>}
                  {selectedPosition.optionType && selectedPosition.strikePrice !== undefined && <span className="bg-gray-100 rounded px-2 py-0.5">Strike: ₹{selectedPosition.strikePrice}</span>}
                  {selectedPosition.optionType && <span className="bg-gray-100 rounded px-2 py-0.5">{selectedPosition.optionType}</span>}
                  {selectedPosition.lotSize && <span className="bg-gray-100 rounded px-2 py-0.5">Lot: {selectedPosition.lotSize}</span>}
                </div>
              )}
            </div>
            <div className="space-y-1"><Label>Target Price</Label><Input type="number" value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))} step="0.05" /></div>
            <div className="flex gap-2"><Button onClick={() => handleAction('target', selectedPosition.id, targetValue)} disabled={loading === selectedPosition.id || !targetValue} className="flex-1 bg-green-600 hover:bg-green-700">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set Target"}</Button><Button variant="outline" onClick={() => setTargetDialogOpen(false)} className="flex-1">Cancel</Button></div>
          </div>)}
        </DialogContent>
      </Dialog>
    </>
  )
}