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
import { prisma } from "@/lib/prisma"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

console.log("⚙️ [API-ADMIN-SETTINGS] Route loaded")

/**
 * GET - Fetch system settings
 */
export async function GET(req: NextRequest) {
  console.log("🌐 [API-ADMIN-SETTINGS] GET request received")
  
  try {
    const authResult = await requireAdminPermissions(req, "admin.settings.manage")
    if (!authResult.ok) return authResult.response
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    const category = searchParams.get('category')

    console.log("📋 [API-ADMIN-SETTINGS] Query params:", { key, category })

    // Build query (global settings only for now; per-RM scoping will use ownerId in prod DB)
    // NOTE: `SystemSettings.key` is not globally unique. We treat "global" as ownerId = null.
    const where: any = { isActive: true, ownerId: null }
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
    const authResult = await requireAdminPermissions(req, "admin.settings.manage")
    if (!authResult.ok) return authResult.response
    const session = authResult.session

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

    // "Upsert" setting (global for now).
    // NOTE: `SystemSettings.key` is not globally unique and `ownerId` is nullable, so we avoid
    // Prisma `upsert` and instead update by `id` when present.
    const setting = await prisma.$transaction(async (tx) => {
      const existing = await tx.systemSettings.findFirst({
        where: { key, ownerId: null },
        orderBy: { updatedAt: "desc" },
      })

      if (existing) {
        const updated = await tx.systemSettings.update({
          where: { id: existing.id },
          data: {
            value,
            description,
            category: category || "GENERAL",
            isActive: isActive !== undefined ? isActive : true,
            updatedAt: new Date(),
          },
        })

        // Soft-disable accidental duplicates for the same global key.
        await tx.systemSettings.updateMany({
          where: { key, ownerId: null, id: { not: existing.id } },
          data: { isActive: false, updatedAt: new Date() },
        })

        return updated
      }

      return tx.systemSettings.create({
        data: {
          key,
          value,
          description,
          category: category || "GENERAL",
          isActive: isActive !== undefined ? isActive : true,
        },
      })
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
    const authResult = await requireAdminPermissions(req, "admin.settings.manage")
    if (!authResult.ok) return authResult.response

    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')

    console.log("🗑️ [API-ADMIN-SETTINGS] Deleting setting:", key)

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      )
    }

    // Delete setting (global only for now). `key` is not unique, so scope delete to ownerId = null.
    await prisma.systemSettings.deleteMany({
      where: { key, ownerId: null }
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