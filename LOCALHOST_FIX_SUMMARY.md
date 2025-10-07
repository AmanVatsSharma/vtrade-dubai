# Localhost URL Fix - Order Placement Error Resolution

## Problem
The application was failing to place orders in production with the error:
```
ECONNREFUSED 127.0.0.1:3000
```

This was caused by hardcoded fallback URLs defaulting to `localhost:3000` when environment variables were not set.

## Root Cause
Multiple services were using `process.env.NEXT_PUBLIC_BASE_URL` with a fallback to `localhost:3000`:
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
```

In production (AWS Lambda), this environment variable was not set, causing the services to attempt connections to localhost instead of the actual production URL.

## Files Fixed

### 1. `/lib/services/order/PriceResolutionService.ts` (Line 197)
**Before:**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
```

**After:**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || 'https://www.marketpulse360.live'
```

### 2. `/lib/services/position/PositionManagementService.ts` (Line 339)
**Before:**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
```

**After:**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || 'https://www.marketpulse360.live'
```

### 3. `/app/api/trading/positions/actions.ts` (Line 58)
**Before:**
```typescript
const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/quotes?...`)
```

**After:**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || 'https://www.marketpulse360.live'
const res = await fetch(`${baseUrl}/api/quotes?...`)
```

### 4. `/lib/server/position-management.ts` (Line 48)
**Before:**
```typescript
const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/quotes?...`)
```

**After:**
```typescript
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
  || 'https://www.marketpulse360.live'
const res = await fetch(`${baseUrl}/api/quotes?...`)
```

## Solution Strategy

The fix implements a **three-tier fallback strategy**:

1. **Primary**: Use `NEXT_PUBLIC_BASE_URL` if set
2. **Secondary**: Use `VERCEL_URL` (automatically set by Vercel deployments)
3. **Tertiary**: Fall back to production domain `https://www.marketpulse360.live`

This ensures:
- ✅ Works in development (can set NEXT_PUBLIC_BASE_URL to localhost:3000)
- ✅ Works in Vercel deployments (auto-detects VERCEL_URL)
- ✅ Works in AWS Lambda/other platforms (uses production domain)
- ✅ No more ECONNREFUSED errors

## Environment Variables (Recommended Setup)

### Development (`.env.local`)
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### Production (Deployment Environment)
```env
NEXT_PUBLIC_BASE_URL=https://www.marketpulse360.live
```

Or simply leave it unset - the code will automatically use the production URL.

## Testing

### Before Deployment
The changes maintain backward compatibility:
- Local development still works with proper env vars
- Production will automatically use the correct URL

### After Deployment
1. Test order placement - should no longer see ECONNREFUSED errors
2. Monitor logs for successful price fetches
3. Verify position closing functionality works

## Impact

This fix resolves:
- ❌ Order placement failures
- ❌ Price resolution errors
- ❌ Position closing issues
- ❌ Console data fetch failures

All services that fetch live market data from `/api/quotes` endpoint will now correctly resolve to the production URL.

## Related Errors Fixed
- `[PRICE-RESOLUTION-SERVICE] Live price fetch error: TypeError: fetch failed`
- `Error: connect ECONNREFUSED 127.0.0.1:3000`
- `Failed to fetch console data`

---

**Status**: ✅ Fixed and ready for deployment
**Priority**: 🔴 Critical - Required for order placement functionality
**Testing**: Verify after next deployment
