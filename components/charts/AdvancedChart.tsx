"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import { createChart, ColorType, CrosshairMode, Time } from "lightweight-charts"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertTriangle, Maximize2, Minimize2, X } from "lucide-react"

export interface AdvancedChartProps {
  symbol: string
  className?: string
  height?: number
  onClose?: () => void
}

// Demo candle generator: intraday-like 5m bars
function generateDemoCandles(seedPrice: number, numBars: number = 120) {
  const candles: Array<{ time: Time; open: number; high: number; low: number; close: number; volume: number }> = []
  let lastClose = seedPrice
  const baseTime = Math.floor(Date.now() / 1000) - numBars * 300
  for (let i = 0; i < numBars; i++) {
    const t = (baseTime + i * 300) as Time
    const drift = (Math.random() - 0.5) * 0.4
    const open = lastClose
    const close = Math.max(0.01, open * (1 + drift / 100))
    const high = Math.max(open, close) * (1 + Math.random() * 0.003)
    const low = Math.min(open, close) * (1 - Math.random() * 0.003)
    const volume = Math.floor(50000 + Math.random() * 50000)
    candles.push({ time: t, open, high, low, close, volume })
    lastClose = close
  }
  return candles
}

export function AdvancedChart({ symbol, className, height = 520, onClose }: AdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const [isFull, setIsFull] = useState(true)

  const demoData = useMemo(() => generateDemoCandles(100 + Math.random() * 50), [symbol])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "#e2e8f0", visible: true },
        horzLines: { color: "#f1f5f9", visible: true },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, rightBarStaysOnScroll: true, barSpacing: 7 },
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10B981",
      downColor: "#EF4444",
      wickUpColor: "#10B981",
      wickDownColor: "#EF4444",
      borderVisible: false,
    })

    candleSeries.setData(demoData)

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: "#94a3b8",
      base: 0,
      lineWidth: 1,
      lastValueVisible: false,
    })
    volumeSeries.setData(
      demoData.map((c) => ({ time: c.time, value: c.volume, color: c.close >= c.open ? "#10B98188" : "#EF444488" }))
    )

    chart.timeScale().fitContent()

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    try {
      if (typeof ResizeObserver !== "undefined" && containerRef.current) {
        const ro = new ResizeObserver((entries) => {
          const entry = entries[0]
          if (!entry) return
          const width = Math.floor(entry.contentRect.width)
          if (width > 0 && chartRef.current) {
            chartRef.current.applyOptions({ width })
          }
        })
        ro.observe(containerRef.current)
        resizeObserverRef.current = ro
      }
    } catch {}

    return () => {
      if (resizeObserverRef.current && containerRef.current) {
        try {
          resizeObserverRef.current.unobserve(containerRef.current)
          resizeObserverRef.current.disconnect()
        } catch {}
        resizeObserverRef.current = null
      }
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
        candleSeriesRef.current = null
        volumeSeriesRef.current = null
      }
    }
  }, [symbol, height, demoData])

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{symbol}</span>
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <AlertTriangle className="inline h-3 w-3 mr-1" /> Data feed paused; demo candles shown
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={() => setIsFull(v => !v)} title={isFull ? "Exit full height" : "Full height"}>
            {isFull ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {onClose && (
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div
        ref={containerRef}
        className={cn("w-full", isFull ? "h-[70vh]" : undefined)}
        style={isFull ? undefined : { height }}
      />
    </div>
  )
}
