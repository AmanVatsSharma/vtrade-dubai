/**
 * Margin Calculator Service
 * 
 * Calculates required margin for different segments and product types:
 * - NSE Equity: MIS (Intraday), CNC (Delivery)
 * - NFO F&O: Futures, Options
 * - MCX Commodities
 * 
 * Uses risk_config table for configurable leverage and margin rates
 */

import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

console.log("📊 [MARGIN-CALCULATOR] Module loaded")

export interface MarginCalculation {
  requiredMargin: number
  leverage: number
  turnover: number
  segment: string
  productType: string
  brokerage: number
  totalCharges: number
  totalRequired: number
}

export interface BrokerageCalculation {
  brokerage: number
  stt: number
  transactionCharges: number
  gst: number
  stampDuty: number
  total: number
}

export class MarginCalculator {
  
  /**
   * Calculate required margin for an order
   */
  async calculateMargin(
    segment: string,
    productType: string,
    quantity: number,
    price: number,
    lotSize: number = 1
  ): Promise<MarginCalculation> {
    console.log("💹 [MARGIN-CALCULATOR] Calculating margin:", {
      segment,
      productType,
      quantity,
      price,
      lotSize
    })

    const turnover = quantity * price
    console.log("💰 [MARGIN-CALCULATOR] Turnover calculated:", turnover)

    // Fetch risk config from database
    const riskConfig = await this.getRiskConfig(segment, productType)
    console.log("⚙️ [MARGIN-CALCULATOR] Risk config fetched:", riskConfig)

    const leverage = riskConfig?.leverage || this.getDefaultLeverage(segment, productType)
    const requiredMargin = Math.floor(turnover / leverage)

    console.log("📈 [MARGIN-CALCULATOR] Margin calculation:", {
      leverage,
      requiredMargin
    })

    // Calculate brokerage
    const brokerageCalc = this.calculateBrokerage(
      segment,
      productType,
      turnover,
      quantity,
      lotSize,
      riskConfig
    )

    console.log("💸 [MARGIN-CALCULATOR] Brokerage calculated:", brokerageCalc)

    const totalCharges = Math.floor(brokerageCalc.total)
    const totalRequired = requiredMargin + totalCharges

    const result: MarginCalculation = {
      requiredMargin,
      leverage,
      turnover,
      segment,
      productType,
      brokerage: brokerageCalc.brokerage,
      totalCharges,
      totalRequired
    }

    console.log("✅ [MARGIN-CALCULATOR] Final margin calculation:", result)
    return result
  }

  /**
   * Get risk configuration from database
   */
  private async getRiskConfig(segment: string, productType: string) {
    console.log("🔍 [MARGIN-CALCULATOR] Fetching risk config:", { segment, productType })
    
    try {
      const config = await prisma.riskConfig.findFirst({
        where: {
          segment,
          productType,
          active: true
        }
      })

      if (config) {
        console.log("✅ [MARGIN-CALCULATOR] Risk config found:", config.id)
      } else {
        console.log("⚠️ [MARGIN-CALCULATOR] No risk config found, using defaults")
      }

      return config
    } catch (error) {
      console.error("❌ [MARGIN-CALCULATOR] Error fetching risk config:", error)
      return null
    }
  }

  /**
   * Get default leverage if no risk config found
   */
  private getDefaultLeverage(segment: string, productType: string): number {
    console.log("🔧 [MARGIN-CALCULATOR] Getting default leverage:", { segment, productType })
    
    const normalizedSegment = segment.toUpperCase()
    const normalizedProduct = productType.toUpperCase()

    // NSE Equity
    if (normalizedSegment === 'NSE' || normalizedSegment === 'NSE_EQ') {
      if (normalizedProduct === 'MIS' || normalizedProduct === 'INTRADAY') {
        console.log("📊 [MARGIN-CALCULATOR] NSE MIS leverage: 200")
        return 200 // 0.5% margin (200x leverage)
      }
      if (normalizedProduct === 'CNC' || normalizedProduct === 'DELIVERY') {
        console.log("📊 [MARGIN-CALCULATOR] NSE CNC leverage: 50")
        return 50 // 2% margin (50x leverage)
      }
    }

    // NFO F&O
    if (normalizedSegment === 'NFO' || normalizedSegment === 'FNO') {
      console.log("📊 [MARGIN-CALCULATOR] NFO leverage: 100")
      return 100 // 1% margin (100x leverage)
    }

    // MCX Commodities
    if (normalizedSegment === 'MCX') {
      console.log("📊 [MARGIN-CALCULATOR] MCX leverage: 50")
      return 50
    }

    console.log("📊 [MARGIN-CALCULATOR] Default leverage: 1 (no leverage)")
    return 1 // No leverage (100% margin)
  }

