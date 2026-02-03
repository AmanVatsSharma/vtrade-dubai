/**
 * @file route.ts
 * @module admin-console
 * @description Admin KYC queue API for review, assignment, SLA, and AML metadata
 * @author BharatERP
 * @created 2026-01-15
 * @updated 2026-02-02
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleAdminApi } from "@/lib/rbac/admin-api"
import { normalizeAmlFlags } from "@/lib/admin/kyc-utils"
import { AppError } from "@/src/common/errors"
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
  return handleAdminApi(
    request,
    {
      route: "/api/admin/kyc",
      required: "admin.users.kyc",
      fallbackMessage: "Failed to fetch KYC applications",
    },
    async (ctx) => {
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

      ctx.logger.debug(
        { status, page, limit, search, assignedTo, amlStatus, suspiciousStatus, slaFilter, flag },
        "GET /api/admin/kyc - params"
      )

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

      ctx.logger.info({ count: kycApplications.length, total: totalCount, page, limit }, "GET /api/admin/kyc - success")

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
    }
  )
}

export async function PATCH(request: NextRequest) {
  return handleAdminApi(
    request,
    {
      route: "/api/admin/kyc",
      required: "admin.users.kyc",
      fallbackMessage: "Failed to update KYC application",
    },
    async (ctx) => {
      const body = await request.json()
      const { kycId, assignedToId, slaDueAt, amlStatus, amlFlags, suspiciousStatus, note, action } = body

      ctx.logger.debug({ kycId, assignedToId, amlStatus, suspiciousStatus }, "PATCH /api/admin/kyc - request")

      if (!kycId) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "KYC ID is required",
          statusCode: 400,
        })
      }

      const existing = await prisma.kYC.findUnique({
        where: { id: kycId },
      })

      if (!existing) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "KYC record not found",
          statusCode: 404,
        })
      }

      const updateData: any = {}

      if (assignedToId !== undefined) {
        if (assignedToId) {
          const assignee = await prisma.user.findUnique({
            where: { id: assignedToId },
            select: { id: true, role: true },
          })
          if (!assignee) {
            throw new AppError({
              code: "NOT_FOUND",
              message: "Assigned reviewer not found",
              statusCode: 404,
            })
          }
          if (!["ADMIN", "MODERATOR", "SUPER_ADMIN"].includes(assignee.role)) {
            throw new AppError({
              code: "VALIDATION_ERROR",
              message: "Reviewer must be an admin or moderator",
              statusCode: 400,
            })
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
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "Invalid AML status",
            statusCode: 400,
          })
        }
        updateData.amlStatus = amlStatus as KycAmlStatus
      }

    if (amlFlags) {
      const normalizedFlags = Array.isArray(amlFlags) ? amlFlags : [amlFlags]
      updateData.amlFlags = normalizeAmlFlags(normalizedFlags as string[])
    }

      if (suspiciousStatus) {
        if (!Object.values(KycSuspiciousStatus).includes(suspiciousStatus)) {
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "Invalid suspicious status",
            statusCode: 400,
          })
        }
        updateData.suspiciousStatus = suspiciousStatus as KycSuspiciousStatus
      }

      if (Object.keys(updateData).length === 0) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "No update fields provided",
          statusCode: 400,
        })
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
          reviewerId: ctx.session.user.id,
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

      ctx.logger.info({ kycId, reviewAction }, "PATCH /api/admin/kyc - success")

      return NextResponse.json({
        success: true,
        kyc: updatedKyc,
      })
    }
  )
}

export async function PUT(request: NextRequest) {
  return handleAdminApi(
    request,
    {
      route: "/api/admin/kyc",
      required: "admin.users.kyc",
      fallbackMessage: "Failed to update KYC status",
    },
    async (ctx) => {
      const body = await request.json()
      const { kycId, status, reason } = body

      ctx.logger.debug({ kycId, status }, "PUT /api/admin/kyc - request")

      if (!kycId || !status) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "KYC ID and status are required",
          statusCode: 400,
        })
      }

      if (![KycStatus.APPROVED, KycStatus.REJECTED].includes(status)) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Invalid status. Must be APPROVED or REJECTED",
          statusCode: 400,
        })
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
          reviewerId: ctx.session.user.id,
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
          userId: ctx.session.user.id,
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
        await NotificationService.notifyKYC(
          updatedKYC.userId,
          status as "APPROVED" | "REJECTED",
          reason || undefined
        )
      } catch (notifError) {
        ctx.logger.warn({ err: notifError }, "PUT /api/admin/kyc - notification failed")
      }

      ctx.logger.info({ kycId, status }, "PUT /api/admin/kyc - success")

      return NextResponse.json({
        success: `KYC ${status.toLowerCase()} successfully`,
        kyc: updatedKYC,
      })
    }
  )
}
