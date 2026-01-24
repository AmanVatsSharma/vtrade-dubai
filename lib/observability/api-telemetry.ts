/**
 * @file api-telemetry.ts
 * @module lib/observability
 * @description Small helper for consistent API request telemetry logging (requestId + duration).
 * @author BharatERP
 * @created 2026-01-24
 */

import { withRequest } from "@/lib/observability/logger"

export type ApiTelemetryConfig = {
  name: string
}

export async function withApiTelemetry<T>(
  req: Request,
  config: ApiTelemetryConfig,
  handler: () => Promise<T>,
): Promise<{ result: T; durationMs: number }> {
  const start = Date.now()
  const url = new URL(req.url)
  const requestId = req.headers.get("x-request-id") || undefined

  const log = withRequest({
    requestId,
    ip: req.headers.get("x-forwarded-for"),
    route: url.pathname,
  })

  log.info({ event: "api_start", name: config.name, method: (req as any).method, path: url.pathname })
  try {
    const result = await handler()
    const durationMs = Date.now() - start
    log.info({ event: "api_success", name: config.name, durationMs })
    return { result, durationMs }
  } catch (err: any) {
    const durationMs = Date.now() - start
    log.error({ event: "api_error", name: config.name, durationMs, err: err?.message, stack: err?.stack })
    throw err
  }
}

