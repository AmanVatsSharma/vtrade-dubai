/**
 * @file route.ts
 * @module admin-console
 * @description API route for individual user management operations (GET, PUT)
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from "next/server"
import { handleAdminApi } from "@/lib/rbac/admin-api"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { AppError } from "@/src/common/errors"

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  return handleAdminApi(
    req,
    {
      route: `/api/admin/users/${params.userId}`,
      required: "admin.users.read",
      fallbackMessage: "Failed to fetch user details",
    },
    async (ctx) => {
      const userId = params.userId
      ctx.logger.debug({ userId }, "GET /api/admin/users/[userId] - request")

      const adminService = createAdminUserService()
      const user = await adminService.getUserDetails(userId)

      if (!user) {
        throw new AppError({
          code: "USER_NOT_FOUND",
          message: "User not found",
          statusCode: 404,
        })
      }

      ctx.logger.info({ userId }, "GET /api/admin/users/[userId] - success")
      return NextResponse.json({ success: true, user }, { status: 200 })
    }
  )
}

export async function PUT(
  req: Request,
  { params }: { params: { userId: string } }
) {
  return handleAdminApi(
    req,
    {
      route: `/api/admin/users/${params.userId}`,
      required: "admin.users.manage",
      fallbackMessage: "Failed to update user",
    },
    async (ctx) => {
      const userId = params.userId
      const body = await req.json()

      ctx.logger.debug({ userId }, "PUT /api/admin/users/[userId] - request")

      const adminService = createAdminUserService()
      const targetUser = await adminService.getUserDetails(userId)
      if (!targetUser) {
        throw new AppError({
          code: "USER_NOT_FOUND",
          message: "User not found",
          statusCode: 404,
        })
      }

      // 🔐 SECURITY: Prevent privilege escalation
      if (targetUser.role === "ADMIN" || targetUser.role === "SUPER_ADMIN") {
        if (ctx.role !== "SUPER_ADMIN") {
          ctx.logger.warn(
            { userId, targetRole: targetUser.role, actorRole: ctx.role },
            "Security restriction hit"
          )
          throw new AppError({
            code: "SECURITY_RESTRICTION",
            message: "Security restriction: Only Super Admins can modify Admin or Super Admin users",
            statusCode: 403,
          })
        }
      }

      if (body.role && (body.role === "ADMIN" || body.role === "SUPER_ADMIN")) {
        if (ctx.role !== "SUPER_ADMIN") {
          ctx.logger.warn({ userId, attemptedRole: body.role, actorRole: ctx.role }, "Security restriction hit")
          throw new AppError({
            code: "SECURITY_RESTRICTION",
            message: "Security restriction: Only Super Admins can assign Admin or Super Admin roles",
            statusCode: 403,
          })
        }
      }

      const user = await adminService.updateUser(userId, body)
      ctx.logger.info({ userId }, "PUT /api/admin/users/[userId] - success")
      return NextResponse.json({ success: true, user }, { status: 200 })
    }
  )
}