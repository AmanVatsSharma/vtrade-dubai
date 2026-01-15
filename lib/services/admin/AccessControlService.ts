/**
 * File: lib/services/admin/AccessControlService.ts
 * Module: admin-console
 * Purpose: Manage RBAC role permissions with persistent settings and auditing.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-01-15
 * Notes:
 * - Persists role permission map in SystemSettings.
 * - Read `getConfig` first to understand caching behavior.
 */

import { prisma } from "@/lib/prisma"
import { LogCategory, LogLevel } from "@prisma/client"
import {
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSIONS,
  RESTRICTED_PERMISSIONS,
  ROLE_KEYS,
  type PermissionKey,
  type RoleKey,
} from "@/lib/rbac/permissions"
import { baseLogger } from "@/lib/observability/logger"

const RBAC_SETTINGS_KEY = "rbac_role_permissions_v1"
const CACHE_TTL_MS = 30_000
const logger = baseLogger.child({ module: "AccessControlService" })
const getIstTimestamp = () =>
  new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  })

export interface RbacConfig {
  roles: Record<RoleKey, PermissionKey[]>
  updatedAt: string
  updatedBy?: {
    id?: string
    name?: string | null
    email?: string | null
  }
}

export interface RbacConfigResult {
  config: RbacConfig
  source: "db" | "default"
  defaults: Record<RoleKey, PermissionKey[]>
}

type CacheState = {
  config: RbacConfig
  source: "db" | "default"
  expiresAt: number
}

const PERMISSION_KEYS = new Set(PERMISSIONS.map((permission) => permission.key))
let cacheState: CacheState | null = null

const createDefaultConfig = (): RbacConfig => ({
  roles: DEFAULT_ROLE_PERMISSIONS,
  updatedAt: new Date().toISOString(),
  updatedBy: { name: "System" },
})

const filterRolePermissions = (role: RoleKey, rawPermissions: unknown[]): PermissionKey[] => {
  const unique = new Set<string>()

  rawPermissions.forEach((permission) => {
    if (typeof permission !== "string") return
    if (!PERMISSION_KEYS.has(permission)) return
    // Enforce role-specific permission restrictions.
    const restrictedTo = RESTRICTED_PERMISSIONS[permission as PermissionKey]
    if (restrictedTo && !restrictedTo.includes(role)) return
    unique.add(permission)
  })

  if (role === "SUPER_ADMIN") {
    unique.add("admin.all")
    unique.add("admin.access-control.manage")
  }

  return Array.from(unique).sort() as PermissionKey[]
}

const normalizeRolePermissions = (
  rolesInput: Partial<Record<RoleKey, unknown>>
): Record<RoleKey, PermissionKey[]> => {
  return ROLE_KEYS.reduce((acc, role) => {
    const raw = Array.isArray(rolesInput[role]) ? (rolesInput[role] as unknown[]) : []
    acc[role] = filterRolePermissions(role, raw)
    return acc
  }, {} as Record<RoleKey, PermissionKey[]>)
}

const parseConfig = (value: string | null): RbacConfig | null => {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<RbacConfig>
    if (!parsed.roles || typeof parsed.roles !== "object") return null
    const normalizedRoles = normalizeRolePermissions(parsed.roles as Record<RoleKey, unknown>)
    return {
      roles: normalizedRoles,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
      updatedBy: parsed.updatedBy,
    }
  } catch {
    return null
  }
}

const shouldUseCache = (forceRefresh?: boolean) => {
  if (forceRefresh || !cacheState) return false
  return cacheState.expiresAt > Date.now()
}

const buildCacheState = (config: RbacConfig, source: "db" | "default"): CacheState => ({
  config,
  source,
  expiresAt: Date.now() + CACHE_TTL_MS,
})

const logAccessControlChange = async (config: RbacConfig) => {
  await prisma.tradingLog.create({
    data: {
      clientId: config.updatedBy?.id || "SYSTEM",
      userId: config.updatedBy?.id,
      level: LogLevel.INFO,
      category: LogCategory.SYSTEM,
      action: "ACCESS_CONTROL_UPDATED",
      message: "Access control configuration updated.",
      details: {
        updatedBy: config.updatedBy,
        roles: Object.keys(config.roles),
      },
    },
  })
}

export class AccessControlService {
  static async getConfig(forceRefresh: boolean = false): Promise<RbacConfigResult> {
    logger.debug(
      { timeIst: getIstTimestamp(), forceRefresh },
      "AccessControlService.getConfig - start"
    )

    // Serve from cache when still valid.
    if (shouldUseCache(forceRefresh) && cacheState) {
      logger.debug(
        { timeIst: getIstTimestamp(), source: cacheState.source },
        "AccessControlService.getConfig - cache-hit"
      )
      return {
        config: cacheState.config,
        source: cacheState.source,
        defaults: DEFAULT_ROLE_PERMISSIONS,
      }
    }

    const setting = await prisma.systemSettings.findUnique({
      where: { key: RBAC_SETTINGS_KEY },
    })

    const parsedConfig = parseConfig(setting?.value || null)
    if (!parsedConfig) {
      // Fall back to defaults when config is missing or malformed.
      const defaultConfig = createDefaultConfig()
      cacheState = buildCacheState(defaultConfig, "default")
      logger.debug(
        { timeIst: getIstTimestamp(), source: "default" },
        "AccessControlService.getConfig - default"
      )
      return {
        config: defaultConfig,
        source: "default",
        defaults: DEFAULT_ROLE_PERMISSIONS,
      }
    }

    cacheState = buildCacheState(parsedConfig, "db")
    logger.debug(
      { timeIst: getIstTimestamp(), source: "db" },
      "AccessControlService.getConfig - db"
    )
    return {
      config: parsedConfig,
      source: "db",
      defaults: DEFAULT_ROLE_PERMISSIONS,
    }
  }

  static async updateConfig(
    roles: Partial<Record<RoleKey, PermissionKey[]>>,
    actor?: { id?: string; name?: string | null; email?: string | null }
  ): Promise<RbacConfig> {
    logger.debug(
      { timeIst: getIstTimestamp(), actorId: actor?.id },
      "AccessControlService.updateConfig - start"
    )
    const normalizedRoles = normalizeRolePermissions(roles as Record<RoleKey, unknown>)
    const config: RbacConfig = {
      roles: normalizedRoles,
      updatedAt: new Date().toISOString(),
      updatedBy: actor,
    }

    // Persist in SystemSettings for runtime configuration.
    await prisma.systemSettings.upsert({
      where: { key: RBAC_SETTINGS_KEY },
      update: {
        value: JSON.stringify(config),
        description: "Role-based access control configuration",
        category: "ACCESS_CONTROL",
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        key: RBAC_SETTINGS_KEY,
        value: JSON.stringify(config),
        description: "Role-based access control configuration",
        category: "ACCESS_CONTROL",
        isActive: true,
      },
    })

    cacheState = buildCacheState(config, "db")
    await logAccessControlChange(config)
    logger.debug(
      { timeIst: getIstTimestamp(), roles: Object.keys(config.roles) },
      "AccessControlService.updateConfig - end"
    )
    return config
  }

  static listPermissions() {
    return PERMISSIONS
  }

  static clearCache() {
    cacheState = null
  }
}

export const normalizePermissionsForTests = normalizeRolePermissions

