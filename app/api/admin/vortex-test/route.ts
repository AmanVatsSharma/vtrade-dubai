// app/api/admin/vortex-test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { vortexAPI } from "@/lib/vortex/vortex-enhanced";
import { logger, LogCategory } from "@/lib/vortex/vortexLogger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    logger.info(LogCategory.VORTEX_API, 'Vortex test endpoint called');

    // Test 1: Check configuration
    const configTest = {
      hasApplicationId: !!process.env.VORTEX_APPLICATION_ID,
      hasApiKey: !!process.env.VORTEX_X_API_KEY,
      applicationId: process.env.VORTEX_APPLICATION_ID?.substring(0, 10) + '...',
      baseUrl: 'https://vortex-api.rupeezy.in/v2'
    };

    logger.info(LogCategory.VORTEX_API, 'Configuration test', configTest);

    // Test 2: Check session validity
    const sessionValid = await vortexAPI.isSessionValid();
    logger.info(LogCategory.VORTEX_API, 'Session validity check', { sessionValid });

    // Test 3: Get session info
    const sessionInfo = await vortexAPI.getSessionInfo();
    logger.info(LogCategory.VORTEX_API, 'Session info retrieved', { 
      isValid: sessionInfo.isValid,
      hasSessionId: !!sessionInfo.sessionId
    });

    // Test 4: Test API connection
    const connectionTest = await vortexAPI.testConnection();
    logger.info(LogCategory.VORTEX_API, 'Connection test completed', { 
      success: connectionTest.success 
    });

    // Test 5: Try to get quotes (if session is valid)
    let quotesTest = null;
    if (sessionValid) {
      try {
        const quotes = await vortexAPI.getQuotes(['NIFTY'], 'ltp');
        quotesTest = {
          success: true,
          data: quotes,
          instrumentCount: Object.keys(quotes).length
        };
        logger.info(LogCategory.VORTEX_QUOTES, 'Quotes test successful', {
          instrumentCount: Object.keys(quotes).length
        });
      } catch (error) {
        quotesTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        logger.error(LogCategory.VORTEX_QUOTES, 'Quotes test failed', error as Error);
      }
    }

    const processingTime = Date.now() - startTime;

    const testResults = {
      timestamp: new Date().toISOString(),
      processingTime,
      configuration: configTest,
      session: {
        valid: sessionValid,
        info: sessionInfo
      },
      connection: connectionTest,
      quotes: quotesTest,
      summary: {
        configOk: configTest.hasApplicationId && configTest.hasApiKey,
        sessionOk: sessionValid,
        connectionOk: connectionTest.success,
        quotesOk: quotesTest?.success || false
      }
    };

    logger.info(LogCategory.VORTEX_API, 'Vortex test completed', {
      processingTime,
      allTestsPassed: testResults.summary.configOk && testResults.summary.sessionOk && testResults.summary.connectionOk
    });

    return NextResponse.json({
      success: true,
      data: testResults
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error(LogCategory.VORTEX_API, 'Vortex test failed', error as Error, {
      processingTime
    });

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
