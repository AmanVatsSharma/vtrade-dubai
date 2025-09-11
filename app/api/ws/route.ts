// app/api/ws/route.ts
import { NextRequest } from "next/server";
import { vortexAPI } from "@/lib/vortex-enhanced";
import { logger, LogCategory } from "@/lib/vortexLogger";

export async function GET(request: NextRequest) {
  try {
    logger.info(LogCategory.VORTEX_API, 'WebSocket info request received');

    // Check if we have a valid session
    const isSessionValid = await vortexAPI.isSessionValid();
    
    if (!isSessionValid) {
      return new Response(JSON.stringify({
        error: "No valid session found. Please login first.",
        code: "NO_SESSION"
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get session info
    const sessionInfo = await vortexAPI.getSessionInfo();
    
    if (!sessionInfo.isValid) {
      return new Response(JSON.stringify({
        error: "Invalid session",
        code: "INVALID_SESSION"
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return WebSocket connection info
    const wsInfo = {
      url: `wss://wire.rupeezy.in/ws?auth_token=${sessionInfo.accessToken}`,
      supportedModes: ['ltp', 'ohlcv', 'full'],
      supportedExchanges: ['NSE_EQ', 'NSE_FO', 'NSE_CUR', 'MCX_FO'],
      sessionId: sessionInfo.sessionId,
      expiresAt: sessionInfo.expiresAt
    };

    logger.info(LogCategory.VORTEX_API, 'WebSocket info provided', {
      sessionId: sessionInfo.sessionId,
      hasAccessToken: !!sessionInfo.accessToken
    });

    return new Response(JSON.stringify({
      success: true,
      data: wsInfo
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error(LogCategory.VORTEX_API, 'WebSocket info request failed', error as Error);
    
    return new Response(JSON.stringify({
      error: "Failed to get WebSocket info",
      code: "WS_INFO_ERROR",
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
