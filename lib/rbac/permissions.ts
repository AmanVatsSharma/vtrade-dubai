/**
 * File: lib/rbac/permissions.ts
 * Module: rbac
 * Purpose: Define RBAC permission catalog and role defaults.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-01-15
 * Notes:
 * - Keep permission keys stable to avoid breaking stored configs.
 * - Update DEFAULT_ROLE_PERMISSIONS when adding new keys.
 */

export const ROLE_KEYS = ["USER", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as const
export type RoleKey = (typeof ROLE_KEYS)[number]

export type PermissionRisk = "low" | "medium" | "high"

export interface PermissionDefinition {
  key: string
  label: string
  description: string
  category: string
  risk: PermissionRisk
}

export const PERMISSIONS = [
  {
    key: "admin.all",
    label: "Admin Full Access",
    description: "Full administrative access across the platform.",
    category: "ACCESS_CONTROL",
    risk: "high",
  },
  {
    key: "admin.access-control.view",
    label: "Access Control View",
    description: "View role permissions and access control settings.",
    category: "ACCESS_CONTROL",
    risk: "medium",
  },
  {
    key: "admin.access-control.manage",
    label: "Access Control Manage",
    description: "Modify role permissions and access control policies.",
    category: "ACCESS_CONTROL",
    risk: "high",
  },
  {
    key: "admin.profile.read",
    label: "Admin Profile Read",
    description: "View own admin profile details.",
    category: "PROFILE",
    risk: "low",
  },
  {
    key: "admin.profile.manage",
    label: "Admin Profile Manage",
    description: "Update own admin profile details.",
    category: "PROFILE",
    risk: "low",
  },
  {
    key: "admin.users.read",
    label: "Users Read",
    description: "View user lists, profiles, and activity summaries.",
    category: "USERS",
    risk: "medium",
  },
  {
    key: "admin.users.manage",
    label: "Users Manage",
    description: "Create, update, activate, or deactivate users.",
    category: "USERS",
    risk: "high",
  },
  {
    key: "admin.users.credentials",
    label: "Users Credentials",
    description: "Reset passwords and MPIN for users.",
    category: "USERS",
    risk: "high",
  },
  {
    key: "admin.users.kyc",
    label: "Users KYC",
    description: "Review and approve/reject KYC applications.",
    category: "USERS",
    risk: "high",
  },
  {
    key: "admin.users.risk",
    label: "Users Risk",
    description: "View or update user risk limits and alerts.",
    category: "USERS",
    risk: "high",
  },
  {
    key: "admin.users.rm",
    label: "Users RM Assignment",
    description: "Assign or manage relationship managers for users.",
    category: "USERS",
    risk: "medium",
  },
  {
    key: "admin.funds.read",
    label: "Funds Read",
    description: "View deposits, withdrawals, and transactions.",
    category: "FUNDS",
    risk: "medium",
  },
  {
    key: "admin.funds.manage",
    label: "Funds Manage",
    description: "Approve, reject, or adjust user funds.",
    category: "FUNDS",
    risk: "high",
  },
  {
    key: "admin.funds.override",
    label: "Funds Override",
    description: "Perform direct trading account fund overrides.",
    category: "FUNDS",
    risk: "high",
  },
  {
    key: "admin.deposits.manage",
    label: "Deposits Manage",
    description: "Approve or reject deposit requests.",
    category: "FUNDS",
    risk: "high",
  },
  {
    key: "admin.withdrawals.manage",
    label: "Withdrawals Manage",
    description: "Approve or reject withdrawal requests.",
    category: "FUNDS",
    risk: "high",
  },
  {
    key: "admin.orders.read",
    label: "Orders Read",
    description: "View orders and related trading activity.",
    category: "TRADING",
    risk: "medium",
  },
  {
    key: "admin.orders.manage",
    label: "Orders Manage",
    description: "Modify order status or trading details.",
    category: "TRADING",
    risk: "high",
  },
  {
    key: "admin.positions.read",
    label: "Positions Read",
    description: "View positions and exposure details.",
    category: "TRADING",
    risk: "medium",
  },
  {
    key: "admin.positions.manage",
    label: "Positions Manage",
    description: "Modify positions or execute admin trades.",
    category: "TRADING",
    risk: "high",
  },
  {
    key: "admin.activity.read",
    label: "Activity Read",
    description: "View system and user activity feeds.",
    category: "ANALYTICS",
    risk: "medium",
  },
  {
    key: "admin.charts.read",
    label: "Charts Read",
    description: "View chart-based analytics and trends.",
    category: "ANALYTICS",
    risk: "low",
  },
  {
    key: "admin.top-traders.read",
    label: "Top Traders Read",
    description: "View top trader and leaderboard data.",
    category: "ANALYTICS",
    risk: "low",
  },
  {
    key: "admin.analytics.read",
    label: "Analytics Read",
    description: "View analytics dashboards and KPIs.",
    category: "ANALYTICS",
    risk: "low",
  },
  {
    key: "admin.stats.read",
    label: "Stats Read",
    description: "View platform statistics.",
    category: "ANALYTICS",
    risk: "low",
  },
  {
    key: "admin.reports.read",
    label: "Reports Read",
    description: "View financial and compliance reports.",
    category: "ANALYTICS",
    risk: "medium",
  },
  {
    key: "admin.audit.read",
    label: "Audit Read",
    description: "View audit trail entries.",
    category: "ANALYTICS",
    risk: "medium",
  },
  {
    key: "admin.logs.read",
    label: "Logs Read",
    description: "View system logs and diagnostics.",
    category: "ANALYTICS",
    risk: "medium",
  },
  {
    key: "admin.risk.read",
    label: "Risk Read",
    description: "View risk configurations and alerts.",
    category: "RISK",
    risk: "medium",
  },
  {
    key: "admin.risk.manage",
    label: "Risk Manage",
    description: "Manage risk limits, alerts, and configurations.",
    category: "RISK",
    risk: "high",
  },
  {
    key: "admin.system.read",
    label: "System Health Read",
    description: "View system health and performance metrics.",
    category: "SYSTEM",
    risk: "medium",
  },
  {
    key: "admin.settings.manage",
    label: "Settings Manage",
    description: "Manage platform settings and configuration.",
    category: "SYSTEM",
    risk: "high",
  },
  {
    key: "admin.notifications.manage",
    label: "Notifications Manage",
    description: "Create and manage platform notifications.",
    category: "SYSTEM",
    risk: "medium",
  },
  {
    key: "admin.upload.manage",
    label: "Uploads Manage",
    description: "Upload and manage admin assets.",
    category: "SYSTEM",
    risk: "medium",
  },
  {
    key: "admin.cleanup.read",
    label: "Cleanup Read",
    description: "Preview cleanup operations.",
    category: "SYSTEM",
    risk: "high",
  },
  {
    key: "admin.cleanup.execute",
    label: "Cleanup Execute",
    description: "Execute cleanup operations.",
    category: "SYSTEM",
    risk: "high",
  },
  {
    key: "admin.queue.read",
    label: "Queue Read",
    description: "View queue and batcher status.",
    category: "SYSTEM",
    risk: "low",
  },
  {
    key: "admin.vortex.read",
    label: "Vortex Read",
    description: "View Vortex integration diagnostics.",
    category: "SYSTEM",
    risk: "medium",
  },
  {
    key: "admin.super.financial.read",
    label: "Super Admin Financial Read",
    description: "Access super-admin financial endpoints.",
    category: "SUPER_ADMIN",
    risk: "high",
  },
  {
    key: "admin.super.financial.manage",
    label: "Super Admin Financial Manage",
    description: "Update super-admin financial configuration and rules.",
    category: "SUPER_ADMIN",
    risk: "high",
  },
] as const satisfies readonly PermissionDefinition[]

export type PermissionKey = (typeof PERMISSIONS)[number]["key"]

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  USER: [],
  MODERATOR: [
    "admin.profile.read",
    "admin.profile.manage",
    "admin.users.read",
    "admin.users.kyc",
    "admin.activity.read",
    "admin.orders.read",
    "admin.positions.read",
    "admin.charts.read",
    "admin.top-traders.read",
    "admin.analytics.read",
    "admin.stats.read",
  ],
  ADMIN: [
    "admin.access-control.view",
    "admin.profile.read",
    "admin.profile.manage",
    "admin.users.read",
    "admin.users.manage",
    "admin.users.credentials",
    "admin.users.kyc",
    "admin.users.risk",
    "admin.users.rm",
    "admin.funds.read",
    "admin.funds.manage",
    "admin.deposits.manage",
    "admin.withdrawals.manage",
    "admin.orders.read",
    "admin.positions.read",
    "admin.activity.read",
    "admin.charts.read",
    "admin.top-traders.read",
    "admin.analytics.read",
    "admin.stats.read",
    "admin.reports.read",
    "admin.audit.read",
    "admin.logs.read",
    "admin.risk.read",
    "admin.risk.manage",
    "admin.system.read",
    "admin.settings.manage",
    "admin.notifications.manage",
    "admin.upload.manage",
    "admin.cleanup.read",
    "admin.cleanup.execute",
    "admin.queue.read",
    "admin.vortex.read",
  ],
  SUPER_ADMIN: [
    "admin.all",
    "admin.access-control.manage",
    "admin.super.financial.read",
    "admin.super.financial.manage",
    "admin.funds.override",
  ],
}

export const RESTRICTED_PERMISSIONS: Partial<Record<PermissionKey, RoleKey[]>> = {
  "admin.all": ["SUPER_ADMIN"],
  "admin.access-control.manage": ["SUPER_ADMIN"],
  "admin.super.financial.read": ["SUPER_ADMIN"],
  "admin.super.financial.manage": ["SUPER_ADMIN"],
  "admin.funds.override": ["SUPER_ADMIN"],
}

