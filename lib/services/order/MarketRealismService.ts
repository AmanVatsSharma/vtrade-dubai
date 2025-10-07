/**
 * Market Realism Service
 * 
 * Simulates real market conditions by applying:
 * - Bid-ask spreads
 * - Slippage based on order size and market conditions
 * - Random market movement within acceptable ranges
 * 
 * This ensures users experience realistic trading conditions where:
 * - BUY orders execute at ASK (slightly higher than market)
 * - SELL orders execute at BID (slightly lower than market)
 * - Large orders have more slippage
 * - Users start with minor loss (realistic broker behavior)
 */

import { OrderSide } from "@prisma/client"
import { 
  getSlippageConfig, 
  getBidAskSpread, 
  getOrderSizeMultiplier,
  getMarketRealismConfig 
} from "@/lib/config/market-realism-config"

console.log("🚀 [MARKET-REALISM-SERVICE] Module loaded")

export interface MarketRealismResult {
  basePrice: number           // Original price before adjustments
  executionPrice: number      // Final execution price
  spreadPercent: number       // Applied bid-ask spread %
  slippagePercent: number     // Applied slippage %
  totalImpactPercent: number  // Total price impact %
  priceAdjustment: number     // Absolute price difference
  orderSizeCategory: 'small' | 'medium' | 'large'
  warnings: string[]
}

export class MarketRealismService {
  constructor() {
    console.log("🏗️ [MARKET-REALISM-SERVICE] Service instance created")
  }

  /**
   * Apply realistic market conditions to execution price
   * 
   * This is the main entry point that applies both bid-ask spread and slippage
   * 
   * @param basePrice - The base market price
   * @param orderSide - BUY or SELL
   * @param segment - Market segment (NSE_EQ, NSE_FO, etc.)
   * @param quantity - Order quantity
   * @param lotSize - Lot size for the instrument
   * @returns MarketRealismResult with execution price and details
   */
  async applyMarketRealism(
    basePrice: number,
    orderSide: OrderSide,
    segment: string,
    quantity: number,
    lotSize: number = 1
  ): Promise<MarketRealismResult> {
    console.log("📊 [MARKET-REALISM-SERVICE] Applying market realism:", {
      basePrice,
      orderSide,
      segment,
      quantity,
      lotSize
    })

    const warnings: string[] = []

    // Validate inputs
    if (basePrice <= 0) {
      throw new Error("Base price must be greater than 0")
    }

    // Calculate order value
    const orderValue = basePrice * quantity
    console.log("💰 [MARKET-REALISM-SERVICE] Order value:", orderValue)

    // Get configuration
    const slippageConfig = getSlippageConfig(segment)
    const spreadPercent = getBidAskSpread(segment)
    const sizeMultiplier = getOrderSizeMultiplier(orderValue)

    console.log("⚙️ [MARKET-REALISM-SERVICE] Configuration loaded:", {
      slippageConfig,
      spreadPercent,
      sizeMultiplier
    })

    // Determine order size category
    const config = getMarketRealismConfig()
    let orderSizeCategory: 'small' | 'medium' | 'large' = 'small'
    
    if (orderValue >= config.orderSizeThresholds.large) {
      orderSizeCategory = 'large'
      warnings.push(`Large order detected (₹${orderValue.toLocaleString()}). Higher slippage applied.`)
    } else if (orderValue >= config.orderSizeThresholds.medium) {
      orderSizeCategory = 'medium'
      warnings.push(`Medium order detected (₹${orderValue.toLocaleString()}). Moderate slippage applied.`)
    }

    console.log("📦 [MARKET-REALISM-SERVICE] Order size category:", orderSizeCategory)

    // Step 1: Apply bid-ask spread
    let executionPrice = this.applyBidAskSpread(basePrice, orderSide, spreadPercent)
    
    console.log("💵 [MARKET-REALISM-SERVICE] Price after bid-ask spread:", executionPrice)

    // Step 2: Apply slippage
    const slippagePercent = this.calculateSlippage(
      slippageConfig,
      sizeMultiplier,
      segment
    )

    executionPrice = this.applySlippage(
      executionPrice,
      orderSide,
      slippagePercent
    )

    console.log("💸 [MARKET-REALISM-SERVICE] Price after slippage:", executionPrice)

    // Calculate total impact
    const priceAdjustment = executionPrice - basePrice
    const totalImpactPercent = (priceAdjustment / basePrice) * 100

    console.log("📈 [MARKET-REALISM-SERVICE] Final impact:", {
      priceAdjustment,
      totalImpactPercent: totalImpactPercent.toFixed(3) + '%',
      executionPrice
    })

    // Add impact warning if significant
    if (Math.abs(totalImpactPercent) > 0.5) {
      warnings.push(
        `Significant price impact: ${totalImpactPercent.toFixed(2)}% ${
          totalImpactPercent > 0 ? 'higher' : 'lower'
        } than market price`
      )
    }

    const result: MarketRealismResult = {
      basePrice,
      executionPrice: Number(executionPrice.toFixed(2)),
      spreadPercent,
      slippagePercent,
      totalImpactPercent: Number(totalImpactPercent.toFixed(3)),
      priceAdjustment: Number(priceAdjustment.toFixed(2)),
      orderSizeCategory,
      warnings
    }

    console.log("✅ [MARKET-REALISM-SERVICE] Market realism applied:", result)

    return result
  }

