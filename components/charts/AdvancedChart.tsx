/**
 * File: components/charts/AdvancedChart.tsx
 * Module: components/charts
 * Purpose: Full-screen chart drawer component (line-first LTP now; candle-ready later).
 * Author: Cursor / BharatERP
 * Last-updated: 2026-01-25
 * Notes:
 * - Defaults to Line chart; Candles UI is visible but disabled (“Coming soon”) until OHLC feed integration.
 * - Live LTP updates append/update the last line point with monotonic timestamps (prevents time going backwards).
 */

"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { createChart, ColorType, CrosshairMode, Time } from "lightweight-charts"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Maximize2, Minimize2, X } from "lucide-react"
import { buildMockCandles, candlesToLineSeries, type MockCandle } from "@/lib/charts/mock-candles"

export type ChartType = "line" | "candles"

export interface AdvancedChartProps {
  symbol: string
  className?: string
  height?: number
  onClose?: () => void
  mockSeedPrice?: number
  mockSeries?: MockCandle[]
  currentPrice?: number
  initialChartType?: ChartType
}

export function AdvancedChart({
  symbol,
  className,
  height = 520,
  onClose,
  mockSeedPrice,
  mockSeries,
  currentPrice,
  initialChartType = "line",
}: AdvancedChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const lineSeriesRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const volumeSeriesRef = useRef<any>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const lastLineTimeRef = useRef<number | null>(null)
  const [isFull, setIsFull] = useState(true)
  const [chartType, setChartType] = useState<ChartType>(initialChartType)

  const chartCandles = useMemo<MockCandle[]>(() => {
    if (mockSeries && mockSeries.length > 0) {
      return mockSeries
    }
    const fallbackSeed = mockSeedPrice ?? Math.max(100 + Math.random() * 50, 1)
    return buildMockCandles(fallbackSeed, 240, symbol)
  }, [mockSeries, mockSeedPrice, symbol])

  const alignedCandles = useMemo<MockCandle[]>(() => {
    if (!chartCandles || chartCandles.length === 0) return []
    const nowSec = Math.floor(Date.now() / 1000)
    const last = chartCandles[chartCandles.length - 1]?.time ?? nowSec
    const delta = nowSec - last
    // If already close to realtime, don’t shift.
    if (Math.abs(delta) < 5) return chartCandles
    return chartCandles.map((candle) => ({ ...candle, time: candle.time + delta }))
  }, [chartCandles])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    lastLineTimeRef.current = null
    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.12)", visible: true },
        horzLines: { color: "rgba(148, 163, 184, 0.08)", visible: true },
      },
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderVisible: false },
      timeScale: {
        borderVisible: false,
        rightBarStaysOnScroll: true,
        barSpacing: 7,
        timeVisible: true,
        secondsVisible: false,
      },
    })

    if (chartType === "line") {
      const first = alignedCandles[0]
      const last = alignedCandles[alignedCandles.length - 1]
      const isUp = first && last ? last.close >= first.open : true
      const lineColor = isUp ? "#22c55e" : "#ef4444"

      const lineSeries = chart.addAreaSeries({
        lineColor,
        topColor: isUp ? "rgba(34, 197, 94, 0.20)" : "rgba(239, 68, 68, 0.20)",
        bottomColor: "rgba(0, 0, 0, 0)",
        lineWidth: 2,
      })

      const lineData = candlesToLineSeries(alignedCandles).map((p) => ({
        time: p.time as Time,
        value: p.value,
      }))
      lineSeries.setData(lineData as any)
      lastLineTimeRef.current = lineData.length > 0 ? Number(lineData[lineData.length - 1]?.time) : null
      lineSeriesRef.current = lineSeries
      candleSeriesRef.current = null
    } else {
      const candleSeries = chart.addCandlestickSeries({
        upColor: "#10B981",
        downColor: "#EF4444",
        wickUpColor: "#10B981",
        wickDownColor: "#EF4444",
        borderVisible: false,
      })

      candleSeries.setData(
        alignedCandles as unknown as Array<{ time: Time; open: number; high: number; low: number; close: number }>,
      )

      candleSeriesRef.current = candleSeries
      lineSeriesRef.current = null
    }

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: "#94a3b8",
      base: 0,
      lineWidth: 1,
      lastValueVisible: false,
    })
    const histogramData = alignedCandles.map((candle) => ({
      time: candle.time as Time,
      value: candle.volume,
      color: candle.close >= candle.open ? "#10B98188" : "#EF444488",
    }))
    volumeSeries.setData(histogramData)

    chart.timeScale().fitContent()

    chartRef.current = chart
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
        lineSeriesRef.current = null
        candleSeriesRef.current = null
        volumeSeriesRef.current = null
      }
    }
  }, [symbol, height, alignedCandles, chartType])

  // Live LTP updates for line chart (TradingView-like feel)
  useEffect(() => {
    if (chartType !== "line") return
    if (!lineSeriesRef.current) return
    if (typeof currentPrice !== "number" || !Number.isFinite(currentPrice) || currentPrice <= 0) return

    const nowSec = Math.floor(Date.now() / 1000)
    const lastTime = lastLineTimeRef.current ?? nowSec
    const nextTime = nowSec < lastTime ? lastTime : nowSec

    try {
      lineSeriesRef.current.update({ time: nextTime as Time, value: currentPrice } as any)
      lastLineTimeRef.current = nextTime
    } catch {
      // Swallow chart update errors; avoids UI crashes if chart is mid-teardown.
    }
  }, [chartType, currentPrice])

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{symbol}</span>
          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setChartType("line")}
              className={cn(
                "rounded-md px-2 py-1 text-xs transition",
                chartType === "line" ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              Line
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Coming soon (needs OHLC candle feed)"
              className="cursor-not-allowed rounded-md px-2 py-1 text-xs text-white/40"
            >
              Candles
            </button>
          </div>
          <span className="text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5 rounded">
            Live LTP
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
