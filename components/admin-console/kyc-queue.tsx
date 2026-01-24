/**
 * @file kyc-queue.tsx
 * @module admin-console
 * @description Dedicated KYC queue with assignment, SLA, AML flags, and review logs
 * @author BharatERP
 * @created 2026-01-15
 */

"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertTriangle,
  CheckCircle,
  FileSearch,
  ShieldOff,
} from "lucide-react"
import { PageHeader, RefreshButton, StatusBadge, Pagination } from "./shared"
import { getSlaState, normalizeAmlFlags } from "@/lib/admin/kyc-utils"
import { toast } from "@/hooks/use-toast"

type KycUser = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  clientId: string | null
  role: string
}

type KycAssignee = {
  id: string
  name: string | null
  email: string | null
  role: string
}

type KycReviewLog = {
  id: string
  action: string
  note?: string | null
  createdAt: string
  reviewer?: {
    id: string
    name: string | null
    email: string | null
    role: string
  } | null
}

type KycApplication = {
  id: string
  aadhaarNumber: string
  panNumber: string
  bankProofUrl: string
  status: string
  submittedAt: string
  approvedAt?: string | null
  assignedToId?: string | null
  assignedAt?: string | null
  slaDueAt?: string | null
  amlStatus: string
  amlFlags: string[]
  suspiciousStatus: string
  user: KycUser
  assignedTo?: KycAssignee | null
  _count?: {
    reviewLogs: number
  }
}

type KycQueueMeta = {
  overdueCount: number
  flaggedCount: number
  suspiciousCount: number
  assignedCount: number
}

const SLA_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Due Soon (24h)", value: "DUE_SOON" },
  { label: "Due in 48h", value: "DUE_48H" },
  { label: "Due in 72h", value: "DUE_72H" },
]

const AML_STATUS_OPTIONS = ["ALL", "PENDING", "CLEAR", "REVIEW", "HIT"]
const SUSPICIOUS_STATUS_OPTIONS = ["ALL", "NONE", "REVIEW", "ESCALATED", "CLEARED"]
const KYC_STATUS_OPTIONS = ["ALL", "PENDING", "APPROVED", "REJECTED"]

const formatDateTime = (value?: string | null) => {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-IN", { hour12: false })
}

const maskAadhaar = (value: string) => value.replace(/(\d{4})(\d{4})(\d{4})/, "$1-****-****")

