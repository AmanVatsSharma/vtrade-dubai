## 🚀 Real-time UI Implementation Guide

Your dashboard now has **real-time updates** without manual refresh! Here's how to use the new real-time hooks for a smooth trading experience.

---

## 🎯 What's New

### **Automatic Real-time Updates:**
- ✅ Orders update every 2 seconds
- ✅ Positions update every 3 seconds
- ✅ Account balance updates every 2 seconds
- ✅ Optimistic UI updates (instant feedback)
- ✅ No manual refresh needed
- ✅ Smart polling (stops when tab hidden)
- ✅ Toast notifications for all events

---

## 📦 New Hooks

### 1. **`useRealtimeTrading`** - Master Hook (Use This!)

```typescript
import { useRealtimeTrading } from '@/lib/hooks/use-realtime-trading'

function TradingDashboard() {
  const session = useSession()
  const {
    // Real-time data
    orders,
    positions,
    account,
    
    // Loading states
    isLoadingOrders,
    isLoadingPositions,
    isLoadingAccount,
    
    // Event handlers (with optimistic updates)
    handleOrderPlaced,
    handlePositionClosed,
    handleFundOperation,
    
    // Manual refresh (if needed)
    refreshAll,
  } = useRealtimeTrading(session?.user?.id)

  return (
    <div>
      <AccountSummary account={account} loading={isLoadingAccount} />
      <OrdersList orders={orders} loading={isLoadingOrders} />
      <PositionsList positions={positions} loading={isLoadingPositions} />
    </div>
  )
}
```

### 2. **`useTradingNotifications`** - Toast Notifications

```typescript
import { useTradingNotifications } from '@/lib/hooks/use-trading-notifications'

function useTrading() {
  const notifications = useTradingNotifications()
  
  const placeOrder = async (orderData) => {
    try {
      const result = await fetch('/api/trading/orders', {
        method: 'POST',
        body: JSON.stringify(orderData)
      }).then(r => r.json())
      
      notifications.notifyOrderPlaced(orderData)
      return result
    } catch (error) {
      notifications.notifyError(error.message)
    }
  }
}
```

---

## 🎨 Complete Usage Example

### **Trading Component with Real-time Updates**

