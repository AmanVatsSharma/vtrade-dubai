# 🚀 Vortex WebSocket Quick Start Guide

## ⚡ 5-Minute Setup for Live Trading Quotes

**Last Updated:** 2025-10-07  
**Difficulty:** Easy  
**Time Required:** 5 minutes

---

## 📋 What You'll Get

✅ Real-time market quotes for NIFTY, BANK NIFTY, RELIANCE, TCS  
✅ Auto-reconnecting WebSocket connection  
✅ Beautiful, responsive UI  
✅ Comprehensive error handling  
✅ Live connection status indicator  

---

## 🎯 Prerequisites

Before starting, make sure you have:

1. ✅ **Vortex API Credentials** configured in `.env`
   ```bash
   VORTEX_APPLICATION_ID=your_app_id
   VORTEX_X_API_KEY=your_api_key
   ```

2. ✅ **Active Vortex Session**
   - You need to login to Vortex first
   - Exchange an auth token for access token

3. ✅ **Node.js & Dependencies** installed
   ```bash
   npm install
   # or
   pnpm install
   ```

---

## 🛠️ Step-by-Step Setup

### Step 1: Verify Your Environment

```bash
# Check if environment variables are set
echo $VORTEX_APPLICATION_ID
echo $VORTEX_X_API_KEY

# If not set, add them to .env file
nano .env
```

### Step 2: Create a Vortex Session

You need a valid access token. Use one of these methods:

#### Option A: Using the Admin Dashboard

1. Navigate to `/admin/dashboard`
2. Click on "Vortex Settings"
3. Click "Login to Vortex"
4. Complete OAuth flow
5. Session automatically created

#### Option B: Using API Directly

```bash
# Get auth code from SSO
# Visit: https://flow.rupeezy.in?applicationId=YOUR_APP_ID

# Exchange auth code for access token
curl -X POST http://localhost:3000/api/admin/vortex/session \
  -H "Content-Type: application/json" \
  -d '{"authToken": "YOUR_AUTH_CODE"}'
```

#### Option C: Using the Script

```bash
# Run the vortex client example
node lib/vortexClient.ts
```

### Step 3: Start the Development Server

```bash
npm run dev
# or
pnpm dev
```

The app will start at `http://localhost:3000`

### Step 4: Navigate to Admin Dashboard

Open your browser and go to:

```
http://localhost:3000/admin/dashboard
```

You should see:
- **Admin Dashboard** with KYC stats
- **Live Market Data** section with WebSocket indicator
- **Live quotes** for NIFTY, BANK NIFTY, RELIANCE, TCS

### Step 5: Verify Connection

Look for these indicators:

✅ **Green "Connected" badge** - WebSocket is connected  
✅ **Live prices updating** - Data is flowing  
✅ **No error messages** - Everything working correctly  

---

## 🔍 Verification Checklist

### Visual Verification

- [ ] Can see "Live Market Data" section
- [ ] Connection badge shows "Connected" (green)
- [ ] Price cards display for all 4 instruments
- [ ] Prices are updating (watch for changes)
- [ ] Change percentages showing in green/red
- [ ] No error banners visible

### Console Verification

Open browser DevTools (F12) and check console:

```
✅ Look for these logs:
🎬 [LiveMarketQuotes] Component rendering
📊 [LiveMarketQuotes] WebSocket State: { isConnected: true }
🔔 [LiveMarketQuotes] Subscribing to market instruments
📝 [LiveMarketQuotes] Subscribing to NIFTY 50...
💹 [LiveMarketQuotes] Price update received

❌ Should NOT see:
🚨 [HealthMonitor] Error recorded
❌ [LiveMarketQuotes] Connection lost
```

### Network Verification

In DevTools Network tab:

1. Filter by "WS" (WebSocket)
2. Look for connection to `wire.rupeezy.in`
3. Status should be "101 Switching Protocols"
4. Messages tab should show incoming binary data

---

## 🎨 What You Should See

### Desktop View

```
┌─────────────────────────────────────────────────────────┐
│  Admin Dashboard                          [Sign Out]    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Stats Cards (Total Users, Pending KYC, etc.)        │
│                                                          │
│  📈 Live Market Data                      [WebSocket]   │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Live Market Quotes                [Connected]      │ │
│  │ Real-time market data via WebSocket               │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ Status: Online | Subscriptions: 4 | Updates: 4    │ │
│  ├────────────────────────────────────────────────────┤ │
│  │ [Disconnect] [Reconnect] [Show Details]           │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ NIFTY 50 │ │BANK NIFTY│ │ RELIANCE │ │   TCS    │  │
│  │          │ │          │ │          │ │          │  │
│  │₹19,500.25│ │₹44,250.50│ │₹2,450.75 │ │₹3,550.25 │  │
│  │ +125.50  │ │ +320.25  │ │ +12.50   │ │ -15.75   │  │
│  │ (+0.65%) │ │ (+0.73%) │ │ (+0.51%) │ │ (-0.44%) │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Disconnected" Badge (Red)

**Possible Causes:**
- No Vortex session exists
- Invalid credentials
- Network issue

**Solution:**
```bash
# 1. Check session
curl http://localhost:3000/api/ws

# Should return:
# { "success": true, "data": { "url": "wss://..." } }

# If error, create session first (see Step 2)
```

### Issue 2: "Connecting..." Badge (Yellow)

**Possible Causes:**
- Network firewall blocking WebSocket
- Server temporarily down
- Invalid access token

**Solution:**
```bash
# 1. Check if WebSocket port is open
telnet wire.rupeezy.in 443

