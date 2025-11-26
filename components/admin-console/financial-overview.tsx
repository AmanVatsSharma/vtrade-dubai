"use client"

/**
 * File: components/admin-console/financial-overview.tsx
 * Module: admin-console
 * Purpose: Render a super-admin focused deposit audit trail with actionable filters
 * Author: Cursor / GPT-5 Codex
 * Last-updated: 2025-11-12
 * Notes:
 * - Replaces legacy financial summary with approval/rejection insights
 * - Provides filters so super admins can monitor admin decisions
 */

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FilterX, Search, DollarSign } from "lucide-react"
import { PageHeader, RefreshButton, Pagination } from "./shared"

type AuditStatus = "APPROVED" | "REJECTED"

interface AuditUser {
  id: string
  name: string | null
  email: string | null
  clientId: string | null
}

interface AuditRecord {
  id: string
  depositId: string | null
  status: AuditStatus
  adminId: string | null
  adminName: string | null
  adminRole: string | null
  reason: string | null
  amount: number | null
  remarks: string | null
  user?: AuditUser
  createdAt: string
}

interface AuditResponse {
  records: AuditRecord[]
  page: number
  pageSize: number
  total: number
}

interface FilterState {
  status: "ALL" | AuditStatus
  search: string
  adminId: string
  adminName: string
  from: string
  to: string
}

const STATUS_OPTIONS: { label: string; value: FilterState["status"] }[] = [
  { value: "ALL", label: "All actions" },
  { value: "APPROVED", label: "Approved deposits" },
  { value: "REJECTED", label: "Rejected deposits" },
]

const formatCurrency = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "—"
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(value)
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-IN", { hour12: false })
}

const initialFilters: FilterState = {
  status: "ALL",
  search: "",
  adminId: "",
  adminName: "",
  from: "",
  to: "",
}