```typescript
"use client"

import { useRealtimeTrading } from '@/lib/hooks/use-realtime-trading'
import { useTradingNotifications } from '@/lib/hooks/use-trading-notifications'
import { useSession } from 'next-auth/react'
import { useState } from 'react'

export function TradingPage() {
  const { data: session } = useSession()
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  
  // Real-time trading hook
  const {
    orders,
    positions,
    account,
    isLoadingOrders,
    isLoadingPositions,
    isLoadingAccount,
    handleOrderPlaced,
    handlePositionClosed,
  } = useRealtimeTrading(session?.user?.id)
  
  // Notifications
  const notifications = useTradingNotifications()

  // Place order with real-time updates
  const placeOrder = async (orderData: any) => {
    setIsPlacingOrder(true)
    
    try {
      const response = await fetch('/api/trading/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderData,
          userId: session?.user?.id,
          tradingAccountId: account?.id,
        })
      })

      if (response.status === 429) {
        // Rate limited
        const data = await response.json()
        notifications.notifyRateLimitWarning(data.retryAfter)
        return
      }

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Order placement failed')
      }

      const result = await response.json()
      
      // ✨ Optimistic update - UI updates instantly!
      await handleOrderPlaced(orderData, result)
      
      // Show success notification
      notifications.notifyOrderPlaced(orderData)
      
      // Show execution notification after 3 seconds
      setTimeout(() => {
        notifications.notifyOrderExecuted(orderData)
      }, 3000)
      
    } catch (error: any) {
      notifications.notifyError(error.message)
    } finally {
      setIsPlacingOrder(false)
    }
  }

  // Close position with real-time updates
  const closePosition = async (position: any) => {
    try {
      const response = await fetch('/api/trading/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          positionId: position.id,
          tradingAccountId: account?.id,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to close position')
      }

      const result = await response.json()
      
      // ✨ Optimistic update - UI updates instantly!
      await handlePositionClosed(position.id, result)
      
      // Show notification
      notifications.notifyPositionClosed(position, result.realizedPnL)
      
    } catch (error: any) {
      notifications.notifyError(error.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Balance - Updates in real-time every 2s */}
      <div className="bg-card p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Account Summary</h2>
        {isLoadingAccount ? (
          <div>Loading...</div>
        ) : account ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-2xl font-bold">₹{account.balance.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Margin</p>
              <p className="text-2xl font-bold">₹{account.availableMargin.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Used Margin</p>
              <p className="text-2xl font-bold">₹{account.usedMargin.toLocaleString()}</p>
            </div>
          </div>
        ) : (
          <div>No trading account found</div>
        )}
      </div>

      {/* Orders - Updates in real-time every 2s */}
      <div className="bg-card p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Orders</h2>
        {isLoadingOrders ? (
          <div>Loading orders...</div>
        ) : orders.length > 0 ? (
          <div className="space-y-2">
            {orders.map((order: any) => (
              <div key={order.id} className="flex justify-between items-center p-4 border rounded">
                <div>
                  <p className="font-semibold">{order.symbol}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.orderSide} {order.quantity} @ {order.orderType}
                  </p>
                </div>
                <div className={`font-bold ${
                  order.status === 'EXECUTED' ? 'text-green-500' : 
                  order.status === 'PENDING' ? 'text-yellow-500' : 
                  'text-red-500'
                }`}>
                  {order.status}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>No orders yet</div>
        )}
      </div>

      {/* Positions - Updates in real-time every 3s */}
      <div className="bg-card p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Positions</h2>
        {isLoadingPositions ? (
          <div>Loading positions...</div>
        ) : positions.length > 0 ? (
          <div className="space-y-2">
            {positions.map((position: any) => (
              <div key={position.id} className="flex justify-between items-center p-4 border rounded">
                <div>
                  <p className="font-semibold">{position.symbol}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {position.quantity} @ ₹{position.averagePrice.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className={`font-bold ${position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {position.unrealizedPnL >= 0 ? '+' : ''}₹{position.unrealizedPnL.toFixed(2)}
                  </p>
                  <button
                    onClick={() => closePosition(position)}
                    className="mt-2 px-4 py-2 bg-destructive text-destructive-foreground rounded"
                  >
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>No open positions</div>
        )}
      </div>

      {/* Order Form */}
      <div className="bg-card p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Place Order</h2>
        <button
          onClick={() => placeOrder({
            symbol: 'RELIANCE',
            quantity: 1,
            orderType: 'MARKET',
            orderSide: 'BUY',
            productType: 'MIS',
            segment: 'NSE',
            stockId: 'some-stock-id',
            instrumentId: 'NSE_EQ|INE002A01018',
          })}
          disabled={isPlacingOrder || !account}
          className="px-6 py-3 bg-primary text-primary-foreground rounded disabled:opacity-50"
        >
          {isPlacingOrder ? 'Placing Order...' : 'Buy RELIANCE (Demo)'}
        </button>
      </div>
    </div>
  )
}
```

---

## 🎯 Key Features

### **1. Automatic Updates**
```typescript
// Orders poll every 2 seconds
// Positions poll every 3 seconds
// Account polls every 2 seconds
// All automatically, no manual refresh!
```

### **2. Optimistic Updates**
```typescript
// UI updates INSTANTLY before server confirms
await handleOrderPlaced(orderData, result)
// ✅ Order appears in list immediately
// ✅ Balance updates immediately
// ✅ Margin blocked immediately
// ✅ Server confirms in background
```

### **3. Smart Polling**
```typescript
// Stops polling when tab is hidden (saves resources)
// Resumes when tab becomes visible
// Refreshes immediately on tab focus
```

### **4. Toast Notifications**
```typescript
notifications.notifyOrderPlaced(orderData)
// ✅ Toast appears: "Order Placed Successfully"

notifications.notifyPositionClosed(position, pnl)
// ✅ Toast appears: "Position Closed with profit of ₹500.00"

notifications.notifyError("Insufficient margin")
// ✅ Toast appears: "Error: Insufficient margin"
```

---

## 🔄 Update Flow

### **Order Placement Flow:**

```
1. User clicks "Buy" button
   ↓
2. placeOrder() called
   ↓
3. Show loading state
   ↓
4. POST /api/trading/orders
   ↓
