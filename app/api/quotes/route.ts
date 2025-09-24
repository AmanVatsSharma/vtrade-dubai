// app/api/quotes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { vortexAPI } from "@/lib/vortex/vortex-enhanced";
import { logger, LogCategory } from "@/lib/vortex/vortexLogger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  
  try {
    // 1. Validate environment configuration
    const apiKey = process.env.VORTEX_X_API_KEY;
    if (!apiKey) {
      logger.error(LogCategory.VORTEX_QUOTES, 'VORTEX_X_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { 
          error: "Server configuration error",
          code: "MISSING_API_KEY",
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // 2. Parse and validate query parameters
    const instruments = searchParams.getAll('q');
    const mode = searchParams.get('mode') || 'ltp';
    const clientId = request.headers.get('x-client-id') || 'unknown';

    logger.info(LogCategory.VORTEX_QUOTES, 'Quotes request received', {
      instruments: instruments.length,
      mode,
      clientId,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    });

    if (instruments.length === 0) {
      logger.warn(LogCategory.VORTEX_QUOTES, 'No instruments provided in request', { clientId });
      return NextResponse.json({ 
        error: "Query parameter 'q' is required",
        code: "MISSING_INSTRUMENTS",
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // 3. Validate session
    const isSessionValid = await vortexAPI.isSessionValid();
    if (!isSessionValid) {
      logger.error(LogCategory.VORTEX_QUOTES, 'No valid session found', undefined, { clientId });
      return NextResponse.json({ 
        error: "No active session found. Please login again.",
        code: "NO_SESSION",
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // 4. Fetch quotes using enhanced Vortex API
    logger.info(LogCategory.VORTEX_QUOTES, 'Fetching quotes from Vortex API', {
      instruments,
      mode,
      clientId
    });

    const quotes = await vortexAPI.getQuotes(instruments, mode);

    const processingTime = Date.now() - startTime;
    logger.info(LogCategory.VORTEX_QUOTES, 'Quotes fetched successfully', {
      instrumentCount: Object.keys(quotes).length,
      processingTime,
      clientId
    });

    return NextResponse.json({
      success: true,
      data: quotes,
      meta: {
        instrumentCount: Object.keys(quotes).length,
        mode,
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error(LogCategory.VORTEX_QUOTES, 'Failed to fetch quotes', error as Error, {
      instruments: searchParams.getAll('q'),
      mode: searchParams.get('mode') || 'ltp',
      processingTime,
      clientId: request.headers.get('x-client-id') || 'unknown'
    });

    // Return appropriate error response based on error type
    if (error instanceof Error) {
      if (error.message.includes('NO_SESSION')) {
        return NextResponse.json({
          error: "Session expired. Please login again.",
          code: "SESSION_EXPIRED",
          timestamp: new Date().toISOString()
        }, { status: 401 });
      }
      
      if (error.message.includes('API_REQUEST_FAILED')) {
        return NextResponse.json({
          error: "Failed to fetch data from Vortex API",
          code: "API_ERROR",
          details: error.message,
          timestamp: new Date().toISOString()
        }, { status: 502 });
      }
    }

    return NextResponse.json({
      error: "An unexpected error occurred while fetching quotes",
      code: "UNEXPECTED_ERROR",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
