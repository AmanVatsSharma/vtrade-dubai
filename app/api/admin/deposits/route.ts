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
      route: "/api/admin/deposits",
      required: "admin.deposits.manage",
      fallbackMessage: "Failed to fetch deposits",
    },
    async ({ session, role, logger }) => {
      logger.debug({ role }, "GET /api/admin/deposits - start")

      const adminFundService = createAdminFundService()
      // Scope by RM for admins and moderators; super admin sees all
      const managedByIdFilter =
        role === "SUPER_ADMIN"
          ? undefined
          : role === "ADMIN"
            ? session.user.id!
            : (session.user as any).managedById || undefined
      const deposits = await adminFundService.getPendingDeposits(managedByIdFilter)

      logger.info({ count: deposits.length }, "GET /api/admin/deposits - success")
      return NextResponse.json({ success: true, deposits }, { status: 200 })
    }
  )
}

export async function POST(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/deposits",
      required: "admin.deposits.manage",
      fallbackMessage: "Failed to process deposit",
    },
    async ({ session, role, logger }) => {
      const body = await req.json()
      const { depositId, action, reason } = body

      logger.debug({ depositId, action }, "POST /api/admin/deposits - request")

      if (!depositId || !action) {
        throw new AppError({ code: "VALIDATION_ERROR", message: "Missing required fields", statusCode: 400 })
      }

      const adminFundService = createAdminFundService()

      if (action === "approve") {
        const result = await adminFundService.approveDeposit({
          depositId,
          adminId: session.user.id!,
          adminName: session.user.name || "Admin",
          actorRole: role as any,
        })

        // Create notification for user (non-blocking)
        try {
          const deposit = await prisma.deposit.findUnique({
            where: { id: depositId },
            select: { userId: true, amount: true },
          })
          if (deposit) {
            await NotificationService.notifyDeposit(deposit.userId, "APPROVED", Number(deposit.amount))
          }
        } catch (notifError) {
          logger.warn({ err: notifError }, "POST /api/admin/deposits - notification failed")
        }

        logger.info({ depositId }, "POST /api/admin/deposits - approved")
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

        const result = await adminFundService.rejectDeposit({
          depositId,
          reason,
          adminId: session.user.id!,
          adminName: session.user.name || "Admin",
        })

        // Create notification for user (non-blocking)
        try {
          const deposit = await prisma.deposit.findUnique({
            where: { id: depositId },
            select: { userId: true, amount: true },
          })
          if (deposit) {
            await NotificationService.notifyDeposit(deposit.userId, "REJECTED", Number(deposit.amount), reason)
          }
        } catch (notifError) {
          logger.warn({ err: notifError }, "POST /api/admin/deposits - notification failed")
        }

        logger.info({ depositId }, "POST /api/admin/deposits - rejected")
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