/**
 * @file market-timing.ts
 * @module server-market-timing
 * @description Server-side market timing utilities with database access
 * @author BharatERP
 * @created 2025-01-27
 */

import { prisma } from "@/lib/prisma"
import { getCurrentISTDate } from "@/lib/date-utils"
import type { MarketSession } from "@/lib/hooks/market-timing"

// Cache for force closed setting (5 second TTL)
let cachedForceClosed: boolean | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 5000 // 5 seconds

/**
 * Check if market is force closed from database
 * Uses caching to avoid excessive DB queries
 * 
 * @returns Promise<boolean> - True if market is force closed
 */
export async function getMarketForceClosedFromDB(): Promise<boolean> {
  const now = Date.now()
  
  // Return cached value if still valid
  if (cachedForceClosed !== null && (now - cacheTimestamp) < CACHE_TTL_MS) {
    console.log('[MarketTiming-DB] Returning cached force_closed value')
    return cachedForceClosed
  }

  console.log('[MarketTiming-DB] Fetching market_force_closed from database')
  
  try {
    const setting = await prisma.systemSettings.findFirst({
      where: {
        key: 'market_force_closed',
        isActive: true
      }
    })

    const forceClosed = setting?.value === 'true'
    
    // Update cache
    cachedForceClosed = forceClosed
    cacheTimestamp = now

    console.log('[MarketTiming-DB] Force closed setting:', forceClosed)
    return forceClosed
  } catch (error: any) {
    console.error('[MarketTiming-DB] Error fetching force_closed:', error)
    
    // Return cached value if available, otherwise default to false
    if (cachedForceClosed !== null) {
      console.log('[MarketTiming-DB] Using cached value due to error')
      return cachedForceClosed
    }

    return false
  }
}

/**
 * Invalidate the force closed cache
 * Call this after updating market_force_closed setting
 */
export function invalidateMarketForceClosedCache(): void {
  console.log('[MarketTiming-DB] Invalidating force_closed cache')
  cachedForceClosed = null
  cacheTimestamp = 0
}

/**
 * Format a Date (IST) to YYYY-MM-DD
 */
const formatYyyyMmDd = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Returns an IST Date for now
 */
const nowIST = (): Date => {
  try {
    return getCurrentISTDate()
  } catch {
    const now = new Date()
    return new Date(now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))
  }
}

/**
 * Get NSE holidays from database
 */
async function getNSEHolidaysFromDB(): Promise<Set<string>> {
  try {
    const setting = await prisma.systemSettings.findFirst({
      where: {
        key: 'market_holidays_csv',
        isActive: true
      }
    })

    if (!setting?.value) {
      return new Set<string>()
    }

    const holidays = setting.value
      .split(/[,\n\r]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))

    return new Set(holidays)
  } catch (error) {
    console.error('[MarketTiming-DB] Error fetching holidays:', error)
    return new Set<string>()
  }
}

/**
 * Check if given IST date is an NSE holiday (from DB)
 */
export async function isNSEHolidayFromDB(date?: Date): Promise<boolean> {
  try {
    const d = date ? new Date(date) : nowIST()
    const key = formatYyyyMmDd(d)
    const holidays = await getNSEHolidaysFromDB()
    const isHoliday = holidays.has(key)
    if (isHoliday) console.log(`📅 [MARKET-TIMING-DB] Holiday detected for ${key}`)
    return isHoliday
  } catch (error) {
    console.warn("[MARKET-TIMING-DB] isNSEHolidayFromDB failed, defaulting to false", error)
    return false
  }
}

/**
 * Returns true during pre-open window (Mon–Fri, 09:00–09:15 IST)
 */
function isPreOpenTime(date?: Date): boolean {
  try {
    const d = date ? new Date(date) : nowIST()
    const day = d.getDay() // Sun=0 .. Sat=6
    if (day === 0 || day === 6) return false
    const minutes = d.getHours() * 60 + d.getMinutes()
    const preOpenStart = 9 * 60 + 0 // 09:00
    const marketOpen = 9 * 60 + 15 // 09:15
    return minutes >= preOpenStart && minutes < marketOpen
  } catch (error) {
    console.warn("[MARKET-TIMING-DB] isPreOpenTime failed, defaulting to false", error)
    return false
  }
}

/**
 * Returns true when regular session is open (Mon–Fri, 09:15–15:30 IST)
 */
function isMarketOpenTime(date?: Date): boolean {
  try {
    const d = date ? new Date(date) : nowIST()
    const day = d.getDay()
    if (day === 0 || day === 6) return false
    const minutes = d.getHours() * 60 + d.getMinutes()
    const marketOpen = 9 * 60 + 15 // 09:15
    const marketClose = 15 * 60 + 30 // 15:30
    return minutes >= marketOpen && minutes <= marketClose
  } catch (error) {
    console.error("[MARKET-TIMING-DB] Error checking market open status:", error)
    return false
  }
}

/**
 * Get market session from server (checks DB force_closed first)
 * 
 * @param date - Optional date to check (defaults to now in IST)
 * @returns Promise<MarketSession> - Current market session
 */
export async function getServerMarketSession(date?: Date): Promise<MarketSession> {
  try {
    // Check force closed first (highest priority)
    const forceClosed = await getMarketForceClosedFromDB()
    if (forceClosed) {
      console.log('[MARKET-TIMING-DB] Market is force closed')
      return "closed"
    }

    const d = date ? new Date(date) : nowIST()
    const day = d.getDay()
    if (day === 0 || day === 6) return "closed"
    
    // Check holidays from DB
    const isHoliday = await isNSEHolidayFromDB(d)
    if (isHoliday) return "closed"
    
    if (isPreOpenTime(d)) return "pre-open"
    return isMarketOpenTime(d) ? "open" : "closed"
  } catch (error) {
    console.warn("[MARKET-TIMING-DB] getServerMarketSession failed, defaulting to closed", error)
    return "closed"
  }
}

/**
 * Check if market is open from server (checks DB force_closed first)
 * 
 * @param date - Optional date to check (defaults to now in IST)
 * @returns Promise<boolean> - True if market is open
 */
export async function isServerMarketOpen(date?: Date): Promise<boolean> {
  try {
    // Check force closed first
    const forceClosed = await getMarketForceClosedFromDB()
    if (forceClosed) {
      return false
    }

    const d = date ? new Date(date) : nowIST()
    const day = d.getDay()
    if (day === 0 || day === 6) return false
    
    const isHoliday = await isNSEHolidayFromDB(d)
    if (isHoliday) return false
    
    return isMarketOpenTime(d)
  } catch (error) {
    console.error("[MARKET-TIMING-DB] isServerMarketOpen failed, defaulting to false", error)
    return false
  }
}

