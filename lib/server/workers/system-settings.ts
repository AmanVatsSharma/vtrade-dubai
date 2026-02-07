/**
 * File: lib/server/workers/system-settings.ts
 * Module: workers
 * Purpose: Safe read/write helpers for global SystemSettings keys (ownerId=null) used by worker management.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-04
 * Notes:
 * - `SystemSettings` uses a UNIQUE(ownerId,key) with nullable ownerId. In Postgres, NULLs do not collide,
 *   so multiple global rows can exist for the same key. We always select the latest by `updatedAt`.
 * - Writes soft-disable duplicates for safety.
 */

import { prisma } from "@/lib/prisma"

export type GlobalSettingRow = {
  key: string
  value: string
  updatedAt: Date
}

export async function getLatestActiveGlobalSettings(keys: string[]): Promise<Map<string, GlobalSettingRow>> {
  const unique = Array.from(new Set(keys.filter((k) => typeof k === "string" && k.length > 0)))
  const out = new Map<string, GlobalSettingRow>()
  if (unique.length === 0) return out

  const rows = await prisma.systemSettings.findMany({
    where: {
      ownerId: null,
      isActive: true,
      key: { in: unique },
    },
    orderBy: { updatedAt: "desc" },
    select: { key: true, value: true, updatedAt: true },
  })

  for (const r of rows) {
    if (!out.has(r.key)) {
      out.set(r.key, { key: r.key, value: r.value, updatedAt: r.updatedAt })
    }
  }

  return out
}

export async function upsertGlobalSetting(input: {
  key: string
  value: string
  category?: string
  description?: string
  isActive?: boolean
}): Promise<void> {
  const { key, value, category, description } = input
  const isActive = input.isActive !== undefined ? input.isActive : true

  await prisma.$transaction(async (tx) => {
    const existing = await tx.systemSettings.findFirst({
      where: { key, ownerId: null },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    })

    if (existing) {
      await tx.systemSettings.update({
        where: { id: existing.id },
        data: {
          value,
          category: category || "GENERAL",
          description,
          isActive,
          updatedAt: new Date(),
        },
      })

      // Soft-disable accidental duplicates for the same global key.
      await tx.systemSettings.updateMany({
        where: { key, ownerId: null, id: { not: existing.id } },
        data: { isActive: false, updatedAt: new Date() },
      })

      return
    }

    await tx.systemSettings.create({
      data: {
        key,
        value,
        category: category || "GENERAL",
        description,
        isActive,
      },
    })
  })
}

export function parseBooleanSetting(value: string | null | undefined): boolean | null {
  if (value == null) return null
  if (value === "true") return true
  if (value === "false") return false
  return null
}

