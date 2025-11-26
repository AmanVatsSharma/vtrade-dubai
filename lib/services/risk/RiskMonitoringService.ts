/**
 * @file RiskMonitoringService.ts
 * @module risk
 * @description Server-side risk monitoring service that continuously monitors positions,
 * calculates P&L, and automatically closes positions when loss thresholds are breached.
 * Works even when client app is closed.
 * @author BharatERP
 * @created 2025-01-27
 */

import { prisma } from "@/lib/prisma"
import { PositionManagementService } from "@/lib/services/position/PositionManagementService"
import { TradingLogger } from "@/lib/services/logging/TradingLogger"
import { PositionRepository } from "@/lib/repositories/PositionRepository"

console.log("🛡️ [RISK-MONITORING-SERVICE] Module loaded")

export interface RiskMonitoringResult {
  checkedAccounts: number
  positionsChecked: number
  positionsClosed: number
  alertsCreated: number
  errors: number
  details: Array<{
    tradingAccountId: string
    userId: string
    userName: string
    totalUnrealizedPnL: number
    availableMargin: number
    marginUtilizationPercent: number
    positionsClosed: number
    alertCreated: boolean
  }>
}

export interface RiskThresholds {
  warningThreshold: number // e.g., 0.80 (80% of available margin)
  autoCloseThreshold: number // e.g., 0.90 (90% of available margin)
}

export class RiskMonitoringService {
  private positionService: PositionManagementService
  private positionRepo: PositionRepository
  private logger: TradingLogger
  private defaultThresholds: RiskThresholds = {
    warningThreshold: 0.80, // 80% - create alert
    autoCloseThreshold: 0.90 // 90% - auto close positions
  }

  constructor(logger?: TradingLogger) {
    this.logger = logger || new TradingLogger()
    this.positionService = new PositionManagementService(this.logger)
    this.positionRepo = new PositionRepository()
    console.log("🏗️ [RISK-MONITORING-SERVICE] Service instance created")
  }

  /**
   * Monitor all active trading accounts for risk
   * This is the main entry point for risk monitoring
   */
  async monitorAllAccounts(thresholds?: RiskThresholds): Promise<RiskMonitoringResult> {
    const config = thresholds || this.defaultThresholds
    console.log("🔍 [RISK-MONITORING-SERVICE] Starting risk monitoring for all accounts", {
      warningThreshold: config.warningThreshold,
      autoCloseThreshold: config.autoCloseThreshold
    })

    const result: RiskMonitoringResult = {
      checkedAccounts: 0,
      positionsChecked: 0,
      positionsClosed: 0,
      alertsCreated: 0,
      errors: 0,
      details: []
    }

    try {
      // Get all trading accounts with active positions
      const tradingAccounts = await prisma.tradingAccount.findMany({
        where: {
          positions: {
            some: {
              quantity: { not: 0 } // Only accounts with open positions
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              clientId: true
            }
          },
          positions: {
            where: {
              quantity: { not: 0 } // Only open positions
            },
            include: {
              Stock: {
                select: {
                  instrumentId: true,
                  ltp: true
                }
              }
            }
          }
        }
      })

      console.log(`📊 [RISK-MONITORING-SERVICE] Found ${tradingAccounts.length} accounts with open positions`)

      // Process each account
      for (const account of tradingAccounts) {
        try {
          result.checkedAccounts++
          const accountResult = await this.monitorAccount(
            account.id,
            account.user.id,
            config
          )

          result.positionsChecked += accountResult.positionsChecked
          result.positionsClosed += accountResult.positionsClosed
          if (accountResult.alertCreated) result.alertsCreated++

          result.details.push({
            tradingAccountId: account.id,
            userId: account.user.id,
            userName: account.user.name || account.user.email || 'Unknown',
            totalUnrealizedPnL: accountResult.totalUnrealizedPnL,
            availableMargin: accountResult.availableMargin,
            marginUtilizationPercent: accountResult.marginUtilizationPercent,
            positionsClosed: accountResult.positionsClosed,
            alertCreated: accountResult.alertCreated
          })

        } catch (error: any) {
          console.error(`❌ [RISK-MONITORING-SERVICE] Error monitoring account ${account.id}:`, error)
          result.errors++
          await this.logger.error("RISK_MONITORING_ACCOUNT_ERROR", error.message, error, {
            tradingAccountId: account.id,
            userId: account.user.id
          })
        }
      }

      console.log("✅ [RISK-MONITORING-SERVICE] Risk monitoring completed:", {
        checkedAccounts: result.checkedAccounts,
        positionsClosed: result.positionsClosed,
        alertsCreated: result.alertsCreated,
        errors: result.errors
      })

      return result

    } catch (error: any) {
      console.error("❌ [RISK-MONITORING-SERVICE] Fatal error in risk monitoring:", error)
      await this.logger.error("RISK_MONITORING_FATAL_ERROR", error.message, error)
      throw error
    }
  }

