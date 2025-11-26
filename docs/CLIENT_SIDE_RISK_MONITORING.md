# Client-Side Risk Monitoring

## Overview

Client-side risk monitoring that calculates P&L in real-time and alerts users when their losses approach or exceed risk thresholds. Includes automatic position closure when enabled.

## Features

✅ **Real-time P&L Calculation** - Calculates unrealized P&L using live market data  
✅ **Risk Thresholds** - Configurable warning (80%) and auto-close (90%) thresholds  
✅ **Visual Alerts** - Color-coded warnings and critical alerts (only shown when at risk)  
✅ **Auto-Close Positions** - **Always enabled** - Automatically closes positions when 90% threshold breached  
✅ **Position Risk List** - Shows positions at risk with quick close buttons  
✅ **Hidden When Safe** - Component only appears when there's a warning or critical risk  
✅ **Settings** - Customizable thresholds via UI  

## Components

### 1. `useRiskMonitoring` Hook

**Location**: `lib/hooks/use-risk-monitoring.ts`

**Usage**:
```typescript
import { useRiskMonitoring } from '@/lib/hooks/use-risk-monitoring'

const {
  riskStatus,
  lastChecked,
  autoCloseEnabled,
  setAutoCloseEnabled,
  closePosition,
  isLoading,
  thresholds,
} = useRiskMonitoring(userId, {
  warningThreshold: 0.80,
  autoCloseThreshold: 0.90
})
```

**Returns**:
- `riskStatus`: Current risk status with metrics (null when safe)
- `lastChecked`: Timestamp of last check
- `closePosition`: Manual position close function
- `isLoading`: Loading state
- `thresholds`: Current thresholds

### 2. `RiskMonitor` Component

**Location**: `components/risk/RiskMonitor.tsx`

**Usage**:
```tsx
import { RiskMonitor } from '@/components/risk/RiskMonitor'

<RiskMonitor 
  thresholds={{ warningThreshold: 0.80, autoCloseThreshold: 0.90 }}
  showSettings={true}
  compact={false}
/>
```

**Props**:
- `thresholds?`: Custom thresholds (optional)
- `showSettings?`: Show settings button (default: true)
- `compact?`: Compact display mode (default: false)

## Integration

### In TradingDashboard

Already integrated in:
- **Home Tab**: Full risk monitor display
- **Positions Tab**: Full risk monitor display

### Standalone Usage

```tsx
import { RiskMonitor } from '@/components/risk/RiskMonitor'

function MyComponent() {
  return (
    <div>
      <RiskMonitor />
    </div>
  )
}
```

## How It Works

1. **Monitors Positions**: Uses `useRealtimePositions` hook
2. **Calculates P&L**: Gets live prices from `useMarketData` quotes
3. **Checks Thresholds**: 
   - **80%**: Shows warning alert
   - **90%**: Shows critical alert, can auto-close if enabled
4. **Updates in Real-Time**: Recalculates when positions or quotes change

## Risk Status

### Status Levels

- **SAFE** (Green): Utilization < 80%
- **WARNING** (Yellow): Utilization ≥ 80% and < 90%
- **CRITICAL** (Red): Utilization ≥ 90%

### Metrics Displayed

- **Unrealized P&L**: Total profit/loss from open positions
- **Available Funds**: Available margin + balance
- **Margin Utilization**: Loss as % of available funds
- **Positions at Risk**: List of losing positions

## Auto-Close Feature

**Always Enabled** - Automatically closes positions when 90% threshold is breached:

1. Sorts positions by loss (worst first)
2. Closes worst position automatically
3. Shows toast notification
4. Refreshes data after 2 seconds
5. Prevents multiple closures with debounce logic

**No Toggle Required** - Auto-close is always active when threshold is breached

## Configuration

### Default Thresholds

```typescript
{
  warningThreshold: 0.80,  // 80%
  autoCloseThreshold: 0.90 // 90%
}
```

### Custom Thresholds

```tsx
<RiskMonitor 
  thresholds={{
    warningThreshold: 0.75,  // 75%
    autoCloseThreshold: 0.85  // 85%
  }}
/>
```

### Settings Dialog

Users can adjust thresholds via the settings button (gear icon) in the RiskMonitor component. Settings are stored locally in browser.

## API Integration

Uses existing position close API:

```typescript
POST /api/trading/positions
Body: { positionId: string }
```

## Limitations

⚠️ **Client-Side Only**: Only works when app is open  
⚠️ **Browser Dependent**: Requires JavaScript enabled  
⚠️ **No Background Monitoring**: Stops when tab is closed  

For 24/7 monitoring, see server-side implementation in `docs/RISK_MANAGEMENT_SYSTEM.md`

## Future Enhancements

- [ ] Persist thresholds to user preferences
- [ ] Add sound alerts for critical risk
- [ ] Show risk trend chart
- [ ] Add risk score calculation
- [ ] Integrate with stop-loss orders

## Troubleshooting

**Risk monitor not showing?**
- Check if user is logged in
- Verify positions exist
- Check browser console for errors

**Auto-close not working?**
- Ensure auto-close toggle is enabled
- Check if threshold is breached
- Verify API endpoint is accessible
- Check browser console for errors

**P&L not updating?**
- Verify WebSocket connection is active
- Check if quotes are being received
- Verify positions have valid `instrumentId`
