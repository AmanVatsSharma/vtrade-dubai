// app/api/quotes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { vortexAPI } from "@/lib/vortex/vortex-enhanced";
import { requestQuotesBatched } from "@/lib/vortex/quotes-batcher";
import { logger, LogCategory } from "@/lib/vortex/vortexLogger";
import { cacheService, CacheNamespaces } from "@/lib/services/cache/CacheService";
import { checkRateLimit, getRateLimitKey } from "@/lib/services/security/RateLimiter";
import { config } from "@/lib/config/runtime";
import crypto from 'crypto'
import { withRequest } from "@/lib/observability/logger";
import { requestCount, requestDuration, cacheHits, cacheMiss, upstreamErrors, circuitBreakerOpen } from "@/lib/observability/metrics";
import { captureError } from "@/lib/observability/sentry";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const reqLogger = withRequest({ route: '/api/quotes', ip: ip || undefined })
  
  try {
    // 1. Validate environment configuration (support Vedpragya and legacy env names)
    const apiKey = process.env.VEDPRAGYA_X_API_KEY || process.env.VORTEX_X_API_KEY;
    if (!apiKey) {
      logger.error(LogCategory.VORTEX_QUOTES, 'VORTEX_X_API_KEY is not defined in environment variables');
      return NextResponse.json(
        { 
          error: "Server configuration error",
          code: "MISSING_API_KEY",
          timestamp: new Date().toISOString()
        },
        { status: 500, headers: { "X-Powered-By": "Vedpragya Bharat", "X-API-Name": "Vedpragya Quotes API" } }
      );
    }

    // 2. Parse and validate query parameters
    // Normalize instrument ids and sort for cache maximization
    const instruments = searchParams.getAll('q').map(s => (s || '').trim()).filter(Boolean).sort();
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
      }, { status: 400, headers: { "X-Powered-By": "Vedpragya Bharat", "X-API-Name": "Vedpragya Quotes API" } });
    }

    // Per-IP rate limit (1 rps)
    if (config.feature.rateLimit) {
      const key = getRateLimitKey('quotes_ip', ip as string)
      const limit = checkRateLimit(key, { windowMs: config.rateLimit.quotesWindowMs, maxRequests: config.rateLimit.quotesMax, message: 'Too many requests' })
      if (!limit.allowed) {
        reqLogger.warn({ event: 'rate_limited', retryAfter: limit.retryAfter })
        const res = NextResponse.json({ error: 'Too Many Requests', code: 'RATE_LIMITED', retryAfter: limit.retryAfter }, { status: 429 })
        res.headers.set('Retry-After', String(limit.retryAfter || 1))
        return res
      }
    }

    // 3. Validate session
    console.log('🔐 [API/Quotes] Validating session...');
    const isSessionValid = await vortexAPI.isSessionValid();
    
    if (!isSessionValid) {
      console.error('❌ [API/Quotes] No valid session found');
      logger.error(LogCategory.VORTEX_QUOTES, 'No valid session found', undefined, { clientId });
      
      return NextResponse.json({ 
        error: "No active session found. Please authenticate first.",
        code: "NO_SESSION",
        hint: "Visit /admin/dashboard to create a session.",
        timestamp: new Date().toISOString()
      }, { status: 401, headers: { "X-Powered-By": "Vedpragya Bharat", "X-API-Name": "Vedpragya Quotes API" } });
    }
    
    console.log('✅ [API/Quotes] Session is valid, proceeding to fetch quotes');

    // Compute canonical cache key for server-side caching
    const cacheKey = `${mode}|${instruments.join(',')}`

    // Edge/CDN cache headers: ETag based on canonical response body hash
    const wantEtag = request.headers.get('if-none-match')

    // Server-side cache with SWR
    const ttlMs = config.cache.apiTtlMs
    const staleMs = config.cache.apiStaleMs

    // Attempt cache hit first
    const cached = config.feature.cache ? cacheService.get<any>(cacheKey, { namespace: CacheNamespaces.QUOTES }) : null
    if (cached) {
      cacheHits.inc({ route: '/api/quotes' })
      const body = { success: true, data: cached.data, meta: cached.meta }
      const etag = `W/"${crypto.createHash('sha1').update(JSON.stringify(body)).digest('hex')}"`
      if (wantEtag && wantEtag === etag) {
        const notMod = new NextResponse(null, { status: 304 })
        notMod.headers.set('ETag', etag)
        notMod.headers.set('Cache-Control', 'public, max-age=2, s-maxage=2, stale-while-revalidate=5')
        notMod.headers.set('Vary', 'mode, Accept-Encoding')
        notMod.headers.set('X-Cache-Status', 'hit')
        return notMod
      }
      const res = NextResponse.json(body)
      res.headers.set('ETag', etag)
      res.headers.set('Cache-Control', 'public, max-age=2, s-maxage=2, stale-while-revalidate=5')
      res.headers.set('Vary', 'mode, Accept-Encoding')
      res.headers.set('X-Cache-Status', 'hit')
      requestCount.inc({ route: '/api/quotes', method: 'GET', status: '200' })
      const dur = (Date.now() - startTime) / 1000
      requestDuration.observe({ route: '/api/quotes', method: 'GET', status: '200' }, dur)
      return res
    } else {
      cacheMiss.inc({ route: '/api/quotes' })
    }

    // 4. Fetch quotes using batcher (coalesces within 1s, 1000 unique cap)
    logger.info(LogCategory.VORTEX_QUOTES, 'Fetching quotes via batcher', {
      instruments,
      mode,
      clientId
    });

    const quotes = await requestQuotesBatched(instruments, mode, { clientId });

    const processingTime = Date.now() - startTime;
    logger.info(LogCategory.VORTEX_QUOTES, 'Quotes fetched successfully', {
      instrumentCount: Object.keys(quotes).length,
      processingTime,
      clientId
    });

    // Store in server cache for SWR
    if (config.feature.cache) {
      cacheService.set(cacheKey, {
        data: quotes,
        meta: {
          instrumentCount: Object.keys(quotes).length,
          mode,
          processingTime,
          timestamp: new Date().toISOString()
        }
      }, { namespace: CacheNamespaces.QUOTES, ttl: ttlMs })
      // Last-known-good for stale fallback during upstream slowness
      if (staleMs > 0) {
        cacheService.set(`lastgood|${cacheKey}`, {
          data: quotes,
          meta: {
            instrumentCount: Object.keys(quotes).length,
            mode,
            processingTime,
            timestamp: new Date().toISOString()
          }
        }, { namespace: CacheNamespaces.QUOTES, ttl: staleMs })
      }
    }

    const body = {
      success: true,
      data: quotes,
      meta: {
        instrumentCount: Object.keys(quotes).length,
        mode,
        processingTime,
        timestamp: new Date().toISOString()
      }
    }
    const etag = `W/"${crypto.createHash('sha1').update(JSON.stringify(body)).digest('hex')}"`
    if (wantEtag && wantEtag === etag) {
      const notMod = new NextResponse(null, { status: 304 })
      notMod.headers.set('ETag', etag)
      notMod.headers.set('Cache-Control', 'public, max-age=2, s-maxage=2, stale-while-revalidate=5')
      notMod.headers.set('Vary', 'mode, Accept-Encoding')
      notMod.headers.set('X-Cache-Status', 'miss')
      return notMod
    }
    const res = NextResponse.json(body, { headers: { "X-Powered-By": "Vedpragya Bharat", "X-API-Name": "Vedpragya Quotes API" } })
    res.headers.set('ETag', etag)
    res.headers.set('Cache-Control', 'public, max-age=2, s-maxage=2, stale-while-revalidate=5')
    res.headers.set('Vary', 'mode, Accept-Encoding')
    res.headers.set('X-Cache-Status', 'miss')

    requestCount.inc({ route: '/api/quotes', method: 'GET', status: '200' })
    const dur = (Date.now() - startTime) / 1000
    requestDuration.observe({ route: '/api/quotes', method: 'GET', status: '200' }, dur)
    return res

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error(LogCategory.VORTEX_QUOTES, 'Failed to fetch quotes', error as Error, {
      instruments: searchParams.getAll('q'),
      mode: searchParams.get('mode') || 'ltp',
      processingTime,
      clientId: request.headers.get('x-client-id') || 'unknown'
    });

    // observability side effects
    try {
      captureError(error as any, { route: '/api/quotes' })
      const msg = (error as any)?.message || ''
      if (msg.includes('API_REQUEST_FAILED')) {
        upstreamErrors.inc({ route: '/api/quotes', upstream: 'vortex' })
      }
      if (msg.includes('CIRCUIT_OPEN')) {
        circuitBreakerOpen.inc({ route: '/api/quotes' })
      }
    } catch {}

    // Return appropriate error response based on error type
    if (error instanceof Error) {
      if (error.message.includes('NO_SESSION')) {
        return NextResponse.json({
          error: "Session expired. Please login again.",
          code: "SESSION_EXPIRED",
          timestamp: new Date().toISOString()
        }, { status: 401, headers: { "X-Powered-By": "Vedpragya Bharat", "X-API-Name": "Vedpragya Quotes API" } });
      }
      
      if (error.message.includes('API_REQUEST_FAILED')) {
        return NextResponse.json({
          error: "Failed to fetch data from market data provider",
          code: "API_ERROR",
          details: error.message,
          timestamp: new Date().toISOString()
        }, { status: 502, headers: { "X-Powered-By": "Vedpragya Bharat", "X-API-Name": "Vedpragya Quotes API" } });
      }
    }

    // Serve stale last-known-good if available
    const mode = searchParams.get('mode') || 'ltp'
    const instruments = searchParams.getAll('q').map(s => (s || '').trim()).filter(Boolean).sort()
    const cacheKey = `${mode}|${instruments.join(',')}`
    const stale = config.feature.cache ? cacheService.get<any>(`lastgood|${cacheKey}`, { namespace: CacheNamespaces.QUOTES }) : null
    if (stale) {
      const body = { success: true, data: stale.data, meta: { ...stale.meta, stale: true } }
      const etag = `W/"${crypto.createHash('sha1').update(JSON.stringify(body)).digest('hex')}"`
      const res = NextResponse.json(body, { status: 200 })
      res.headers.set('ETag', etag)
      res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=0, stale-while-revalidate=5')
      res.headers.set('Vary', 'mode, Accept-Encoding')
      res.headers.set('X-Cache-Status', 'stale')
      requestCount.inc({ route: '/api/quotes', method: 'GET', status: '200' })
      requestDuration.observe({ route: '/api/quotes', method: 'GET', status: '200' }, processingTime / 1000)
      return res
    }

    requestCount.inc({ route: '/api/quotes', method: 'GET', status: '500' })
    requestDuration.observe({ route: '/api/quotes', method: 'GET', status: '500' }, processingTime / 1000)
    return NextResponse.json({
      error: "An unexpected error occurred while fetching quotes",
      code: "UNEXPECTED_ERROR",
      timestamp: new Date().toISOString()
    }, { status: 500, headers: { "X-Powered-By": "Vedpragya Bharat", "X-API-Name": "Vedpragya Quotes API" } });
  }
}
