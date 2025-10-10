// lib/vortex/quotes-batcher.ts
import { vortexAPI, VortexQuote } from '@/lib/vortex/vortex-enhanced';
import { logger, LogCategory } from '@/lib/vortex/vortexLogger';
import { getQuotesBatcherConfig } from '@/lib/vortex/quotes-batcher-config';

/**
 * Quotes batcher: coalesces incoming quotes requests per `mode` within a window
 * and performs a single upstream fetch to Vortex. Results are split back to
 * individual callers. Designed for high-load environments.
 */

type BatchFlushReason = 'timer' | 'max_union' | 'manual';

interface RequestEntry {
  instruments: string[];
  clientId?: string;
  requestedAt: number;
  resolve: (value: Record<string, VortexQuote>) => void;
  reject: (reason?: any) => void;
  timeoutId?: ReturnType<typeof setTimeout> | null;
  isSettled: boolean;
}

interface Batch {
  instruments: Set<string>;
  requests: RequestEntry[];
  timer?: ReturnType<typeof setTimeout> | null;
  startedAt: number;
  batchId: string;
}

const batches = new Map<string, Batch>(); // key: `mode`

// Dynamic config via config service
const readWindowMs = () => getQuotesBatcherConfig().windowMs;
const readMaxUnion = () => getQuotesBatcherConfig().maxUnion;
const readRequestTimeoutMs = () => getQuotesBatcherConfig().requestTimeoutMs;
const readMicroCacheTtlMs = () => getQuotesBatcherConfig().microCacheTtlMs;

// Lightweight telemetry for diagnostics
let lastFlushMeta: Record<string, any> = {};
const metrics = {
  totalBatches: 0,
  totalRequests: 0,
  totalInstruments: 0,
  totalUpstreamCalls: 0,
  totalUpstreamFailures: 0,
  lastErrorAt: 0
};

// Circuit breaker state (simple)
let consecutiveFailures = 0;
let circuitOpenUntil = 0; // epoch ms; 0 means closed

// Micro-cache: mode + sorted union -> { data, expiresAt }
const microCache = new Map<string, { data: Record<string, VortexQuote>; expiresAt: number }>();

