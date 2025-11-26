/**
 * @file RiskMonitoringJob.ts
 * @module risk
 * @description Background job that runs risk monitoring periodically
 * Can be triggered via cron or scheduled task
 * @author BharatERP
 * @created 2025-01-27
 */

import { RiskMonitoringService, RiskThresholds } from "./RiskMonitoringService"
import { TradingLogger } from "@/lib/services/logging/TradingLogger"

console.log("⏰ [RISK-MONITORING-JOB] Module loaded")

export class RiskMonitoringJob {
  private monitoringService: RiskMonitoringService
  private logger: TradingLogger
  private isRunning: boolean = false
  private intervalId: NodeJS.Timeout | null = null
  private thresholds: RiskThresholds

  constructor(
    thresholds?: RiskThresholds,
    logger?: TradingLogger
  ) {
    this.logger = logger || new TradingLogger()
    this.monitoringService = new RiskMonitoringService(this.logger)
    this.thresholds = thresholds || {
      warningThreshold: parseFloat(process.env.RISK_WARNING_THRESHOLD || '0.80'),
      autoCloseThreshold: parseFloat(process.env.RISK_AUTO_CLOSE_THRESHOLD || '0.90')
    }
    console.log("🏗️ [RISK-MONITORING-JOB] Job instance created", {
      thresholds: this.thresholds
    })
  }

  /**
   * Run risk monitoring once
   */
  async runOnce(): Promise<void> {
    if (this.isRunning) {
      console.warn("⚠️ [RISK-MONITORING-JOB] Monitoring already running, skipping")
      return
    }

    this.isRunning = true
    const startTime = Date.now()

    try {
      console.log("🚀 [RISK-MONITORING-JOB] Starting risk monitoring job")
      
      await this.logger.logPosition(
        "RISK_MONITORING_START",
        "Risk monitoring job started",
        { thresholds: this.thresholds }
      )

      const result = await this.monitoringService.monitorAllAccounts(this.thresholds)

      const duration = Date.now() - startTime
      console.log(`✅ [RISK-MONITORING-JOB] Risk monitoring completed in ${duration}ms`, {
        checkedAccounts: result.checkedAccounts,
        positionsClosed: result.positionsClosed,
        alertsCreated: result.alertsCreated,
        errors: result.errors
      })

      await this.logger.logPosition(
        "RISK_MONITORING_COMPLETE",
        `Risk monitoring completed: ${result.positionsClosed} positions closed, ${result.alertsCreated} alerts created`,
        {
          result: {
            checkedAccounts: result.checkedAccounts,
            positionsClosed: result.positionsClosed,
            alertsCreated: result.alertsCreated,
            errors: result.errors
          },
          duration
        }
      )

    } catch (error: any) {
      console.error("❌ [RISK-MONITORING-JOB] Risk monitoring job failed:", error)
      await this.logger.error(
        "RISK_MONITORING_JOB_FAILED",
        error.message,
        error
      )
      throw error
    } finally {
      this.isRunning = false
    }
  }

  /**
   * Start periodic risk monitoring
   * @param intervalMs Interval in milliseconds (default: 60 seconds)
   */
  start(intervalMs: number = 60000): void {
    if (this.intervalId) {
      console.warn("⚠️ [RISK-MONITORING-JOB] Job already started")
      return
    }

    console.log(`⏰ [RISK-MONITORING-JOB] Starting periodic risk monitoring (interval: ${intervalMs}ms)`)

    // Run immediately
    this.runOnce().catch(error => {
      console.error("❌ [RISK-MONITORING-JOB] Initial run failed:", error)
    })

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.runOnce().catch(error => {
        console.error("❌ [RISK-MONITORING-JOB] Periodic run failed:", error)
      })
    }, intervalMs)
  }

  /**
   * Stop periodic risk monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log("🛑 [RISK-MONITORING-JOB] Stopped periodic risk monitoring")
    }
  }

  /**
   * Check if job is currently running
   */
  getRunning(): boolean {
    return this.isRunning
  }
}

// Singleton instance for use in API routes or cron jobs
let jobInstance: RiskMonitoringJob | null = null

export function getRiskMonitoringJob(
  thresholds?: RiskThresholds,
  logger?: TradingLogger
): RiskMonitoringJob {
  if (!jobInstance) {
    jobInstance = new RiskMonitoringJob(thresholds, logger)
  }
  return jobInstance
}

console.log("✅ [RISK-MONITORING-JOB] Module initialized")
