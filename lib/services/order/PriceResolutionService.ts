/**
 * Price Resolution Service
 * 
 * Multi-tier price resolution strategy:
 * 1. Tier 1: Live Vortex API (real-time quotes)
 * 2. Tier 2: Database Cache (recent LTP)
 * 3. Tier 3: Estimated Price (previous close with adjustment)
 * 
 * This ensures orders don't fail due to temporary API issues
 * while maintaining transparency about price quality.
 */

import { prisma } from "@/lib/prisma"
import { OrderType } from "@prisma/client"
import { getMarketRealismConfig } from "@/lib/config/market-realism-config"

console.log("🚀 [PRICE-RESOLUTION-SERVICE] Module loaded")

export type PriceSource = 'LIVE' | 'CACHED' | 'ESTIMATED' | 'LIMIT_ORDER'
export type PriceConfidence = 'HIGH' | 'MEDIUM' | 'LOW'

export interface PriceResolution {
  price: number
  source: PriceSource
  confidence: PriceConfidence
  warnings: string[]
  timestamp: Date
  metadata?: {
    cacheAge?: number      // How old cached data is (ms)
    estimatedFrom?: string // What estimate is based on
    apiResponse?: any      // Original API response
  }
}

export interface PriceResolutionInput {
  instrumentId: string
  stockId: string
  symbol: string
  orderType: OrderType
  limitPrice?: number | null
  dialogPrice?: number | null  // Price from order dialog (fallback)
}

export class PriceResolutionService {
  constructor() {
    console.log("🏗️ [PRICE-RESOLUTION-SERVICE] Service instance created")
  }

  /**
   * Main entry point: Resolve execution price using multi-tier strategy
   */
  async resolveExecutionPrice(
    input: PriceResolutionInput
  ): Promise<PriceResolution> {
    console.log("🔍 [PRICE-RESOLUTION-SERVICE] Resolving execution price:", {
      symbol: input.symbol,
      instrumentId: input.instrumentId,
      orderType: input.orderType,
      hasLimitPrice: !!input.limitPrice
    })

    // For LIMIT orders, use the specified price
    if (input.orderType === OrderType.LIMIT && input.limitPrice) {
      console.log("📌 [PRICE-RESOLUTION-SERVICE] Using LIMIT order price:", input.limitPrice)
      
      return {
        price: input.limitPrice,
        source: 'LIMIT_ORDER',
        confidence: 'HIGH',
        warnings: [],
        timestamp: new Date(),
        metadata: {}
      }
    }

    // For MARKET orders, resolve price using multi-tier strategy
    console.log("🎯 [PRICE-RESOLUTION-SERVICE] MARKET order - starting multi-tier resolution")

    const warnings: string[] = []

    // Tier 1: Try live Vortex API
    console.log("📡 [PRICE-RESOLUTION-SERVICE] Tier 1: Attempting live Vortex API")
    try {
      const livePrice = await this.fetchLivePrice(input.instrumentId)
      
      if (livePrice && livePrice > 0) {
        console.log("✅ [PRICE-RESOLUTION-SERVICE] Tier 1 SUCCESS - Live price fetched:", livePrice)
        
        return {
          price: livePrice,
          source: 'LIVE',
          confidence: 'HIGH',
          warnings: [],
          timestamp: new Date(),
          metadata: {
            apiResponse: 'Vortex API - Real-time quote'
          }
        }
      }
    } catch (error: any) {
      console.warn("⚠️ [PRICE-RESOLUTION-SERVICE] Tier 1 FAILED - Live API error:", error.message)
      warnings.push("Live market data temporarily unavailable")
    }

    // Tier 2: Try database cache
    console.log("💾 [PRICE-RESOLUTION-SERVICE] Tier 2: Attempting database cache")
    try {
      const cachedPrice = await this.fetchCachedPrice(input.stockId)
      
      if (cachedPrice) {
        console.log("✅ [PRICE-RESOLUTION-SERVICE] Tier 2 SUCCESS - Cached price:", cachedPrice)
        
        return {
          price: cachedPrice.price,
          source: 'CACHED',
          confidence: 'MEDIUM',
          warnings: [
            ...warnings,
            `Using cached price from ${cachedPrice.age} seconds ago`
          ],
          timestamp: new Date(),
          metadata: {
            cacheAge: cachedPrice.age * 1000,
            estimatedFrom: `Database LTP updated ${cachedPrice.updatedAt.toLocaleString()}`
          }
        }
      }
    } catch (error: any) {
      console.warn("⚠️ [PRICE-RESOLUTION-SERVICE] Tier 2 FAILED - Cache error:", error.message)
      warnings.push("Cached price unavailable")
    }

    // Tier 3: Estimate from previous close
    console.log("📊 [PRICE-RESOLUTION-SERVICE] Tier 3: Attempting estimated price")
    try {
      const estimatedPrice = await this.estimatePrice(input.stockId)
      
      if (estimatedPrice) {
        console.log("✅ [PRICE-RESOLUTION-SERVICE] Tier 3 SUCCESS - Estimated price:", estimatedPrice)
        
        return {
          price: estimatedPrice.price,
          source: 'ESTIMATED',
          confidence: 'LOW',
          warnings: [
            ...warnings,
            '⚠️ Using estimated price - market data unavailable',
            estimatedPrice.warning
          ],
          timestamp: new Date(),
          metadata: {
            estimatedFrom: `Previous close: ₹${estimatedPrice.previousClose} + 2% market assumption`
          }
        }
      }
    } catch (error: any) {
      console.error("❌ [PRICE-RESOLUTION-SERVICE] Tier 3 FAILED - Estimation error:", error.message)
      warnings.push("Price estimation failed")
    }

    // Tier 4: Use dialog price (user-provided fallback)
    if (input.dialogPrice && input.dialogPrice > 0) {
      console.log("🎯 [PRICE-RESOLUTION-SERVICE] Tier 4: Using dialog price as fallback:", input.dialogPrice)
      
      return {
        price: input.dialogPrice,
        source: 'LIMIT_ORDER', // Treat as user-specified price
        confidence: 'MEDIUM',
        warnings: [
          ...warnings,
          '⚠️ Using price from order dialog - live market data unavailable'
        ],
        timestamp: new Date(),
        metadata: {
          estimatedFrom: `User dialog price: ₹${input.dialogPrice}`
        }
      }
    }

    // All tiers failed
    console.error("❌ [PRICE-RESOLUTION-SERVICE] ALL TIERS FAILED - No price data available")
    
    throw new Error(
      `Unable to determine execution price for ${input.symbol}. ` +
      `All price sources unavailable. Please try again or contact support.`
    )
  }