function newBatchId(mode: string): string {
  return `${mode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureBatch(mode: string): Batch {
  let batch = batches.get(mode);
  if (!batch) {
    batch = {
      instruments: new Set<string>(),
      requests: [],
      startedAt: Date.now(),
      timer: null,
      batchId: newBatchId(mode)
    };
    batches.set(mode, batch);
    // Start window timer
    const windowMs = readWindowMs();
    batch.timer = setTimeout(() => flushBatch(mode, 'timer'), windowMs);
    (batch.timer as any)?.unref?.();

    logger.info(LogCategory.VORTEX_QUOTES, 'Quotes batch created', {
      batch_id: batch.batchId,
      mode,
      window_ms: windowMs,
      max_union: readMaxUnion()
    });
  }
  return batch;
}

async function flushBatch(mode: string, reason: BatchFlushReason) {
  const batch = batches.get(mode);
  if (!batch) return; // already flushed
  // Detach batch first to avoid double-flush races
  batches.delete(mode);
  if (batch.timer) {
    clearTimeout(batch.timer);
    batch.timer = null;
  }

  const uniqueIds = Array.from(batch.instruments);
  const waitMs = Date.now() - batch.startedAt;

  // If there are no pending requests (all timed out), nothing to do
  const activeRequests = batch.requests.filter(r => !r.isSettled);
  if (uniqueIds.length === 0 || activeRequests.length === 0) {
    logger.warn(LogCategory.VORTEX_QUOTES, 'Batch flush skipped - nothing active', {
      batch_id: batch.batchId,
      mode,
      reason,
      unique_instruments: uniqueIds.length,
      active_requests: activeRequests.length,
      wait_ms: waitMs
    });
    // Best-effort reject any non-settled requests with empty result
    for (const r of activeRequests) {
      try { r.isSettled = true; r.timeoutId && clearTimeout(r.timeoutId); r.resolve({}); } catch {}
    }
    return;
  }

  logger.info(LogCategory.VORTEX_QUOTES, 'Batch flush start', {
    batch_id: batch.batchId,
    mode,
    reason,
    req_count: activeRequests.length,
    unique_instruments: uniqueIds.length,
    wait_ms: waitMs
  });

  const t0 = Date.now();
  try {
    // Circuit breaker short-circuit
    const now = Date.now();
    if (circuitOpenUntil && now < circuitOpenUntil) {
      throw new Error('CIRCUIT_OPEN');
    }

    // Micro-cache lookup (only if enabled and small union)
    const cacheTtl = readMicroCacheTtlMs();
    if (cacheTtl > 0) {
      const cacheKey = `${mode}|${uniqueIds.slice().sort().join(',')}`;
      const cached = microCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        for (const r of activeRequests) {
          if (r.isSettled) continue;
          const subset: Record<string, VortexQuote> = {};
          for (const id of r.instruments) {
            const q = (cached.data as any)[id];
            if (q != null) subset[id] = q;
          }
          r.isSettled = true;
          if (r.timeoutId) clearTimeout(r.timeoutId);
          r.resolve(subset);
        }

        lastFlushMeta = {
          mode,
          batchId: batch.batchId,
          reason: `${reason}_cache_hit`,
          uniqueInstrumentCount: uniqueIds.length,
          requestCount: activeRequests.length,
          upstreamMs: 0,
          waitMs,
          timestamp: new Date().toISOString()
        };

        logger.info(LogCategory.VORTEX_QUOTES, 'Batch served from micro-cache', {
          batch_id: batch.batchId,
          mode,
          cache: 'hit'
        });
        metrics.totalBatches += 1;
        metrics.totalRequests += activeRequests.length;
        metrics.totalInstruments += uniqueIds.length;
        return;
      }
    }

    // Single upstream call
    const quotes = await vortexAPI.getQuotes(uniqueIds, mode);
    const upstreamMs = Date.now() - t0;

    // Micro-cache store
    if (readMicroCacheTtlMs() > 0) {
      const cacheKey = `${mode}|${uniqueIds.slice().sort().join(',')}`;
      microCache.set(cacheKey, { data: quotes, expiresAt: Date.now() + readMicroCacheTtlMs() });
    }

    // Fan-out: resolve each request with its subset
    for (const r of activeRequests) {
      if (r.isSettled) continue;
      const subset: Record<string, VortexQuote> = {};
      for (const id of r.instruments) {
        const q = (quotes as any)[id];
        if (q != null) subset[id] = q;
      }
      r.isSettled = true;
      if (r.timeoutId) clearTimeout(r.timeoutId);
      r.resolve(subset);
    }

    lastFlushMeta = {
      mode,
      batchId: batch.batchId,
      reason,
      uniqueInstrumentCount: uniqueIds.length,
      requestCount: activeRequests.length,
      upstreamMs,
      waitMs,
      timestamp: new Date().toISOString()
    };

    logger.info(LogCategory.VORTEX_QUOTES, 'Batch flush complete', {
      batch_id: batch.batchId,
      mode,
      upstream_ms: upstreamMs,
      delivered_requests: activeRequests.length
    });

    metrics.totalBatches += 1;
    metrics.totalRequests += activeRequests.length;
    metrics.totalInstruments += uniqueIds.length;
    metrics.totalUpstreamCalls += 1;
    consecutiveFailures = 0;
  } catch (err) {
    logger.error(LogCategory.VORTEX_QUOTES, 'Batch flush failed', err as Error, {
      batch_id: batch.batchId,
      mode,
      reason
    });

    // Circuit breaker accounting
    const now = Date.now();
    metrics.totalUpstreamFailures += 1;
    metrics.lastErrorAt = now;
    consecutiveFailures += 1;
    const { failureThreshold, halfOpenAfterMs } = getQuotesBatcherConfig().circuitBreaker;
    if (consecutiveFailures >= failureThreshold) {
      circuitOpenUntil = now + halfOpenAfterMs;
      logger.warn(LogCategory.VORTEX_QUOTES, 'Circuit opened for quotes batcher', {
        open_until: circuitOpenUntil,
        failure_count: consecutiveFailures
      });
    }

    for (const r of activeRequests) {
      if (r.isSettled) continue;
      r.isSettled = true;
      if (r.timeoutId) clearTimeout(r.timeoutId);
      r.reject(err);
    }
  }
}

export interface BatchRequestOptions {
  clientId?: string;
  timeoutMs?: number; // per-request safety timeout
}

/**
 * Enqueue quotes request into the per-mode batch.
 * - Deduplicates instruments across all users in the same window
 * - Hard caps at MAX_UNION unique instruments; flushes immediately when reached
 */
export function requestQuotesBatched(
  instruments: string[],
  mode: string = 'ltp',
  options?: BatchRequestOptions
): Promise<Record<string, VortexQuote>> {
  const normalizedMode = mode || 'ltp';
  // Validate instruments list
  if (!Array.isArray(instruments) || instruments.length === 0) {
    return Promise.resolve({});
  }
  const batch = ensureBatch(normalizedMode);

  // Normalize & add instruments to the union set
  const validIds: string[] = [];
  for (const id of instruments || []) {
    const trimmed = (id || '').trim();
    if (!trimmed) continue;
    if (!batch.instruments.has(trimmed)) batch.instruments.add(trimmed);
    validIds.push(trimmed);
  }

  // If unique cap reached/exceeded, flush immediately
  if (batch.instruments.size >= readMaxUnion()) {
    logger.warn(LogCategory.VORTEX_QUOTES, 'Batch reached MAX_UNION; flushing', {
      batch_id: batch.batchId,
      mode: normalizedMode,
      unique_instruments: batch.instruments.size,
      cap: readMaxUnion()
    });
    if (batch.timer) { clearTimeout(batch.timer); batch.timer = null; }
    // Fire-and-forget flush; current request will still be part of this batch
    // because we do not recreate the batch until flush begins.
    // flushBatch detaches the batch at the start, so concurrent calls are safe.
    void flushBatch(normalizedMode, 'max_union');
  }

  return new Promise<Record<string, VortexQuote>>((resolve, reject) => {
    const req: RequestEntry = {
      instruments: validIds,
      clientId: options?.clientId,
      requestedAt: Date.now(),
      resolve,
      reject,
      isSettled: false,
      timeoutId: null
    };

    // Per-request safety timeout to avoid hanging
    const timeoutMs = Math.max(200, options?.timeoutMs || readRequestTimeoutMs());
    req.timeoutId = setTimeout(() => {
      if (req.isSettled) return;
      req.isSettled = true;
      logger.error(LogCategory.VORTEX_QUOTES, 'Quotes batcher request timed out', undefined, {
        mode: normalizedMode,
        clientId: options?.clientId,
        timeout_ms: timeoutMs
      });
      reject(new Error('BATCH_TIMEOUT'));
    }, timeoutMs);
    (req.timeoutId as any)?.unref?.();

    batch.requests.push(req);

    logger.debug(LogCategory.VORTEX_QUOTES, 'Enqueued quotes request into batch', {
      batch_id: batch.batchId,
      mode: normalizedMode,
      req_instruments: validIds.length,
      unique_instruments: batch.instruments.size,
      current_req_count: batch.requests.length
    });
  });
}

/** Diagnostics: snapshot of current batches and last flush metadata */
export function getQuotesBatcherState() {
  const state: Record<string, any> = {};
  for (const [mode, batch] of batches.entries()) {
    state[mode] = {
      batchId: batch.batchId,
      uniqueInstrumentCount: batch.instruments.size,
      requestCount: batch.requests.filter(r => !r.isSettled).length,
      ageMs: Date.now() - batch.startedAt,
      windowMs: readWindowMs(),
      maxUnion: readMaxUnion()
    };
  }
  return { activeBatches: state, lastFlushMeta };
}

/** Optional manual flush hook (used in diagnostics or tests) */
export async function manualFlush(mode: string) {
  await flushBatch(mode, 'manual');
}
