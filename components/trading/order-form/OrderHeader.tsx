/**
 * @file OrderHeader.tsx
 * @module components/trading/order-form
 * @description Header component for the order form displaying stock info and LTP.
 * @author BharatERP
 * @created 2026-02-02
 */

import React from "react"
import { Badge } from "@/components/ui/badge"

interface OrderHeaderProps {
  stock: any
}

export function OrderHeader({ stock }: OrderHeaderProps) {
  if (!stock) return null

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md border flex justify-between items-center">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">{stock.symbol}</h3>
          {stock.segment === "NFO" && !stock.optionType && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200 text-[10px] px-1.5 py-0 h-5">FUT</Badge>
          )}
          {stock.segment === "NFO" && stock.optionType && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200 text-[10px] px-1.5 py-0 h-5">OPT</Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate max-w-[200px]">{stock.name}</p>
        {stock.segment === "NFO" && (
          <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
            {stock.expiry && <span className="bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 text-gray-600 dark:text-gray-300">Exp: {new Date(stock.expiry).toLocaleDateString()}</span>}
            {stock.optionType && stock.strikePrice !== undefined && <span className="bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 text-gray-600 dark:text-gray-300">₹{stock.strikePrice}</span>}
            {stock.optionType && <span className="bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5 text-gray-600 dark:text-gray-300">{stock.optionType}</span>}
          </div>
        )}
      </div>
      <div className="text-right">
        <span className="font-mono font-bold text-lg text-gray-900 dark:text-gray-100">
          ₹{stock.ltp?.toFixed(2)}
        </span>
      </div>
    </div>
  )
}