  /**
   * Apply bid-ask spread
   * 
   * BUY orders execute at ASK (higher price)
   * SELL orders execute at BID (lower price)
   * 
   * @private
   */
  private applyBidAskSpread(
    price: number,
    orderSide: OrderSide,
    spreadPercent: number
  ): number {
    console.log("🎯 [MARKET-REALISM-SERVICE] Applying bid-ask spread:", {
      price,
      orderSide,
      spreadPercent
    })

    // Half the spread goes to each side
    const halfSpread = spreadPercent / 2 / 100

    if (orderSide === OrderSide.BUY) {
      // BUY at ASK (higher price)
      const askPrice = price * (1 + halfSpread)
      console.log("📈 [MARKET-REALISM-SERVICE] BUY at ASK:", {
        bidPrice: price,
        askPrice,
        spread: spreadPercent + '%'
      })
      return askPrice
    } else {
      // SELL at BID (lower price)
      const bidPrice = price * (1 - halfSpread)
      console.log("📉 [MARKET-REALISM-SERVICE] SELL at BID:", {
        bidPrice,
        askPrice: price,
        spread: spreadPercent + '%'
      })
      return bidPrice
    }
  }

  /**
   * Calculate slippage percentage
   * 
   * Uses configuration and adds randomness for realism
   * 
   * @private
   */
  private calculateSlippage(
    slippageConfig: { min: number; max: number },
    sizeMultiplier: number,
    segment: string
  ): number {
    console.log("🎲 [MARKET-REALISM-SERVICE] Calculating slippage:", {
      slippageConfig,
      sizeMultiplier,
      segment
    })

    // Random slippage between min and max
    const baseSlippage = 
      slippageConfig.min + 
      Math.random() * (slippageConfig.max - slippageConfig.min)

    // Apply size multiplier
    const finalSlippage = baseSlippage * sizeMultiplier

    console.log("✅ [MARKET-REALISM-SERVICE] Slippage calculated:", {
      baseSlippage: baseSlippage.toFixed(3) + '%',
      sizeMultiplier,
      finalSlippage: finalSlippage.toFixed(3) + '%'
    })

    return finalSlippage
  }

  /**
   * Apply slippage to price
   * 
   * BUY orders: slippage increases price (unfavorable)
   * SELL orders: slippage decreases price (unfavorable)
   * 
   * @private
   */
  private applySlippage(
    price: number,
    orderSide: OrderSide,
    slippagePercent: number
  ): number {
    console.log("💫 [MARKET-REALISM-SERVICE] Applying slippage:", {
      price,
      orderSide,
      slippagePercent
    })

    const slippageMultiplier = 1 + (slippagePercent / 100)

    if (orderSide === OrderSide.BUY) {
      // BUY: slippage increases price (worse for buyer)
      const newPrice = price * slippageMultiplier
      console.log("📈 [MARKET-REALISM-SERVICE] BUY slippage applied:", {
        originalPrice: price,
        newPrice,
        increase: ((newPrice - price) / price * 100).toFixed(3) + '%'
      })
      return newPrice
    } else {
      // SELL: slippage decreases price (worse for seller)
      const newPrice = price / slippageMultiplier
      console.log("📉 [MARKET-REALISM-SERVICE] SELL slippage applied:", {
        originalPrice: price,
        newPrice,
        decrease: ((price - newPrice) / price * 100).toFixed(3) + '%'
      })
      return newPrice
    }
  }

