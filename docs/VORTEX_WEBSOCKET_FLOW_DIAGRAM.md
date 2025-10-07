# Vortex WebSocket Integration - Flow Diagrams

## 📊 Overview

This document contains comprehensive flow diagrams for the Vortex WebSocket integration, showing how live market data flows through the system.

---

## 🔄 WebSocket Connection Lifecycle

```mermaid
graph TD
    Start[Component Mount] --> CheckAutoConnect{Auto Connect<br/>Enabled?}
    
    CheckAutoConnect -->|Yes| InitWS[Initialize WebSocket]
    CheckAutoConnect -->|No| WaitManual[Wait for Manual Connect]
    
    WaitManual --> ManualConnect[User Clicks Connect]
    ManualConnect --> InitWS
    
    InitWS --> GetToken[Fetch Access Token<br/>from /api/ws]
    
    GetToken --> TokenSuccess{Token<br/>Retrieved?}
    TokenSuccess -->|No| ShowError[Show Error:<br/>No Valid Session]
    TokenSuccess -->|Yes| CreateWS[Create WebSocket<br/>Instance]
    
    CreateWS --> ConnectWS[Connect to<br/>wss://wire.rupeezy.in/ws]
    
    ConnectWS --> WSOpen{Connection<br/>Opened?}
    
    WSOpen -->|Yes| OnConnected[Emit 'connected' Event]
    WSOpen -->|No| OnError[Emit 'error' Event]
    
    OnConnected --> StartHeartbeat[Start Heartbeat Timer<br/>30s interval]
    StartHeartbeat --> ResubscribeAll[Resubscribe to<br/>Previous Subscriptions]
    ResubscribeAll --> Connected[Connected State]
    
    Connected --> ListenMessages[Listen for Messages]
    
    ListenMessages --> MessageType{Message<br/>Type?}
    MessageType -->|Binary| ParseBinary[Parse Binary Data<br/>to Price Quotes]
    MessageType -->|JSON| ParseJSON[Parse JSON Message]
    
    ParseBinary --> EmitQuote[Emit 'quote' Event]
    ParseJSON --> EmitMessage[Emit 'message' Event]
    
    EmitQuote --> UpdateUI[Update UI with<br/>New Prices]
    EmitMessage --> UpdateUI
    
    UpdateUI --> ListenMessages
    
    OnError --> CheckReconnect{Reconnect<br/>Attempts < Max?}
    CheckReconnect -->|Yes| ScheduleReconnect[Schedule Reconnect<br/>5s * attempts]
    CheckReconnect -->|No| FinalError[Show Final Error]
    
    ScheduleReconnect --> Wait[Wait...]
    Wait --> ConnectWS
    
    Connected --> Disconnect{User Disconnects<br/>or Error?}
    Disconnect --> StopHeartbeat[Stop Heartbeat]
    StopHeartbeat --> CloseWS[Close WebSocket]
    CloseWS --> Disconnected[Disconnected State]
    
    style Start fill:#e1f5e1
    style Connected fill:#c3e6cb
    style Disconnected fill:#f8d7da
    style ShowError fill:#f8d7da
    style FinalError fill:#f8d7da
    style UpdateUI fill:#d1ecf1
```

---

## 📡 Data Subscription Flow

```mermaid
sequenceDiagram
    participant UI as LiveMarketQuotes Component
    participant Hook as useVortexWebSocket Hook
    participant WS as VortexWebSocket Class
    participant Server as Vortex WebSocket Server
    
    UI->>Hook: Component Mounts
    Hook->>WS: connect()
    
    WS->>Server: WebSocket Connection Request
    Server-->>WS: Connection Established
    
    WS->>Hook: Emit 'connected' event
    Hook->>UI: Update isConnected = true
    
    UI->>Hook: subscribeToFull('NSE_EQ', 26000) [NIFTY]
    Hook->>WS: subscribe({exchange, token, mode: 'full'})
    
    WS->>Server: Send Subscribe Message<br/>{exchange: 'NSE_EQ', token: 26000, mode: 'full'}
    Server-->>WS: Subscription Confirmed
    
    WS->>Hook: Emit 'subscribed' event
    Hook->>UI: Add to subscriptions array
    
    Note over Server: Market Data Updates...
    
    Server-->>WS: Binary Market Data
    WS->>WS: Parse Binary to VortexPriceData
    WS->>Hook: Emit 'quote' event
    Hook->>Hook: Update priceData Map
    Hook->>UI: Re-render with new prices
    
    UI->>UI: Display Updated Price
    
    Note over UI,Server: Continuous Updates Every Second
    
    UI->>Hook: unsubscribe({exchange, token, mode})
    Hook->>WS: unsubscribe()
    WS->>Server: Send Unsubscribe Message
    Server-->>WS: Unsubscription Confirmed
    WS->>Hook: Emit 'unsubscribed' event
    Hook->>UI: Remove from subscriptions
```

