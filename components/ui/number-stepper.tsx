"use client"

import React, { useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  disabled?: boolean
  className?: string
  formatValue?: (val: number) => string
}

export function NumberStepper({
  value,
  onChange,
  min = 1,
  max = 999999,
  step = 1,
  label,
  disabled = false,
  className,
  formatValue
}: NumberStepperProps) {
  const [isFocused, setIsFocused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleIncrement = () => {
    if (disabled || value >= max) return
    const next = Math.min(max, value + step)
    // Fix floating point precision
    const fixed = Number(next.toFixed(2))
    onChange(fixed)
  }

  const handleDecrement = () => {
    if (disabled || value <= min) return
    const next = Math.max(min, value - step)
    const fixed = Number(next.toFixed(2))
    onChange(fixed)
  }

  const startAutoChange = (action: () => void) => {
    action()
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(action, 100)
    }, 400)
  }

  const stopAutoChange = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  const displayValue = formatValue ? formatValue(value) : value.toString()

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 ml-1">
          {label}
        </label>
      )}
      <div 
        className={cn(
          "relative flex items-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border transition-all duration-200",
          isFocused 
            ? "border-primary ring-2 ring-primary/10 bg-white dark:bg-gray-800" 
            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
          disabled && "opacity-50 pointer-events-none"
        )}
      >
        {/* Decrement Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onMouseDown={() => startAutoChange(handleDecrement)}
          onMouseUp={stopAutoChange}
          onMouseLeave={stopAutoChange}
          onTouchStart={() => startAutoChange(handleDecrement)}
          onTouchEnd={stopAutoChange}
          className="p-3 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-30"
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </motion.button>

        {/* Value Display/Input */}
        <div className="flex-1 text-center relative h-10 flex items-center justify-center overflow-hidden">
          <input
            type="number"
            value={value}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              if (!isNaN(val)) onChange(val)
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="absolute inset-0 w-full h-full text-center bg-transparent border-none outline-none font-mono font-semibold text-lg text-gray-900 dark:text-gray-100 z-10 opacity-0 focus:opacity-100"
            min={min}
            max={max}
            step={step}
          />
          <AnimatePresence mode="popLayout" initial={false}>
            {!isFocused && (
              <motion.span
                key={value}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute font-mono font-semibold text-lg text-gray-900 dark:text-gray-100 pointer-events-none"
              >
                {displayValue}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Increment Button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onMouseDown={() => startAutoChange(handleIncrement)}
          onMouseUp={stopAutoChange}
          onMouseLeave={stopAutoChange}
          onTouchStart={() => startAutoChange(handleIncrement)}
          onTouchEnd={stopAutoChange}
          className="p-3 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-30"
          disabled={value >= max}
        >
          <Plus className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  )
}
