"use client"

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function toISO(d?: Date) { return d ? d.toISOString() : undefined }

export function FinancialOverview() {
  const [from, setFrom] = useState<Date>(() => new Date(new Date().setDate(new Date().getDate() - 30)))
  const [to, setTo] = useState<Date>(() => new Date())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<any>(null)
  const [timeseries, setTimeseries] = useState<any>(null)
  const [breakdown, setBreakdown] = useState<any>(null)
  const [topUsers, setTopUsers] = useState<any[]>([])

  const params = useMemo(() => {
    const p = new URLSearchParams()
    if (from) p.set('from', toISO(from)!)
    if (to) p.set('to', toISO(to)!)
    return p
  }, [from, to])

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, t, b, u] = await Promise.all([
        fetch(`/api/super-admin/finance/summary?${params.toString()}`),
        fetch(`/api/super-admin/finance/timeseries?granularity=day&from=${encodeURIComponent(toISO(from) || '')}&to=${encodeURIComponent(toISO(to) || '')}`),
        fetch(`/api/super-admin/finance/breakdown?by=status&${params.toString()}`),
        fetch(`/api/super-admin/finance/top-users?by=deposits&${params.toString()}`),
      ])
      if (!s.ok) throw new Error('summary failed')
      if (!t.ok) throw new Error('timeseries failed')
      if (!b.ok) throw new Error('breakdown failed')
      if (!u.ok) throw new Error('top users failed')
      const [sj, tj, bj, uj] = await Promise.all([s.json(), t.json(), b.json(), u.json()])
      setSummary(sj.data)
      setTimeseries(tj.data)
      setBreakdown(bj.data)
      setTopUsers(uj.data)
    } catch (e: any) {
      console.error('[FinancialOverview] load error', e)
      setError(e?.message || 'Failed to load finance data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Financial Overview</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setFrom(new Date(new Date().setDate(new Date().getDate() - 30))); setTo(new Date()); }}>Last 30d</Button>
          <Button variant="outline" onClick={fetchAll} disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</Button>
        </div>
      </div>

      {error && (
        <div className="p-3 border rounded text-red-700 bg-red-50">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Deposits</div>
          <div className="text-2xl font-bold">₹{Number(summary?.totalDeposits || 0).toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total Withdrawals</div>
          <div className="text-2xl font-bold">₹{Number(summary?.totalWithdrawals || 0).toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Net Flow</div>
          <div className="text-2xl font-bold">₹{Number(summary?.netFlow || 0).toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Pending Deposits</div>
          <div className="text-2xl font-bold">{Number(summary?.pendingDeposits || 0).toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Pending Withdrawals</div>
          <div className="text-2xl font-bold">{Number(summary?.pendingWithdrawals || 0).toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Commission Due</div>
          <div className="text-2xl font-bold">₹{Number(summary?.commissionDue || 0).toLocaleString()}</div>
        </Card>
      </div>

      {/* Timeseries and breakdown placeholders for now */}
      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-2">Timeseries (daily)</div>
        <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(timeseries, null, 2)}</pre>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-2">Breakdown</div>
        <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(breakdown, null, 2)}</pre>
      </Card>
      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-2">Top Users</div>
        <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(topUsers, null, 2)}</pre>
      </Card>
    </div>
  )
}
