# Enhanced Market Data System

## Overview

The Enhanced Market Data System provides near real-time price updates with smooth transitions, jittering effects, and configurable deviation. This system makes 5-second price updates feel like continuous, live market data.

## Features

### 🎯 Jitter System
- **Purpose**: Adds realistic micro-movements to simulate live trading activity
- **Frequency**: Every 200-300ms (configurable)
- **Intensity**: ±0.1-0.2 or percentage-based (configurable)
- **Convergence**: Gradually moves toward actual price (configurable rate)
- **Effect**: Creates natural price movement between major updates

### 📈 Smooth Transitions (Linear Interpolation)
- **Purpose**: Eliminates jarring price jumps between updates
- **Method**: Linear interpolation between current and target prices
- **Duration**: 4.5 seconds (configurable)
- **Steps**: 50 interpolation steps (configurable)
- **Effect**: Smooth, continuous price movement

### 🎛️ Deviation Control
- **Purpose**: Offset prices from actual LTP while maintaining trends
- **Types**: 
  - Percentage deviation (0-100%)
  - Absolute deviation (fixed amount)
- **Trend Preservation**: If actual price goes up, deviated price also goes up
- **Use Cases**: Testing, slight price variations, market simulation

## Configuration

### Default Settings
```typescript
const DEFAULT_CONFIG = {
  jitter: {
    enabled: true,
    interval: 250,        // 250ms between jitter updates
    intensity: 0.15,      // ±0.15 or ±0.15% of price
    convergence: 0.1      // 10% convergence per update
  },
  deviation: {
    enabled: false,
    percentage: 0,        // 0% deviation
    absolute: 0           // No fixed deviation
  },
  interpolation: {
    enabled: true,
    steps: 50,            // 50 interpolation steps
    duration: 4500        // 4.5 seconds duration
  }
}
```

### Quick Presets
- **Subtle**: Light jitter, smooth transitions
- **Active**: More pronounced jitter, faster transitions
- **Smooth Only**: No jitter, only smooth transitions
- **Disable All**: Raw price updates only

## Technical Implementation

### Core Components

1. **MarketDataProvider**: Enhanced context provider with configuration management
2. **MarketDataConfig**: Configuration component with real-time controls
3. **MarketDataDemo**: Demo component showcasing all features

### Key Algorithms

#### Jitter Calculation
```typescript
const calculateJitter = (basePrice, intensity, convergence, currentJitter) => {
  const maxJitter = basePrice * (intensity / 100) || intensity;
  const randomJitter = (Math.random() - 0.5) * 2 * maxJitter;
  return currentJitter * (1 - convergence) + randomJitter * convergence;
};
```

#### Linear Interpolation
```typescript
const linearInterpolate = (start, end, progress) => {
  return start + (end - start) * progress;
};
```

#### Display Price Calculation
```typescript
displayPrice = actualPrice + deviationOffset + jitterOffset
```

### Performance Optimizations

- **RequestAnimationFrame**: Smooth 60fps interpolation
- **Efficient State Management**: Minimal re-renders
- **Proper Cleanup**: All intervals and animation frames cleaned up
- **Memory Management**: Efficient price history tracking

## Usage

### Basic Implementation
```tsx
import { MarketDataProvider } from "@/lib/hooks/MarketDataProvider"

function App() {
  return (
    <MarketDataProvider userId="user-123">
      <YourTradingComponents />
    </MarketDataProvider>
  )
}
```

### With Custom Configuration
```tsx
const customConfig = {
  jitter: {
    enabled: true,
    interval: 200,
    intensity: 0.2,
    convergence: 0.15
  },
  deviation: {
    enabled: true,
    percentage: 0.5,
    absolute: 0
  }
}

<MarketDataProvider userId="user-123" config={customConfig}>
  <YourComponents />
</MarketDataProvider>
```

### Accessing Market Data
```tsx
import { useMarketData } from "@/lib/hooks/MarketDataProvider"

function PriceDisplay() {
  const { quotes, config, updateConfig } = useMarketData()
  
  return (
    <div>
      {Object.entries(quotes).map(([instrumentId, quote]) => (
        <div key={instrumentId}>
          <span>Display: ₹{quote.display_price.toFixed(2)}</span>
          <span>Actual: ₹{quote.actual_price.toFixed(2)}</span>
          <span>Trend: {quote.trend}</span>
        </div>
      ))}
    </div>
  )
}
```

## API Reference

### EnhancedQuote Interface
```typescript
interface EnhancedQuote {
  last_trade_price: number;    // Original LTP
  display_price: number;       // Price shown to user
  actual_price: number;        // Real LTP
  trend: 'up' | 'down' | 'neutral';
  jitter_offset: number;       // Current jitter amount
  deviation_offset: number;    // Current deviation amount
  timestamp: number;           // Last update timestamp
}
```

### MarketDataConfig Interface
```typescript
interface MarketDataConfig {
  jitter: {
    enabled: boolean;
    interval: number;          // ms between jitter updates
    intensity: number;         // ±amount or percentage
    convergence: number;       // 0-1, how fast jitter converges
  };
  deviation: {
    enabled: boolean;
    percentage: number;        // 0-100% deviation
    absolute: number;          // Fixed deviation amount
  };
  interpolation: {
    enabled: boolean;
    steps: number;             // Number of interpolation steps
    duration: number;          // Duration in ms
  };
}
```

## Demo Page

Visit `/market-demo` to see the enhanced market data system in action with:
- Real-time configuration controls
- Live price display with jitter and deviation
- Visual trend indicators
- Performance metrics
- Feature explanations

## Benefits

1. **Enhanced User Experience**: Prices feel live and responsive
2. **Realistic Trading Feel**: Micro-movements simulate real market behavior
3. **Configurable**: Adjust intensity and behavior to match requirements
4. **Performance Optimized**: Efficient rendering and memory usage
5. **Trend Preservation**: Deviation maintains market direction
6. **Smooth Transitions**: No jarring price jumps

## Future Enhancements

- **Advanced Interpolation**: Easing functions (ease-in, ease-out)
- **Volume-Based Jitter**: Jitter intensity based on trading volume
- **Market Hours Awareness**: Different behavior during market hours
- **Historical Data Integration**: Use historical patterns for jitter
- **Machine Learning**: Adaptive jitter based on price volatility

## Troubleshooting

### Common Issues

1. **Prices not updating**: Check if market is open and API is responding
2. **Jitter too intense**: Reduce intensity value in configuration
3. **Smooth transitions not working**: Ensure interpolation is enabled
4. **Performance issues**: Reduce jitter frequency or interpolation steps

### Debug Mode
Enable console logging to see:
- Price update timestamps
- Jitter calculations
- Interpolation progress
- Configuration changes

## Contributing

When modifying the market data system:
1. Maintain backward compatibility
2. Add proper TypeScript types
3. Include performance optimizations
4. Update configuration documentation
5. Test with various market conditions
