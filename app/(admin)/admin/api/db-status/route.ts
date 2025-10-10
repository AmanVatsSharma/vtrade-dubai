// app/(admin)/admin/api/db-status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

console.log('📊 [DB-STATUS] Route loaded')

export async function GET() {
  const startTime = Date.now();
  
  try {
    console.log('🔍 [DB-STATUS] Database status check initiated');

    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    
    console.log('✅ [DB-STATUS] Database connection successful');

    // Vortex configuration flags
    const hasAppId = !!(process.env.VORTEX_APPLICATION_ID || process.env.NEXT_PUBLIC_VORTEX_APPLICATION_ID);
    const hasApiKey = !!process.env.VORTEX_X_API_KEY;
    const configOk = hasAppId && hasApiKey;

    // Get latest Vortex session info (without calling Vortex API during build)
    const latestSession = await prisma.vortexSession.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let vortexStatus = "not_configured";
    let sessionId = null;

    if (latestSession) {
      sessionId = latestSession.id;
      // Check if session is recent (last 24 hours)
      const sessionAge = Date.now() - latestSession.createdAt.getTime();
      const isRecent = sessionAge < 24 * 60 * 60 * 1000;
      vortexStatus = isRecent ? "session_available" : "session_expired";
      
      console.log('📡 [DB-STATUS] Vortex session check completed:', {
        status: vortexStatus,
        sessionId,
        sessionAge: Math.floor(sessionAge / 1000 / 60) + ' minutes'
      });
    } else {
      console.log('⚠️ [DB-STATUS] No Vortex session found');
    }

    // Normalize Vortex status for UI consumers
    const vortexConnected = configOk && vortexStatus === 'session_available';
    const vortexStatusNormalized = vortexConnected ? 'connected' : 'error';

    const processingTime = Date.now() - startTime;
    
    console.log('✅ [DB-STATUS] Status check completed:', {
      database: 'connected',
      vortex: vortexStatus,
      vortexConnected,
      vortexStatusNormalized,
      config: { hasAppId, hasApiKey, configOk },
      processingTime: processingTime + 'ms'
    });

    return NextResponse.json({
      database: "connected",
      vortex: vortexStatus, // legacy field
      vortexStatus: vortexStatusNormalized, // normalized for UI: connected/error
      vortexConnected, // boolean convenience
      config: { hasAppId, hasApiKey, configOk },
      sessionId: latestSession?.id || null,
      sessionCreated: latestSession?.createdAt || null,
      lastChecked: new Date().toISOString(),
      processingTime
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error('❌ [DB-STATUS] Database status check failed:', error);

    return NextResponse.json(
      { 
        database: "error", 
        vortex: "unknown",
        vortexStatus: "error",
        vortexConnected: false,
        error: error instanceof Error ? error.message : "Database connection failed",
        lastChecked: new Date().toISOString(),
        processingTime
      },
      { status: 500 }
    );
  }
}
