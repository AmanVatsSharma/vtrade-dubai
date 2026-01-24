/**
 * @file screener-lite.tsx
 * @module components/trading/widgets
 * @description Internal lightweight stock screener (search + basic results) without external embeds.
 * @author BharatERP
 * @created 2026-01-24
 */

"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { searchStocks } from "@/lib/hooks/use-trading-data"

type ScreenerRow = {
  id: string
  symbol: string
  name: string
  ltp?: number
  changePercent?: number
  segment?: string
  exchange?: string
}

type ScreenerLiteProps = {
  placeholder?: string
}

export function ScreenerLite({ placeholder = "Search stocks (e.g. RELIANCE, TCS)..." }: ScreenerLiteProps) {
  const [query, setQuery] = useState("")
  const [rows, setRows] = useState<ScreenerRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const q = query.trim()
    if (q.length < 2) {
      setRows([])
      setError(null)
      return
    }

    const run = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result: any[] = await searchStocks(q)
        if (cancelled) return
        setRows(
          (result || []).map((s: any) => ({
            id: s.id,
            symbol: s.symbol || s.ticker || "UNKNOWN",
            name: s.name || "Unknown",
            ltp: typeof s.ltp === "number" ? s.ltp : undefined,
            changePercent: typeof s.changePercent === "number" ? s.changePercent : undefined,
            segment: s.segment,
            exchange: s.exchange,
          })),
        )
      } catch (e: any) {
        console.error("[ScreenerLite] search failed", e)
        if (!cancelled) setError(e?.message || "Search failed")
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    const t = setTimeout(run, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query])

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Screener</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
        {error && <div className="text-xs text-red-600">{error}</div>}
        {isLoading && <div className="text-xs text-muted-foreground">Searching…</div>}
        {!isLoading && rows.length === 0 && query.trim().length >= 2 && !error && (
          <div className="text-xs text-muted-foreground">No results.</div>
        )}
        {rows.length > 0 && (
          <div className="divide-y divide-border/50 rounded-lg border border-border/50 overflow-hidden">
            {rows.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{r.symbol}</div>
                  <div className="text-xs text-muted-foreground truncate">{r.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono font-bold tabular-nums">
                    {typeof r.ltp === "number" ? `₹${r.ltp.toFixed(2)}` : "—"}
                  </div>
                  <div className={`text-[10px] font-semibold ${Number(r.changePercent ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {typeof r.changePercent === "number"
                      ? `${r.changePercent >= 0 ? "+" : ""}${r.changePercent.toFixed(2)}%`
                      : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