---

## 🏗️ Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard Page                     │
│                 /app/(admin)/admin/dashboard                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  WebSocketErrorBoundary                      │
│           • Catches and handles component errors             │
│           • Provides retry mechanism                         │
│           • Logs errors to console                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   LiveMarketQuotes Component                 │
│           • Displays real-time market quotes                 │
│           • Manages UI state and user interactions           │
│           • Renders price cards and connection status        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  useVortexWebSocket Hook                     │
│           • Manages WebSocket lifecycle                      │
│           • Handles subscriptions                            │
│           • Provides connection state                        │
│           • Stores price data in Map                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   VortexWebSocket Class                      │
│           • Low-level WebSocket management                   │
│           • Binary data parsing                              │
│           • Heartbeat mechanism                              │
│           • Auto-reconnection logic                          │
│           • Event emission                                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│              Browser WebSocket API                           │
│         wss://wire.rupeezy.in/ws?auth_token=XXX             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Flow

```mermaid
graph LR
    A[Component Needs WS] --> B[Call /api/ws]
    B --> C{Valid Vortex<br/>Session?}
    
    C -->|No| D[Return 401<br/>NO_SESSION]
    C -->|Yes| E[Get Session from DB]
    
    E --> F[Extract Access Token]
    F --> G[Build WebSocket URL<br/>with auth_token]
    G --> H[Return WS Info to Client]
    
    H --> I[Client Creates WebSocket]
    I --> J[WebSocket Connects<br/>with auth_token in URL]
    
    J --> K{Auth Token<br/>Valid?}
    K -->|No| L[Connection Rejected]
    K -->|Yes| M[Connection Established]
    
    M --> N[Stream Market Data]
    
    style D fill:#f8d7da
    style L fill:#f8d7da
    style M fill:#c3e6cb
    style N fill:#d1ecf1
```

---

## 💹 Real-time Price Update Flow

```mermaid
graph TD
    A[Market Data Update<br/>at Exchange] --> B[Vortex Server Receives]
    
    B --> C[Server Prepares<br/>Binary Packet]
    
    C --> D{Subscribed<br/>Clients?}
    D -->|No| E[Discard]
    D -->|Yes| F[Broadcast to<br/>Subscribed Clients]
    
    F --> G[Client WebSocket<br/>Receives Binary Data]
    
    G --> H[Parse Binary<br/>DataView]
    
    H --> I[Extract Fields:<br/>• exchange<br/>• token<br/>• lastTradePrice<br/>• OHLC<br/>• volume<br/>• etc.]
    
    I --> J[Create VortexPriceData<br/>Object]
    
    J --> K[Emit 'quote' Event]
    
    K --> L[Hook Updates<br/>priceData Map]
    
    L --> M[React Re-renders<br/>Component]
    
    M --> N[UI Shows<br/>New Price]
    
    N --> O{More<br/>Updates?}
    O -->|Yes| A
    O -->|No| P[Wait for Next Update]
    
    style A fill:#fff3cd
    style N fill:#d1ecf1
    style E fill:#f8d7da
```

---

## 🔄 Reconnection Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                  Connection Lost                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Stop Heartbeat Timer  │
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │  Check Reconnect Count │
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────────┐
              │  Count < Max (5)?          │
              └──┬──────────────────────┬──┘
                 │                      │
                Yes                    No
                 │                      │
                 ▼                      ▼
    ┌────────────────────────┐  ┌──────────────┐
    │  Calculate Delay:      │  │  Give Up     │
    │  5000ms * attempts     │  │  Show Error  │
    └────────────┬───────────┘  └──────────────┘
                 │
                 ▼
    ┌────────────────────────┐
    │  Wait (Delay)          │
    │  Attempt 1: 5s         │
    │  Attempt 2: 10s        │
    │  Attempt 3: 15s        │
    │  Attempt 4: 20s        │
    │  Attempt 5: 25s        │
    └────────────┬───────────┘
                 │
                 ▼
    ┌────────────────────────┐
    │  Attempt Reconnect     │
    └────────────┬───────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │  Success?                  │
    └──┬──────────────────────┬──┘
       │                      │
      Yes                    No
       │                      │
       ▼                      │
