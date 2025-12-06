/**
 * @file AdvancedChart.tsx
 * @module components/charts
 * @description Full-screen lightweight chart with deterministic mock data for enterprise watchlist flows.
 * @author BharatERP
 * @created 2025-12-06
 */

"use client"

import React, { useEffect, useRef, useState, useMemo } from "react"
import { createChart, ColorType, CrosshairMode, Time } from "lightweight-charts"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AlertTriangle, Maximize2, Minimize2, X } from "lucide-react"
import { buildMockCandles, type MockCandle } from "@/lib/charts/mock-candles"

export interface AdvancedChartProps {
  symbol: string
  className?: string
  height?: number
  onClose?: () => void
  mockSeedPrice?: number
  mockSeries?: MockCandle[]
}

export function AdvancedChart({
  symbol,
  className,
  height = 520,
  onClose,
  mockSeedPrice,
  mockSeries,
}: AdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const [isFull, setIsFull] = useState(true)

  const chartCandles = useMemo<MockCandle[]>(() => {
    if (mockSeries && mockSeries.length > 0) {
      return mockSeries
    }
    const fallbackSeed = mockSeedPrice ?? Math.max(100 + Math.random() * 50, 1)
    return buildMockCandles(fallbackSeed, 240, symbol)
  }, [mockSeries, mockSeedPrice, symbol])

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

    candleSeries.setData(chartCandles as unknown as Array<{ time: Time; open: number; high: number; low: number; close: number }>)

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: "#94a3b8",
      base: 0,
      lineWidth: 1,
      lastValueVisible: false,
    })
    const histogramData = chartCandles.map((candle) => ({
      time: candle.time as Time,
      value: candle.volume,
      color: candle.close >= candle.open ? "#10B98188" : "#EF444488",
    }))
    volumeSeries.setData(histogramData)

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
  }, [symbol, height, chartCandles])

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{symbol}</span>
          <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
            <AlertTriangle className="inline h-3 w-3 mr-1" /> Data feed paused; deterministic mock candles
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
