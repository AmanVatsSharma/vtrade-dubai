/**
 * @file financial-reports.tsx
 * @module admin-console
 * @description Enterprise financial reports module with P&L, commissions, and exports
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Filter,
  BarChart3,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface FinancialReport {
  id: string
  period: string
  revenue: number
  expenses: number
  profit: number
  commission: number
  trades: number
  users: number
}

export function FinancialReports() {
  const [reports, setReports] = useState<FinancialReport[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    period: 'month',
    dateFrom: '',
    dateTo: '',
  })

  const fetchReports = async () => {
    setLoading(true)
    console.log("💰 [FINANCIAL-REPORTS] Fetching financial reports...")

    try {
      const params = new URLSearchParams()
      params.set('period', filters.period)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      const response = await fetch(`/api/admin/financial/reports?${params.toString()}`).catch(() => null)

      if (response && response.ok) {
        const data = await response.json()
        setReports(data.reports || [])
        console.log(`✅ [FINANCIAL-REPORTS] Loaded ${data.reports?.length || 0} reports`)
      } else {
        console.warn("⚠️ [FINANCIAL-REPORTS] Failed to fetch financial reports")
        setReports([])
      }
    } catch (error) {
      console.error("❌ [FINANCIAL-REPORTS] Error fetching reports:", error)
      toast({
        title: "Error",
        description: "Failed to load financial reports",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [filters])

  const totalRevenue = reports.reduce((sum, r) => sum + r.revenue, 0)
  const totalExpenses = reports.reduce((sum, r) => sum + r.expenses, 0)
  const totalProfit = reports.reduce((sum, r) => sum + r.profit, 0)
  const totalCommission = reports.reduce((sum, r) => sum + r.commission, 0)

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0"
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary mb-1 sm:mb-2 flex items-center gap-2 break-words">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />
            <span>Financial Reports</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground break-words">Comprehensive financial analysis and reporting</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReports}
            disabled={loading}
            className="border-primary/50 text-primary hover:bg-primary/10 text-xs sm:text-sm"
          >
            <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10 text-xs sm:text-sm">
            <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <Card className="bg-card border-border shadow-sm neon-border">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Select value={filters.period} onValueChange={(value) => setFilters({ ...filters, period: value })}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              placeholder="From"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="bg-background border-border"
            />
            <Input
              type="date"
              placeholder="To"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="bg-background border-border"
            />
            <Button onClick={fetchReports} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Filter className="w-4 h-4 mr-2" />
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-xl sm:text-2xl font-bold text-green-400 truncate">₹{(totalRevenue / 100000).toFixed(2)}Cr</p>
              </div>
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total Expenses</p>
                <p className="text-xl sm:text-2xl font-bold text-red-400 truncate">₹{(totalExpenses / 100000).toFixed(2)}Cr</p>
              </div>
              <TrendingDown className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Net Profit</p>
                <p className="text-xl sm:text-2xl font-bold text-primary truncate">₹{(totalProfit / 100000).toFixed(2)}Cr</p>
              </div>
              <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-primary flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Commission</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-400 truncate">₹{(totalCommission / 100000).toFixed(2)}Cr</p>
              </div>
              <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-yellow-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card className="bg-card border-border shadow-sm neon-border">
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-lg sm:text-xl font-bold text-primary">Financial Reports</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[800px] sm:min-w-0">
              <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Period</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Expenses</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Trades</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Loading reports...
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No reports found
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report) => (
                    <TableRow key={report.id} className="border-border">
                      <TableCell className="font-medium text-foreground">{report.period}</TableCell>
                      <TableCell className="text-green-400">₹{(report.revenue / 1000).toFixed(0)}k</TableCell>
                      <TableCell className="text-red-400">₹{(report.expenses / 1000).toFixed(0)}k</TableCell>
                      <TableCell className="text-primary font-bold">₹{(report.profit / 1000).toFixed(0)}k</TableCell>
                      <TableCell className="text-yellow-400">₹{(report.commission / 1000).toFixed(0)}k</TableCell>
                      <TableCell>{report.trades.toLocaleString()}</TableCell>
                      <TableCell>{report.users.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Export
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
