/**
 * @file route.ts
 * @module admin-console
 * @description API route for withdrawal management (pending list + approve/reject)
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from "next/server"
import { createAdminFundService } from "@/lib/services/admin/AdminFundService"
import { NotificationService } from "@/lib/services/notifications/NotificationService"
import { prisma } from "@/lib/prisma"
import { handleAdminApi } from "@/lib/rbac/admin-api"
import { AppError } from "@/src/common/errors"

export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/withdrawals",
      required: "admin.withdrawals.manage",
      fallbackMessage: "Failed to fetch withdrawals",
    },
    async ({ session, role, logger }) => {
      logger.debug({ role }, "GET /api/admin/withdrawals - start")

      const adminFundService = createAdminFundService()
      // Scope by RM for admins and moderators; super admin sees all
      const managedByIdFilter =
        role === "SUPER_ADMIN"
          ? undefined
          : role === "ADMIN"
            ? session.user.id!
            : (session.user as any).managedById || undefined
      const withdrawals = await adminFundService.getPendingWithdrawals(managedByIdFilter)

      logger.info({ count: withdrawals.length }, "GET /api/admin/withdrawals - success")
      return NextResponse.json({ success: true, withdrawals }, { status: 200 })
    }
  )
}

export async function POST(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/withdrawals",
      required: "admin.withdrawals.manage",
      fallbackMessage: "Failed to process withdrawal",
    },
    async ({ session, role, logger }) => {
      const body = await req.json()
      const { withdrawalId, action, reason, transactionId } = body

      logger.debug({ withdrawalId, action }, "POST /api/admin/withdrawals - request")

      if (!withdrawalId || !action) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Missing required fields",
          statusCode: 400,
        })
      }

      const adminFundService = createAdminFundService()

      if (action === "approve") {
        if (!transactionId) {
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "Transaction ID required for approval",
            statusCode: 400,
          })
        }

        const result = await adminFundService.approveWithdrawal({
          withdrawalId,
          transactionId,
          adminId: session.user.id!,
          adminName: session.user.name || "Admin",
          actorRole: role as any,
        })

        // Create notification for user (non-blocking)
        try {
          const withdrawal = await prisma.withdrawal.findUnique({
            where: { id: withdrawalId },
            select: { userId: true, amount: true },
          })
          if (withdrawal) {
            await NotificationService.notifyWithdrawal(
              withdrawal.userId,
              "APPROVED",
              Number(withdrawal.amount)
            )
          }
        } catch (notifError) {
          logger.warn({ err: notifError }, "POST /api/admin/withdrawals - notification failed")
        }

        logger.info({ withdrawalId }, "POST /api/admin/withdrawals - approved")
        return NextResponse.json(result, { status: 200 })
      }

      if (action === "reject") {
        if (!reason) {
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "Rejection reason required",
            statusCode: 400,
          })
        }

        const result = await adminFundService.rejectWithdrawal({
          withdrawalId,
          reason,
          adminId: session.user.id!,
          adminName: session.user.name || "Admin",
        })

        // Create notification for user (non-blocking)
        try {
          const withdrawal = await prisma.withdrawal.findUnique({
            where: { id: withdrawalId },
            select: { userId: true, amount: true },
          })
          if (withdrawal) {
            await NotificationService.notifyWithdrawal(
              withdrawal.userId,
              "REJECTED",
              Number(withdrawal.amount),
              reason
            )
          }
        } catch (notifError) {
          logger.warn({ err: notifError }, "POST /api/admin/withdrawals - notification failed")
        }

        logger.info({ withdrawalId }, "POST /api/admin/withdrawals - rejected")
        return NextResponse.json(result, { status: 200 })
      }

      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Invalid action. Use 'approve' or 'reject'",
        statusCode: 400,
      })
    }
  )
}