  /**
   * Estimate execution quality based on market conditions
   * 
   * Provides transparency about expected execution
   */
  async estimateExecutionQuality(
    basePrice: number,
    orderSide: OrderSide,
    segment: string,
    orderValue: number
  ): Promise<{
    quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
    expectedSlippage: { min: number; max: number }
    expectedSpread: number
    recommendation: string
  }> {
    console.log("🔍 [MARKET-REALISM-SERVICE] Estimating execution quality:", {
      basePrice,
      orderSide,
      segment,
      orderValue
    })

    const slippageConfig = getSlippageConfig(segment)
    const spreadPercent = getBidAskSpread(segment)
    const sizeMultiplier = getOrderSizeMultiplier(orderValue)

    // Calculate expected slippage range with size multiplier
    const expectedSlippage = {
      min: slippageConfig.min * sizeMultiplier,
      max: slippageConfig.max * sizeMultiplier
    }

    // Determine quality based on total expected impact
    const maxImpact = expectedSlippage.max + spreadPercent
    
    let quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
    let recommendation: string

    if (maxImpact < 0.2) {
      quality = 'EXCELLENT'
      recommendation = 'Ideal conditions for execution. Low slippage expected.'
    } else if (maxImpact < 0.4) {
      quality = 'GOOD'
      recommendation = 'Good execution conditions. Moderate slippage expected.'
    } else if (maxImpact < 0.7) {
      quality = 'FAIR'
      recommendation = 'Fair execution conditions. Consider splitting large orders.'
    } else {
      quality = 'POOR'
      recommendation = 'High slippage expected. Strongly consider splitting order or using limit orders.'
    }

    console.log("✅ [MARKET-REALISM-SERVICE] Execution quality:", {
      quality,
      expectedSlippage,
      expectedSpread: spreadPercent,
      maxImpact: maxImpact.toFixed(2) + '%'
    })

    return {
      quality,
      expectedSlippage,
      expectedSpread: spreadPercent,
      recommendation
    }
  }

  /**
   * Simulate multiple executions to show price range
   * 
   * Useful for showing users what to expect
   */
  async simulateExecutionRange(
    basePrice: number,
    orderSide: OrderSide,
    segment: string,
    quantity: number,
    simulations: number = 100
  ): Promise<{
    minPrice: number
    maxPrice: number
    avgPrice: number
    mostLikelyPrice: number
    priceDistribution: number[]
  }> {
    console.log("🎲 [MARKET-REALISM-SERVICE] Simulating execution range:", {
      basePrice,
      orderSide,
      segment,
      quantity,
      simulations
    })

    const prices: number[] = []

    // Run multiple simulations
    for (let i = 0; i < simulations; i++) {
      const result = await this.applyMarketRealism(
        basePrice,
        orderSide,
        segment,
        quantity
      )
      prices.push(result.executionPrice)
    }

    // Calculate statistics
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length

    // Find most likely price (mode)
    const priceFrequency = new Map<number, number>()
    prices.forEach(price => {
      const roundedPrice = Math.round(price * 100) / 100
      priceFrequency.set(
        roundedPrice,
        (priceFrequency.get(roundedPrice) || 0) + 1
      )
    })

    let mostLikelyPrice = avgPrice
    let maxFrequency = 0
    priceFrequency.forEach((freq, price) => {
      if (freq > maxFrequency) {
        maxFrequency = freq
        mostLikelyPrice = price
      }
    })

    const result = {
      minPrice: Number(minPrice.toFixed(2)),
      maxPrice: Number(maxPrice.toFixed(2)),
      avgPrice: Number(avgPrice.toFixed(2)),
      mostLikelyPrice: Number(mostLikelyPrice.toFixed(2)),
      priceDistribution: prices
    }

    console.log("✅ [MARKET-REALISM-SERVICE] Simulation complete:", {
      ...result,
      priceDistribution: `${prices.length} prices`
    })

    return result
  }
}

/**
 * Create market realism service instance
 */
export function createMarketRealismService(): MarketRealismService {
  console.log("🏭 [MARKET-REALISM-SERVICE] Creating service instance")
  return new MarketRealismService()
}

console.log("✅ [MARKET-REALISM-SERVICE] Module initialized")