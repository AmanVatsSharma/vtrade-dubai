# Deployment Checklist - Localhost Fix

## 🔴 Critical Fix Applied
Fixed order placement failures caused by hardcoded `localhost:3000` URLs in production.

## ✅ Changes Made

### Code Changes
- [x] Fixed `/lib/services/order/PriceResolutionService.ts`
- [x] Fixed `/lib/services/position/PositionManagementService.ts`
- [x] Fixed `/app/api/trading/positions/actions.ts`
- [x] Fixed `/lib/server/position-management.ts`

### Documentation Added
- [x] Created `LOCALHOST_FIX_SUMMARY.md`
- [x] Created `.env.example`
- [x] Created `DEPLOYMENT_CHECKLIST.md`

## 🚀 Deployment Steps

### 1. Environment Variables Setup

#### Option A: Set NEXT_PUBLIC_BASE_URL (Recommended)
In your deployment platform (AWS Lambda, Vercel, etc.), set:
```bash
NEXT_PUBLIC_BASE_URL=https://www.marketpulse360.live
```

#### Option B: Let Auto-Detection Handle It
If you don't set `NEXT_PUBLIC_BASE_URL`, the app will:
1. Try to use `VERCEL_URL` (auto-set by Vercel)
2. Fall back to `https://www.marketpulse360.live`

**Recommendation**: Set it explicitly to avoid any issues.

### 1b. Vercel-only: Ensure order execution runs (important)

On Vercel, API routes run serverless. Orders are accepted quickly (202) and then executed asynchronously.

To avoid orders staying `PENDING`, configure at least one of:

1) **Inline background execution (best-effort)**\n   Already supported in code (uses Vercel `waitUntil`).\n\n2) **Vercel Cron backstop (recommended)**\n   Create a Vercel Cron Job to call:\n\n   - `GET /api/cron/order-worker?limit=25`\n   - Header: `Authorization: Bearer $CRON_SECRET`\n\n   This sweeps and executes any missed `PENDING` orders.

### 2. Build & Deploy

```bash
# Install dependencies (if needed)
npm install

# Build the application
npm run build

# Deploy using your platform's deployment command
# (e.g., AWS SAM, Vercel CLI, etc.)
```

### 3. Post-Deployment Verification

#### Test Order Placement
1. Log into the application
2. Navigate to trading dashboard
3. Try to place a market order
4. **Expected**: Order should be placed successfully without errors
5. **Previous Error**: `ECONNREFUSED 127.0.0.1:3000`

#### Check Logs
Monitor your application logs for:
- ✅ Successful price fetches: `✅ [PRICE-RESOLUTION-SERVICE] Live price fetched:`
- ✅ No connection refused errors
- ✅ Correct URLs in logs: `https://www.marketpulse360.live/api/quotes`

#### Test Position Closing
1. If you have an open position, try closing it
2. **Expected**: Position closes successfully with realized P&L
3. **Previous Error**: Price fetch failures

#### Console Data
1. Visit: `https://www.marketpulse360.live/api/console`
2. **Expected**: Console data loads successfully
3. **Previous Error**: Failed to fetch console data

## 🔍 Troubleshooting

### If Orders Still Fail

1. **Check Environment Variable**
   ```bash
   # Verify it's set correctly in your deployment
   echo $NEXT_PUBLIC_BASE_URL
   ```

2. **Check Application Logs**
   Look for the log line:
   ```
   🌐 [PRICE-RESOLUTION-SERVICE] Calling Vortex API: <URL>
   ```
   The URL should be `https://www.marketpulse360.live/api/quotes?...`
   NOT `http://localhost:3000/api/quotes?...`

3. **Verify Build Included Changes**
   Ensure the latest code was deployed. Check file timestamps or git commit.

4. **Check API Endpoint**
   Test the quotes API directly:
   ```bash
   curl "https://www.marketpulse360.live/api/quotes?q=NSE:SBIN-EQ&mode=ltp"
   ```
   Should return market data, not connection errors.

### Common Issues

| Issue | Solution |
|-------|----------|
| Still seeing localhost in logs | Environment variable not set or build not redeployed |
| 404 on /api/quotes | API route deployment issue, unrelated to this fix |
| Different connection error | Network/firewall issue, not localhost issue |
| Works locally, fails in prod | Environment variable not set in production |

## 📊 Expected Outcomes

### Before Fix
```
❌ [PRICE-RESOLUTION-SERVICE] Live price fetch error: TypeError: fetch failed
   at node:internal/deps/undici/undici:13510:13
   { [cause]: Error: connect ECONNREFUSED 127.0.0.1:3000 }
```

### After Fix
```
✅ [PRICE-RESOLUTION-SERVICE] Calling Vortex API: https://www.marketpulse360.live/api/quotes?q=NSE:SBIN-EQ&mode=ltp
✅ [PRICE-RESOLUTION-SERVICE] Live price fetched: 823.45
✅ [PRICE-RESOLUTION-SERVICE] Tier 1 SUCCESS - Live price fetched: 823.45
```

## 🎯 Success Criteria

- [ ] Orders can be placed without `ECONNREFUSED` errors
- [ ] Position closing works correctly
- [ ] Console data loads successfully
- [ ] Price fetches use correct production URL in logs
- [ ] No references to `localhost:3000` in production logs

## 📝 Rollback Plan

If issues occur, you can rollback by:

1. Revert the 4 files to their previous versions
2. Set `NEXT_PUBLIC_BASE_URL=https://www.marketpulse360.live` explicitly
3. Redeploy

However, the current fix is **safer and more robust** than the previous implementation.

## 📞 Support

If you encounter issues:
1. Check application logs for detailed error messages
2. Verify environment variables are set correctly
3. Ensure the API endpoints are accessible
4. Review the `LOCALHOST_FIX_SUMMARY.md` for technical details

---

**Last Updated**: $(date)
**Priority**: 🔴 Critical
**Status**: ✅ Ready for Deployment
