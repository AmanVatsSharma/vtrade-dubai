/**
 * @file redis-client.ts
 * @module lib/redis
 * @description Server-only Redis client wrapper for pub/sub + cache with graceful disable when REDIS_URL is missing.
 * @author BharatERP
 * @created 2026-02-12
 */

import "server-only"

import Redis from "ioredis"
import { baseLogger } from "@/lib/observability/logger"

const log = baseLogger.child({ module: "redis-client" })

export type RedisSubscriptionHandler = (message: string, channel: string) => void

type RedisState = {
  url: string
  pub: Redis
  sub: Redis
  handlers: Map<string, Set<RedisSubscriptionHandler>>
  pubConnectPromise: Promise<void> | null
  subConnectPromise: Promise<void> | null
}

const globalForRedis = globalThis as unknown as {
  __redisState?: RedisState
}

function getRedisUrl(): string | null {
  const url = process.env.REDIS_URL
  if (!url || typeof url !== "string" || url.trim().length === 0) return null
  return url.trim()
}

export function isRedisEnabled(): boolean {
  return Boolean(getRedisUrl())
}

function ensureState(): RedisState {
  const existing = globalForRedis.__redisState
  if (existing) return existing

  const url = getRedisUrl()
  if (!url) {
    throw new Error("REDIS_URL is not set")
  }

  const pub = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true,
  })
  const sub = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: true,
  })

  const handlers = new Map<string, Set<RedisSubscriptionHandler>>()

  sub.on("message", (channel, message) => {
    const set = handlers.get(channel)
    if (!set || set.size === 0) return
    set.forEach((h) => {
      try {
        h(message, channel)
      } catch (e) {
        log.warn({ channel, message: (e as any)?.message || String(e) }, "subscription handler error")
      }
    })
  })

  pub.on("error", (e) => log.warn({ message: (e as any)?.message || String(e) }, "pub error"))
  sub.on("error", (e) => log.warn({ message: (e as any)?.message || String(e) }, "sub error"))

  globalForRedis.__redisState = { url, pub, sub, handlers, pubConnectPromise: null, subConnectPromise: null }
  log.info({ url }, "initialized")
  return globalForRedis.__redisState
}

async function ensurePubConnected(state: RedisState): Promise<void> {
  if (state.pub.status === "ready") return
  if (!state.pubConnectPromise) {
    state.pubConnectPromise = state.pub.connect().then(
      () => {},
      (e) => {
        log.warn({ message: (e as any)?.message || String(e) }, "pub connect failed")
      },
    )
  }
  await state.pubConnectPromise
}

async function ensureSubConnected(state: RedisState): Promise<void> {
  if (state.sub.status === "ready") return
  if (!state.subConnectPromise) {
    state.subConnectPromise = state.sub.connect().then(
      () => {},
      (e) => {
        log.warn({ message: (e as any)?.message || String(e) }, "sub connect failed")
      },
    )
  }
  await state.subConnectPromise
}

export async function redisPublish(channel: string, payload: string): Promise<void> {
  if (!isRedisEnabled()) return
  const state = ensureState()
  try {
    await ensurePubConnected(state)
    await state.pub.publish(channel, payload)
  } catch (e) {
    log.warn({ channel, message: (e as any)?.message || String(e) }, "publish failed")
  }
}

export async function redisGet(key: string): Promise<string | null> {
  if (!isRedisEnabled()) return null
  const state = ensureState()
  try {
    await ensurePubConnected(state)
    return await state.pub.get(key)
  } catch (e) {
    log.warn({ key, message: (e as any)?.message || String(e) }, "get failed")
    return null
  }
}

export async function redisMGet(keys: string[]): Promise<Array<string | null>> {
  if (!isRedisEnabled()) return keys.map(() => null)
  const state = ensureState()
  try {
    await ensurePubConnected(state)
    // ioredis returns (string | null)[]
    return (await state.pub.mget(...keys)) as Array<string | null>
  } catch (e) {
    log.warn({ count: keys.length, message: (e as any)?.message || String(e) }, "mget failed")
    return keys.map(() => null)
  }
}

export async function redisSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (!isRedisEnabled()) return
  const state = ensureState()
  try {
    await ensurePubConnected(state)
    if (typeof ttlSeconds === "number" && Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
      await state.pub.set(key, value, "EX", Math.floor(ttlSeconds))
    } else {
      await state.pub.set(key, value)
    }
  } catch (e) {
    log.warn({ key, message: (e as any)?.message || String(e) }, "set failed")
  }
}

export async function redisSubscribe(channel: string, handler: RedisSubscriptionHandler): Promise<() => void> {
  if (!isRedisEnabled()) return () => {}
  const state = ensureState()

  const set = state.handlers.get(channel) || new Set<RedisSubscriptionHandler>()
  const had = set.size > 0
  set.add(handler)
  state.handlers.set(channel, set)

  try {
    await ensureSubConnected(state)
    if (!had) await state.sub.subscribe(channel)
  } catch (e) {
    log.warn({ channel, message: (e as any)?.message || String(e) }, "subscribe failed")
  }

  return () => {
    const s = state.handlers.get(channel)
    if (!s) return
    s.delete(handler)
    if (s.size > 0) return
    state.handlers.delete(channel)
    state.sub
      .unsubscribe(channel)
      .catch((e) => log.warn({ channel, message: (e as any)?.message || String(e) }, "unsubscribe failed"))
  }
}

