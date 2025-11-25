/**
 * @file AdminUserService.ts
 * @module admin-console
 * @description Comprehensive admin user management service with full CRUD operations, KYC management, credential resets, activity tracking, and risk management
 * @author BharatERP
 * @created 2025-01-27
 */

import { prisma } from "@/lib/prisma"
import { Role, KycStatus } from "@prisma/client"
import { TradingLogger } from "@/lib/services/logging/TradingLogger"
import bcrypt from "bcryptjs"

console.log("👥 [ADMIN-USER-SERVICE] Module loaded")

export interface UserSummary {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  clientId: string | null
  role: Role
  isActive: boolean
  kycStatus: string
  tradingAccount: {
    id: string
    balance: number
    availableMargin: number
    usedMargin: number
  } | null
  createdAt: Date
  stats: {
    totalOrders: number
    activePositions: number
    totalDeposits: number
    totalWithdrawals: number
  }
}

export class AdminUserService {
  private logger: TradingLogger

  constructor(logger?: TradingLogger) {
    this.logger = logger || new TradingLogger({ clientId: 'ADMIN' })
    console.log("🏗️ [ADMIN-USER-SERVICE] Service instance created")
  }

  /**
   * Get all users with summary
   */
  async getAllUsers(
    page: number = 1,
    limit: number = 50,
    search?: string
  ): Promise<{ users: UserSummary[]; total: number; pages: number }> {
    console.log("📋 [ADMIN-USER-SERVICE] Fetching all users:", { page, limit, search })

    const skip = (page - 1) * limit

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
            { clientId: { contains: search, mode: 'insensitive' as const } }
          ]
        }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          tradingAccount: {
            select: {
              id: true,
              balance: true,
              availableMargin: true,
              usedMargin: true,
              _count: {
                select: {
                  orders: true,
                  positions: { where: { quantity: { not: 0 } } }
                }
              }
            }
          },
          kyc: {
            select: {
              status: true
            }
          },
          deposits: {
            where: { status: 'COMPLETED' },
            select: {
              amount: true
            }
          },
          withdrawals: {
            where: { status: 'COMPLETED' },
            select: {
              amount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    console.log(`✅ [ADMIN-USER-SERVICE] Found ${users.length} users (total: ${total})`)

    const userSummaries: UserSummary[] = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      clientId: user.clientId,
      role: user.role,
      isActive: user.isActive,
      kycStatus: user.kyc?.status || 'NOT_SUBMITTED',
      tradingAccount: user.tradingAccount ? {
        id: user.tradingAccount.id,
        balance: user.tradingAccount.balance,
        availableMargin: user.tradingAccount.availableMargin,
        usedMargin: user.tradingAccount.usedMargin
      } : null,
      createdAt: user.createdAt,
      stats: {
        totalOrders: (user.tradingAccount as any)?._count?.orders || 0,
        activePositions: (user.tradingAccount as any)?._count?.positions || 0,
        totalDeposits: user.deposits.reduce((sum, d) => sum + Number(d.amount), 0),
        totalWithdrawals: user.withdrawals.reduce((sum, w) => sum + Number(w.amount), 0)
      }
    }))

    return {
      users: userSummaries,
      total,
      pages: Math.ceil(total / limit)
    }
  }

  /**
   * Get user details with full activity
   */
  async getUserDetails(userId: string) {
    console.log("🔍 [ADMIN-USER-SERVICE] Fetching user details:", userId)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tradingAccount: {
          include: {
            orders: {
              take: 20,
              orderBy: { createdAt: 'desc' }
            },
            positions: {
              where: { quantity: { not: 0 } }
            },
            trades: {
              take: 50,
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        kyc: true,
        deposits: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        withdrawals: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        },
        bankAccounts: true
      }
    })

    if (!user) {
      console.error("❌ [ADMIN-USER-SERVICE] User not found:", userId)
      throw new Error("User not found")
    }

    console.log("✅ [ADMIN-USER-SERVICE] User details retrieved")
    return user
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats() {
    console.log("📊 [ADMIN-USER-SERVICE] Fetching platform statistics")

    const [
      totalUsers,
      activeUsers,
      totalTradingAccounts,
      totalBalance,
      totalOrders,
      activePositions,
      pendingDeposits,
      pendingWithdrawals
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.tradingAccount.count(),
      prisma.tradingAccount.aggregate({
        _sum: { balance: true, availableMargin: true, usedMargin: true }
      }),
      prisma.order.count(),
      prisma.position.count({ where: { quantity: { not: 0 } } }),
      prisma.deposit.count({ where: { status: 'PENDING' } }),
      prisma.withdrawal.count({ where: { status: 'PENDING' } })
    ])

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers
      },
      tradingAccounts: {
        total: totalTradingAccounts,
        totalBalance: Number(totalBalance._sum.balance || 0),
        totalAvailableMargin: Number(totalBalance._sum.availableMargin || 0),
        totalUsedMargin: Number(totalBalance._sum.usedMargin || 0)
      },
      trading: {
        totalOrders,
        activePositions
      },
      pending: {
        deposits: pendingDeposits,
        withdrawals: pendingWithdrawals
      }
    }

    console.log("✅ [ADMIN-USER-SERVICE] Platform statistics:", stats)
    return stats
  }

  /**
   * Update user status
   */
  async updateUserStatus(userId: string, isActive: boolean) {
    console.log("🔄 [ADMIN-USER-SERVICE] Updating user status:", { userId, isActive })

    await this.logger.logSystemEvent("USER_STATUS_UPDATE", `Admin updating user ${userId} status to ${isActive ? 'active' : 'inactive'}`)

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive }
    })

    console.log("✅ [ADMIN-USER-SERVICE] User status updated")
    return user
  }

  /**
   * Get recent activity across all users
   */
  async getRecentActivity(limit: number = 50) {
    console.log("📋 [ADMIN-USER-SERVICE] Fetching recent activity")

    const [recentOrders, recentDeposits, recentWithdrawals] = await Promise.all([
      prisma.order.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          tradingAccount: {
            include: {
              user: {
                select: {
                  name: true,
                  clientId: true
                }
              }
            }
          }
        }
      }),
      prisma.deposit.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              clientId: true
            }
          }
        }
      }),
      prisma.withdrawal.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              name: true,
              clientId: true
            }
          }
        }
      })
    ])

    // Combine and sort all activities
    const activities = [
      ...recentOrders.map(o => ({
        id: o.id,
        type: 'ORDER',
        user: o.tradingAccount.user?.name || 'Unknown',
        clientId: o.tradingAccount.user?.clientId || '',
        action: `${o.orderSide} ${o.symbol}`,
        amount: Number(o.price || 0) * o.quantity,
        status: o.status,
        timestamp: o.createdAt
      })),
      ...recentDeposits.map(d => ({
        id: d.id,
        type: 'DEPOSIT',
        user: d.user.name || 'Unknown',
        clientId: d.user.clientId || '',
        action: 'Fund Deposit',
        amount: Number(d.amount),
        status: d.status,
        timestamp: d.createdAt
      })),
      ...recentWithdrawals.map(w => ({
        id: w.id,
        type: 'WITHDRAWAL',
        user: w.user.name || 'Unknown',
        clientId: w.user.clientId || '',
        action: 'Withdrawal Request',
        amount: Number(w.amount),
        status: w.status,
        timestamp: w.createdAt
      }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit)

    console.log(`✅ [ADMIN-USER-SERVICE] Found ${activities.length} recent activities`)
    return activities
  }

  /**
   * Update user profile information
   */
  async updateUser(userId: string, data: {
    name?: string
    email?: string
    phone?: string
    role?: Role
    isActive?: boolean
    bio?: string
    clientId?: string
  }) {
    console.log("✏️ [ADMIN-USER-SERVICE] Updating user:", { userId, data })

    await this.logger.logSystemEvent("USER_UPDATE", `Admin updating user ${userId} profile`)

    // Check if email/phone/clientId already exists for another user
    if (data.email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email: data.email, id: { not: userId } }
      })
      if (existingEmail) {
        throw new Error("Email already exists for another user")
      }
    }

    if (data.phone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone: data.phone, id: { not: userId } }
      })
      if (existingPhone) {
        throw new Error("Phone already exists for another user")
      }
    }

    if (data.clientId) {
      const existingClientId = await prisma.user.findFirst({
        where: { clientId: data.clientId, id: { not: userId } }
      })
      if (existingClientId) {
        throw new Error("Client ID already exists for another user")
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        tradingAccount: true,
        kyc: true
      }
    })

    console.log("✅ [ADMIN-USER-SERVICE] User updated successfully")
    return user
  }

  /**
   * Reset user password
   */
  async resetPassword(userId: string, newPassword: string) {
    console.log("🔑 [ADMIN-USER-SERVICE] Resetting password for user:", userId)

    await this.logger.logSystemEvent("PASSWORD_RESET", `Admin resetting password for user ${userId}`)

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    const user = await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
      select: { id: true, email: true, name: true }
    })

    console.log("✅ [ADMIN-USER-SERVICE] Password reset successfully")
    return user
  }

  /**
   * Reset user MPIN
   */
  async resetMPIN(userId: string, newMPIN: string) {
    console.log("🔐 [ADMIN-USER-SERVICE] Resetting MPIN for user:", userId)

    await this.logger.logSystemEvent("MPIN_RESET", `Admin resetting MPIN for user ${userId}`)

    // Encrypt MPIN (simple hash for now, can be enhanced)
    const hashedMPIN = await bcrypt.hash(newMPIN, 10)

    const user = await prisma.user.update({
      where: { id: userId },
      data: { mPin: hashedMPIN },
      select: { id: true, email: true, name: true }
    })

    console.log("✅ [ADMIN-USER-SERVICE] MPIN reset successfully")
    return user
  }

  /**
   * Approve or reject KYC
   */
  async updateKYCStatus(userId: string, status: KycStatus, reason?: string) {
    console.log("📋 [ADMIN-USER-SERVICE] Updating KYC status:", { userId, status, reason })

    await this.logger.logSystemEvent("KYC_STATUS_UPDATE", `Admin updating KYC status for user ${userId} to ${status}`)

    const kyc = await prisma.kYC.update({
      where: { userId },
      data: {
        status,
        approvedAt: status === 'APPROVED' ? new Date() : null,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            clientId: true
          }
        }
      }
    })

    console.log("✅ [ADMIN-USER-SERVICE] KYC status updated successfully")
    return kyc
  }

  /**
   * Freeze or unfreeze user account (temporary suspension)
   */
  async freezeAccount(userId: string, freeze: boolean, reason?: string) {
    console.log("❄️ [ADMIN-USER-SERVICE] Freezing/unfreezing account:", { userId, freeze, reason })

    await this.logger.logSystemEvent(
      freeze ? "ACCOUNT_FROZEN" : "ACCOUNT_UNFROZEN",
      `Admin ${freeze ? 'froze' : 'unfroze'} account for user ${userId}${reason ? `: ${reason}` : ''}`
    )

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !freeze },
      include: {
        tradingAccount: true
      }
    })

    console.log(`✅ [ADMIN-USER-SERVICE] Account ${freeze ? 'frozen' : 'unfrozen'} successfully`)
    return user
  }

  /**
   * Get user activity log (auth events, orders, transactions)
   */
  async getUserActivity(userId: string, limit: number = 100) {
    console.log("📊 [ADMIN-USER-SERVICE] Fetching user activity:", { userId, limit })

    const [authEvents, orders, deposits, withdrawals, trades] = await Promise.all([
      prisma.authEvent.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.findMany({
        where: {
          tradingAccount: { userId }
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          stock: {
            select: {
              symbol: true,
              name: true
            }
          }
        }
      }),
      prisma.deposit.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.withdrawal.findMany({
        where: { userId },
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.trade.findMany({
        where: {
          tradingAccount: { userId }
        },
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ])

    // Combine all activities into unified timeline
    const activities = [
      ...authEvents.map(e => ({
        id: e.id,
        type: 'AUTH',
        action: e.eventType,
        description: e.metadata || e.eventType,
        timestamp: e.createdAt,
        severity: e.severity
      })),
      ...orders.map(o => ({
        id: o.id,
        type: 'ORDER',
        action: `${o.orderSide} ${o.symbol}`,
        description: `Order ${o.status} - Qty: ${o.quantity}, Price: ${o.price}`,
        timestamp: o.createdAt,
        amount: Number(o.price || 0) * o.quantity
      })),
      ...deposits.map(d => ({
        id: d.id,
        type: 'DEPOSIT',
        action: 'Deposit',
        description: `Deposit ${d.status} - ₹${d.amount}`,
        timestamp: d.createdAt,
        amount: Number(d.amount)
      })),
      ...withdrawals.map(w => ({
        id: w.id,
        type: 'WITHDRAWAL',
        action: 'Withdrawal',
        description: `Withdrawal ${w.status} - ₹${w.amount}`,
        timestamp: w.createdAt,
        amount: Number(w.amount)
      })),
      ...trades.map(t => ({
        id: t.id,
        type: 'TRADE',
        action: 'Trade Executed',
        description: `Trade executed - Amount: ₹${t.amount}`,
        timestamp: t.createdAt,
        amount: Number(t.amount)
      }))
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit)

    console.log(`✅ [ADMIN-USER-SERVICE] Found ${activities.length} activities`)
    return activities
  }

  /**
   * Bulk update user statuses
   */
  async bulkUpdateStatus(userIds: string[], isActive: boolean) {
    console.log("📦 [ADMIN-USER-SERVICE] Bulk updating user statuses:", { userIds: userIds.length, isActive })

    await this.logger.logSystemEvent("BULK_USER_UPDATE", `Admin bulk ${isActive ? 'activating' : 'deactivating'} ${userIds.length} users`)

    const result = await prisma.user.updateMany({
      where: { id: { in: userIds } },
      data: { isActive }
    })

    console.log(`✅ [ADMIN-USER-SERVICE] Bulk updated ${result.count} users`)
    return result
  }

  /**
   * Get users with advanced filters
   */
  async getUsersWithFilters(filters: {
    page?: number
    limit?: number
    search?: string
    status?: 'active' | 'inactive' | 'all'
    kycStatus?: KycStatus | 'all'
    role?: Role | 'all'
    dateFrom?: Date
    dateTo?: Date
  }) {
    console.log("🔍 [ADMIN-USER-SERVICE] Fetching users with filters:", filters)

    const page = filters.page || 1
    const limit = filters.limit || 50
    const skip = (page - 1) * limit

    const where: any = {}

    // Search filter
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' as const } },
        { email: { contains: filters.search, mode: 'insensitive' as const } },
        { phone: { contains: filters.search, mode: 'insensitive' as const } },
        { clientId: { contains: filters.search, mode: 'insensitive' as const } }
      ]
    }

    // Status filter
    if (filters.status && filters.status !== 'all') {
      where.isActive = filters.status === 'active'
    }

    // Role filter
    if (filters.role && filters.role !== 'all') {
      where.role = filters.role
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom
      if (filters.dateTo) where.createdAt.lte = filters.dateTo
    }

    // KYC status filter (via relation)
    if (filters.kycStatus && filters.kycStatus !== 'all') {
      where.kyc = {
        status: filters.kycStatus
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          tradingAccount: {
            select: {
              id: true,
              balance: true,
              availableMargin: true,
              usedMargin: true
            }
          },
          kyc: {
            select: {
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    console.log(`✅ [ADMIN-USER-SERVICE] Found ${users.length} users (total: ${total})`)

    return {
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        clientId: u.clientId,
        role: u.role,
        isActive: u.isActive,
        kycStatus: u.kyc?.status || 'NOT_SUBMITTED',
        tradingAccount: u.tradingAccount,
        createdAt: u.createdAt
      })),
      total,
      pages: Math.ceil(total / limit)
    }
  }

  /**
   * Get users managed by a specific Relationship Manager
   */
  async getUsersByRM(
    rmId: string,
    page: number = 1,
    limit: number = 50,
    search?: string
  ): Promise<{ users: UserSummary[]; total: number; pages: number }> {
    console.log("👥 [ADMIN-USER-SERVICE] Fetching users by RM:", { rmId, page, limit, search })

    const skip = (page - 1) * limit

    const where: any = {
      managedById: rmId
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { clientId: { contains: search, mode: 'insensitive' as const } }
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          tradingAccount: {
            select: {
              id: true,
              balance: true,
              availableMargin: true,
              usedMargin: true,
              _count: {
                select: {
                  orders: true,
                  positions: { where: { quantity: { not: 0 } } }
                }
              }
            }
          },
          kyc: {
            select: {
              status: true
            }
          },
          deposits: {
            where: { status: 'COMPLETED' },
            select: {
              amount: true
            }
          },
          withdrawals: {
            where: { status: 'COMPLETED' },
            select: {
              amount: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ])

    console.log(`✅ [ADMIN-USER-SERVICE] Found ${users.length} users managed by RM ${rmId} (total: ${total})`)

    const userSummaries: UserSummary[] = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      clientId: user.clientId,
      role: user.role,
      isActive: user.isActive,
      kycStatus: user.kyc?.status || 'NOT_SUBMITTED',
      tradingAccount: user.tradingAccount ? {
        id: user.tradingAccount.id,
        balance: user.tradingAccount.balance,
        availableMargin: user.tradingAccount.availableMargin,
        usedMargin: user.tradingAccount.usedMargin
      } : null,
      createdAt: user.createdAt,
      stats: {
        totalOrders: (user.tradingAccount as any)?._count?.orders || 0,
        activePositions: (user.tradingAccount as any)?._count?.positions || 0,
        totalDeposits: user.deposits.reduce((sum, d) => sum + Number(d.amount), 0),
        totalWithdrawals: user.withdrawals.reduce((sum, w) => sum + Number(w.amount), 0)
      }
    }))

    return {
      users: userSummaries,
      total,
      pages: Math.ceil(total / limit)
    }
  }

  /**
   * Verify user email or phone manually
   */
  async verifyContact(userId: string, type: 'email' | 'phone') {
    console.log("✅ [ADMIN-USER-SERVICE] Verifying contact:", { userId, type })

    await this.logger.logSystemEvent("CONTACT_VERIFIED", `Admin verified ${type} for user ${userId}`)

    const updateData: any = {}
    if (type === 'email') {
      updateData.emailVerified = new Date()
    } else {
      updateData.phoneVerified = new Date()
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    console.log(`✅ [ADMIN-USER-SERVICE] ${type} verified successfully`)
    return user
  }
}

/**
 * Create admin user service instance
 */
export function createAdminUserService(logger?: TradingLogger): AdminUserService {
  console.log("🏭 [ADMIN-USER-SERVICE] Creating service instance")
  return new AdminUserService(logger)
}

console.log("✅ [ADMIN-USER-SERVICE] Module initialized")