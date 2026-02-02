/**
 * @file OrderInputs.tsx
 * @module components/trading/order-form
 * @description Input fields for quantity, price, and product type selection.
 * @author BharatERP
 * @created 2026-02-02
 */

import React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Package } from "lucide-react"

interface OrderInputsProps {
  isDerivatives: boolean
  lots: number
  setLots: (lots: number) => void
  quantity: number
  setQuantity: (qty: number) => void
  price: number | null
  setPrice: (price: number) => void
  isMarket: boolean
  setIsMarket: (isMarket: boolean) => void
  currentOrderType: string
  setCurrentOrderType: (type: string) => void
  isMarketBlocked: boolean
  lotSize: number
  units: number
  segment: string
}

export function OrderInputs({
  isDerivatives,
  lots,
  setLots,
  quantity,
  setQuantity,
  price,
  setPrice,
  isMarket,
  setIsMarket,
  currentOrderType,
  setCurrentOrderType,
  isMarketBlocked,
  lotSize,
  units,
  segment
}: OrderInputsProps) {
  
  const isIntradayDisabled = segment === "NFO" || segment === "FNO" || segment === "NSE_FO"

  return (
    <div className="space-y-4">
      {/* Order Type Selection */}
      <Tabs value={currentOrderType} onValueChange={setCurrentOrderType} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="MIS" disabled={isIntradayDisabled} className="text-xs">
            Intraday (MIS)
          </TabsTrigger>
          <TabsTrigger value="CNC" className="text-xs">
            Delivery (CNC)
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Derivatives Info Banner */}
      {isDerivatives && (
        <div className="flex items-center justify-between p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
          <div className="flex items-center">
            <Package className="h-3.5 w-3.5 mr-1.5" />
            <span>Lot Size: <span className="font-semibold">{lotSize}</span></span>
          </div>
          <span className="font-mono">1 Lot = {lotSize} Qty</span>
        </div>
      )}

      {/* Inputs Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Quantity / Lots Input */}
        <div className="space-y-1.5">
          <Label className="text-xs text-gray-500">
            {isDerivatives ? "Lots" : "Quantity"}
          </Label>
          <div className="relative">
            <Input
              type="number"
              value={isDerivatives ? lots : quantity}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value))
                if (isDerivatives) setLots(val)
                else setQuantity(val)
              }}
              min={1}
              step={1}
              disabled={isMarketBlocked}
              className="h-9 font-mono text-sm"
            />
          </div>
          {isDerivatives && (
            <div className="text-[10px] text-gray-500 text-right">
              Total: <span className="font-semibold text-gray-700 dark:text-gray-300">{units}</span> Qty
            </div>
          )}
        </div>

        {/* Price Input */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-gray-500">Price</Label>
            <button
              onClick={() => setIsMarket(!isMarket)}
              disabled={isMarketBlocked}
              className="text-[10px] text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              {isMarket ? "Set Limit" : "Set Market"}
            </button>
          </div>
          <Input
            type="number"
            value={isMarket ? "" : price ?? ""}
            onChange={(e) => setPrice(Number(e.target.value))}
            placeholder="Market"
            disabled={isMarket || isMarketBlocked}
            step="0.05"
            className={`h-9 font-mono text-sm ${isMarket ? "bg-gray-50 dark:bg-gray-800 text-gray-400 italic" : ""}`}
          />
        </div>
      </div>
    </div>
  )
}
