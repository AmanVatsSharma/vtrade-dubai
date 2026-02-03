/**
 * @file OrderInputs.tsx
 * @module components/trading/order-form
 * @description Input fields for quantity, price, and product type selection using high-fi components.
 * @author BharatERP
 * @created 2026-02-02
 */

import React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Package, Zap, Lock } from "lucide-react"
import { NumberStepper } from "@/components/ui/number-stepper"
import { TabSelector } from "@/components/ui/tab-selector"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

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
  orderSide: "BUY" | "SELL"
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
  segment,
  orderSide
}: OrderInputsProps) {
  
  const isIntradayDisabled = segment === "NFO" || segment === "FNO" || segment === "NSE_FO"
  const themeColor = orderSide === "BUY" ? "bg-emerald-500" : "bg-rose-500"
  const themeText = orderSide === "BUY" ? "text-emerald-600" : "text-rose-600"

  return (
    <div className="space-y-6">
      {/* Product Type Selector */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1">
          <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Product</Label>
        </div>
        <TabSelector
          options={[
            { id: "MIS", label: "Intraday (MIS)", disabled: isIntradayDisabled },
            { id: "CNC", label: isDerivatives ? "Normal (NRML)" : "Delivery (CNC)" },
          ]}
          value={currentOrderType}
          onChange={setCurrentOrderType}
          themeColor={themeColor}
        />
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Quantity / Lots Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
              {isDerivatives ? "Lots" : "Quantity"}
            </Label>
            {isDerivatives && (
              <span className="text-[10px] font-mono text-gray-400">
                1 Lot = {lotSize} Qty
              </span>
            )}
          </div>
          
          <NumberStepper
            value={isDerivatives ? lots : quantity}
            onChange={(val) => isDerivatives ? setLots(val) : setQuantity(val)}
            min={1}
            max={100000}
            step={1}
            disabled={isMarketBlocked}
          />
          
          {isDerivatives && (
            <div className="flex justify-end">
              <span className={cn("text-xs font-medium bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md", themeText)}>
                Total: {units} Qty
              </span>
            </div>
          )}
        </div>

        {/* Price Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1 h-[18px]">
            <Label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Price</Label>
            <div className="flex items-center gap-2">
              <Label htmlFor="market-mode" className="text-[10px] cursor-pointer text-gray-500 hover:text-gray-700">Market</Label>
              <Switch
                id="market-mode"
                checked={isMarket}
                onCheckedChange={setIsMarket}
                disabled={isMarketBlocked}
                className={cn("scale-75", isMarket ? themeColor : "bg-gray-200")}
              />
            </div>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {isMarket ? (
                <motion.div
                  key="market"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute inset-0 z-10"
                >
                  <div className="h-[50px] w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center justify-center text-sm font-medium text-gray-400 italic">
                    <Zap className="w-3.5 h-3.5 mr-1.5" />
                    Market Order
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="limit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <NumberStepper
                    value={price || 0}
                    onChange={setPrice}
                    min={0.05}
                    step={0.05}
                    disabled={isMarketBlocked}
                    formatValue={(v) => `₹${v.toFixed(2)}`}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            {/* Placeholder to maintain height when absolute positioned element is active */}
            <div className="h-[50px] w-full invisible pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  )
}
