/**
 * @file market-timing.ts
 * @module market-timing
 * @description Central helpers to determine Indian market (NSE) session status in IST.
 * - Open: Mon–Fri, 09:15–15:30 IST
 * - Pre-Open (blocked for orders): Mon–Fri, 09:00–09:15 IST
 * - Closed: Otherwise (weekends/holidays/after-hours/force-closed)
 *
 * All calculations are based on Asia/Kolkata timezone (IST).
 * @author BharatERP
 * @created 2025-01-27
 */

import { getCurrentISTDate } from "@/lib/date-utils"

export type MarketSession = "open" | "pre-open" | "closed"

// Simple in-memory holiday list (YYYY-MM-DD). Replace/populate from your preferred source.
// For production, consider loading this from a server API, database, or a cron-updated JSON.
const NSE_HOLIDAYS_YYYYMMDD = new Set<string>([
  // Examples (replace with actual NSE trading holidays for the year)
  // "2025-01-26", // Republic Day
  // "2025-03-14", // Holi (example)
])

// Cache for force closed setting (client-side, updated from API)
let cachedForceClosed: boolean | null = null
let forceClosedCacheTimestamp: number = 0
const FORCE_CLOSED_CACHE_TTL_MS = 5000 // 5 seconds

/**
 * Get market force closed status (client-side cache)
 * This is updated by calling setMarketForceClosed()
 * 
 * @returns boolean - True if market is force closed
 */
function getMarketForceClosed(): boolean {
  const now = Date.now()
  
  // Return cached value if still valid
  if (cachedForceClosed !== null && (now - forceClosedCacheTimestamp) < FORCE_CLOSED_CACHE_TTL_MS) {
    return cachedForceClosed
  }

  // Default to false if cache expired (will be refreshed by API call)
  return false
}

/**
 * Set market force closed status (called from settings component)
 * 
 * @param forceClosed - True if market should be force closed
 */
export function setMarketForceClosed(forceClosed: boolean): void {
  console.log(`[MARKET-TIMING] Setting force_closed: ${forceClosed}`)
  cachedForceClosed = forceClosed
  forceClosedCacheTimestamp = Date.now()
}

/**
 * Invalidate force closed cache
 */
export function invalidateForceClosedCache(): void {
  cachedForceClosed = null
  forceClosedCacheTimestamp = 0
}

/** Format a Date (IST) to YYYY-MM-DD */
const formatYyyyMmDd = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Returns an IST Date for now (safe wrapper). */
const nowIST = (): Date => {
  try {
    return getCurrentISTDate()
  } catch {
    // Fallback using toLocaleString if import path changes
    const now = new Date()
    return new Date(now.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }))
  }
}

/** Check if given IST date is an NSE holiday (static list). */
export function isNSEHoliday(date?: Date): boolean {
  try {
    const d = date ? new Date(date) : nowIST()
    const key = formatYyyyMmDd(d)
    const isHoliday = NSE_HOLIDAYS_YYYYMMDD.has(key)
    if (isHoliday) console.log(`📅 [MARKET-TIMING] Holiday detected for ${key}`)
    return isHoliday
  } catch (error) {
    console.warn("[MARKET-TIMING] isNSEHoliday failed, defaulting to false", error)
    return false
  }
}

/** Returns true during pre-open window (Mon–Fri, 09:00–09:15 IST). */
export function isPreOpen(date?: Date): boolean {
  try {
    // Check force closed first (highest priority)
    if (getMarketForceClosed()) {
      console.log('[MARKET-TIMING] Market is force closed - blocking pre-open')
      return false
    }

    const d = date ? new Date(date) : nowIST()
    const day = d.getDay() // Sun=0 .. Sat=6
    if (day === 0 || day === 6) return false
    if (isNSEHoliday(d)) return false
    const minutes = d.getHours() * 60 + d.getMinutes()
    const preOpenStart = 9 * 60 + 0 // 09:00
    const marketOpen = 9 * 60 + 15 // 09:15
    return minutes >= preOpenStart && minutes < marketOpen
  } catch (error) {
    console.warn("[MARKET-TIMING] isPreOpen failed, defaulting to false", error)
    return false
  }
}