# 2. Check browser console for errors

# 3. Try manual reconnect via button
```

### Issue 3: No Price Updates

**Possible Causes:**
- Market closed
- Invalid instrument tokens
- Subscription failed

**Solution:**
```typescript
// Check browser console for:
📝 [LiveMarketQuotes] Subscribing to NIFTY 50...

// Should see subscription confirmations
// If not, check instrument tokens are correct
```

### Issue 4: Component Not Showing

**Possible Causes:**
- Not logged in as admin
- JavaScript error
- Build issue

**Solution:**
```bash
# 1. Check you're logged in as ADMIN/MODERATOR

# 2. Check browser console for errors

# 3. Rebuild
npm run build

# 4. Clear cache
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

---

## 🔧 Testing the Connection

### Test 1: Manual Connect/Disconnect

1. Click **Disconnect** button
2. Badge should turn red "Disconnected"
3. Price updates stop
4. Click **Connect** button
5. Badge should turn green "Connected"
6. Price updates resume

**✅ Pass:** Connection toggles work correctly

### Test 2: Auto-Reconnect

1. Open DevTools Network tab
2. Note the WebSocket connection
3. Right-click on WS connection → "Close connection"
4. Watch the badge - should show "Connecting..."
5. Connection should re-establish automatically
6. Badge turns green again

**✅ Pass:** Auto-reconnect works

### Test 3: Price Updates

1. Watch one price card for 10 seconds
2. Note if the price changes
3. Check the timestamp updates

**✅ Pass:** Prices update in real-time

### Test 4: Error Handling

1. Stop the Next.js dev server
2. Refresh the page
3. Should see error message
4. Start server again
5. Click "Retry Connection"

**✅ Pass:** Errors handled gracefully

---

## 📊 Understanding the UI

### Connection Status Badge

| Badge | Meaning | Action |
|-------|---------|--------|
| 🟢 Connected | WebSocket active | ✅ All good! |
| 🟡 Connecting... | Establishing connection | ⏳ Wait a few seconds |
| 🔴 Disconnected | No connection | 🔄 Click Reconnect |

### Price Card Colors

| Color | Meaning |
|-------|---------|
| 🟢 Green | Price increased |
| 🔴 Red | Price decreased |
| ⚪ Gray | No change |

### Info Row

- **Status**: Online/Offline/Connecting
- **Subscriptions**: Number of active instrument subscriptions
- **Updates**: Number of instruments with price data
- **Last Update**: Timestamp of most recent update

---

## 🎯 Next Steps

Now that you have WebSocket working:

### 1. Customize Instruments

Edit `/components/vortex/LiveMarketQuotes.tsx`:

```typescript
const MARKET_INSTRUMENTS: MarketInstrument[] = [
  {
    name: 'YOUR_STOCK',
    displayName: 'Your Stock Name',
    exchange: 'NSE_EQ',
    token: 12345, // Your instrument token
    description: 'Your Stock Description'
  }
];
```

### 2. Add to Other Pages

```tsx
// In any page.tsx
import dynamic from 'next/dynamic';
import { WebSocketErrorBoundary } from '@/components/vortex/WebSocketErrorBoundary';

const LiveMarketQuotes = dynamic(
  () => import('@/components/vortex/LiveMarketQuotes'),
  { ssr: false }
);

export default function MyPage() {
  return (
    <WebSocketErrorBoundary>
      <LiveMarketQuotes />
    </WebSocketErrorBoundary>
  );
}
```

### 3. Integrate with Trading

Use live prices in order placement:

```tsx
import { useVortexWebSocket } from '@/hooks/use-vortex-websocket';

function OrderForm() {
  const { getPrice } = useVortexWebSocket({ autoConnect: true });
  
  const niftyPrice = getPrice('NSE_EQ', 26000);
  
  return (
    <div>
      Current NIFTY: ₹{niftyPrice?.lastTradePrice}
      {/* Your order form */}
    </div>
  );
}
```

### 4. Monitor Health

```tsx
import { websocketHealthMonitor } from '@/lib/vortex/websocket-health-monitor';

const metrics = websocketHealthMonitor.getMetrics();
console.log('Health Score:', metrics.healthScore);
console.log('Latency:', metrics.averageLatency);
```

---

## 📚 Learn More

- **Full Documentation**: [VORTEX_WEBSOCKET_INTEGRATION.md](./VORTEX_WEBSOCKET_INTEGRATION.md)
- **Flow Diagrams**: [VORTEX_WEBSOCKET_FLOW_DIAGRAM.md](./VORTEX_WEBSOCKET_FLOW_DIAGRAM.md)
- **API Reference**: See Integration docs
- **Troubleshooting**: See Integration docs

---

## 🤝 Need Help?

1. **Check browser console** - Most issues show detailed error logs
2. **Review flow diagrams** - Understand how data flows
3. **Read full documentation** - Comprehensive guide available
4. **Check Vortex API docs** - https://docs.rupeezy.in

---

## ✅ Success Checklist

- [x] Environment variables configured
- [x] Vortex session created
- [x] Dev server running
- [x] Admin dashboard accessible
- [x] WebSocket connected (green badge)
- [x] Live prices updating
- [x] No errors in console
- [x] Reconnection works
- [x] Manual controls work

**If all checked - Congratulations! 🎉 Your WebSocket integration is working perfectly!**

---

**Happy Trading! 📈🚀**