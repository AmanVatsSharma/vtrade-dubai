/**
 * Market Realism Configuration
 * 
 * Configures slippage, bid-ask spreads, and other market realism parameters
 * for different segments and asset classes.
 * 
 * This makes order execution more realistic by simulating real market conditions.
 */

export interface SlippageConfig {
  min: number  // Minimum slippage percentage
  max: number  // Maximum slippage percentage
}

export interface MarketRealismConfig {
  // Slippage configuration by segment
  slippage: {
    [segment: string]: SlippageConfig
  }
  
  // Bid-ask spread by segment (in percentage)
  spread: {
    [segment: string]: number
  }
  
  // Price resolution configuration
  priceResolution: {
    cacheTTL: number          // How long cached prices are valid (ms)
    allowEstimated: boolean   // Whether to allow estimated prices
    maxEstimatedAge: number   // Max age for previous close to be used (ms)
  }
  
  // Order size thresholds for increased slippage
  orderSizeThresholds: {
    small: number      // < 10,000
    medium: number     // 10,000 - 100,000  
    large: number      // > 100,000
  }
  
  // Slippage multipliers based on order size
  orderSizeMultipliers: {
    small: number   // 1.0x (no increase)
    medium: number  // 1.5x (50% more slippage)
    large: number   // 2.0x (100% more slippage)
  }
}

/**
 * Development Configuration
 * More lenient settings for testing
 */
export const MARKET_REALISM_CONFIG_DEV: MarketRealismConfig = {
  slippage: {
    // Indian Equity - NSE Cash
    NSE_EQ: { min: 0.05, max: 0.15 },
    NSE: { min: 0.05, max: 0.15 },
    
    // Indian Derivatives - NSE F&O
    NSE_FO: { min: 0.10, max: 0.20 },
    FO: { min: 0.10, max: 0.20 },
    
    // BSE - Bombay Stock Exchange
    BSE_EQ: { min: 0.08, max: 0.18 },
    BSE: { min: 0.08, max: 0.18 },
    
    // MCX - Commodities
    MCX: { min: 0.15, max: 0.30 },
    MCX_FO: { min: 0.15, max: 0.30 },
    
    // Forex
    FOREX: { min: 0.03, max: 0.08 },
    CDS: { min: 0.03, max: 0.08 },
    
    // Crypto
    CRYPTO: { min: 0.20, max: 0.50 },
    
    // Default fallback
    DEFAULT: { min: 0.10, max: 0.25 }
  },
  
  spread: {
    // Bid-ask spread percentages
    NSE_EQ: 0.03,
    NSE: 0.03,
    NSE_FO: 0.08,
    FO: 0.08,
    BSE_EQ: 0.04,
    BSE: 0.04,
    MCX: 0.10,
    MCX_FO: 0.10,
    FOREX: 0.02,
    CDS: 0.02,
    CRYPTO: 0.20,
    DEFAULT: 0.05
  },
  
  priceResolution: {
    cacheTTL: 60000,        // 1 minute - cache is valid
    allowEstimated: true,   // Allow estimated prices in dev
    maxEstimatedAge: 3600000 // 1 hour - max age for previous close
  },
  
  orderSizeThresholds: {
    small: 10000,
    medium: 100000,
    large: 500000
  },
  
  orderSizeMultipliers: {
    small: 1.0,   // No increase for small orders
    medium: 1.5,  // 50% more slippage for medium orders
    large: 2.0    // 100% more slippage for large orders
  }
}

/**
 * Production Configuration
 * More realistic, stricter settings
 */
export const MARKET_REALISM_CONFIG_PROD: MarketRealismConfig = {
  slippage: {
    // More realistic slippage for production
    NSE_EQ: { min: 0.08, max: 0.25 },
    NSE: { min: 0.08, max: 0.25 },
    NSE_FO: { min: 0.12, max: 0.30 },
    FO: { min: 0.12, max: 0.30 },
    BSE_EQ: { min: 0.10, max: 0.28 },
    BSE: { min: 0.10, max: 0.28 },
    MCX: { min: 0.20, max: 0.40 },
    MCX_FO: { min: 0.20, max: 0.40 },
    FOREX: { min: 0.05, max: 0.10 },
    CDS: { min: 0.05, max: 0.10 },
    CRYPTO: { min: 0.30, max: 0.80 },
    DEFAULT: { min: 0.15, max: 0.35 }
  },
  
  spread: {
    NSE_EQ: 0.04,
    NSE: 0.04,
    NSE_FO: 0.10,
    FO: 0.10,
    BSE_EQ: 0.05,
    BSE: 0.05,
    MCX: 0.12,
    MCX_FO: 0.12,
    FOREX: 0.03,
    CDS: 0.03,
    CRYPTO: 0.25,
    DEFAULT: 0.08
  },
  
  priceResolution: {
    cacheTTL: 30000,        // 30 seconds - fresher cache in prod
    allowEstimated: false,  // Don't allow estimated prices in prod
    maxEstimatedAge: 1800000 // 30 minutes - stricter
  },
  
  orderSizeThresholds: {
    small: 10000,
    medium: 100000,
    large: 500000
  },
  
  orderSizeMultipliers: {
    small: 1.0,
    medium: 1.8,  // More impact in production
    large: 2.5    // Significant impact for large orders
  }
}

