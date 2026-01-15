/**
 * File: tests/admin/access-control-guard.test.ts
 * Module: admin-console
 * Purpose: Validate RBAC permission evaluation logic.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-01-15
 * Notes:
 * - Focuses on `hasPermission` behavior.
 * - Uses PermissionKey literals for coverage.
 */

import { hasPermission } from "@/lib/rbac"
import type { PermissionKey } from "@/lib/rbac"

describe("hasPermission", () => {
  it("grants access when admin.all is present", () => {
    const permissions = new Set<PermissionKey>(["admin.all"])
    expect(hasPermission(permissions, "admin.super.financial.manage")).toBe(true)
  })

  it("requires all permissions by default", () => {
    const permissions = new Set<PermissionKey>(["admin.users.read", "admin.activity.read"])
    expect(hasPermission(permissions, ["admin.users.read", "admin.activity.read"])).toBe(true)
    expect(hasPermission(permissions, ["admin.users.read", "admin.funds.manage"])).toBe(false)
  })

  it("allows any permission when mode is any", () => {
    const permissions = new Set<PermissionKey>(["admin.users.read", "admin.activity.read"])
    expect(hasPermission(permissions, ["admin.users.read", "admin.funds.manage"], "any")).toBe(true)
    expect(hasPermission(permissions, ["admin.funds.manage", "admin.orders.manage"], "any")).toBe(false)
  })
})