export function KycQueue() {
  const [items, setItems] = useState<KycApplication[]>([])
  const [meta, setMeta] = useState<KycQueueMeta | null>(null)
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [search, setSearch] = useState("")
  const [amlFlagFilter, setAmlFlagFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [assignedFilter, setAssignedFilter] = useState("ALL")
  const [slaFilter, setSlaFilter] = useState("ALL")
  const [amlStatusFilter, setAmlStatusFilter] = useState("ALL")
  const [suspiciousFilter, setSuspiciousFilter] = useState("ALL")

  const [assignees, setAssignees] = useState<KycAssignee[]>([])
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const fetchAssignees = useCallback(async () => {
    console.log("[KYC-QUEUE] Loading assignees list")
    try {
      const response = await fetch("/api/admin/rms")
      if (!response.ok) return
      const data = await response.json()
      const filtered = (data?.rms || []).filter((rm: KycAssignee) => rm.role === "ADMIN" || rm.role === "MODERATOR")
      setAssignees(filtered)
    } catch (err) {
      console.error("[KYC-QUEUE] Failed to load assignees", err)
    }
  }, [])

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    setError(null)
    console.log("[KYC-QUEUE] Fetching KYC queue")

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      })
      if (search) params.set("search", search)
      if (statusFilter !== "ALL") params.set("status", statusFilter)
      if (amlFlagFilter.trim()) params.set("flag", amlFlagFilter.trim())
      if (assignedFilter !== "ALL") params.set("assignedTo", assignedFilter)
      if (slaFilter !== "ALL") params.set("sla", slaFilter)
      if (amlStatusFilter !== "ALL") params.set("amlStatus", amlStatusFilter)
      if (suspiciousFilter !== "ALL") params.set("suspiciousStatus", suspiciousFilter)

      const response = await fetch(`/api/admin/kyc?${params.toString()}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || "Failed to load KYC queue")
      }

      const data = await response.json()
      setItems(data.kycApplications || [])
      setStatusCounts(data.statusCounts || {})
      setMeta(data.meta || null)
      setTotalPages(data.pagination?.totalPages || 1)
    } catch (err: any) {
      console.error("[KYC-QUEUE] Fetch error", err)
      setError(err?.message || "Failed to load KYC queue")
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, amlFlagFilter, assignedFilter, slaFilter, amlStatusFilter, suspiciousFilter])

  useEffect(() => {
    fetchAssignees()
  }, [fetchAssignees])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  const assignedOptions = useMemo(() => {
    return [
      { label: "All", value: "ALL" },
      { label: "Unassigned", value: "UNASSIGNED" },
      ...assignees.map((assignee) => ({
        label: assignee.name || assignee.email || assignee.id,
        value: assignee.id,
      })),
    ]
  }, [assignees])

  const selectedItem = items.find((item) => item.id === selectedId) || null

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <PageHeader
        title="KYC Queue"
        description="Review KYC applications with assignment, SLA tracking, and AML checks."
        icon={<FileSearch className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={<RefreshButton onClick={fetchQueue} loading={loading} />}
      />

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <AlertTitle className="text-red-500 text-sm sm:text-base">Unable to load queue</AlertTitle>
          <AlertDescription className="text-red-400 text-xs sm:text-sm">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-400">{statusCounts.PENDING || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Approved</p>
            <p className="text-xl sm:text-2xl font-bold text-green-400">{statusCounts.APPROVED || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Rejected</p>
            <p className="text-xl sm:text-2xl font-bold text-red-400">{statusCounts.REJECTED || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <p className="text-xs sm:text-sm text-muted-foreground">AML Flagged</p>
            <p className="text-xl sm:text-2xl font-bold text-yellow-400">{meta?.flaggedCount || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Suspicious</p>
            <p className="text-xl sm:text-2xl font-bold text-orange-400">{meta?.suspiciousCount || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-sm neon-border">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <p className="text-xs sm:text-sm text-muted-foreground">Overdue SLA</p>
            <p className="text-xl sm:text-2xl font-bold text-orange-400">{meta?.overdueCount || 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-sm neon-border">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
            <Input
              placeholder="Search by name, email, phone, client ID..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
            <Input
              placeholder="AML flags (comma separated)"
              value={amlFlagFilter}
              onChange={(event) => {
                setAmlFlagFilter(event.target.value)
                setPage(1)
              }}
            />
            <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {KYC_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignedFilter} onValueChange={(value) => { setAssignedFilter(value); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Assigned" />
              </SelectTrigger>
              <SelectContent>
                {assignedOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={slaFilter} onValueChange={(value) => { setSlaFilter(value); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="SLA" />
              </SelectTrigger>
              <SelectContent>
                {SLA_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={amlStatusFilter} onValueChange={(value) => { setAmlStatusFilter(value); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="AML Status" />
              </SelectTrigger>
              <SelectContent>
                {AML_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={suspiciousFilter} onValueChange={(value) => { setSuspiciousFilter(value); setPage(1) }}>
              <SelectTrigger>
                <SelectValue placeholder="Suspicious" />
              </SelectTrigger>
              <SelectContent>
                {SUSPICIOUS_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border shadow-sm neon-border">
        <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
          <CardTitle className="text-lg sm:text-xl font-bold text-primary">KYC Applications ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0 sm:px-6 pb-3 sm:pb-6">
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[1100px] sm:min-w-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground">User</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">AML</TableHead>
                    <TableHead className="text-muted-foreground">Suspicious</TableHead>
                    <TableHead className="text-muted-foreground">Assigned</TableHead>
                    <TableHead className="text-muted-foreground">SLA</TableHead>
                    <TableHead className="text-muted-foreground">Submitted</TableHead>
                    <TableHead className="text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Loading applications...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && items.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No KYC applications found
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading &&
                    items.map((item) => {
                      const slaState = getSlaState(item.slaDueAt, item.status)
                      return (
                        <TableRow key={item.id} className="border-border">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{item.user.name || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{item.user.email || "—"}</p>
                              <p className="text-xs text-muted-foreground">{item.user.clientId || item.user.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={item.status} type="kyc" />
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <StatusBadge status={item.amlStatus} type="risk" />
                              {item.amlFlags?.length > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  {item.amlFlags.length} flag(s)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={item.suspiciousStatus} type="risk" />
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {item.assignedTo?.name || item.assignedTo?.email || "Unassigned"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className="mr-2">{formatDateTime(item.slaDueAt)}</span>
                              {slaState === "OVERDUE" && (
                                <Badge className="bg-red-400/20 text-red-400 border-red-400/30">Overdue</Badge>
                              )}
                              {slaState === "DUE_SOON" && (
                                <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30">Due soon</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">{formatDateTime(item.submittedAt)}</span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedId(item.id)
                                setDetailOpen(true)
                              }}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} loading={loading} />
        </CardContent>
      </Card>

      {selectedItem && (
        <KycDetailDialog
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open)
            if (!open) setSelectedId(null)
          }}
          kycId={selectedItem.id}
          assignees={assignees}
          onUpdated={() => {
            fetchQueue()
          }}
        />
      )}
    </div>
  )
}

type DetailDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  kycId: string
  assignees: KycAssignee[]
  onUpdated: () => void
}

function KycDetailDialog({ open, onOpenChange, kycId, assignees, onUpdated }: DetailDialogProps) {
  const [kyc, setKyc] = useState<KycApplication | null>(null)
  const [reviewLogs, setReviewLogs] = useState<KycReviewLog[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [assignedToId, setAssignedToId] = useState<string>("")
  const [slaDueAt, setSlaDueAt] = useState<string>("")
  const [amlStatus, setAmlStatus] = useState("PENDING")
  const [amlFlagsInput, setAmlFlagsInput] = useState("")
  const [amlFlags, setAmlFlags] = useState<string[]>([])
  const [suspiciousStatus, setSuspiciousStatus] = useState("NONE")
  const [note, setNote] = useState("")
  const [rejectReason, setRejectReason] = useState("")

  const loadDetail = useCallback(async () => {
    if (!kycId) return
    setLoading(true)
    setError(null)
    console.log("[KYC-QUEUE] Loading KYC detail", kycId)

    try {
      const response = await fetch(`/api/admin/kyc/${kycId}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || "Failed to load KYC detail")
      }

      const data = await response.json()
      const record = data.kyc as KycApplication & { reviewLogs?: KycReviewLog[] }
      setKyc(record)
      setReviewLogs(record.reviewLogs || [])
      setAssignedToId(record.assignedToId || "")
      setSlaDueAt(record.slaDueAt ? record.slaDueAt.slice(0, 16) : "")
      setAmlStatus(record.amlStatus)
      setAmlFlags(record.amlFlags || [])
      setSuspiciousStatus(record.suspiciousStatus)
    } catch (err: any) {
      console.error("[KYC-QUEUE] Failed to load detail", err)
      setError(err?.message || "Failed to load KYC detail")
    } finally {
      setLoading(false)
    }
  }, [kycId])

  useEffect(() => {
    if (open) {
      loadDetail()
    }
  }, [open, loadDetail])

  const updateMetadata = async (payload: Record<string, any>, action: string, actionNote?: string) => {
    setSaving(true)
    setError(null)
    console.log("[KYC-QUEUE] Updating KYC metadata", payload)

    try {
      const response = await fetch("/api/admin/kyc", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kycId,
          action,
          note: actionNote || note || undefined,
          ...payload,
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || "Failed to update KYC")
      }
      toast({ title: "KYC updated", description: "Changes saved successfully." })
      setNote("")
      await loadDetail()
      onUpdated()
    } catch (err: any) {
      console.error("[KYC-QUEUE] Update failed", err)
      setError(err?.message || "Failed to update KYC")
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (status: "APPROVED" | "REJECTED") => {
    setSaving(true)
    setError(null)
    console.log("[KYC-QUEUE] Updating status", status)

    try {
      const response = await fetch("/api/admin/kyc", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kycId,
          status,
          reason: status === "REJECTED" ? rejectReason : undefined,
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error || "Failed to update status")
      }
      toast({ title: `KYC ${status.toLowerCase()}`, description: "Status updated successfully." })
      setRejectReason("")
      await loadDetail()
      onUpdated()
    } catch (err: any) {
      console.error("[KYC-QUEUE] Status update failed", err)
      setError(err?.message || "Failed to update status")
    } finally {
      setSaving(false)
    }
  }

  const addFlag = () => {
    const updated = normalizeAmlFlags([...amlFlags, amlFlagsInput])
    setAmlFlags(updated)
    setAmlFlagsInput("")
  }

  if (!kyc) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>KYC Review</DialogTitle>
            <DialogDescription>Loading KYC record...</DialogDescription>
          </DialogHeader>
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>KYC Review</DialogTitle>
          <DialogDescription>Review documents, AML flags, and SLA assignment.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Action failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="bg-muted/30 border-border">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{kyc.user.name || "Unknown user"}</p>
                  <p className="text-xs text-muted-foreground">{kyc.user.email || "—"}</p>
                  <p className="text-xs text-muted-foreground">{kyc.user.clientId || kyc.user.id}</p>
                </div>
                <StatusBadge status={kyc.status} type="kyc" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Aadhaar</p>
                  <p className="font-medium">{maskAadhaar(kyc.aadhaarNumber)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">PAN</p>
                  <p className="font-medium">{kyc.panNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium">{formatDateTime(kyc.submittedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Approved At</p>
                  <p className="font-medium">{formatDateTime(kyc.approvedAt)}</p>
                </div>
              </div>
              <div>
                <Label>Bank Proof</Label>
                {kyc.bankProofUrl ? (
                  <a
                    href={kyc.bankProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline text-sm"
                  >
                    View Document
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground">No bank proof uploaded.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Assignment & SLA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Assigned To</Label>
                  <Select value={assignedToId} onValueChange={setAssignedToId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {assignees.map((assignee) => (
                        <SelectItem key={assignee.id} value={assignee.id}>
                          {assignee.name || assignee.email || assignee.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>SLA Due</Label>
                  <Input type="datetime-local" value={slaDueAt} onChange={(e) => setSlaDueAt(e.target.value)} />
                </div>
                <Button
                  onClick={() =>
                    updateMetadata(
                      { assignedToId: assignedToId || null, slaDueAt: slaDueAt || null },
                      assignedToId ? "ASSIGNED" : "UNASSIGNED"
                    )
                  }
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Saving..." : "Save Assignment"}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">AML Flags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>AML Status</Label>
                  <Select value={amlStatus} onValueChange={setAmlStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AML_STATUS_OPTIONS.filter((option) => option !== "ALL").map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Add Flag</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. PEP_MATCH"
                      value={amlFlagsInput}
                      onChange={(e) => setAmlFlagsInput(e.target.value)}
                    />
                    <Button variant="outline" onClick={addFlag} disabled={!amlFlagsInput.trim()}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {amlFlags.map((flag) => (
                      <Badge key={flag} className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30">
                        {flag}
                        <button
                          type="button"
                          onClick={() => setAmlFlags(amlFlags.filter((item) => item !== flag))}
                          className="ml-2 text-xs"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() =>
                    updateMetadata(
                      { amlStatus, amlFlags },
                      "AML_UPDATED"
                    )
                  }
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Saving..." : "Save AML"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="bg-card border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Suspicious Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={suspiciousStatus} onValueChange={setSuspiciousStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUSPICIOUS_STATUS_OPTIONS.filter((option) => option !== "ALL").map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => updateMetadata({ suspiciousStatus }, "SUSPICIOUS_UPDATED")}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? "Saving..." : "Save Suspicious Status"}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Review Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add reviewer note..."
                  rows={3}
                />
                <Button onClick={() => updateMetadata({}, "NOTE_ADDED", note)} disabled={saving || !note.trim()} className="w-full">
                  {saving ? "Saving..." : "Add Note"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Approve / Reject</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason required for rejection"
                rows={3}
              />
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                  onClick={() => updateStatus("APPROVED")}
                  disabled={saving}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => updateStatus("REJECTED")}
                  disabled={saving || !rejectReason.trim()}
                >
                  <ShieldOff className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Review Logs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reviewLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No review actions logged yet.</p>
              ) : (
                reviewLogs.map((log) => (
                  <div key={log.id} className="border border-border rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.reviewer?.name || log.reviewer?.email || "System"} • {formatDateTime(log.createdAt)}
                        </p>
                      </div>
                      <Badge className="bg-muted text-muted-foreground">{log.reviewer?.role || "ADMIN"}</Badge>
                    </div>
                    {log.note && <p className="text-xs text-muted-foreground mt-2">{log.note}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
