# WebSocket Architecture Documentation

## Overview

This platform uses **two separate WebSocket systems** for different purposes. Understanding their architecture and usage is crucial for proper integration.

---

## System 1: Market Data WebSocket (Socket.IO)

### Purpose
Real-time market prices, quotes, and market data streaming.

### Location
`lib/market-data/`

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │     WebSocketMarketDataProvider (Context API)         │  │
│  │  - Wraps dashboard components                        │  │
│  │  - Provides market data context                       │  │
│  │  - Auto-subscribes to watchlist/positions            │  │
│  └──────────────┬──────────────────────────────────────┘  │
│                 │                                           │
│  ┌──────────────▼──────────────────────────────────────┐  │
│  │        useWebSocketMarketData (React Hook)           │  │
│  │  - Manages WebSocket lifecycle                       │  │
│  │  - Handles subscription state                        │  │
│  │  - Provides price data to components                 │  │
│  └──────────────┬──────────────────────────────────────┘  │
│                 │                                           │
│  ┌──────────────▼──────────────────────────────────────┐  │
│  │   WebSocketMarketDataService (Business Logic)        │  │
│  │  - Price caching layer                               │  │
│  │  - Price enhancements (jitter, interpolation)        │  │
│  │  - Subscription management                           │  │
│  └──────────────┬──────────────────────────────────────┘  │
│                 │                                           │
│  ┌──────────────▼──────────────────────────────────────┐  │
│  │           SocketIOClient (Socket.IO Wrapper)         │  │
│  │  - Low-level Socket.IO connection                    │  │
│  │  - Event handlers                                    │  │
│  │  - Auto-reconnection logic                           │  │
│  └──────────────┬──────────────────────────────────────┘  │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│         Socket.IO Market Data Server                        │
│    (http://marketdata.vedpragya.com:3000/market-data)      │
│                                                               │
│  Events:                                                      │
│  - connected                                                  │
│  - market_data (price updates)                               │
│  - subscription_confirmed                                      │
│  - error                                                      │
│                                                               │
│  Emits:                                                       │
│  - subscribe_instruments {instruments: [], mode: 'ltp'}      │
│  - unsubscribe_instruments {instruments: []}                 │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **WebSocketMarketDataProvider** (`lib/market-data/providers/WebSocketMarketDataProvider.tsx`)
   - React Context provider
   - Auto-subscribes to watchlist, positions, and indices
   - Provides market data to child components

2. **useWebSocketMarketData Hook** (`lib/market-data/hooks/useWebSocketMarketData.ts`)
   - React hook interface
   - Manages connection lifecycle
   - Handles subscription state

3. **WebSocketMarketDataService** (`lib/market-data/services/WebSocketMarketDataService.ts`)
   - Business logic layer
   - Price caching
   - Enhancement (jitter, interpolation)

4. **SocketIOClient** (`lib/market-data/services/SocketIOClient.ts`)
   - Socket.IO connection wrapper
   - Event handling
   - Reconnection logic

### Connection Flow

```
1. Provider Initializes
   ↓
2. useWebSocketMarketData hook created
   ↓
3. WebSocketMarketDataService instantiated
   ↓
4. SocketIOClient connects to Socket.IO server
   ↓
5. Server sends 'connected' event
   ↓
6. Provider auto-subscribes to instruments
   ↓
7. Server sends 'subscription_confirmed'
   ↓
8. Server streams 'market_data' events
   ↓
9. Service caches prices and enhances data
   ↓
10. Hook updates React state
   ↓
11. Components re-render with new prices
```

### Usage

```typescript
import { WebSocketMarketDataProvider } from '@/lib/market-data/providers/WebSocketMarketDataProvider';
import { useMarketData } from '@/lib/market-data/providers/WebSocketMarketDataProvider';

// Wrap your dashboard
<WebSocketMarketDataProvider userId={userId}>
  <Dashboard />
</WebSocketMarketDataProvider>

// Use in components
function MyComponent() {
  const { quotes, isConnected, subscribe, unsubscribe } = useMarketData();
  
  // Access live prices
  const niftyPrice = quotes['26000']?.last_trade_price;
  
  // Manually subscribe
  subscribe([26000], 'ltp');
  
  // Unsubscribe
  unsubscribe([26000], 'ltp');
}
```

### Environment Variables

```bash
NEXT_PUBLIC_LIVE_MARKET_WS_URL=http://marketdata.vedpragya.com:3000/market-data
NEXT_PUBLIC_LIVE_MARKET_WS_API_KEY=demo-key-1
NEXT_PUBLIC_ENABLE_WS_MARKET_DATA=true
```

### Subscription Modes

- **ltp**: Last Traded Price only (22 bytes, fastest)
- **ohlcv**: OHLC + Volume data (~150 bytes)
- **full**: Complete market depth + OHLCV (~500+ bytes)

---

## System 2: Trading WebSocket

### Purpose
Real-time order execution, position updates, and account balance updates.

### Location
`lib/services/websocket/WebSocketManager.ts`

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                        │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐  │
│  │          useWebSocketTrading (React Hook)            │  │
│  │  - Trading data state                                │  │
│  │  - Order updates                                     │  │
│  │  - Position updates                                  │  │
│  └──────────────┬──────────────────────────────────────┘  │
│                 │                                           │
│  ┌──────────────▼──────────────────────────────────────┐  │
│  │           WebSocketManager (Singleton)                │  │
│  │  - Standard WebSocket connection                     │  │
│  │  - Event management                                   │  │
│  │  - Heartbeat mechanism                                │  │
│  └──────────────┬──────────────────────────────────────┘  │
└─────────────────┼───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Internal Trading WebSocket                      │
│          (ws://yourdomain.com/api/ws?userId=XXX)           │
│                                                               │
│  Events:                                                      │
│  - order_placed                                               │
│  - order_executed                                             │
│  - order_cancelled                                            │
│  - position_opened                                            │
│  - position_updated                                           │
│  - balance_updated                                            │
└─────────────────────────────────────────────────────────────┘
```

### Events

- `order_placed`: New order submitted
- `order_executed`: Order filled
- `order_cancelled`: Order cancelled
- `position_opened`: New position created
- `position_updated`: Position modified
- `balance_updated`: Account balance changed
- `margin_blocked`: Margin blocked
- `margin_released`: Margin released

### Usage

```typescript
import { useWebSocketTrading } from '@/lib/hooks/use-websocket-trading';

function TradingDashboard() {
  const { 
    orders, 
    positions, 
    account, 
    isWebSocketConnected 
  } = useWebSocketTrading(userId, true);
  
  // Updates automatically via WebSocket!
}
```

---

## When to Use Which System

### Use Market Data WebSocket for:
- ✅ Live prices in watchlist
- ✅ Real-time quotes on dashboard
- ✅ Index values (Nifty, BankNifty)
- ✅ Position LTP updates
- ✅ Any market data streaming

### Use Trading WebSocket for:
- ✅ Order execution notifications
- ✅ Position change alerts
- ✅ Balance updates
- ✅ Margin updates
- ✅ Any trading events

---

## Error Handling

### Market Data WebSocket

1. **Connection Failures**: Auto-reconnect with exponential backoff (5 attempts)
2. **Disconnection**: Use cached prices, show "Disconnected" status
3. **Invalid Data**: Log warning, skip invalid updates
4. **Subscription Errors**: Emit error event, continue with other subscriptions

### Trading WebSocket

1. **Connection Failures**: Fall back to polling
2. **Disconnection**: Use last known state
3. **Event Errors**: Log and continue

---

## Configuration

### Market Data WebSocket

```typescript
// Provider configuration
<WebSocketMarketDataProvider
  userId={userId}
  config={{
    jitter: { enabled: true, interval: 250, intensity: 0.15 },
    interpolation: { enabled: true, steps: 50, duration: 2800 }
  }}
>
  <Dashboard />
</WebSocketMarketDataProvider>
```

### Trading WebSocket

```typescript
// Hook configuration
const { orders, positions } = useWebSocketTrading(userId, enableWebSocket);
```

---

## Best Practices

1. **Always handle connection states**: Check `isConnected` before subscribing
2. **Use appropriate subscription modes**: Start with 'ltp', upgrade to 'ohlcv' or 'full' if needed
3. **Monitor error states**: Listen to error events and handle gracefully
4. **Cleanup subscriptions**: Unsubscribe on component unmount
5. **Cache fallback**: Use cached prices during disconnection
6. **Connection health**: Display connection status to users

---

## Testing

### Test Page
Navigate to `/test-websocket` to test Market Data WebSocket:
- Connect/disconnect manually
- Subscribe to token 26000 (Nifty)
- Monitor live price updates
- View comprehensive console logs

### Manual Testing
```bash
# Start development server
npm run dev

# Navigate to test page
http://localhost:3000/test-websocket
```

---

## Troubleshooting

### Market Data WebSocket Issues

1. **Not Connecting**: Check `NEXT_PUBLIC_LIVE_MARKET_WS_URL` in `.env.local`
2. **No Data**: Verify API key in `NEXT_PUBLIC_LIVE_MARKET_WS_API_KEY`
3. **Subscription Fails**: Check console logs for error messages
4. **Prices Not Updating**: Verify subscription is confirmed

### Trading WebSocket Issues

1. **Not Connecting**: Check internal WebSocket server status
2. **No Updates**: Verify WebSocket manager is initialized
3. **Fallback Required**: Ensure polling is enabled as fallback

---

## Conclusion

Two WebSocket systems serve different purposes:
- **Market Data WebSocket**: For market prices (Socket.IO)
- **Trading WebSocket**: For order/position updates (Standard WebSocket)

Both systems can run simultaneously without conflicts. Choose the appropriate system based on your data needs.

