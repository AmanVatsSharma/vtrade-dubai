/**
 * @file OrderHeader.tsx
 * @module components/trading/order-form
 * @description Header component for the order form displaying stock info and LTP with animations.
 * @author BharatERP
 * @created 2026-02-02
 */

import React, { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, TrendingDown } from "lucide-react"

interface OrderHeaderProps {
  stock: any
  orderSide: "BUY" | "SELL"
}

export function OrderHeader({ stock, orderSide }: OrderHeaderProps) {
  const [prevPrice, setPrevPrice] = useState(stock?.ltp || 0)
  const [priceColor, setPriceColor] = useState<"green" | "red" | "gray">("gray")

  useEffect(() => {
    if (!stock?.ltp) return
    if (stock.ltp > prevPrice) setPriceColor("green")
    else if (stock.ltp < prevPrice) setPriceColor("red")
    setPrevPrice(stock.ltp)
    
    const timer = setTimeout(() => setPriceColor("gray"), 1000)
    return () => clearTimeout(timer)
  }, [stock?.ltp])

  if (!stock) return null

  const isBuy = orderSide === "BUY"
  const themeClass = isBuy ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-rose-600 bg-rose-50 border-rose-100"

  return (
    <div className="flex justify-between items-start mb-2">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-lg sm:text-xl text-gray-900 dark:text-gray-100">{stock.symbol}</h3>
          <div className="flex gap-1">
            {stock.segment === "NFO" && !stock.optionType && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-blue-200 text-blue-700 bg-blue-50">FUT</Badge>
            )}
            {stock.segment === "NFO" && stock.optionType && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-yellow-200 text-yellow-700 bg-yellow-50">OPT</Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 border-gray-200 text-gray-500 bg-gray-50">{stock.exchange}</Badge>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{stock.name}</p>
        
        {stock.segment === "NFO" && (
          <div className="flex flex-wrap gap-1.5 mt-1 text-[10px] text-gray-500">
            {stock.expiry && <span>Exp: {new Date(stock.expiry).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>}
            {stock.optionType && stock.strikePrice !== undefined && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300 self-center" />
                <span>₹{stock.strikePrice} {stock.optionType}</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="text-right">
        <div className="flex items-center justify-end gap-1.5">
          <AnimatePresence mode="wait">
            {priceColor === "green" && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </motion.div>
            )}
            {priceColor === "red" && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <TrendingDown className="h-4 w-4 text-rose-500" />
              </motion.div>
            )}
          </AnimatePresence>
          <motion.span 
            key={stock.ltp}
            initial={{ scale: 1.1, color: priceColor === "green" ? "#10b981" : priceColor === "red" ? "#f43f5e" : "inherit" }}
            animate={{ scale: 1, color: "var(--foreground)" }}
            className="font-mono font-bold text-2xl tracking-tight"
          >
            ₹{stock.ltp?.toFixed(2)}
          </motion.span>
        </div>
        {/* Change indicator could go here */}
      </div>
    </div>
  )
}