/** Returns true when regular session is open (Mon–Fri, 09:15–15:30 IST). */
export function isMarketOpen(date?: Date): boolean {
  try {
    // Check force closed first (highest priority)
    if (getMarketForceClosed()) {
      console.log('[MARKET-TIMING] Market is force closed - blocking orders')
      return false
    }

    const d = date ? new Date(date) : nowIST()
    const day = d.getDay()
    if (day === 0 || day === 6) return false
    if (isNSEHoliday(d)) return false
    const minutes = d.getHours() * 60 + d.getMinutes()
    const marketOpen = 9 * 60 + 15 // 09:15
    const marketClose = 15 * 60 + 30 // 15:30
    return minutes >= marketOpen && minutes <= marketClose
  } catch (error) {
    console.error("[MARKET-TIMING] Error checking market open status:", error)
    return false
  }
}

/** Returns the current market session in IST. */
export function getMarketSession(date?: Date): MarketSession {
  try {
    // Check force closed first (highest priority)
    if (getMarketForceClosed()) {
      console.log('[MARKET-TIMING] Market is force closed')
      return "closed"
    }

    const d = date ? new Date(date) : nowIST()
    const day = d.getDay()
    if (day === 0 || day === 6) return "closed"
    if (isNSEHoliday(d)) return "closed"
    if (isPreOpen(d)) return "pre-open"
    return isMarketOpen(d) ? "open" : "closed"
  } catch (error) {
    console.warn("[MARKET-TIMING] getMarketSession failed, defaulting to closed", error)
    return "closed"
  }
}

/**
 * Segment-aware market session check
 * MCX: 09:00-23:55 IST (Mon-Fri)
 * NSE (Equity/Futures/Options): 09:15-15:30 IST (Mon-Fri, 09:00-09:15 pre-open)
 * 
 * @param segment - Market segment (NSE, NSE_EQ, NSE_FO, NFO, MCX, MCX_FO, etc.)
 * @param date - Optional date to check (defaults to now in IST)
 * @returns MarketSession and optional reason
 */
export function getSegmentMarketSession(
  segment?: string | null,
  date?: Date
): { session: MarketSession; reason?: string } {
  try {
    // Check force closed first
    if (getMarketForceClosed()) {
      return { session: "closed", reason: "Market is force-closed by operations" }
    }

    const d = date ? new Date(date) : nowIST()
    const day = d.getDay()
    
    // Weekend check
    if (day === 0 || day === 6) {
      return { session: "closed", reason: "Weekend (markets closed)" }
    }

    const normalizedSegment = (segment || "NSE").toUpperCase()
    const minutes = d.getHours() * 60 + d.getMinutes()

    // MCX segments: 09:00-23:55 IST
    if (normalizedSegment.includes('MCX')) {
      const mcxStart = 9 * 60 // 09:00
      const mcxEnd = 23 * 60 + 55 // 23:55
      const isMcxOpen = minutes >= mcxStart && minutes <= mcxEnd
      
      return {
        session: isMcxOpen ? "open" : "closed",
        reason: isMcxOpen ? undefined : "MCX orders are accepted between 09:00–23:55 IST"
      }
    }

    // NSE segments (Equity, Futures, Options): 09:15-15:30 IST
    // Pre-open: 09:00-09:15 IST
    if (isNSEHoliday(d)) {
      return { session: "closed", reason: "NSE holiday" }
    }

    if (isPreOpen(d)) {
      return { session: "pre-open", reason: "NSE pre-open window 09:00–09:15 IST" }
    }

    if (isMarketOpen(d)) {
      return { session: "open" }
    }

    return { session: "closed", reason: "NSE trading hours are 09:15–15:30 IST" }
  } catch (error) {
    console.warn("[MARKET-TIMING] getSegmentMarketSession failed, defaulting to closed", error)
    return { session: "closed", reason: "Unable to confirm trading window" }
  }
}

/** Allow runtime override of holiday set (e.g., after fetching from server). */
export function setNSEHolidays(datesYyyyMmDd: string[]): void {
  try {
    NSE_HOLIDAYS_YYYYMMDD.clear()
    for (const d of datesYyyyMmDd) {
      // Basic sanity check for YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) NSE_HOLIDAYS_YYYYMMDD.add(d)
    }
    console.log(`[MARKET-TIMING] NSE holidays loaded (${NSE_HOLIDAYS_YYYYMMDD.size})`)
  } catch (error) {
    console.error("[MARKET-TIMING] setNSEHolidays failed", error)
  }
}
