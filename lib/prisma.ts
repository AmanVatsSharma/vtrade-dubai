/**
 * @file prisma.ts
 * @module prisma
 * @description Prisma client with realtime middleware for database change detection
 * @author BharatERP
 * @created 2025-01-27
 */

import { PrismaClient } from "@prisma/client"
import { setupRealtimeMiddleware } from "./prisma-middleware"

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient
  middlewareSetup: boolean
}

// Create base Prisma client (if not already created)
let basePrisma: PrismaClient
if (globalForPrisma.prisma) {
  basePrisma = globalForPrisma.prisma
} else {
  basePrisma = new PrismaClient()
  globalForPrisma.prisma = basePrisma
}

// Setup realtime middleware only once (with error handling)
if (!globalForPrisma.middlewareSetup) {
  try {
    // Check if $use is available before attempting setup
    if (basePrisma && typeof (basePrisma as any).$use === 'function') {
      console.log('🔧 [PRISMA] Setting up realtime middleware')
      setupRealtimeMiddleware(basePrisma as any)
      globalForPrisma.middlewareSetup = true
      console.log('✅ [PRISMA] Realtime middleware setup complete')
    } else {
      console.warn('⚠️ [PRISMA] $use is not available on Prisma client - middleware not set up')
      console.warn('⚠️ [PRISMA] Prisma client type:', typeof basePrisma, 'Constructor:', basePrisma?.constructor?.name)
      globalForPrisma.middlewareSetup = true // Mark as attempted to avoid repeated warnings
    }
  } catch (error: any) {
    console.error('❌ [PRISMA] Failed to setup middleware:', error?.message || error)
    console.error('❌ [PRISMA] Error stack:', error?.stack)
    // Mark as attempted even on error to avoid infinite retries
    globalForPrisma.middlewareSetup = true
  }
}

export const prisma = basePrisma

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma
}