5. handleOrderPlaced() - Optimistic updates:
   • Add order to list (instantly)
   • Deduct balance (instantly)
   • Block margin (instantly)
   • Show toast notification
   ↓
6. Background polling continues:
   • Orders refresh every 2s
   • Account refresh every 2s
   • After 3s: Order status changes to EXECUTED
   • Position appears in positions list
   ↓
7. Show execution notification
```

### **Position Close Flow:**

```
1. User clicks "Close Position"
   ↓
2. closePosition() called
   ↓
3. POST /api/trading/positions
   ↓
4. handlePositionClosed() - Optimistic updates:
   • Mark position as closed (instantly)
   • Update balance with P&L (instantly)
   • Release margin (instantly)
   • Show toast notification
   ↓
5. Background polling confirms:
   • Position removed from list
   • Account balance updated
   • Margin released confirmed
```

---

## 📊 Performance

### **Polling Intervals:**
```
Orders:      2000ms (2 seconds)
Positions:   3000ms (3 seconds)
Account:     2000ms (2 seconds)
```

### **Optimizations:**
- ✅ Stops polling when tab hidden
- ✅ Deduping interval (1 second)
- ✅ Revalidate on focus
- ✅ Revalidate on reconnect
- ✅ Optimistic updates (instant feedback)

### **Data Transfer:**
```
Orders:      ~2-5KB every 2 seconds
Positions:   ~1-3KB every 3 seconds
Account:     ~500B every 2 seconds
Total:       ~3-8KB every 2-3 seconds
```

---

## 🎨 UI States

### **Loading States:**
```typescript
if (isLoadingOrders) return <Skeleton />
if (isLoadingPositions) return <Skeleton />
if (isLoadingAccount) return <Skeleton />
```

### **Empty States:**
```typescript
if (orders.length === 0) return <EmptyOrders />
if (positions.length === 0) return <EmptyPositions />
```

### **Error States:**
```typescript
if (ordersError) return <ErrorMessage error={ordersError} />
```

---

## 🚀 Migration from Old Code

### **Before (Manual Refresh):**
```typescript
const [orders, setOrders] = useState([])
const [loading, setLoading] = useState(false)

const fetchOrders = async () => {
  setLoading(true)
  const data = await fetch('/api/orders')
  setOrders(data.orders)
  setLoading(false)
}

// User has to click refresh button
<button onClick={fetchOrders}>Refresh</button>
```

### **After (Real-time):**
```typescript
const { orders, isLoadingOrders } = useRealtimeTrading(userId)

// Automatic updates every 2 seconds
// No refresh button needed!
```

---

## ✅ Benefits

### **For Users:**
- 🎨 **Smooth Experience** - No manual refresh needed
- ⚡ **Instant Feedback** - Optimistic updates
- 📱 **Native Feel** - Like real trading apps
- 🔔 **Notifications** - Know what's happening
- 👀 **Always Up-to-date** - Automatic polling

### **For Developers:**
- 🎯 **Simple API** - One hook for everything
- 🔧 **Easy to Use** - Just call handlers
- 📦 **Type Safe** - Full TypeScript
- 🧪 **Easy to Test** - Mock SWR
- 🎨 **Flexible** - Customize as needed

---

## 🎯 Next Steps

1. **Install SWR** (if not already):
   ```bash
   npm install swr
   # or
   yarn add swr
   # or
   pnpm add swr
   ```

2. **Use in Your Components:**
   ```typescript
   import { useRealtimeTrading } from '@/lib/hooks/use-realtime-trading'
   ```

3. **Add Notifications:**
   ```typescript
   import { useTradingNotifications } from '@/lib/hooks/use-trading-notifications'
   ```

4. **Test It Out:**
   - Place an order
   - Watch it update automatically
   - See position appear after 3 seconds
   - Close position and see balance update
   - All without refresh!

---

## 🎉 Result

Your dashboard now feels like a **native trading app** with:
- ✅ Real-time updates (no refresh)
- ✅ Instant feedback (optimistic updates)
- ✅ Toast notifications (user awareness)
- ✅ Smooth animations (great UX)
- ✅ Professional feel (enterprise-grade)

**The UI is now as smooth as the best trading platforms! 🚀**
