/**
 * @file RiskMonitoringIntegration.ts
 * @module risk
 * @description Integration helpers to easily add risk monitoring to existing services
 * @author BharatERP
 * @created 2025-01-27
 */

import { getRiskEventMonitor, triggerRiskCheck } from './RiskEventMonitor'
import { RiskMonitoringService } from './RiskMonitoringService'

/**
 * Initialize risk monitoring on app startup
 * Call this in your app initialization (e.g., middleware.ts or app startup)
 */
export function initializeRiskMonitoring() {
  console.log("🛡️ [RISK-INTEGRATION] Initializing risk monitoring")
  
  // Initialize event-driven monitoring
  const eventMonitor = getRiskEventMonitor()
  console.log("✅ [RISK-INTEGRATION] Event-driven monitoring initialized")
  
  return eventMonitor
}

/**
 * Helper to trigger risk check after position update
 * Use this in your position update handlers
 */
export async function checkRiskAfterPositionUpdate(
  tradingAccountId: string,
  userId: string
): Promise<void> {
  try {
    // Trigger event-driven check (debounced)
    await triggerRiskCheck(tradingAccountId, userId)
    console.log(`📊 [RISK-INTEGRATION] Risk check triggered for account ${tradingAccountId}`)
  } catch (error: any) {
    console.error(`❌ [RISK-INTEGRATION] Failed to trigger risk check:`, error)
    // Don't throw - risk check failure shouldn't block position updates
  }
}

/**
 * Helper to trigger risk check after order execution
 * Use this in your order execution handlers
 */
export async function checkRiskAfterOrderExecution(
  tradingAccountId: string,
  userId: string
): Promise<void> {
  return checkRiskAfterPositionUpdate(tradingAccountId, userId)
}

/**
 * Helper to trigger risk check after margin change
 * Use this when margin is blocked/released
 */
export async function checkRiskAfterMarginChange(
  tradingAccountId: string,
  userId: string
): Promise<void> {
  return checkRiskAfterPositionUpdate(tradingAccountId, userId)
}

/**
 * Get risk monitoring service instance
 */
export function getRiskMonitoringService(): RiskMonitoringService {
  return new RiskMonitoringService()
}
