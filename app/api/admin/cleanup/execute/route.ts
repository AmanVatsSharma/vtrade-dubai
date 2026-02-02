/**
 * @file route.ts
 * @module admin-console
 * @description API route for cleanup execution
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleAdminApi } from "@/lib/rbac/admin-api"
import { AppError } from "@/src/common/errors"

export async function POST(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/cleanup/execute",
      required: "admin.cleanup.execute",
      fallbackMessage: "Failed to execute cleanup",
    },
    async ({ logger }) => {
      const body = (await req.json().catch(() => ({}))) as any
      const beforeParam = body.before as string | undefined
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const before = beforeParam ? new Date(beforeParam) : today

      // Safety: never allow after today
      const cutoff = new Date(before)
      cutoff.setHours(0, 0, 0, 0)
      const maxAllowed = new Date()
      maxAllowed.setHours(0, 0, 0, 0)
      if (cutoff >= maxAllowed) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Cannot cleanup today or future data",
          statusCode: 400,
        })
      }

      logger.debug({ cutoff: cutoff.toISOString() }, "POST /api/admin/cleanup/execute - start")

      const result = await prisma.$transaction(async (tx) => {
        const deletedOrders = await tx.order.deleteMany({ where: { createdAt: { lt: cutoff } } })
        const deletedPositions = await tx.position.deleteMany({
          where: { quantity: 0, createdAt: { lt: cutoff } },
        })
        return { deletedOrders: deletedOrders.count, deletedPositions: deletedPositions.count }
      })

      logger.info({ result }, "POST /api/admin/cleanup/execute - success")
      return NextResponse.json(result, { status: 200 })
    }
  )
}
