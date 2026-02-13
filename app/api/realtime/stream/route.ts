/**
 * @file route.ts
 * @module api-realtime-stream
 * @description Server-Sent Events (SSE) endpoint for real-time trading updates
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextRequest } from "next/server"
import { auth } from "@/auth"
import { getRealtimeEventEmitter } from "@/lib/services/realtime/RealtimeEventEmitter"
import { withRequest } from "@/lib/observability/logger"

/**
 * GET /api/realtime/stream
 * 
 * Server-Sent Events endpoint for real-time updates
 * Streams events to clients based on their userId
 * 
 * Query params:
 * - userId (optional, falls back to session)
 */
export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || request.headers.get("x-correlation-id") || undefined
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")?.[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  const log = withRequest({ requestId, ip, route: "/api/realtime/stream" }).child({ module: "sse-stream" })

  log.info("new connection request")

  try {
    // Get userId from query params or session
    const searchParams = request.nextUrl.searchParams
    const userIdParam = searchParams.get('userId')

    // Authenticate user
    const session = await auth()
    const userId = userIdParam || (session?.user?.id as string | undefined)

    if (!userId) {
      log.warn("unauthorized: no userId")
      return new Response('Unauthorized', { status: 401 })
    }

    log.info({ userId }, "user authenticated")

    // Create SSE stream
    const eventEmitter = getRealtimeEventEmitter()

    const stream = new ReadableStream({
      async start(controller) {
        log.info({ userId }, "starting SSE stream")

        // Subscribe to events
        eventEmitter.subscribe(userId, controller)

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          log.info({ userId }, "client disconnected")
          eventEmitter.unsubscribe(userId, controller)
          
          try {
            controller.close()
          } catch (error) {
            // Controller already closed - ignore
          }
        })

        // NOTE: Welcome message is emitted by RealtimeEventEmitter.subscribe() to avoid duplicates.
      },

      cancel() {
        log.info({ userId }, "stream cancelled")
        // Cleanup handled in abort event handler
      }
    })

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    })

  } catch (error) {
    log.error({ message: (error as any)?.message || String(error) }, "failed to create SSE stream")
    return new Response(
      JSON.stringify({ error: 'Failed to create SSE stream' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

