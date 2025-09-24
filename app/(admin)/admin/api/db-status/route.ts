// app/(admin)/admin/api/db-status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vortexAPI } from "@/lib/vortex/vortex-enhanced";
import { logger, LogCategory } from "@/lib/vortex/vortexLogger";

export async function GET() {
  const startTime = Date.now();
  
  try {
    logger.info(LogCategory.DATABASE, 'Database status check initiated');

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    logger.info(LogCategory.DATABASE, 'Database connection successful');

    // Get latest access token and session info
    const latestSession = await prisma.vortexSession.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let vortexStatus = "disconnected";
    let sessionId = null;

    if (latestSession) {
      sessionId = latestSession.id;
      
      // Test Vortex API connection
      try {
        const isSessionValid = await vortexAPI.isSessionValid();
        vortexStatus = isSessionValid ? "connected" : "expired";
        
        logger.info(LogCategory.VORTEX_API, 'Vortex API status check completed', {
          status: vortexStatus,
          sessionId: latestSession.id
        });
      } catch (error) {
        vortexStatus = "error";
        logger.error(LogCategory.VORTEX_API, 'Vortex API status check failed', error as Error, {
          sessionId: latestSession.id
        });
      }
    } else {
      logger.info(LogCategory.VORTEX_AUTH, 'No Vortex session found');
    }

    const processingTime = Date.now() - startTime;
    
    logger.info(LogCategory.DATABASE, 'Status check completed', {
      database: 'connected',
      vortex: vortexStatus,
      sessionId,
      processingTime
    });

    return NextResponse.json({
      database: "connected",
      vortex: vortexStatus,
      token: latestSession?.accessToken || null,
      sessionId: latestSession?.id || null,
      lastChecked: new Date().toISOString(),
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error(LogCategory.DATABASE, 'Database status check failed', error as Error, {
      processingTime
    });

    return NextResponse.json(
      { 
        database: "error", 
        vortex: "unknown",
        error: "Database connection failed",
        lastChecked: new Date().toISOString(),
        processingTime
      },
      { status: 500 }
    );
  }
}
