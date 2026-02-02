/**
 * @file OrderSummary.tsx
 * @module components/trading/order-form
 * @description Summary of order value, margin required, brokerage, and charges.
 * @author BharatERP
 * @created 2026-02-02
 */

import React, { useState } from "react"
import { ChevronDown, ChevronUp, Info } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface OrderSummaryProps {
  price: number | null
  units: number
  marginRequired: number
  brokerage: number
  additionalCharges: number
  totalCost: number
  availableMargin: number
}

export function OrderSummary({
  price,
  units,
  marginRequired,
  brokerage,
  additionalCharges,
  totalCost,
  availableMargin
}: OrderSummaryProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const orderValue = (price || 0) * units
  const isInsufficient = totalCost > availableMargin

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Main Summary Row */}
      <div className="p-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500">Required Margin</span>
          <span className="text-sm font-mono font-semibold">₹{marginRequired.toFixed(2)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Available Balance</span>
          <span className={`text-sm font-mono font-medium ${isInsufficient ? 'text-red-600' : 'text-green-600'}`}>
            ₹{availableMargin.toFixed(2)}
          </span>
        </div>

        {isInsufficient && (
          <div className="mt-2 text-[11px] text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded border border-red-100 dark:border-red-800">
            Insufficient margin! Short by ₹{(totalCost - availableMargin).toFixed(2)}
          </div>
        )}
      </div>

      {/* Collapsible Details */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between p-2 bg-gray-100/50 dark:bg-gray-700/30 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors border-t border-gray-100 dark:border-gray-700">
          <span>View Charges & Taxes</span>
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 space-y-2 text-xs bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-500">Order Value</span>
              <span className="font-mono">₹{orderValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Brokerage</span>
              <span className="font-mono">₹{brokerage.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <div className="flex items-center gap-1">
                <span className="text-gray-500">Govt. Charges</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Includes STT, Transaction Charges, GST, and Stamp Duty</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <span className="font-mono">₹{additionalCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
              <span>Total Required</span>
              <span className="font-mono">₹{totalCost.toFixed(2)}</span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
