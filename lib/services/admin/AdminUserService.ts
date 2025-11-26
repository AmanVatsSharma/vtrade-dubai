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
   * Generate unique client ID
   */
  private generateClientId(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const randomLetters = Array.from({ length: 2 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("")
    const randomNumbers = Math.floor(1000 + Math.random() * 9000)
    return randomLetters + randomNumbers
  }

  /**
   * Create a new user with trading account and KYC
   */
  async createUser(input: {
    name: string
    email: string
    phone: string
    password: string
    initialBalance?: number
  }) {
    console.log("👤 [ADMIN-USER-SERVICE] Creating new user:", { email: input.email, name: input.name })
    
    try {
      await this.logger.info("ADMIN_CREATE_USER_START", "Admin creating new user", {
        email: input.email,
        name: input.name
      })

      // Check if email already exists
      const existingEmail = await prisma.user.findUnique({
        where: { email: input.email }
      })
      if (existingEmail) {
        throw new Error("Email already registered")
      }

      // Check if phone already exists
      if (input.phone) {
        const existingPhone = await prisma.user.findUnique({
          where: { phone: input.phone }
        })
        if (existingPhone) {
          throw new Error("Phone number already registered")
        }
      }

      // Generate unique client ID
      let clientId = this.generateClientId()
      let attempts = 0
      while (attempts < 10) {
        const existing = await prisma.user.findUnique({
          where: { clientId }
        })
        if (!existing) break
        clientId = this.generateClientId()
        attempts++
      }
      if (attempts >= 10) {
        throw new Error("Failed to generate unique client ID")
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10)

      // Create user, trading account, and KYC in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            phone: input.phone,
            password: hashedPassword,
            clientId,
            role: Role.USER,
            isActive: true,
            emailVerified: new Date(), // Auto-verify for admin-created users
            phoneVerified: new Date(), // Auto-verify for admin-created users
          }
        })

        // Create trading account
        const tradingAccount = await tx.tradingAccount.create({
          data: {
            userId: newUser.id,
            clientId,
            balance: input.initialBalance || 0,
            availableMargin: input.initialBalance || 0,
            usedMargin: 0,
          }
        })

        // Create default KYC record
        await tx.kYC.create({
          data: {
            userId: newUser.id,
            aadhaarNumber: "",
            panNumber: "",
            bankProofUrl: "",
            status: KycStatus.PENDING,
          }
        })

        return { user: newUser, tradingAccount }
      })

      await this.logger.info("ADMIN_CREATE_USER_COMPLETED", "User created successfully", {
        userId: result.user.id,
        clientId: result.user.clientId,
        email: result.user.email
      })

      console.log("✅ [ADMIN-USER-SERVICE] User created successfully:", {
        id: result.user.id,
        clientId: result.user.clientId,
        email: result.user.email
      })

      return {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        clientId: result.user.clientId,
        password: input.password, // Return plain password for display
        tradingAccount: {
          id: result.tradingAccount.id,
          balance: result.tradingAccount.balance,
        }
      }
    } catch (error: any) {
      console.error("❌ [ADMIN-USER-SERVICE] Create user failed:", error)
      await this.logger.error("ADMIN_CREATE_USER_FAILED", error.message, error, { email: input.email })
      throw error
    }
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
   * Update trading account funds (Super Admin only)
   * Allows direct manipulation of balance, availableMargin, and usedMargin
   */
  async updateTradingAccountFunds(
    userId: string,
    updates: {
      balance?: number
      availableMargin?: number
      usedMargin?: number
    },
    reason?: string
  ) {
    console.log("💰 [ADMIN-USER-SERVICE] Updating trading account funds:", { userId, updates })

    await this.logger.logSystemEvent("TRADING_ACCOUNT_FUNDS_UPDATE", `Admin updating trading account funds for user ${userId}`, {
      userId,
      updates,
      reason
    })

    // Validate inputs
    if (updates.balance !== undefined && (!Number.isFinite(updates.balance) || updates.balance < 0)) {
      throw new Error("Balance must be a non-negative number")
    }
    if (updates.availableMargin !== undefined && (!Number.isFinite(updates.availableMargin) || updates.availableMargin < 0)) {
      throw new Error("Available margin must be a non-negative number")
    }
    if (updates.usedMargin !== undefined && (!Number.isFinite(updates.usedMargin) || updates.usedMargin < 0)) {
      throw new Error("Used margin must be a non-negative number")
    }

    // Get user's trading account
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { tradingAccount: true }
    })

    if (!user) {
      throw new Error("User not found")
    }

    if (!user.tradingAccount) {
      throw new Error("User does not have a trading account")
    }

    const oldBalance = Number(user.tradingAccount.balance)
    const oldAvailableMargin = Number(user.tradingAccount.availableMargin)
    const oldUsedMargin = Number(user.tradingAccount.usedMargin)

    // Calculate deltas for transaction record
    const balanceDelta = updates.balance !== undefined ? updates.balance - oldBalance : 0
    const availableMarginDelta = updates.availableMargin !== undefined ? updates.availableMargin - oldAvailableMargin : 0
    const usedMarginDelta = updates.usedMargin !== undefined ? updates.usedMargin - oldUsedMargin : 0

    // Update trading account and create transaction record
    const result = await prisma.$transaction(async (tx) => {
      // Update trading account
      const updatedAccount = await tx.tradingAccount.update({
        where: { id: user.tradingAccount!.id },
        data: {
          ...(updates.balance !== undefined && { balance: updates.balance }),
          ...(updates.availableMargin !== undefined && { availableMargin: updates.availableMargin }),
          ...(updates.usedMargin !== undefined && { usedMargin: updates.usedMargin })
        }
      })

      // Create transaction record for balance changes
      if (balanceDelta !== 0) {
        await tx.transaction.create({
          data: {
            tradingAccountId: user.tradingAccount.id,
            type: balanceDelta > 0 ? 'CREDIT' : 'DEBIT',
            amount: Math.abs(balanceDelta),
            description: reason || `Admin manual fund adjustment: Balance ${balanceDelta > 0 ? 'increased' : 'decreased'} by ₹${Math.abs(balanceDelta).toLocaleString()}`
          }
        })
      }

      // Create transaction record for margin changes
      if (availableMarginDelta !== 0 || usedMarginDelta !== 0) {
        const marginDescription = `Admin manual margin adjustment: ` +
          (availableMarginDelta !== 0 ? `Available ${availableMarginDelta > 0 ? '+' : ''}₹${availableMarginDelta.toLocaleString()}` : '') +
          (usedMarginDelta !== 0 ? ` Used ${usedMarginDelta > 0 ? '+' : ''}₹${usedMarginDelta.toLocaleString()}` : '')
        
        await tx.transaction.create({
          data: {
            tradingAccountId: user.tradingAccount.id,
            type: (availableMarginDelta - usedMarginDelta) > 0 ? 'CREDIT' : 'DEBIT',
            amount: Math.abs(availableMarginDelta - usedMarginDelta) || Math.abs(availableMarginDelta) || Math.abs(usedMarginDelta),
            description: reason || marginDescription
          }
        })
      }

      return updatedAccount
    })

    console.log("✅ [ADMIN-USER-SERVICE] Trading account funds updated successfully:", {
      oldBalance,
      newBalance: updates.balance ?? oldBalance,
      oldAvailableMargin,
      newAvailableMargin: updates.availableMargin ?? oldAvailableMargin,
      oldUsedMargin,
      newUsedMargin: updates.usedMargin ?? oldUsedMargin
    })

    return result
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

  /**
   * Get top traders by profit and win rate
   */
  async getTopTraders(limit: number = 10) {
    console.log("🏆 [ADMIN-USER-SERVICE] Fetching top traders:", { limit })

    // Get users with their trading accounts and positions
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        tradingAccount: {
          isNot: null
        }
      },
      include: {
        tradingAccount: {
          include: {
            positions: {
              where: {
                quantity: { not: 0 }
              }
            },
            orders: {
              where: {
                status: 'EXECUTED'
              }
            },
            trades: {
              where: {
                type: 'CREDIT'
              }
            }
          }
        }
      },
      take: limit * 2 // Get more to calculate win rate
    })

    // Calculate metrics for each user
    const traders = users
      .map(user => {
        if (!user.tradingAccount) return null

        const positions = user.tradingAccount.positions || []
        const orders = user.tradingAccount.orders || []
        const trades = user.tradingAccount.trades || []

        // Calculate total profit from positions (unrealized PnL)
        const totalProfit = positions.reduce((sum, pos) => {
          return sum + Number(pos.unrealizedPnL || 0)
        }, 0)

        // Calculate win rate from executed orders
        const totalTrades = orders.length
        const winningTrades = orders.filter(order => {
          // Find corresponding position to check if profitable
          const position = positions.find(p => p.symbol === order.symbol)
          if (!position) return false
          return Number(position.unrealizedPnL || 0) > 0
        }).length

        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

        return {
          id: user.id,
          name: user.name || 'Unknown',
          clientId: user.clientId || user.id.slice(0, 10),
          profit: totalProfit,
          trades: totalTrades,
          winRate: Math.round(winRate)
        }
      })
      .filter((t): t is NonNullable<typeof t> => t !== null && t.trades > 0) // Only traders with actual trades
      .sort((a, b) => b.profit - a.profit) // Sort by profit descending
      .slice(0, limit) // Take top N

    console.log(`✅ [ADMIN-USER-SERVICE] Found ${traders.length} top traders`)
    return traders
  }

  /**
   * Get system alerts from risk alerts and system health
   */
  async getSystemAlerts(limit: number = 10) {
    console.log("🚨 [ADMIN-USER-SERVICE] Fetching system alerts:", { limit })

    const [riskAlerts, recentErrors] = await Promise.all([
      // Get unresolved risk alerts
      prisma.riskAlert.findMany({
        where: {
          resolved: false
        },
        include: {
          user: {
            select: {
              name: true,
              clientId: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      }),
      // Get recent critical system errors from logs
      prisma.tradingLog.findMany({
        where: {
          level: 'ERROR',
          category: 'SYSTEM'
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit / 2
      })
    ])

    // Format risk alerts
    const alerts = [
      ...riskAlerts.map(alert => ({
        id: alert.id,
        type: alert.severity === 'CRITICAL' ? 'error' : 'warning',
        message: `${alert.type}: ${alert.message}`,
        time: alert.createdAt,
        user: alert.user?.name || alert.user?.clientId || 'Unknown'
      })),
      ...recentErrors.map(log => ({
        id: log.id,
        type: 'error',
        message: log.message,
        time: log.createdAt,
        user: 'System'
      }))
    ]
      .sort((a, b) => b.time.getTime() - a.time.getTime())
      .slice(0, limit)
      .map(alert => ({
        ...alert,
        time: this.getTimeAgo(alert.time)
      }))

    console.log(`✅ [ADMIN-USER-SERVICE] Found ${alerts.length} system alerts`)
    return alerts
  }

  /**
   * Get trading chart data (volume and price over time)
   */
  async getTradingChartData(days: number = 7) {
    console.log("📈 [ADMIN-USER-SERVICE] Fetching trading chart data:", { days })

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Get orders grouped by day
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate
        },
        status: 'EXECUTED'
      },
      select: {
        createdAt: true,
        quantity: true,
        averagePrice: true,
        price: true
      }
    })

    // Group by day and calculate metrics
    const dailyData: { [key: string]: { volume: number; prices: number[] } } = {}

    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0]
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { volume: 0, prices: [] }
      }
      dailyData[dateKey].volume += order.quantity
      const price = Number(order.averagePrice || order.price || 0)
      if (price > 0) {
        dailyData[dateKey].prices.push(price)
      }
    })

    // Convert to chart format
    const chartData = Object.entries(dailyData)
      .map(([date, data]) => {
        const avgPrice = data.prices.length > 0
          ? data.prices.reduce((sum, p) => sum + p, 0) / data.prices.length
          : 0

        return {
          time: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          date: date,
          price: Math.round(avgPrice),
          volume: data.volume
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date))

    // Fill in missing days with zero values
    const filledData = []
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      const existing = chartData.find(d => d.date === dateKey)
      filledData.push(existing || {
        time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        date: dateKey,
        price: 0,
        volume: 0
      })
    }

    console.log(`✅ [ADMIN-USER-SERVICE] Generated chart data for ${filledData.length} days`)
    return filledData
  }

  /**
   * Get user activity chart data (daily active and new users)
   */
  async getUserActivityChartData(days: number = 7) {
    console.log("👥 [ADMIN-USER-SERVICE] Fetching user activity chart data:", { days })

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    // Get all users created in the period
    const allUsers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      select: {
        createdAt: true,
        id: true
      }
    })

    // Get active users (users who logged in or placed orders)
    // Use a simpler approach: get users with orders or recent sessions
    const [orders, sessions] = await Promise.all([
      prisma.order.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          tradingAccount: {
            select: {
              userId: true
            }
          },
          createdAt: true
        }
      }),
      prisma.sessionAuth.findMany({
        where: {
          lastActivity: { gte: startDate }
        },
        select: {
          userId: true,
          lastActivity: true
        }
      })
    ])

    // Group by user and date to get unique user-date combinations
    const userDateMap = new Map<string, Date>()
    
    orders.forEach(o => {
      const userId = o.tradingAccount.userId
      const dateKey = o.createdAt.toISOString().split('T')[0]
      const key = `${userId}-${dateKey}`
      if (!userDateMap.has(key) || userDateMap.get(key)! < o.createdAt) {
        userDateMap.set(key, o.createdAt)
      }
    })

    sessions.forEach(s => {
      const dateKey = s.lastActivity.toISOString().split('T')[0]
      const key = `${s.userId}-${dateKey}`
      if (!userDateMap.has(key) || userDateMap.get(key)! < s.lastActivity) {
        userDateMap.set(key, s.lastActivity)
      }
    })

    // Convert to array format
    const activeUserIds = Array.from(userDateMap.entries()).map(([key, date]) => {
      const [userId] = key.split('-')
      return { userId, date }
    })

    // Group by day
    const dailyData: { [key: string]: { active: Set<string>; new: Set<string> } } = {}

    // Process new users
    allUsers.forEach(user => {
      const dateKey = user.createdAt.toISOString().split('T')[0]
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { active: new Set(), new: new Set() }
      }
      dailyData[dateKey].new.add(user.id)
    })

    // Process active users
    activeUserIds.forEach(item => {
      const dateKey = item.date.toISOString().split('T')[0]
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { active: new Set(), new: new Set() }
      }
      dailyData[dateKey].active.add(item.userId)
    })

    // Convert to chart format
    const chartData = []
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      const data = dailyData[dateKey] || { active: new Set(), new: new Set() }

      chartData.push({
        day: dayNames[date.getDay()],
        date: dateKey,
        active: data.active.size,
        new: data.new.size
      })
    }

    console.log(`✅ [ADMIN-USER-SERVICE] Generated activity data for ${chartData.length} days`)
    return chartData
  }

  /**
   * Helper to format time ago
   */
  private getTimeAgo(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
    if (seconds < 60) return `${seconds} sec ago`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
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