  /**
   * Monitor a specific trading account
   */
  private async monitorAccount(
    tradingAccountId: string,
    userId: string,
    thresholds: RiskThresholds
  ): Promise<{
    positionsChecked: number
    positionsClosed: number
    totalUnrealizedPnL: number
    availableMargin: number
    marginUtilizationPercent: number
    alertCreated: boolean
  }> {
    console.log(`🔍 [RISK-MONITORING-SERVICE] Monitoring account: ${tradingAccountId}`)

    // Get account with current margin
    const account = await prisma.tradingAccount.findUnique({
      where: { id: tradingAccountId },
      select: {
        availableMargin: true,
        usedMargin: true,
        balance: true
      }
    })

    if (!account) {
      throw new Error(`Trading account not found: ${tradingAccountId}`)
    }

    // Calculate unrealized P&L for all positions
    const pnlData = await this.positionService.calculateUnrealizedPnL(tradingAccountId)
    const totalUnrealizedPnL = pnlData.totalUnrealizedPnL

    // Calculate margin utilization
    // If loss exceeds available margin, we have a problem
    const totalAvailableFunds = account.availableMargin + account.balance
    const marginUtilizationPercent = totalAvailableFunds > 0 
      ? Math.abs(totalUnrealizedPnL) / totalAvailableFunds 
      : 0

    console.log(`📊 [RISK-MONITORING-SERVICE] Account ${tradingAccountId} risk metrics:`, {
      totalUnrealizedPnL,
      availableMargin: account.availableMargin,
      balance: account.balance,
      totalAvailableFunds,
      marginUtilizationPercent: (marginUtilizationPercent * 100).toFixed(2) + '%'
    })

    let positionsClosed = 0
    let alertCreated = false

    // Check if we've breached auto-close threshold
    if (marginUtilizationPercent >= thresholds.autoCloseThreshold) {
      console.log(`🚨 [RISK-MONITORING-SERVICE] AUTO-CLOSE THRESHOLD BREACHED for account ${tradingAccountId}`)
      console.log(`   Loss: ₹${totalUnrealizedPnL.toFixed(2)}, Available: ₹${totalAvailableFunds.toFixed(2)}`)
      console.log(`   Utilization: ${(marginUtilizationPercent * 100).toFixed(2)}%`)

      // Get all open positions sorted by loss (close worst positions first)
      const positions = await this.positionRepo.findActive(tradingAccountId)
      
      // Calculate individual position losses
      const positionsWithLoss = await Promise.all(
        positions.map(async (pos) => {
          try {
            const currentPrice = await this.getCurrentPrice(pos.Stock?.instrumentId || '')
            const avgPrice = Number(pos.averagePrice)
            const unrealizedPnL = (currentPrice - avgPrice) * pos.quantity
            return { position: pos, unrealizedPnL, currentPrice }
          } catch (error) {
            console.error(`❌ [RISK-MONITORING-SERVICE] Failed to get price for ${pos.symbol}:`, error)
            return { position: pos, unrealizedPnL: 0, currentPrice: 0 }
          }
        })
      )

      // Sort by loss (worst first)
      positionsWithLoss.sort((a, b) => a.unrealizedPnL - b.unrealizedPnL)

      // Close positions until we're below threshold
      for (const { position, unrealizedPnL } of positionsWithLoss) {
        if (unrealizedPnL >= 0) break // Only close losing positions
        
        try {
          console.log(`🔴 [RISK-MONITORING-SERVICE] Auto-closing position ${position.id} (${position.symbol})`)
          console.log(`   Loss: ₹${unrealizedPnL.toFixed(2)}`)

          await this.positionService.closePosition(
            position.id,
            tradingAccountId
          )

          positionsClosed++

          // Recalculate after closing
          const updatedPnl = await this.positionService.calculateUnrealizedPnL(tradingAccountId)
          const updatedAccount = await prisma.tradingAccount.findUnique({
            where: { id: tradingAccountId },
            select: { availableMargin: true, balance: true }
          })

          if (updatedAccount) {
            const updatedTotalFunds = updatedAccount.availableMargin + updatedAccount.balance
            const updatedUtilization = updatedTotalFunds > 0 
              ? Math.abs(updatedPnl.totalUnrealizedPnL) / updatedTotalFunds 
              : 0

            console.log(`📊 [RISK-MONITORING-SERVICE] After closing position, utilization: ${(updatedUtilization * 100).toFixed(2)}%`)

            // If we're below threshold now, stop closing
            if (updatedUtilization < thresholds.autoCloseThreshold) {
              console.log(`✅ [RISK-MONITORING-SERVICE] Risk reduced below threshold, stopping auto-close`)
              break
            }
          }

        } catch (error: any) {
          console.error(`❌ [RISK-MONITORING-SERVICE] Failed to auto-close position ${position.id}:`, error)
          await this.logger.error("RISK_AUTO_CLOSE_FAILED", error.message, error, {
            positionId: position.id,
            tradingAccountId
          })
        }
      }

      // Create critical alert
      await this.createRiskAlert(
        userId,
        'MARGIN_CALL',
        'CRITICAL',
        `Auto-closed ${positionsClosed} position(s) due to loss exceeding ${(thresholds.autoCloseThreshold * 100).toFixed(0)}% of available funds. Total loss: ₹${totalUnrealizedPnL.toFixed(2)}`
      )
      alertCreated = true

    } else if (marginUtilizationPercent >= thresholds.warningThreshold) {
      // Warning threshold - create alert but don't auto-close
      console.log(`⚠️ [RISK-MONITORING-SERVICE] WARNING THRESHOLD BREACHED for account ${tradingAccountId}`)
      
      await this.createRiskAlert(
        userId,
        'LARGE_LOSS',
        'HIGH',
        `Unrealized loss (₹${totalUnrealizedPnL.toFixed(2)}) exceeds ${(thresholds.warningThreshold * 100).toFixed(0)}% of available funds (₹${totalAvailableFunds.toFixed(2)}). Current utilization: ${(marginUtilizationPercent * 100).toFixed(2)}%`
      )
      alertCreated = true
    }

    return {
      positionsChecked: pnlData.positions.length,
      positionsClosed,
      totalUnrealizedPnL,
      availableMargin: account.availableMargin,
      marginUtilizationPercent,
      alertCreated
    }
  }

