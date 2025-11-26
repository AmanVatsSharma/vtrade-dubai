/**
 * @file audit-trail.tsx
 * @module admin-console
 * @description Enterprise audit trail system with comprehensive activity logging and search
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Shield,
  Download,
  Calendar,
  User,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { StatusBadge, PageHeader, RefreshButton, FilterBar, Pagination, type FilterField } from "./shared"

interface AuditLog {
  id: string
  timestamp: Date
  userId: string
  userName: string
  action: string
  resource: string
  resourceId: string
  details: string
  ipAddress: string
  userAgent: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  status: 'SUCCESS' | 'FAILED' | 'PENDING'
}

export function AuditTrail() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    search: '',
    severity: 'all' as string,
    status: 'all' as string,
    action: 'all' as string,
    dateFrom: '',
    dateTo: '',
  })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchAuditLogs = async () => {
    setLoading(true)
    console.log("🔍 [AUDIT-TRAIL] Fetching audit logs...")

    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '50')
      if (filters.search) params.set('search', filters.search)
      if (filters.severity !== 'all') params.set('severity', filters.severity)
      if (filters.status !== 'all') params.set('status', filters.status)
      if (filters.action !== 'all') params.set('action', filters.action)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)

      const response = await fetch(`/api/admin/audit?${params.toString()}`).catch(() => null)

      if (response && response.ok) {
        const data = await response.json()
        const formattedLogs = (data.logs || []).map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }))
        setLogs(formattedLogs)
        setTotalPages(data.pages || 1)
        console.log(`✅ [AUDIT-TRAIL] Loaded ${formattedLogs.length} logs`)
      } else {
        console.warn("⚠️ [AUDIT-TRAIL] Failed to fetch audit logs")
        setLogs([])
        setTotalPages(1)
      }
    } catch (error) {
      console.error("❌ [AUDIT-TRAIL] Error fetching logs:", error)
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [page, filters])

  // Filter fields configuration
  const filterFields: FilterField[] = [
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search logs...',
      span: 2
    },
    {
      key: 'severity',
      label: 'Severity',
      type: 'select',
      options: [
        { label: 'All Severities', value: 'all' },
        { label: 'Low', value: 'LOW' },
        { label: 'Medium', value: 'MEDIUM' },
        { label: 'High', value: 'HIGH' },
        { label: 'Critical', value: 'CRITICAL' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Success', value: 'SUCCESS' },
        { label: 'Failed', value: 'FAILED' },
        { label: 'Pending', value: 'PENDING' }
      ]
    },
    {
      key: 'dateFrom',
      label: 'From',
      type: 'date'
    },
    {
      key: 'dateTo',
      label: 'To',
      type: 'date'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-400" />
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <PageHeader
        title="Audit Trail"
        description="Complete activity log and compliance tracking"
        icon={<Shield className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={
          <>
            <RefreshButton onClick={fetchAuditLogs} loading={loading} />
            <Button variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10 text-xs sm:text-sm">
              <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </>
        }
      />

      {/* Filters */}
      <FilterBar
        filters={filters}
        fields={filterFields}
        onFilterChange={(key, value) => setFilters({ ...filters, [key]: value })}
        onReset={() => setFilters({
          search: '',
          severity: 'all',
          status: 'all',
          action: 'all',
          dateFrom: '',
          dateTo: '',
        })}
      />

      {/* Audit Logs Table */}
      <Card className="bg-card border-border shadow-sm neon-border">
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-lg sm:text-xl font-bold text-primary">Activity Logs ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[1000px] sm:min-w-0">
              <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-muted-foreground">Timestamp</TableHead>
                  <TableHead className="text-muted-foreground">User</TableHead>
                  <TableHead className="text-muted-foreground">Action</TableHead>
                  <TableHead className="text-muted-foreground">Resource</TableHead>
                  <TableHead className="text-muted-foreground">Details</TableHead>
                  <TableHead className="text-muted-foreground">Severity</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Loading audit logs...
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <motion.tr
                      key={log.id}
                      className="border-border hover:bg-muted/30 transition-colors"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{log.userName}</p>
                            <p className="text-xs text-muted-foreground">{log.userId.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          {log.action}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">{log.resource}</p>
                          <p className="text-xs text-muted-foreground">{log.resourceId.slice(0, 8)}...</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-sm text-foreground truncate">{log.details}</p>
                      </TableCell>
                      <TableCell><StatusBadge status={log.severity} type="risk" /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className="text-sm text-foreground">{log.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs text-muted-foreground">{log.ipAddress}</code>
                      </TableCell>
                    </motion.tr>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            loading={loading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
