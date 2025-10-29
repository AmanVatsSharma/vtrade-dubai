/**
 * @file route.ts
 * @module api-realtime-stream
 * @description Server-Sent Events (SSE) endpoint for real-time trading updates
 * @author BharatERP
 * @created 2025-01-27
 */

import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getRealtimeEventEmitter } from '@/lib/services/realtime/RealtimeEventEmitter'

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
  console.log('📡 [SSE-STREAM] New connection request')

  try {
    // Get userId from query params or session
    const searchParams = request.nextUrl.searchParams
    const userIdParam = searchParams.get('userId')

    // Authenticate user
    const session = await getServerSession(authOptions)
    const userId = userIdParam || (session?.user?.id as string | undefined)

    if (!userId) {
      console.error('❌ [SSE-STREAM] Unauthorized: No userId')
      return new Response('Unauthorized', { status: 401 })
    }

    console.log(`✅ [SSE-STREAM] User authenticated: ${userId}`)

    // Create SSE stream
    const encoder = new TextEncoder()
    const eventEmitter = getRealtimeEventEmitter()

    const stream = new ReadableStream({
      async start(controller) {
        console.log(`🔌 [SSE-STREAM] Starting SSE stream for user: ${userId}`)

        // Subscribe to events
        eventEmitter.subscribe(userId, controller)

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log(`🔌 [SSE-STREAM] Client disconnected: ${userId}`)
          eventEmitter.unsubscribe(userId, controller)
          
          try {
            controller.close()
          } catch (error) {
            // Controller already closed - ignore
          }
        })

        // Send initial connection message
        try {
          const welcomeMessage = `data: ${JSON.stringify({
            event: 'connected',
            data: { userId, timestamp: new Date().toISOString() },
            timestamp: new Date().toISOString()
          })}\n\n`
          controller.enqueue(encoder.encode(welcomeMessage))
        } catch (error) {
          console.error('❌ [SSE-STREAM] Error sending welcome message:', error)
        }
      },

      cancel() {
        console.log(`🔌 [SSE-STREAM] Stream cancelled for user: ${userId}`)
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
    console.error('❌ [SSE-STREAM] Error creating SSE stream:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to create SSE stream' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

