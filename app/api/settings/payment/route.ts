/**
 * File: app/api/settings/payment/route.ts
 * Module: api-settings
 * Purpose: Provide auth-only payment settings (UPI ID + QR code URL) to the user console deposits UI.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-12
 * Notes:
 * - Authenticated users only (no admin permissions required).
 * - Returns only safe keys: `payment_qr_code` and `payment_upi_id`.
 * - Uses `Cache-Control: no-store` to reflect admin updates immediately.
 */

import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { withRequest } from "@/lib/observability/logger"
import { AppError, mapErrorToHttp } from "@/src/common/errors"

const ROUTE = "/api/settings/payment"

type PaymentSettingsPayload = {
  qrCodeUrl: string | null
  upiId: string | null
}

export async function GET(req: Request) {
  const logger = withRequest({
    requestId: req.headers.get("x-request-id") || undefined,
    ip: req.headers.get("x-forwarded-for"),
    route: ROUTE,
  })

  try {
    const session = await auth()
    if (!session?.user?.id) {
      throw new AppError({ code: "UNAUTHORIZED", message: "Unauthorized", statusCode: 401 })
    }

    const settings = await prisma.systemSettings.findMany({
      where: {
        isActive: true,
        ownerId: null,
        key: { in: ["payment_qr_code", "payment_upi_id"] },
      },
      orderBy: { updatedAt: "desc" },
      select: { key: true, value: true },
    })

    const byKey = new Map<string, string>()
    for (const setting of settings) {
      if (!byKey.has(setting.key)) byKey.set(setting.key, setting.value)
    }

    const data: PaymentSettingsPayload = {
      qrCodeUrl: (byKey.get("payment_qr_code") || "").trim() || null,
      upiId: (byKey.get("payment_upi_id") || "").trim() || null,
    }

    const res = NextResponse.json({ success: true, data }, { status: 200 })
    res.headers.set("Cache-Control", "no-store")
    logger.info({ keys: Object.keys(data), hasQr: Boolean(data.qrCodeUrl), hasUpi: Boolean(data.upiId) }, "payment settings - success")
    return res
  } catch (error: unknown) {
    logger.error({ err: error }, "payment settings - error")
    const mapped = mapErrorToHttp(error, "Failed to fetch payment settings")
    const res = NextResponse.json({ success: false, ...mapped.body }, { status: mapped.status })
    res.headers.set("Cache-Control", "no-store")
    return res
  }
}