  /**
   * Calculate brokerage and charges
   */
  private calculateBrokerage(
    segment: string,
    productType: string,
    turnover: number,
    quantity: number,
    lotSize: number = 1,
    riskConfig: any = null
  ): BrokerageCalculation {
    console.log("💸 [MARGIN-CALCULATOR] Calculating brokerage:", {
      segment,
      productType,
      turnover,
      quantity,
      lotSize
    })

    let brokerage = 0

    // Check if we have custom brokerage config
    if (riskConfig?.brokerageFlat !== null && riskConfig?.brokerageFlat !== undefined) {
      brokerage = Number(riskConfig.brokerageFlat)
      console.log("💰 [MARGIN-CALCULATOR] Using flat brokerage:", brokerage)
    } else if (riskConfig?.brokerageRate !== null && riskConfig?.brokerageRate !== undefined) {
      const rate = Number(riskConfig.brokerageRate)
      brokerage = turnover * rate
      
      if (riskConfig?.brokerageCap !== null && riskConfig?.brokerageCap !== undefined) {
        const cap = Number(riskConfig.brokerageCap)
        brokerage = Math.min(brokerage, cap)
        console.log("💰 [MARGIN-CALCULATOR] Rate-based brokerage with cap:", { brokerage, rate, cap })
      } else {
        console.log("💰 [MARGIN-CALCULATOR] Rate-based brokerage:", { brokerage, rate })
      }
    } else {
      // Default brokerage calculation
      brokerage = this.getDefaultBrokerage(segment, productType, turnover, quantity, lotSize)
      console.log("💰 [MARGIN-CALCULATOR] Default brokerage:", brokerage)
    }

    // Calculate other charges (simplified)
    const stt = this.calculateSTT(segment, productType, turnover)
    const transactionCharges = turnover * 0.0000325 // NSE transaction charges
    const gst = (brokerage + transactionCharges) * 0.18 // 18% GST
    const stampDuty = turnover * 0.00003 // Stamp duty

    console.log("📊 [MARGIN-CALCULATOR] Charge breakdown:", {
      brokerage,
      stt,
      transactionCharges,
      gst,
      stampDuty
    })

    const total = brokerage + stt + transactionCharges + gst + stampDuty

    return {
      brokerage,
      stt,
      transactionCharges,
      gst,
      stampDuty,
      total
    }
  }

  /**
   * Calculate STT (Securities Transaction Tax)
   */
  private calculateSTT(segment: string, productType: string, turnover: number): number {
    const normalizedSegment = segment.toUpperCase()
    const normalizedProduct = productType.toUpperCase()

    // Equity delivery: 0.1% on both buy and sell
    if (normalizedSegment === 'NSE' && normalizedProduct === 'CNC') {
      return turnover * 0.001
    }

    // Equity intraday: 0.025% on sell side only
    if (normalizedSegment === 'NSE' && normalizedProduct === 'MIS') {
      return turnover * 0.00025
    }

    // F&O: 0.0125% on sell side for options, 0.01% for futures
    if (normalizedSegment === 'NFO') {
      return turnover * 0.0001
    }

    return 0
  }

  /**
   * Get default brokerage
   */
  private getDefaultBrokerage(
    segment: string,
    productType: string,
    turnover: number,
    quantity: number,
    lotSize: number
  ): number {
    const normalizedSegment = segment.toUpperCase()

    // NSE Equity: 0.03% or ₹20 per order, whichever is lower
    if (normalizedSegment === 'NSE' || normalizedSegment === 'NSE_EQ') {
      return Math.min(20, turnover * 0.0003)
    }

    // NFO F&O: Flat ₹20 per order
    if (normalizedSegment === 'NFO' || normalizedSegment === 'FNO') {
      return 20
    }

    // Default: ₹20 per order
    return 20
  }

  /**
   * Validate if account has sufficient margin
   */
  async validateMargin(
    tradingAccountId: string,
    requiredMargin: number,
    totalCharges: number
  ): Promise<{
    isValid: boolean
    availableMargin: number
    requiredAmount: number
    shortfall: number
  }> {
    console.log("🔍 [MARGIN-CALCULATOR] Validating margin:", {
      tradingAccountId,
      requiredMargin,
      totalCharges
    })

    const account = await prisma.tradingAccount.findUnique({
      where: { id: tradingAccountId },
      select: { availableMargin: true }
    })

    if (!account) {
      console.error("❌ [MARGIN-CALCULATOR] Trading account not found:", tradingAccountId)
      throw new Error("Trading account not found")
    }

    const availableMargin = account.availableMargin
    const requiredAmount = requiredMargin + totalCharges
    const shortfall = Math.max(0, requiredAmount - availableMargin)
    const isValid = availableMargin >= requiredAmount

    console.log("✅ [MARGIN-CALCULATOR] Margin validation result:", {
      isValid,
      availableMargin,
      requiredAmount,
      shortfall
    })

    return {
      isValid,
      availableMargin,
      requiredAmount,
      shortfall
    }
  }
}

/**
 * Create a margin calculator instance
 */
export function createMarginCalculator(): MarginCalculator {
  console.log("🏭 [MARGIN-CALCULATOR] Creating new margin calculator instance")
  return new MarginCalculator()
}

console.log("✅ [MARGIN-CALCULATOR] Module initialized")