/**
 * Get active configuration based on environment
 */
export function getMarketRealismConfig(): MarketRealismConfig {
  const env = process.env.NODE_ENV || 'development'
  
  console.log("📊 [MARKET-REALISM-CONFIG] Loading configuration for environment:", env)
  
  if (env === 'production') {
    console.log("✅ [MARKET-REALISM-CONFIG] Using PRODUCTION config")
    return MARKET_REALISM_CONFIG_PROD
  }
  
  console.log("✅ [MARKET-REALISM-CONFIG] Using DEVELOPMENT config")
  return MARKET_REALISM_CONFIG_DEV
}

/**
 * Get slippage config for a segment
 */
export function getSlippageConfig(segment: string): SlippageConfig {
  const config = getMarketRealismConfig()
  
  console.log("🔍 [MARKET-REALISM-CONFIG] Getting slippage config for segment:", segment)
  
  // Normalize segment name
  const normalizedSegment = segment.toUpperCase().trim()
  
  // Try exact match first
  if (config.slippage[normalizedSegment]) {
    console.log("✅ [MARKET-REALISM-CONFIG] Found exact match:", config.slippage[normalizedSegment])
    return config.slippage[normalizedSegment]
  }
  
  // Try partial matches
  for (const key of Object.keys(config.slippage)) {
    if (normalizedSegment.includes(key) || key.includes(normalizedSegment)) {
      console.log("✅ [MARKET-REALISM-CONFIG] Found partial match:", key, config.slippage[key])
      return config.slippage[key]
    }
  }
  
  // Fallback to DEFAULT
  console.log("⚠️ [MARKET-REALISM-CONFIG] No match found, using DEFAULT:", config.slippage.DEFAULT)
  return config.slippage.DEFAULT
}

/**
 * Get bid-ask spread for a segment
 */
export function getBidAskSpread(segment: string): number {
  const config = getMarketRealismConfig()
  
  console.log("🔍 [MARKET-REALISM-CONFIG] Getting spread for segment:", segment)
  
  // Normalize segment name
  const normalizedSegment = segment.toUpperCase().trim()
  
  // Try exact match first
  if (config.spread[normalizedSegment] !== undefined) {
    console.log("✅ [MARKET-REALISM-CONFIG] Found exact match:", config.spread[normalizedSegment])
    return config.spread[normalizedSegment]
  }
  
  // Try partial matches
  for (const key of Object.keys(config.spread)) {
    if (normalizedSegment.includes(key) || key.includes(normalizedSegment)) {
      console.log("✅ [MARKET-REALISM-CONFIG] Found partial match:", key, config.spread[key])
      return config.spread[key]
    }
  }
  
  // Fallback to DEFAULT
  console.log("⚠️ [MARKET-REALISM-CONFIG] No match found, using DEFAULT:", config.spread.DEFAULT)
  return config.spread.DEFAULT
}

/**
 * Get order size multiplier based on order value
 */
export function getOrderSizeMultiplier(orderValue: number): number {
  const config = getMarketRealismConfig()
  
  console.log("🔍 [MARKET-REALISM-CONFIG] Getting size multiplier for order value:", orderValue)
  
  if (orderValue < config.orderSizeThresholds.small) {
    console.log("✅ [MARKET-REALISM-CONFIG] Small order, multiplier:", config.orderSizeMultipliers.small)
    return config.orderSizeMultipliers.small
  }
  
  if (orderValue < config.orderSizeThresholds.medium) {
    console.log("✅ [MARKET-REALISM-CONFIG] Medium order, multiplier:", config.orderSizeMultipliers.medium)
    return config.orderSizeMultipliers.medium
  }
  
  console.log("✅ [MARKET-REALISM-CONFIG] Large order, multiplier:", config.orderSizeMultipliers.large)
  return config.orderSizeMultipliers.large
}

console.log("✅ [MARKET-REALISM-CONFIG] Module initialized")