  /**
   * Tier 1: Fetch live price from Vortex API
   * @private
   */
  private async fetchLivePrice(instrumentId: string): Promise<number | null> {
    console.log("📡 [PRICE-RESOLUTION-SERVICE] Fetching live price for:", instrumentId)

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
        || 'https://www.marketpulse360.live'
      const url = `${baseUrl}/api/quotes?q=${instrumentId}&mode=ltp`
      
      console.log("🌐 [PRICE-RESOLUTION-SERVICE] Calling Vortex API:", url)

      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.warn("⚠️ [PRICE-RESOLUTION-SERVICE] API response not OK:", response.status)
        return null
      }

      const data = await response.json()
      console.log("📥 [PRICE-RESOLUTION-SERVICE] API response received:", data)

      // Handle different response formats
      const payload = data?.success ? data.data : data
      
      // Try multiple paths to find LTP
      const ltp = 
        payload?.[instrumentId]?.last_trade_price ||
        payload?.[instrumentId]?.ltp ||
        payload?.data?.[instrumentId]?.last_trade_price ||
        payload?.data?.[instrumentId]?.ltp ||
        null

      if (ltp && ltp > 0) {
        console.log("✅ [PRICE-RESOLUTION-SERVICE] Live price found:", ltp)
        return Number(ltp)
      }

