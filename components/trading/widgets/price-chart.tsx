/**
 * @file price-chart.tsx
 * @module components/trading/widgets
 * @description Internal lightweight price chart powered by `lightweight-charts` with in-memory series.
 * @author BharatERP
 * @created 2026-01-24
 */

"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { createChart, type IChartApi, type ISeriesApi, type Time } from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useMarketData } from "@/lib/market-data/providers/WebSocketMarketDataProvider"

export type ChartSymbol = {
  key: string
  label: string
  token: number
}

type PriceChartProps = {
  symbols: ChartSymbol[]
  defaultSymbolKey?: string
}

type Point = { time: Time; value: number }

export function PriceChart({ symbols, defaultSymbolKey }: PriceChartProps) {
  const { quotes, isConnected } = useMarketData()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const [selectedKey, setSelectedKey] = useState<string>(() => defaultSymbolKey ?? symbols[0]?.key ?? "")

  const selected = useMemo(() => symbols.find((s) => s.key === selectedKey) ?? symbols[0], [symbols, selectedKey])

  // Chart init
  useEffect(() => {
    if (!containerRef.current) return
    if (chartRef.current) return

    const chart = createChart(containerRef.current, {
      height: 320,
      layout: { background: { color: "transparent" }, textColor: "#71717a" },
      grid: { vertLines: { visible: false }, horzLines: { visible: false } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: true },
      crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
    })

    const series = chart.addLineSeries({
      lineWidth: 2,
      priceLineVisible: true,
    })

    chartRef.current = chart
    seriesRef.current = series

    const resize = () => {
      if (!containerRef.current || !chartRef.current) return
      const { clientWidth } = containerRef.current
      chartRef.current.applyOptions({ width: clientWidth })
    }

    resize()
    window.addEventListener("resize", resize)

    return () => {
      window.removeEventListener("resize", resize)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Reset series when symbol changes
  useEffect(() => {
    const s = seriesRef.current
    if (!s) return
    s.setData([])
  }, [selected?.key])

  // Append new points from live quotes (in-memory series)
  useEffect(() => {
    const s = seriesRef.current
    if (!s || !selected) return

    const q: any = (quotes as any)?.[String(selected.token)]
    const ltp = Number(q?.last_trade_price)
    if (!Number.isFinite(ltp)) return

    const now = Math.floor(Date.now() / 1000) as Time
    s.update({ time: now, value: ltp } satisfies Point)
  }, [quotes, selected])

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">Price Chart</CardTitle>
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-muted-foreground">
              {isConnected === "connected" ? "Live" : isConnected === "connecting" ? "Connecting" : "Offline"}
            </div>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder="Select symbol" />
              </SelectTrigger>
              <SelectContent>
                {symbols.map((s) => (
                  <SelectItem key={s.key} value={s.key}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={containerRef} className="w-full" />
      </CardContent>
    </Card>
  )
}

