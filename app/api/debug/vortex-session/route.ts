// app/api/debug/vortex-session/route.ts
/**
 * Debug endpoint to check Vortex session status
 * This helps diagnose session-related issues
 */
import { NextRequest, NextResponse } from "next/server";
import { vortexAPI } from "@/lib/vortex/vortex-enhanced";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [DEBUG] Checking Vortex session status...');

    // 1. Check environment configuration
    const envStatus = {
      hasVortexAppId: !!process.env.VORTEX_APPLICATION_ID || !!process.env.NEXT_PUBLIC_VORTEX_APPLICATION_ID,
      hasVortexApiKey: !!process.env.VORTEX_X_API_KEY,
      vortexAppIdValue: process.env.VORTEX_APPLICATION_ID || process.env.NEXT_PUBLIC_VORTEX_APPLICATION_ID || 'NOT_SET'
    };

    console.log('📋 [DEBUG] Environment status:', envStatus);

    // 2. Check database for sessions
    const sessions = await prisma.vortexSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('💾 [DEBUG] Database sessions found:', sessions.length);

    // 3. Check vortexAPI session validity
    const isValid = await vortexAPI.isSessionValid();

    console.log('✅ [DEBUG] Session validity:', isValid);

    // 4. Try to get session info
    let sessionInfo = null;
    try {
      sessionInfo = await vortexAPI.getSessionInfo();
      console.log('📊 [DEBUG] Session info retrieved:', {
        hasSessionInfo: !!sessionInfo,
        isValid: sessionInfo?.isValid
      });
    } catch (error) {
      console.error('❌ [DEBUG] Failed to get session info:', error);
    }

    // 5. Compile diagnostic report
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        hasVortexAppId: envStatus.hasVortexAppId,
        hasVortexApiKey: envStatus.hasVortexApiKey,
        vortexAppId: envStatus.vortexAppIdValue.substring(0, 10) + '...' // Only show first 10 chars for security
      },
      database: {
        totalSessions: sessions.length,
        latestSession: sessions.length > 0 ? {
          id: sessions[0].id,
          userId: sessions[0].userId,
          createdAt: sessions[0].createdAt,
          updatedAt: sessions[0].updatedAt,
          hasAccessToken: !!sessions[0].accessToken,
          accessTokenPreview: sessions[0].accessToken ? sessions[0].accessToken.substring(0, 20) + '...' : 'N/A'
        } : null,
        allSessionIds: sessions.map(s => ({
          id: s.id,
          userId: s.userId,
          createdAt: s.createdAt
        }))
      },
      vortexAPI: {
        isSessionValid: isValid,
        sessionInfo: sessionInfo ? {
          sessionId: sessionInfo.sessionId,
          userId: sessionInfo.userId,
          isValid: sessionInfo.isValid,
          hasProfile: !!sessionInfo.profile,
          profileData: sessionInfo.profile ? {
            userName: sessionInfo.profile.data?.user_name || 'N/A',
            email: sessionInfo.profile.data?.email || 'N/A',
            exchanges: sessionInfo.profile.data?.exchanges || []
          } : null
        } : null
      },
      diagnosis: {
        status: isValid ? 'HEALTHY' : 'NEEDS_LOGIN',
        message: isValid 
          ? 'Vortex session is active and valid' 
          : sessions.length > 0 
            ? 'Session exists in database but may be expired or invalid' 
            : 'No Vortex session found. Please login to Vortex.',
        recommendations: isValid ? [] : [
          'Visit /admin/vortex-dashboard',
          'Click on "Login to Vortex" button',
          'Complete the OAuth flow',
          'Return to this endpoint to verify session is created'
        ]
      }
    };

    console.log('📊 [DEBUG] Diagnostics complete:', diagnostics.diagnosis);

    return NextResponse.json({
      success: true,
      data: diagnostics
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG] Diagnostic check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}