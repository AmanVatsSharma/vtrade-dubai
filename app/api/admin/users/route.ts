/**
 * @file route.ts
 * @module admin-console
 * @description API route for user list with advanced filtering
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { createTradingLogger } from "@/lib/services/logging/TradingLogger"
import { auth } from "@/auth"
import { Role, KycStatus } from "@prisma/client"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-USERS] GET request received")
  
  try {
    // Get session and verify role
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR' && role !== 'SUPER_ADMIN')) {
      console.error("❌ [API-ADMIN-USERS] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || undefined
    const status = searchParams.get('status') as 'active' | 'inactive' | 'all' | null
    const kycStatus = searchParams.get('kycStatus') as KycStatus | 'all' | null
    const userRole = searchParams.get('role') as Role | 'all' | null
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined
    const rmId = searchParams.get('rmId') || undefined // Filter by Relationship Manager

    console.log("📝 [API-ADMIN-USERS] Request params:", { page, limit, search, status, kycStatus, userRole, dateFrom, dateTo, rmId })

    // If MODERATOR role, only show their assigned users
    if (role === 'MODERATOR') {
      const rmIdForFilter = session.user.id
      console.log("🔒 [API-ADMIN-USERS] MODERATOR access - filtering by RM:", rmIdForFilter)
      
      const logger = createTradingLogger({
        clientId: 'ADMIN',
        userId: session.user.id
      })

      const adminService = createAdminUserService(logger)
      
      // Get users managed by this RM
      const result = await adminService.getUsersByRM(rmIdForFilter, page, limit, search)
      
      return NextResponse.json(result, { status: 200 })
    }

    const logger = createTradingLogger({
      clientId: 'ADMIN',
      userId: session.user.id
    })

    const adminService = createAdminUserService(logger)
    
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
        status: status || 'all',
        kycStatus: kycStatus || 'all',
        role: userRole || 'all',
        dateFrom,
        dateTo
      })
    } else {
      result = await adminService.getAllUsers(page, limit, search)
    }

    console.log("🎉 [API-ADMIN-USERS] Users retrieved:", {
      count: result.users.length,
      total: result.total,
      pages: result.pages
    })

    return NextResponse.json(result, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-USERS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  console.log("🌐 [API-ADMIN-USERS] POST request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      console.error("❌ [API-ADMIN-USERS] Unauthorized role attempting POST:", role)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    console.log("📝 [API-ADMIN-USERS] Create user request:", { 
      name: body.name, 
      email: body.email,
      phone: body.phone ? "***" : undefined,
      hasInitialBalance: !!body.initialBalance
    })

    const { name, email, phone, password, initialBalance } = body

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, phone, and password are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Validate phone format (basic check)
    if (phone.length < 10) {
      return NextResponse.json(
        { error: "Invalid phone number" },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      )
    }

    const logger = createTradingLogger({
      clientId: 'ADMIN',
      userId: session.user.id
    })

    const adminService = createAdminUserService(logger)
    const result = await adminService.createUser({
      name,
      email,
      phone,
      password,
      initialBalance: initialBalance ? parseFloat(initialBalance) : undefined
    })

    console.log("✅ [API-ADMIN-USERS] User created successfully:", result.clientId)

    return NextResponse.json({ 
      success: true, 
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        phone: result.phone,
        clientId: result.clientId,
        password: result.password, // Return password for display
        initialBalance: result.tradingAccount.balance
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-USERS] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  console.log("🌐 [API-ADMIN-USERS] PATCH request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    console.log("📝 [API-ADMIN-USERS] Update request:", body)

    const { userId, isActive } = body

    if (!userId || isActive === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const adminService = createAdminUserService()
    const user = await adminService.updateUserStatus(userId, isActive)

    console.log("✅ [API-ADMIN-USERS] User status updated:", user.id)

    return NextResponse.json({ success: true, user }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-USERS] PATCH error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    )
  }
}