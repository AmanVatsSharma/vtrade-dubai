/**
 * @file route.ts
 * @module console
 * @description API route for users to request a Relationship Manager
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

/**
 * POST /api/console/request-rm
 * Create a request for a Relationship Manager
 */
export async function POST(req: Request) {
  console.log("🌐 [API-CONSOLE-REQUEST-RM] POST request received")
  
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Check if user already has an RM
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        managedById: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.managedById) {
      return NextResponse.json(
        { error: "You already have a Relationship Manager assigned" },
        { status: 400 }
      )
    }

    // Create a notification for admins about RM request
    // Using the existing Notification model
    await prisma.notification.create({
      data: {
        title: "RM Assignment Request",
        message: `User ${session.user.email || session.user.name || userId} has requested a Relationship Manager assignment.`,
        type: "INFO",
        priority: "MEDIUM",
        target: "ADMINS",
        targetUserIds: [], // Will be handled by admin notification system
        createdBy: userId
      }
    })

    console.log(`✅ [API-CONSOLE-REQUEST-RM] Created RM request for user ${userId}`)

    return NextResponse.json({
      success: true,
      message: "Your request for a Relationship Manager has been submitted. An admin will assign one shortly."
    })

  } catch (error: any) {
    console.error("❌ [API-CONSOLE-REQUEST-RM] POST error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to submit RM request" },
      { status: 500 }
    )
  }
}