      console.warn("⚠️ [PRICE-RESOLUTION-SERVICE] LTP not found in response")
      return null

    } catch (error: any) {
      console.error("❌ [PRICE-RESOLUTION-SERVICE] Live price fetch error:", error)
      return null
    }
  }

  /**
   * Tier 2: Fetch recent cached price from database
   * @private
   */
  private async fetchCachedPrice(
    stockId: string
  ): Promise<{ price: number; age: number; updatedAt: Date } | null> {
    console.log("💾 [PRICE-RESOLUTION-SERVICE] Fetching cached price for stock:", stockId)

    try {
      const stock = await prisma.stock.findUnique({
        where: { id: stockId },
        select: {
          ltp: true,
          updatedAt: true
        }
      })

      if (!stock || !stock.ltp || stock.ltp <= 0) {
        console.warn("⚠️ [PRICE-RESOLUTION-SERVICE] No valid cached price found")
        return null
      }

      const config = getMarketRealismConfig()
      const cacheAge = Date.now() - stock.updatedAt.getTime()
      const cacheAgeSeconds = Math.floor(cacheAge / 1000)

      console.log("📊 [PRICE-RESOLUTION-SERVICE] Cached price details:", {
        ltp: stock.ltp,
        updatedAt: stock.updatedAt,
        ageSeconds: cacheAgeSeconds,
        cacheTTL: config.priceResolution.cacheTTL
      })

      // Check if cache is fresh enough
      if (cacheAge > config.priceResolution.cacheTTL) {
        console.warn(
          `⚠️ [PRICE-RESOLUTION-SERVICE] Cache too old: ${cacheAgeSeconds}s (TTL: ${config.priceResolution.cacheTTL / 1000}s)`
        )
        
        // Still return it, but with warning
        return {
          price: stock.ltp,
          age: cacheAgeSeconds,
          updatedAt: stock.updatedAt
        }
      }

      console.log("✅ [PRICE-RESOLUTION-SERVICE] Fresh cached price found")
      
      return {
        price: stock.ltp,
        age: cacheAgeSeconds,
        updatedAt: stock.updatedAt
      }

    } catch (error: any) {
      console.error("❌ [PRICE-RESOLUTION-SERVICE] Cache fetch error:", error)
      return null
    }
  }

  /**
   * Tier 3: Estimate price from previous close
   * @private
   */
  private async estimatePrice(
    stockId: string
  ): Promise<{ price: number; previousClose: number; warning: string } | null> {
    console.log("📊 [PRICE-RESOLUTION-SERVICE] Estimating price for stock:", stockId)

    try {
      const config = getMarketRealismConfig()

      // Check if estimated prices are allowed
      if (!config.priceResolution.allowEstimated) {
        console.warn("⚠️ [PRICE-RESOLUTION-SERVICE] Estimated prices disabled in config")
        return null
      }

      const stock = await prisma.stock.findUnique({
        where: { id: stockId },
        select: {
          previousClose: true,
          updatedAt: true,
          symbol: true
        }
      })

      if (!stock || !stock.previousClose || stock.previousClose <= 0) {
        console.warn("⚠️ [PRICE-RESOLUTION-SERVICE] No previous close available")
        return null
      }

      // Check if previous close data is too old
      const dataAge = Date.now() - stock.updatedAt.getTime()
      
      if (dataAge > config.priceResolution.maxEstimatedAge) {
        console.warn(
          `⚠️ [PRICE-RESOLUTION-SERVICE] Previous close too old: ${Math.floor(dataAge / 1000 / 60)} minutes`
        )
        return null
      }

      // Estimate: Previous close + 2% (market tends to move up slightly)
      // This is a conservative estimate
      const estimatedPrice = stock.previousClose * 1.02

      console.log("✅ [PRICE-RESOLUTION-SERVICE] Price estimated:", {
        previousClose: stock.previousClose,
        estimatedPrice,
        adjustment: '+2%',
        symbol: stock.symbol
      })

      return {
        price: estimatedPrice,
        previousClose: stock.previousClose,
        warning: `Estimated from previous close (₹${stock.previousClose}) + 2% market assumption`
      }

    } catch (error: any) {
      console.error("❌ [PRICE-RESOLUTION-SERVICE] Price estimation error:", error)
      return null
    }
  }

  /**
   * Validate if a price is reasonable
   * 
   * Checks for extreme price movements that might indicate bad data
   */
  async validatePriceReasonableness(
    stockId: string,
    proposedPrice: number
  ): Promise<{
    isReasonable: boolean
    warnings: string[]
  }> {
    console.log("🔍 [PRICE-RESOLUTION-SERVICE] Validating price reasonableness:", {
      stockId,
      proposedPrice
    })

    const warnings: string[] = []

    try {
      const stock = await prisma.stock.findUnique({
        where: { id: stockId },
        select: {
          ltp: true,
          previousClose: true,
          high: true,
          low: true,
          symbol: true
        }
      })

      if (!stock) {
        console.warn("⚠️ [PRICE-RESOLUTION-SERVICE] Stock not found for validation")
        return { isReasonable: true, warnings: [] }
      }

      // Check against previous close (circuit limit: typically 20%)
      if (stock.previousClose && stock.previousClose > 0) {
        const changePercent = ((proposedPrice - stock.previousClose) / stock.previousClose) * 100
        
        if (Math.abs(changePercent) > 20) {
          warnings.push(
            `⚠️ Proposed price ${changePercent > 0 ? 'above' : 'below'} previous close by ${Math.abs(changePercent).toFixed(2)}%`
          )
        }
      }

      // Check against day's high/low
      if (stock.high && proposedPrice > stock.high * 1.05) {
        warnings.push(`⚠️ Proposed price significantly above day's high`)
      }
      
      if (stock.low && stock.low > 0 && proposedPrice < stock.low * 0.95) {
        warnings.push(`⚠️ Proposed price significantly below day's low`)
      }

      const isReasonable = warnings.length === 0

      console.log("✅ [PRICE-RESOLUTION-SERVICE] Price validation:", {
        isReasonable,
        warnings
      })

      return { isReasonable, warnings }

    } catch (error: any) {
      console.error("❌ [PRICE-RESOLUTION-SERVICE] Validation error:", error)
      return { isReasonable: true, warnings: [] }
    }
  }

  /**
   * Get price resolution summary for logging/display
   */
  getPriceResolutionSummary(resolution: PriceResolution): string {
    const sourceEmoji = {
      LIVE: '📡',
      CACHED: '💾',
      ESTIMATED: '📊',
      LIMIT_ORDER: '📌'
    }

    const confidenceEmoji = {
      HIGH: '🟢',
      MEDIUM: '🟡',
      LOW: '🔴'
    }

    return `${sourceEmoji[resolution.source]} ${resolution.source} price: ₹${resolution.price} ${confidenceEmoji[resolution.confidence]} (${resolution.confidence} confidence)`
  }
}

/**
 * Create price resolution service instance
 */
export function createPriceResolutionService(): PriceResolutionService {
  console.log("🏭 [PRICE-RESOLUTION-SERVICE] Creating service instance")
  return new PriceResolutionService()
}

console.log("✅ [PRICE-RESOLUTION-SERVICE] Module initialized")