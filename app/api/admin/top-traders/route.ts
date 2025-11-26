/**
 * @file route.ts
 * @module admin-console
 * @description API route for top traders data
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { createAdminUserService } from "@/lib/services/admin/AdminUserService"
import { auth } from "@/auth"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-TOP-TRADERS] GET request received")
  
  try {
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      console.error("❌ [API-ADMIN-TOP-TRADERS] Unauthorized role attempting GET:", role)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    console.log("✅ [API-ADMIN-TOP-TRADERS] Admin/SuperAdmin authenticated:", session.user.email)

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log("🏆 [API-ADMIN-TOP-TRADERS] Fetching top traders:", { limit })

    const adminService = createAdminUserService()
    const traders = await adminService.getTopTraders(limit)

    console.log(`✅ [API-ADMIN-TOP-TRADERS] Found ${traders.length} top traders`)

    return NextResponse.json({ success: true, traders }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-TOP-TRADERS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch top traders" },
      { status: 500 }
    )
  }
}
