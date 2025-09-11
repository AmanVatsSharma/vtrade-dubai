// app/api/admin/queue-status/route.ts
import { NextResponse } from "next/server";
import { requestQueue } from "@/lib/request-queue";
import { logger, LogCategory } from "@/lib/vortexLogger";

export async function GET() {
  try {
    logger.info(LogCategory.VORTEX_API, 'Queue status requested');

    const status = requestQueue.getQueueStatus();
    
    logger.info(LogCategory.VORTEX_API, 'Queue status retrieved', status);

    return NextResponse.json({
      success: true,
      data: {
        ...status,
        timestamp: new Date().toISOString(),
        recommendations: {
          isHealthy: status.queueLength < 10 && status.requestsPerMinute < 25,
          shouldSlowDown: status.requestsPerMinute > 20,
          critical: status.requestsPerMinute > 30
        }
      }
    });

  } catch (error) {
    logger.error(LogCategory.VORTEX_API, 'Failed to get queue status', error as Error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    logger.info(LogCategory.VORTEX_API, 'Clearing request queue');
    
    requestQueue.clearQueue();
    
    logger.info(LogCategory.VORTEX_API, 'Request queue cleared');

    return NextResponse.json({
      success: true,
      message: 'Queue cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(LogCategory.VORTEX_API, 'Failed to clear queue', error as Error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
