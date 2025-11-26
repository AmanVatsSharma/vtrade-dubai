/**
 * @file RiskEventMonitor.ts
 * @module risk
 * @description Event-driven risk monitoring - triggers checks immediately on position/order updates
 * Alternative to cron-based monitoring
 * @author BharatERP
 * @created 2025-01-27
 */

import { EventEmitter } from 'events'
import { RiskMonitoringService, RiskThresholds } from './RiskMonitoringService'
import { prisma } from '@/lib/prisma'

console.log("📡 [RISK-EVENT-MONITOR] Module loaded")

interface AccountCheck {
  tradingAccountId: string
  userId: string
  timestamp: number
}

export class RiskEventMonitor extends EventEmitter {
  private monitoringService: RiskMonitoringService
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private readonly DEBOUNCE_MS = 5000 // 5 seconds debounce
  private defaultThresholds: RiskThresholds = {
    warningThreshold: 0.80,
    autoCloseThreshold: 0.90
  }

  constructor(thresholds?: RiskThresholds) {
    super()
    this.monitoringService = new RiskMonitoringService()
    if (thresholds) {
      this.defaultThresholds = thresholds
    }
    console.log("🏗️ [RISK-EVENT-MONITOR] Event monitor instance created")
  }

  /**
   * Initialize event listeners
   * Call this when your app starts
   */
  initialize() {
    console.log("🚀 [RISK-EVENT-MONITOR] Initializing event listeners")
    
    // Listen to position updates
    this.on('position:updated', (data: AccountCheck) => {
      this.debouncedCheck(data.tradingAccountId, data.userId)
    })

    // Listen to order executions
    this.on('order:executed', (data: AccountCheck) => {
      this.debouncedCheck(data.tradingAccountId, data.userId)
    })

    // Listen to margin changes
    this.on('margin:changed', (data: AccountCheck) => {
      this.debouncedCheck(data.tradingAccountId, data.userId)
    })

    console.log("✅ [RISK-EVENT-MONITOR] Event listeners initialized")
  }

  /**
   * Trigger risk check for an account (with debouncing)
   */
  private debouncedCheck(tradingAccountId: string, userId: string) {
    const key = tradingAccountId
    const existing = this.debounceTimers.get(key)
    
    if (existing) {
      clearTimeout(existing)
      console.log(`⏱️ [RISK-EVENT-MONITOR] Debouncing check for account ${tradingAccountId}`)
    }

    const timer = setTimeout(async () => {
      try {
        console.log(`🔍 [RISK-EVENT-MONITOR] Running risk check for account ${tradingAccountId}`)
        
        await this.monitoringService.monitorAccount(
          tradingAccountId,
          userId,
          this.defaultThresholds
        )
        
        this.debounceTimers.delete(key)
        console.log(`✅ [RISK-EVENT-MONITOR] Risk check completed for account ${tradingAccountId}`)
      } catch (error: any) {
        console.error(`❌ [RISK-EVENT-MONITOR] Risk check failed for account ${tradingAccountId}:`, error)
        this.debounceTimers.delete(key)
      }
    }, this.DEBOUNCE_MS)

    this.debounceTimers.set(key, timer)
  }

  /**
   * Manually trigger check (no debounce)
   */
  async checkNow(tradingAccountId: string, userId: string): Promise<void> {
    // Clear any pending debounced check
    const existing = this.debounceTimers.get(tradingAccountId)
    if (existing) {
      clearTimeout(existing)
      this.debounceTimers.delete(tradingAccountId)
    }

    await this.monitoringService.monitorAccount(
      tradingAccountId,
      userId,
      this.defaultThresholds
    )
  }

  /**
   * Cleanup - call when shutting down
   */
  cleanup() {
    console.log("🧹 [RISK-EVENT-MONITOR] Cleaning up event monitor")
    this.debounceTimers.forEach((timer) => clearTimeout(timer))
    this.debounceTimers.clear()
    this.removeAllListeners()
  }
}

// Singleton instance
let eventMonitorInstance: RiskEventMonitor | null = null

export function getRiskEventMonitor(thresholds?: RiskThresholds): RiskEventMonitor {
  if (!eventMonitorInstance) {
    eventMonitorInstance = new RiskEventMonitor(thresholds)
    eventMonitorInstance.initialize()
  }
  return eventMonitorInstance
}

// Helper function to emit events from other services
export async function triggerRiskCheck(tradingAccountId: string, userId: string) {
  const monitor = getRiskEventMonitor()
  monitor.emit('position:updated', { tradingAccountId, userId, timestamp: Date.now() })
}

console.log("✅ [RISK-EVENT-MONITOR] Module initialized")
