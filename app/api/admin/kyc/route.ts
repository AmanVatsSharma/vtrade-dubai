/**
 * @file route.ts
 * @module admin-console
 * @description Admin KYC queue API for review, assignment, SLA, and AML metadata
 * @author BharatERP
 * @created 2026-01-15
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"
import { normalizeAmlFlags } from "@/lib/admin/kyc-utils"
import { KycAmlStatus, KycReviewAction, KycSuspiciousStatus, KycStatus } from "@prisma/client"

export const dynamic = "force-dynamic"

const parseNumber = (value: string | null, fallback: number) => {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

const parseDateValue = (value: string | null) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const parseFlagFilter = (value: string | null) => {
  if (!value) return []
  const parts = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
  return normalizeAmlFlags(parts)
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminPermissions(request, "admin.users.kyc")
    if (!authResult.ok) return authResult.response

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const page = parseNumber(searchParams.get("page"), 1)
    const limit = parseNumber(searchParams.get("limit"), 20)
    const search = searchParams.get("search")
    const assignedTo = searchParams.get("assignedTo")
    const amlStatus = searchParams.get("amlStatus")
    const suspiciousStatus = searchParams.get("suspiciousStatus")
    const slaFilter = searchParams.get("sla")
    const flag = searchParams.get("flag")

    const where: any = {}
    if (status && status !== "ALL") {
      where.status = status
    }
    if (assignedTo) {
      if (assignedTo === "UNASSIGNED") {
        where.assignedToId = null
      } else {
        where.assignedToId = assignedTo
      }
    }
    if (amlStatus && amlStatus !== "ALL") {
      where.amlStatus = amlStatus
    }
    if (suspiciousStatus && suspiciousStatus !== "ALL") {
      where.suspiciousStatus = suspiciousStatus
    }
    const flagFilter = parseFlagFilter(flag)
    if (flagFilter.length === 1) {
      where.amlFlags = { has: flagFilter[0] }
    } else if (flagFilter.length > 1) {
      where.amlFlags = { hasSome: flagFilter }
    }
    if (slaFilter && slaFilter !== "ALL") {
      const now = new Date()
      const enforcePending = () => {
        if (!status || status === "ALL") {
          where.status = KycStatus.PENDING
        }
      }
      const dueWithinHours = (hours: number) => {
        const dueSoon = new Date(now.getTime() + hours * 60 * 60 * 1000)
        where.slaDueAt = { gte: now, lte: dueSoon }
        enforcePending()
      }
      if (slaFilter === "OVERDUE") {
        where.slaDueAt = { lt: now }
        enforcePending()
      }
      if (slaFilter === "DUE_SOON") {
        dueWithinHours(24)
      }
      if (slaFilter === "DUE_48H") {
        dueWithinHours(48)
      }
      if (slaFilter === "DUE_72H") {
        dueWithinHours(72)
      }
    }
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
          { clientId: { contains: search, mode: "insensitive" } },
        ],
      }
    }

    const [kycApplications, totalCount, statusCounts, overdueCount, flaggedCount, suspiciousCount, assignedCount] =
      await Promise.all([
        prisma.kYC.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                clientId: true,
                createdAt: true,
                role: true,
              },
            },
            assignedTo: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            _count: {
              select: { reviewLogs: true },
            },
          },
          orderBy: { submittedAt: "desc" },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.kYC.count({ where }),
        prisma.kYC.groupBy({
          by: ["status"],
          _count: { status: true },
          where,
        }),
        prisma.kYC.count({
          where: { ...where, slaDueAt: { lt: new Date() }, status: KycStatus.PENDING },
        }),
        prisma.kYC.count({
          where: { ...where, NOT: { amlFlags: { equals: [] } } },
        }),
        prisma.kYC.count({
          where: { ...where, suspiciousStatus: { not: KycSuspiciousStatus.NONE } },
        }),
        prisma.kYC.count({
          where: { ...where, assignedToId: { not: null } },
        }),
      ])

    return NextResponse.json({
      kycApplications,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      statusCounts: statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status
        return acc
      }, {} as Record<string, number>),
      meta: {
        overdueCount,
        flaggedCount,
        suspiciousCount,
        assignedCount,
      },
    })
  } catch (error) {
    console.error("Admin KYC fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAdminPermissions(request, "admin.users.kyc")
    if (!authResult.ok) return authResult.response
    const session = authResult.session

    const body = await request.json()
    const {
      kycId,
      assignedToId,
      slaDueAt,
      amlStatus,
      amlFlags,
      suspiciousStatus,
      note,
      action,
    } = body

    if (!kycId) {
      return NextResponse.json({ error: "KYC ID is required" }, { status: 400 })
    }

    const existing = await prisma.kYC.findUnique({
      where: { id: kycId },
    })

    if (!existing) {
      return NextResponse.json({ error: "KYC record not found" }, { status: 404 })
    }

    const updateData: any = {}

    if (assignedToId !== undefined) {
      if (assignedToId) {
        const assignee = await prisma.user.findUnique({
          where: { id: assignedToId },
          select: { id: true, role: true },
        })
        if (!assignee) {
          return NextResponse.json({ error: "Assigned reviewer not found" }, { status: 404 })
        }
        if (!["ADMIN", "MODERATOR", "SUPER_ADMIN"].includes(assignee.role)) {
          return NextResponse.json({ error: "Reviewer must be an admin or moderator" }, { status: 400 })
        }
      }
      updateData.assignedToId = assignedToId || null
      updateData.assignedAt = assignedToId ? new Date() : null
    }

    const parsedSla = parseDateValue(slaDueAt)
    if (slaDueAt !== undefined) {
      updateData.slaDueAt = parsedSla
      updateData.slaBreachedAt =
        parsedSla && existing.status === KycStatus.PENDING && parsedSla.getTime() < Date.now()
          ? new Date()
          : null
    }

    if (amlStatus) {
      if (!Object.values(KycAmlStatus).includes(amlStatus)) {
        return NextResponse.json({ error: "Invalid AML status" }, { status: 400 })
      }
      updateData.amlStatus = amlStatus as KycAmlStatus
    }

    if (amlFlags) {
      const normalizedFlags = Array.isArray(amlFlags) ? amlFlags : [amlFlags]
      updateData.amlFlags = normalizeAmlFlags(normalizedFlags as string[])
    }

    if (suspiciousStatus) {
      if (!Object.values(KycSuspiciousStatus).includes(suspiciousStatus)) {
        return NextResponse.json({ error: "Invalid suspicious status" }, { status: 400 })
      }
      updateData.suspiciousStatus = suspiciousStatus as KycSuspiciousStatus
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No update fields provided" }, { status: 400 })
    }

    const updatedKyc = await prisma.kYC.update({
      where: { id: kycId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            clientId: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    const reviewAction = (() => {
      if (action && Object.values(KycReviewAction).includes(action)) {
        return action as KycReviewAction
      }
      if (assignedToId !== undefined) {
        return assignedToId ? KycReviewAction.ASSIGNED : KycReviewAction.UNASSIGNED
      }
      if (amlStatus || amlFlags) return KycReviewAction.AML_UPDATED
      if (suspiciousStatus) return KycReviewAction.SUSPICIOUS_UPDATED
      return KycReviewAction.NOTE_ADDED
    })()

    await prisma.kycReviewLog.create({
      data: {
        kycId,
        reviewerId: session.user.id,
        action: reviewAction,
        note: note || null,
        metadata: {
          assignedToId: assignedToId ?? undefined,
          slaDueAt: parsedSla?.toISOString(),
          amlStatus,
          amlFlags: updateData.amlFlags,
          suspiciousStatus,
        },
      },
    })

    return NextResponse.json({
      success: true,
      kyc: updatedKyc,
    })
  } catch (error) {
    console.error("Admin KYC update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAdminPermissions(request, "admin.users.kyc")
    if (!authResult.ok) return authResult.response
    const session = authResult.session

    const body = await request.json()
    const { kycId, status, reason } = body

    if (!kycId || !status) {
      return NextResponse.json({ error: "KYC ID and status are required" }, { status: 400 })
    }

    if (![KycStatus.APPROVED, KycStatus.REJECTED].includes(status)) {
      return NextResponse.json({ error: "Invalid status. Must be APPROVED or REJECTED" }, { status: 400 })
    }

    const updatedKYC = await prisma.kYC.update({
      where: { id: kycId },
      data: {
        status,
        approvedAt: status === KycStatus.APPROVED ? new Date() : null,
        slaBreachedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            clientId: true,
          },
        },
      },
    })

    await prisma.kycReviewLog.create({
      data: {
        kycId,
        reviewerId: session.user.id,
        action: KycReviewAction.STATUS_UPDATED,
        note: reason || null,
        metadata: {
          status,
        },
      },
    })

    await prisma.tradingLog.create({
      data: {
        clientId: updatedKYC.user.clientId || "UNKNOWN",
        userId: session.user.id,
        action: `KYC_${status.toLowerCase()}`,
        message: `KYC ${status.toLowerCase()} for ${updatedKYC.user.name} (${updatedKYC.user.email})`,
        details: {
          kycId,
          reason: reason || "",
          approvedAt: status === KycStatus.APPROVED ? new Date() : null,
        },
        category: "SYSTEM",
        level: "INFO",
      },
    })

    try {
      const { NotificationService } = await import("@/lib/services/notifications/NotificationService")
      await NotificationService.notifyKYC(updatedKYC.userId, status as "APPROVED" | "REJECTED", reason || undefined)
    } catch (notifError) {
      console.warn("⚠️ [API-ADMIN-KYC] Failed to create notification:", notifError)
    }

    return NextResponse.json({
      success: `KYC ${status.toLowerCase()} successfully`,
      kyc: updatedKYC,
    })
  } catch (error) {
    console.error("Admin KYC update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
