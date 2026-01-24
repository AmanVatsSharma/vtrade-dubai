/**
 * @file route.ts
 * @module admin-console
 * @description Admin KYC detail and review log API
 * @author BharatERP
 * @created 2026-01-15
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, { params }: { params: { kycId: string } }) {
  try {
    const authResult = await requireAdminPermissions(request, "admin.users.kyc")
    if (!authResult.ok) return authResult.response

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
      return NextResponse.json({ error: "KYC record not found" }, { status: 404 })
    }

    return NextResponse.json({ kyc })
  } catch (error) {
    console.error("Admin KYC detail fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