┌──────────────┐              │
│  Connected!  │              │
│  Resubscribe │              │
└──────────────┘              │
                              │
                              └──► Increment Count, Try Again
```

---

## 🎯 Error Handling Strategy

```mermaid
graph TD
    Start[Operation Starts] --> Try[Try Block]
    
    Try --> Success{Success?}
    Success -->|Yes| Log1[Log Success]
    Success -->|No| Catch[Catch Block]
    
    Catch --> LogError[Log Error to Console]
    LogError --> CheckType{Error Type?}
    
    CheckType -->|Network Error| ShowNetwork[Show Network Error UI]
    CheckType -->|Auth Error| ShowAuth[Show Auth Error UI<br/>Redirect to Login]
    CheckType -->|Rate Limit| ShowRate[Show Rate Limit Warning<br/>Auto Retry Later]
    CheckType -->|Unknown| ShowGeneric[Show Generic Error<br/>with Retry Button]
    
    ShowNetwork --> NotifyUser[Notify User via Toast/Banner]
    ShowAuth --> NotifyUser
    ShowRate --> NotifyUser
    ShowGeneric --> NotifyUser
    
    NotifyUser --> RetryOption{Retry<br/>Available?}
    RetryOption -->|Yes| RetryButton[Show Retry Button]
    RetryOption -->|No| End[End]
    
    RetryButton --> UserRetry{User<br/>Retries?}
    UserRetry -->|Yes| Start
    UserRetry -->|No| End
    
    Log1 --> End
    
    style Success fill:#d4edda
    style Catch fill:#f8d7da
    style LogError fill:#fff3cd
    style NotifyUser fill:#d1ecf1
```

---

## 📊 State Management Flow

```
User Action / Event
        │
        ▼
┌──────────────────┐
│  Event Handler   │
│  (callback)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  setState()      │
│  or Hook Update  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  State Updated   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  React Detects   │
│  State Change    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Component       │
│  Re-renders      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Virtual DOM     │
│  Diff            │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Real DOM        │
│  Updated         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  User Sees       │
│  Updated UI      │
└──────────────────┘
```

---

## 🔍 Key States Tracked

### WebSocket Connection States
- `isConnected: boolean` - Is WebSocket currently connected
- `isConnecting: boolean` - Is connection in progress
- `error: string | null` - Current error message
- `connectionCount: number` - Number of successful connections

### Subscription States
- `subscriptions: VortexSubscription[]` - Active subscriptions
- `priceData: Map<string, VortexPriceData>` - Current price data
- `lastPriceUpdate: VortexPriceData | null` - Last received update

### UI States
- `showDetails: boolean` - Show/hide detailed price info
- `lastUpdateTime: Date | null` - Timestamp of last update

---

## 🚀 Performance Optimizations

1. **Debounced Updates**: Price updates are throttled to prevent excessive re-renders
2. **Memoization**: `useMemo` used for expensive calculations
3. **Callback Memoization**: `useCallback` prevents unnecessary function recreations
4. **Map Data Structure**: Fast O(1) price lookups by exchange:token key
5. **Dynamic Import**: LiveMarketQuotes loaded only when needed
6. **SSR Disabled**: WebSocket component client-side only

---

## 📝 Logging Strategy

All operations are logged with emoji prefixes for easy scanning:

- `🎬` Component lifecycle
- `📊` State updates
- `🔔` Subscriptions
- `💹` Price updates
- `🔄` Reconnections
- `❌` Errors
- `✅` Successes
- `⏱️` Performance metrics
- `🔍` Debugging info

---

## 🎨 UI State Indicators

| State | Badge | Icon | Color |
|-------|-------|------|-------|
| Connecting | "Connecting..." | Spinner | Yellow |
| Connected | "Connected" | Wifi | Green |
| Disconnected | "Disconnected" | WifiOff | Red |
| Error | Error message | AlertCircle | Red |
| Data Loading | Spinner | Loader2 | Gray |
| Data Available | Price info | CheckCircle | Green |

---

## 📌 Important Notes

1. **WebSocket URL**: `wss://wire.rupeezy.in/ws?auth_token={ACCESS_TOKEN}`
2. **Heartbeat Interval**: 30 seconds
3. **Reconnect Strategy**: Exponential backoff (5s, 10s, 15s, 20s, 25s)
4. **Max Reconnect Attempts**: 5
5. **Binary Data Format**: Custom binary protocol from Vortex
6. **Subscription Modes**: `ltp`, `ohlcv`, `full`

---

*Last Updated: 2025-10-07*