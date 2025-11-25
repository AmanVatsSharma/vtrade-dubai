"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

// Mock data for the trading chart
const chartData = [
  { time: "00:00", price: 45230, volume: 1200 },
  { time: "04:00", price: 46150, volume: 1450 },
  { time: "08:00", price: 44890, volume: 1680 },
  { time: "12:00", price: 47320, volume: 2100 },
  { time: "16:00", price: 48750, volume: 1890 },
  { time: "20:00", price: 49200, volume: 1560 },
  { time: "24:00", price: 50100, volume: 1340 },
]

export function TradingChart() {
  const maxPrice = Math.max(...chartData.map((d) => d.price))
  const minPrice = Math.min(...chartData.map((d) => d.price))
  const priceRange = maxPrice - minPrice

  return (
    <Card className="bg-card border-border shadow-sm neon-border">
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
        <CardTitle className="text-base sm:text-lg font-bold text-primary flex items-center">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
          <span className="truncate">Trading Volume & Price</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="h-48 sm:h-56 md:h-64 relative overflow-x-auto">
          {/* Chart Grid */}
          <div className="absolute inset-0 grid grid-cols-7 grid-rows-4 opacity-20">
            {Array.from({ length: 28 }).map((_, i) => (
              <div key={i} className="border-r border-b border-muted-foreground/20"></div>
            ))}
          </div>

          {/* Price Line */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Price area */}
            <motion.path
              d={`M 0 ${256 - ((chartData[0].price - minPrice) / priceRange) * 200} ${chartData
                .map(
                  (point, index) =>
                    `L ${(index / (chartData.length - 1)) * 100}% ${256 - ((point.price - minPrice) / priceRange) * 200}`,
                )
                .join(" ")} L 100% 256 L 0 256 Z`}
              fill="url(#priceGradient)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />

            {/* Price line */}
            <motion.path
              d={`M 0 ${256 - ((chartData[0].price - minPrice) / priceRange) * 200} ${chartData
                .map(
                  (point, index) =>
                    `L ${(index / (chartData.length - 1)) * 100}% ${256 - ((point.price - minPrice) / priceRange) * 200}`,
                )
                .join(" ")}`}
              stroke="rgb(34, 197, 94)"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />

            {/* Data points */}
            {chartData.map((point, index) => (
              <motion.circle
                key={index}
                cx={`${(index / (chartData.length - 1)) * 100}%`}
                cy={256 - ((point.price - minPrice) / priceRange) * 200}
                r="4"
                fill="rgb(34, 197, 94)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="drop-shadow-lg"
              />
            ))}
          </svg>

          {/* X-axis labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
            {chartData.map((point, index) => (
              <span key={index}>{point.time}</span>
            ))}
          </div>

          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-muted-foreground">
            <span>${maxPrice.toLocaleString()}</span>
            <span>${((maxPrice + minPrice) / 2).toLocaleString()}</span>
            <span>${minPrice.toLocaleString()}</span>
          </div>
        </div>

        {/* Chart Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Current Price</p>
            <p className="text-lg font-bold text-green-400">
              ${chartData[chartData.length - 1].price.toLocaleString()}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">24h Change</p>
            <p className="text-lg font-bold text-green-400">+8.7%</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Volume</p>
            <p className="text-lg font-bold text-foreground">{chartData[chartData.length - 1].volume}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
