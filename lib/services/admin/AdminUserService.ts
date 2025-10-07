/**
 * Admin User Service
 * 
 * Handles all admin operations for user management:
 * - View all users
 * - View user details
 * - Update user status
 * - View user trading activity
 * - User statistics
 */

import { prisma } from "@/lib/prisma"
import { Role } from "@prisma/client"
import { TradingLogger } from "@/lib/services/logging/TradingLogger"

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
}

/**
 * Create admin user service instance
 */
export function createAdminUserService(logger?: TradingLogger): AdminUserService {
  console.log("🏭 [ADMIN-USER-SERVICE] Creating service instance")
  return new AdminUserService(logger)
}

console.log("✅ [ADMIN-USER-SERVICE] Module initialized")