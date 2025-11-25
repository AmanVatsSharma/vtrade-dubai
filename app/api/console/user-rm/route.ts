/**
 * @file route.ts
 * @module console
 * @description API route for getting current user's Relationship Manager details
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

/**
 * GET /api/console/user-rm
 * Get current user's Relationship Manager details
 */
export async function GET(req: Request) {
  console.log("🌐 [API-CONSOLE-USER-RM] GET request received")
  
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        managedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            clientId: true,
            image: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log(`✅ [API-CONSOLE-USER-RM] Found RM for user ${userId}`)

    return NextResponse.json({
      hasRM: !!user.managedBy,
      rm: user.managedBy
    })

  } catch (error: any) {
    console.error("❌ [API-CONSOLE-USER-RM] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch RM details" },
      { status: 500 }
    )
  }
}
