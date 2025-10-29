/**
 * @file prisma.ts
 * @module prisma
 * @description Prisma client with realtime middleware for database change detection
 * @author BharatERP
 * @created 2025-01-27
 */

import { PrismaClient } from "@prisma/client"
import { setupRealtimeMiddleware } from "./prisma-middleware"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// Create base Prisma client
export const prisma = globalForPrisma.prisma || new PrismaClient()

// Setup realtime middleware
setupRealtimeMiddleware(prisma)

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma