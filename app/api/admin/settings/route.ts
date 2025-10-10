/**
 * API Route: System Settings
 * 
 * Manages platform-wide settings:
 * - Payment QR code
 * - Payment UPI ID
 * - Platform branding
 * - Notifications
 * 
 * @route GET /api/admin/settings - Get all or specific settings
 * @route POST /api/admin/settings - Create or update setting
 * @route DELETE /api/admin/settings - Delete setting
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

console.log("⚙️ [API-ADMIN-SETTINGS] Route loaded")

/**
 * GET - Fetch system settings
 */
export async function GET(req: NextRequest) {
  console.log("🌐 [API-ADMIN-SETTINGS] GET request received")
  
  try {
    // Authenticate admin (optional for reading settings)
    const session = await auth()
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    const category = searchParams.get('category')

    console.log("📋 [API-ADMIN-SETTINGS] Query params:", { key, category })

    // Build query (global settings only for now; per-RM scoping will use ownerId in prod DB)
    const where: any = { isActive: true }
    if (key) where.key = key
    if (category) where.category = category

    // Fetch settings
    const settings = await prisma.systemSettings.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    })

    console.log(`✅ [API-ADMIN-SETTINGS] Found ${settings.length} settings`)

    // If requesting a specific key, return single object
    if (key && settings.length === 1) {
      return NextResponse.json({
        success: true,
        setting: settings[0]
      }, { status: 200 })
    }

    return NextResponse.json({
      success: true,
      settings,
      count: settings.length
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-SETTINGS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

/**
 * POST - Create or update setting
 */
export async function POST(req: NextRequest) {
  console.log("🌐 [API-ADMIN-SETTINGS] POST request received")
  
  try {
    // Authenticate admin
    const session = await auth()
    const role = (session?.user as any)?.role
    if (!session?.user || (role !== 'ADMIN' && role !== 'SUPER_ADMIN')) {
      console.error("❌ [API-ADMIN-SETTINGS] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("✅ [API-ADMIN-SETTINGS] Admin authenticated:", session.user.email)

    const body = await req.json()
    const { key, value, description, category, isActive } = body

    console.log("📝 [API-ADMIN-SETTINGS] Setting data:", { key, value: value?.substring(0, 50), category })

    // Validate required fields
    if (!key || !value) {
      console.error("❌ [API-ADMIN-SETTINGS] Missing required fields")
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      )
    }

    // Upsert setting (global for now). In prod DB with ownerId, scope by ownerId=session.user.id for ADMIN
    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: {
        value,
        description,
        category: category || 'GENERAL',
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date()
      },
      create: {
        key,
        value,
        description,
        category: category || 'GENERAL',
        isActive: isActive !== undefined ? isActive : true
      }
    })

    console.log("✅ [API-ADMIN-SETTINGS] Setting saved:", setting.key)

    return NextResponse.json({
      success: true,
      setting,
      message: "Setting saved successfully"
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-SETTINGS] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save setting" },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Delete setting
 */
export async function DELETE(req: NextRequest) {
  console.log("🌐 [API-ADMIN-SETTINGS] DELETE request received")
  
  try {
    // Authenticate admin
    const session = await auth()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      console.error("❌ [API-ADMIN-SETTINGS] Unauthorized access attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')

    console.log("🗑️ [API-ADMIN-SETTINGS] Deleting setting:", key)

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      )
    }

    // Delete setting
    await prisma.systemSettings.delete({
      where: { key }
    })

    console.log("✅ [API-ADMIN-SETTINGS] Setting deleted")

    return NextResponse.json({
      success: true,
      message: "Setting deleted successfully"
    }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-SETTINGS] DELETE error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete setting" },
      { status: 500 }
    )
  }
}