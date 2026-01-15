/**
 * @file route.ts
 * @module admin-console
 * @description API route for financial reports
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminPermissions } from "@/lib/rbac/admin-guard"

export async function GET(req: Request) {
  console.log("🌐 [API-ADMIN-FINANCIAL-REPORTS] GET request received")

  try {
    const authResult = await requireAdminPermissions(req, "admin.reports.read")
    if (!authResult.ok) return authResult.response

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined

    console.log("💰 [API-ADMIN-FINANCIAL-REPORTS] Fetching reports for period:", period)

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    if (dateFrom) {
      startDate = dateFrom
    } else {
      switch (period) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
          break
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
    }

    const endDate = dateTo || now

    // Fetch financial data
    const [deposits, withdrawals, trades, orders] = await Promise.all([
      prisma.deposit.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      }),
      prisma.withdrawal.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED'
        },
        _sum: { amount: true }
      }),
      prisma.trade.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        },
        select: {
          amount: true,
          type: true
        }
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'EXECUTED'
        }
      })
    ])

    // Calculate metrics
    const revenue = Number(deposits._sum.amount || 0)
    const expenses = Number(withdrawals._sum.amount || 0)
    const profit = revenue - expenses
    const commission = profit * 0.1 // 10% commission (example)
    const totalTrades = orders
    const activeUsers = await prisma.user.count({
      where: {
        isActive: true,
        updatedAt: { gte: startDate }
      }
    })

    // Generate period label
    const periodLabel = period === 'month' 
      ? now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`

    const reports = [{
      id: '1',
      period: periodLabel,
      revenue,
      expenses,
      profit,
      commission,
      trades: totalTrades,
      users: activeUsers,
    }]

    console.log("✅ [API-ADMIN-FINANCIAL-REPORTS] Reports generated")

    return NextResponse.json({ reports }, { status: 200 })

  } catch (error: any) {
    console.error("❌ [API-ADMIN-FINANCIAL-REPORTS] GET error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch financial reports" },
      { status: 500 }
    )
  }
}
