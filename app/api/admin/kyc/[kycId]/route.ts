/**
 * @file route.ts
 * @module admin-console
 * @description Admin KYC detail and review log API
 * @author BharatERP
 * @created 2026-01-15
 * @updated 2026-02-02
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { handleAdminApi } from "@/lib/rbac/admin-api"
import { AppError } from "@/src/common/errors"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { kycId: string } }) {
  return handleAdminApi(
    request,
    {
      route: "/api/admin/kyc/[kycId]",
      required: "admin.users.kyc",
      fallbackMessage: "Failed to fetch KYC details",
    },
    async (ctx) => {
      ctx.logger.debug({ kycId: params.kycId }, "GET /api/admin/kyc/[kycId] - request")

      const kyc = await prisma.kYC.findUnique({
        where: { id: params.kycId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              clientId: true,
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
          reviewLogs: {
            include: {
              reviewer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      })

      if (!kyc) {
        throw new AppError({
          code: "NOT_FOUND",
          message: "KYC record not found",
          statusCode: 404,
        })
      }

      ctx.logger.info(
        { kycId: params.kycId, reviewLogsCount: kyc.reviewLogs.length },
        "GET /api/admin/kyc/[kycId] - success"
      )

      return NextResponse.json({ kyc })
    }
  )
}