  /**
   * Get current market price for a stock
   */
  private async getCurrentPrice(instrumentId: string): Promise<number> {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
        || 'https://www.marketpulse360.live'
      
      const response = await fetch(
        `${baseUrl}/api/quotes?q=${instrumentId}&mode=ltp`,
        { cache: 'no-store', next: { revalidate: 0 } }
      )

      const data = await response.json()
      const payload = data?.success ? data.data : data
      const ltp = payload?.[instrumentId]?.last_trade_price || 
                  payload?.data?.[instrumentId]?.last_trade_price

      if (ltp && ltp > 0) {
        return Number(ltp)
      }

      // Fallback to stock's last known price
      const stock = await prisma.stock.findFirst({
        where: { instrumentId },
        select: { ltp: true }
      })

      if (stock && stock.ltp > 0) {
        return stock.ltp
      }

      throw new Error("Unable to determine current price")

    } catch (error: any) {
      console.error(`❌ [RISK-MONITORING-SERVICE] Failed to fetch price for ${instrumentId}:`, error)
      throw error
    }
  }

  /**
   * Create a risk alert
   */
  private async createRiskAlert(
    userId: string,
    type: string,
    severity: string,
    message: string
  ): Promise<void> {
    try {
      await prisma.riskAlert.create({
        data: {
          userId,
          type,
          severity,
          message,
          resolved: false
        }
      })

      console.log(`📢 [RISK-MONITORING-SERVICE] Risk alert created:`, {
        userId,
        type,
        severity,
        message
      })

    } catch (error: any) {
      console.error(`❌ [RISK-MONITORING-SERVICE] Failed to create risk alert:`, error)
      // Don't throw - alert creation failure shouldn't stop monitoring
    }
  }
}

/**
 * Create risk monitoring service instance
 */
export function createRiskMonitoringService(logger?: TradingLogger): RiskMonitoringService {
  console.log("🏭 [RISK-MONITORING-SERVICE] Creating service instance")
  return new RiskMonitoringService(logger)
}

console.log("✅ [RISK-MONITORING-SERVICE] Module initialized")
