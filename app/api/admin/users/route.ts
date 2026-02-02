/**
 * @file route.ts
 * @module admin-console
 * @description API route for user list with advanced filtering
 * @author BharatERP
 * @created 2025-01-27
 * @updated 2026-02-02
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { createTradingLogger } from "@/lib/services/logging/TradingLogger"
import { handleAdminApi } from "@/lib/rbac/admin-api"
import { AppError } from "@/src/common/errors"
import { Role, KycStatus } from "@prisma/client"

export async function GET(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/users",
      required: "admin.users.read",
      fallbackMessage: "Failed to fetch users",
    },
    async (ctx) => {
      const { searchParams } = new URL(req.url)
      const page = parseInt(searchParams.get("page") || "1")
      const limit = parseInt(searchParams.get("limit") || "50")
      const search = searchParams.get("search") || undefined
      const status = searchParams.get("status") as "active" | "inactive" | "all" | null
      const kycStatus = searchParams.get("kycStatus") as KycStatus | "all" | null
      const userRole = searchParams.get("role") as Role | "all" | null
      const dateFrom = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined
      const dateTo = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined
      const rmId = searchParams.get("rmId") || undefined // Filter by Relationship Manager

      ctx.logger.debug(
        { page, limit, search, status, kycStatus, userRole, dateFrom, dateTo, rmId },
        "GET /api/admin/users - params"
      )

      // If MODERATOR role, only show their assigned users
      if (ctx.role === "MODERATOR") {
        const rmIdForFilter = ctx.session.user.id
        ctx.logger.debug({ rmId: rmIdForFilter }, "GET /api/admin/users - MODERATOR scope")

        const tradingLogger = createTradingLogger({
          clientId: "ADMIN",
          userId: ctx.session.user.id,
        })

        const adminService = createAdminUserService(tradingLogger)
        const result = await adminService.getUsersByRM(rmIdForFilter, page, limit, search)
        return NextResponse.json(result, { status: 200 })
      }

      const tradingLogger = createTradingLogger({
        clientId: "ADMIN",
        userId: ctx.session.user.id,
      })

      const adminService = createAdminUserService(tradingLogger)

      // Use advanced filters if any filter is provided, otherwise use simple getAllUsers
      let result
      if (rmId) {
        // Filter by RM
        result = await adminService.getUsersByRM(rmId, page, limit, search)
      } else if (status || kycStatus || userRole || dateFrom || dateTo) {
        result = await adminService.getUsersWithFilters({
          page,
          limit,
          search,
          status: status || "all",
          kycStatus: kycStatus || "all",
          role: userRole || "all",
          dateFrom,
          dateTo,
        })
      } else {
        result = await adminService.getAllUsers(page, limit, search)
      }

      ctx.logger.info(
        { count: result.users?.length, total: result.total, pages: result.pages },
        "GET /api/admin/users - success"
      )
      return NextResponse.json(result, { status: 200 })
    }
  )
}

export async function POST(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/users",
      required: "admin.users.manage",
      fallbackMessage: "Failed to create user",
    },
    async (ctx) => {
      const body = await req.json()

      ctx.logger.debug(
        {
          name: body.name,
          email: body.email,
          phone: body.phone ? "***" : undefined,
          hasInitialBalance: !!body.initialBalance,
        },
        "POST /api/admin/users - create request"
      )

      const { name, email, phone, password, initialBalance } = body

      // Validate required fields
      if (!name || !email || !phone || !password) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Missing required fields: name, email, phone, and password are required",
          statusCode: 400,
        })
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Invalid email format",
          statusCode: 400,
        })
      }

      // Validate phone format (basic check)
      if (phone.length < 10) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Invalid phone number",
          statusCode: 400,
        })
      }

      // Validate password strength
      if (password.length < 8) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Password must be at least 8 characters long",
          statusCode: 400,
        })
      }

      const tradingLogger = createTradingLogger({
        clientId: "ADMIN",
        userId: ctx.session.user.id,
      })

      const adminService = createAdminUserService(tradingLogger)
      const result = await adminService.createUser({
        name,
        email,
        phone,
        password,
        initialBalance: initialBalance ? parseFloat(initialBalance) : undefined,
      })

      ctx.logger.info({ userId: result.id, clientId: result.clientId }, "POST /api/admin/users - success")

      return NextResponse.json(
        {
          success: true,
          user: {
            id: result.id,
            name: result.name,
            email: result.email,
            phone: result.phone,
            clientId: result.clientId,
            password: result.password, // Return password for display
            initialBalance: result.tradingAccount.balance,
          },
        },
        { status: 201 }
      )
    }
  )
}

export async function PATCH(req: Request) {
  return handleAdminApi(
    req,
    {
      route: "/api/admin/users",
      required: "admin.users.manage",
      fallbackMessage: "Failed to update user",
    },
    async (ctx) => {
      const body = await req.json()
      ctx.logger.debug(body, "PATCH /api/admin/users - request")

      const { userId, isActive } = body

      if (!userId || isActive === undefined) {
        throw new AppError({
          code: "VALIDATION_ERROR",
          message: "Missing required fields",
          statusCode: 400,
        })
      }

      const tradingLogger = createTradingLogger({
        clientId: "ADMIN",
        userId: ctx.session.user.id,
      })

      const adminService = createAdminUserService(tradingLogger)
      const user = await adminService.updateUserStatus(userId, isActive)

      ctx.logger.info({ userId: user.id, isActive: user.isActive }, "PATCH /api/admin/users - success")
      return NextResponse.json({ success: true, user }, { status: 200 })
    }
  )
}