export function FinancialOverview() {
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [total, setTotal] = useState(0)
  const [records, setRecords] = useState<AuditRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  )

  const buildQueryParams = useCallback(() => {
    const params = new URLSearchParams()
    if (filters.status !== "ALL") params.set("status", filters.status)
    if (filters.search) params.set("search", filters.search.trim())
    if (filters.adminId) params.set("adminId", filters.adminId.trim())
    if (filters.adminName) params.set("adminName", filters.adminName.trim())
    if (filters.from) {
      const fromDate = new Date(`${filters.from}T00:00:00Z`)
      if (!Number.isNaN(fromDate.getTime())) {
        params.set("from", fromDate.toISOString())
      }
    }
    if (filters.to) {
      const toDate = new Date(`${filters.to}T23:59:59Z`)
      if (!Number.isNaN(toDate.getTime())) {
        params.set("to", toDate.toISOString())
      }
    }
    params.set("page", String(page))
    params.set("pageSize", String(pageSize))
    console.log("🔧 [FinancialOverview] Built query params:", Object.fromEntries(params.entries()))
    return params
  }, [filters, page, pageSize])

  const fetchAuditLogs = useCallback(async () => {
    const params = buildQueryParams()
    console.log("🌐 [FinancialOverview] Fetching audit logs with params:", params.toString())
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/super-admin/deposits/audit?${params.toString()}`)
      if (!res.ok) {
        const text = await res.text()
        console.error("❌ [FinancialOverview] Audit API failed:", res.status, text)
        throw new Error("Failed to fetch audit logs")
      }

      const payload = await res.json()
      console.log("✅ [FinancialOverview] Audit API response:", payload)

      const data: AuditResponse | undefined = payload?.data
      if (!data) {
        throw new Error("Malformed response from audit API")
      }

      setRecords(
        (data.records || []).map((record) => ({
          ...record,
          createdAt: record.createdAt,
        })),
      )
      setTotal(data.total || 0)
    } catch (err: any) {
      console.error("❌ [FinancialOverview] Unable to load audit logs:", err)
      setError(err?.message || "Unexpected error while fetching audit logs")
      setRecords([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [buildQueryParams])

  useEffect(() => {
    fetchAuditLogs()
  }, [fetchAuditLogs])

  const handleFilterChange = <Key extends keyof FilterState>(key: Key, value: FilterState[Key]) => {
    console.log("🔄 [FinancialOverview] Updating filter", key, value)
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleResetFilters = () => {
    console.log("♻️ [FinancialOverview] Resetting filters")
    setFilters(initialFilters)
    setPage(1)
  }

  const handleRefresh = () => {
    console.log("🔁 [FinancialOverview] Manual refresh triggered")
    fetchAuditLogs()
  }

  const handlePageChange = (direction: "prev" | "next") => {
    setPage((prevPage) => {
      const nextPage = direction === "prev" ? Math.max(1, prevPage - 1) : Math.min(totalPages, prevPage + 1)
      console.log("📄 [FinancialOverview] Page change:", { direction, prevPage, nextPage })
      return nextPage
    })
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <PageHeader
        title="Deposit Audit Trail"
        description="Super-admin focused deposit audit trail with actionable filters"
        icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs sm:text-sm">
              <FilterX className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Reset
            </Button>
            <RefreshButton onClick={handleRefresh} loading={loading} />
          </>
        }
      />
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6" style={{ display: 'none' }}>
          <CardTitle className="text-lg sm:text-xl font-semibold break-words">Deposit Audit Trail</CardTitle>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs sm:text-sm">
              <FilterX className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Reset
            </Button>
            <RefreshButton onClick={handleRefresh} loading={loading} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-3 sm:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
            <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange("status", value as FilterState["status"])}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Search</label>
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 h-3 w-3 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-7 sm:pl-9 text-sm"
                  placeholder="Deposit ID or keyword"
                  value={filters.search}
                  onChange={(event) => handleFilterChange("search", event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Admin ID</label>
              <Input
                placeholder="admin uuid"
                value={filters.adminId}
                onChange={(event) => handleFilterChange("adminId", event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Admin Name</label>
              <Input
                placeholder="name search"
                value={filters.adminName}
                onChange={(event) => handleFilterChange("adminName", event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">From (IST)</label>
              <Input
                type="date"
                value={filters.from}
                onChange={(event) => handleFilterChange("from", event.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">To (IST)</label>
              <Input
                type="date"
                value={filters.to}
                onChange={(event) => handleFilterChange("to", event.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-lg sm:text-xl font-semibold break-words">Recent Decisions</CardTitle>
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            Showing page {page} of {totalPages} ({total} total actions)
          </div>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-0 sm:px-6 pb-3 sm:pb-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0 rounded-lg border">
            <div className="min-w-[1000px] sm:min-w-0">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Timestamp (IST)</TableHead>
                  <TableHead className="whitespace-nowrap">Deposit ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="whitespace-nowrap text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Reason / Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      No audit records found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}

                {loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Loading audit records...
                    </TableCell>
                  </TableRow>
                )}

                {!loading &&
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {formatDateTime(record.createdAt)}
                      </TableCell>
                      <TableCell className="align-top font-mono text-xs">
                        {record.depositId ?? "—"}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-sm font-medium">{record.user?.name ?? "Unknown user"}</div>
                        <div className="text-xs text-muted-foreground">
                          {record.user?.clientId ?? "N/A"} · {record.user?.email ?? "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-right text-sm font-semibold">
                        {formatCurrency(record.amount)}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge
                          variant={record.status === "APPROVED" ? "default" : "destructive"}
                          className="text-xs"
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="text-sm font-medium">{record.adminName ?? "Unknown admin"}</div>
                        <div className="font-mono text-xs text-muted-foreground">{record.adminId ?? "—"}</div>
                      </TableCell>
                      <TableCell className="align-top text-xs text-muted-foreground">
                        {record.adminRole ?? "—"}
                      </TableCell>
                      <TableCell className="align-top text-xs">
                        {record.reason ? (
                          <span className="text-red-600">{record.reason}</span>
                        ) : (
                          record.remarks ?? "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {records.length} record{records.length === 1 ? "" : "s"} on this page
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => {
                if (newPage < page) handlePageChange("prev")
                else if (newPage > page) handlePageChange("next")
              }}
              loading={loading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
