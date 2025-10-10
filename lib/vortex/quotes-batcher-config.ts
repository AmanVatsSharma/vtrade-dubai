// lib/vortex/quotes-batcher-config.ts
import { z } from 'zod';

export const QuotesBatcherConfigSchema = z.object({
  windowMs: z.number().min(50).max(5000),
  maxUnion: z.number().min(10).max(5000),
  requestTimeoutMs: z.number().min(200).max(30000),
  microCacheTtlMs: z.number().min(0).max(5000), // 0 disables micro-cache
  circuitBreaker: z.object({
    failureThreshold: z.number().min(1).max(50),
    halfOpenAfterMs: z.number().min(1000).max(60000)
  })
});

export type QuotesBatcherConfig = z.infer<typeof QuotesBatcherConfigSchema>;

const DEFAULT_CONFIG: QuotesBatcherConfig = {
  windowMs: Number(process.env.QUOTES_BATCH_WINDOW_MS || 1000),
  maxUnion: Number(process.env.QUOTES_BATCH_MAX_UNION || 1000),
  requestTimeoutMs: Number(process.env.QUOTES_BATCH_REQUEST_TIMEOUT_MS || 4000),
  microCacheTtlMs: Number(process.env.QUOTES_BATCH_MICRO_CACHE_TTL_MS || 0),
  circuitBreaker: {
    failureThreshold: Number(process.env.QUOTES_BATCH_CB_FAILURES || 5),
    halfOpenAfterMs: Number(process.env.QUOTES_BATCH_CB_HALF_OPEN_MS || 10000)
  }
};

let currentConfig: QuotesBatcherConfig = DEFAULT_CONFIG;

export function getQuotesBatcherConfig(): QuotesBatcherConfig {
  return { ...currentConfig };
}

export function setQuotesBatcherConfig(partial: Partial<QuotesBatcherConfig>) {
  const merged = { ...currentConfig, ...partial, circuitBreaker: { ...currentConfig.circuitBreaker, ...(partial.circuitBreaker || {}) } };
  const parsed = QuotesBatcherConfigSchema.safeParse(merged);
  if (!parsed.success) {
    const errorMessage = parsed.error?.errors?.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new Error(`Invalid quotes batcher config: ${errorMessage}`);
  }
  currentConfig = parsed.data;
  return currentConfig;
}
