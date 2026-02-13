/**
 * @file redis-realtime-bus.ts
 * @module lib/services/realtime
 * @description Redis-backed cross-process realtime bus for SSE messages (workers ↔ app). Keeps browser transport as SSE.
 * @author BharatERP
 * @created 2026-02-12
 */

/**
 * NOTE: Avoid `import "server-only"` here.
 * The `server-only` package relies on Next.js bundler conditions and throws when executed via `tsx` in workers.
 */
import { randomUUID } from "crypto"
import { baseLogger } from "@/lib/observability/logger"
import type { SSEMessage } from "@/types/realtime"
import { isRedisEnabled, redisPublish, redisSubscribe } from "@/lib/redis/redis-client"

const log = baseLogger.child({ module: "redis-realtime-bus" })
const instanceId = randomUUID()

type RedisRealtimeEnvelope = {
  v: 1
  sourceInstanceId: string
  publishedAtIso: string
  payload: SSEMessage
}

function userChannel(userId: string): string {
  return `realtime:user:${userId}`
}

export function isRedisRealtimeEnabled(): boolean {
  return isRedisEnabled()
}

export async function publishUserMessage(userId: string, payload: SSEMessage): Promise<void> {
  if (!isRedisRealtimeEnabled()) return
  const env: RedisRealtimeEnvelope = {
    v: 1,
    sourceInstanceId: instanceId,
    publishedAtIso: new Date().toISOString(),
    payload,
  }
  await redisPublish(userChannel(userId), JSON.stringify(env))
}

export async function subscribeUserMessages(
  userId: string,
  onMessage: (payload: SSEMessage) => void,
): Promise<() => void> {
  if (!isRedisRealtimeEnabled()) return () => {}

  return await redisSubscribe(userChannel(userId), (message) => {
    try {
      const parsed = JSON.parse(message) as RedisRealtimeEnvelope
      if (!parsed || parsed.v !== 1) return
      if (parsed.sourceInstanceId === instanceId) return
      if (!parsed.payload) return
      onMessage(parsed.payload)
    } catch (e) {
      log.warn({ userId, message: (e as any)?.message || String(e) }, "failed to parse redis envelope")
    }
  })
}

