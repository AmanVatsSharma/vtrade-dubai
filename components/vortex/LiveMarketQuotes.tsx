// components/vortex/LiveMarketQuotes.tsx
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useVortexWebSocket } from '@/hooks/use-vortex-websocket';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { VortexPriceData } from '@/lib/vortex/vortex-websocket';

/**
 * Interface for market instrument configuration
 */
interface MarketInstrument {
  name: string;
  displayName: string;
  exchange: 'NSE_EQ' | 'NSE_FO' | 'NSE_CUR' | 'MCX_FO';
  token: number;
  description: string;
}

/**
 * Interface for price display data
 */
interface PriceDisplayData {
  instrument: MarketInstrument;
  priceData: VortexPriceData | null;
  change: number;
  changePercent: number;
  isPositive: boolean;
}

/**
 * Market instruments to track
 * These are popular Indian market indices and stocks
 */
const MARKET_INSTRUMENTS: MarketInstrument[] = [
  {
    name: 'NIFTY_50',
    displayName: 'NIFTY 50',
    exchange: 'NSE_EQ',
    token: 26000, // NIFTY 50 Index
    description: 'Nifty 50 Index'
  },
  {
    name: 'BANK_NIFTY',
    displayName: 'BANK NIFTY',
    exchange: 'NSE_EQ',
    token: 26009, // Bank Nifty Index
    description: 'Bank Nifty Index'
  },
  {
    name: 'RELIANCE',
    displayName: 'RELIANCE',
    exchange: 'NSE_EQ',
    token: 2885, // Reliance Industries
    description: 'Reliance Industries Ltd'
  },
  {
    name: 'TCS',
    displayName: 'TCS',
    exchange: 'NSE_EQ',
    token: 11536, // TCS
    description: 'Tata Consultancy Services'
  }
];

/**
 * LiveMarketQuotes Component
 * 
 * Displays real-time market quotes using WebSocket connection to Vortex API.
 * Features:
 * - Auto-connect on mount
 * - Real-time price updates
 * - Connection status indicator
 * - Manual refresh and reconnect
 * - Comprehensive error handling
 * - Detailed logging for debugging
 */
export const LiveMarketQuotes: React.FC = () => {
  console.log('🎬 [LiveMarketQuotes] Component rendering');

  // State for UI controls
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);

  // Initialize WebSocket hook with auto-connect
  const {
    isConnected,
    isConnecting,
    error: wsError,
    subscriptions,
    lastPriceUpdate,
    priceData,
    connectionCount,
    connect,
    disconnect,
    subscribeToFull,
    getPrice,
    isWebSocketConnected
  } = useVortexWebSocket({
    autoConnect: true, // Automatically connect on mount
    maxReconnectAttempts: 5,
    reconnectInterval: 5000,
    heartbeatInterval: 30000
  });

  console.log('📊 [LiveMarketQuotes] WebSocket State:', {
    isConnected,
    isConnecting,
    hasError: !!wsError,
    errorMessage: wsError,
    subscriptionCount: subscriptions.length,
    priceDataCount: priceData.size,
    connectionCount,
    isWebSocketConnected: isWebSocketConnected()
  });

  /**
   * Subscribe to all market instruments when connected
   * Using 'full' mode to get comprehensive market data including OHLC, volume, etc.
   */
  useEffect(() => {
    if (isConnected && subscriptions.length === 0) {
      console.log('🔔 [LiveMarketQuotes] Subscribing to market instruments');
      
      // Subscribe to each instrument with a small delay to avoid rate limiting
      MARKET_INSTRUMENTS.forEach((instrument, index) => {
        setTimeout(() => {
          console.log(`📝 [LiveMarketQuotes] Subscribing to ${instrument.displayName} (${instrument.exchange}:${instrument.token})`);
          subscribeToFull(instrument.exchange, instrument.token);
        }, index * 500); // 500ms delay between subscriptions
      });
    }
  }, [isConnected, subscriptions.length, subscribeToFull]);

  /**
   * Update last update time when price data changes
   */
  useEffect(() => {
    if (lastPriceUpdate) {
      setLastUpdateTime(new Date());
      console.log('💹 [LiveMarketQuotes] Price update received:', {
        exchange: lastPriceUpdate.exchange,
        token: lastPriceUpdate.token,
        lastTradePrice: lastPriceUpdate.lastTradePrice,
        timestamp: new Date().toISOString()
      });
    }
  }, [lastPriceUpdate]);

  /**
   * Handle manual reconnection
   */
  const handleReconnect = useCallback(async () => {
    console.log('🔄 [LiveMarketQuotes] Manual reconnect triggered');
    try {
      await disconnect();
      setTimeout(async () => {
        await connect();
      }, 1000);
    } catch (error) {
      console.error('❌ [LiveMarketQuotes] Reconnect failed:', error);
    }
  }, [connect, disconnect]);

  /**
   * Handle connection toggle
   */
  const handleToggleConnection = useCallback(async () => {
    console.log('🔘 [LiveMarketQuotes] Connection toggle triggered');
    try {
      if (isConnected) {
        console.log('🔌 [LiveMarketQuotes] Disconnecting...');
        await disconnect();
      } else {
        console.log('🔌 [LiveMarketQuotes] Connecting...');
        await connect();
      }
    } catch (error) {
      console.error('❌ [LiveMarketQuotes] Connection toggle failed:', error);
    }
  }, [isConnected, connect, disconnect]);

  /**
   * Prepare price display data for all instruments
   */
  const priceDisplayData: PriceDisplayData[] = useMemo(() => {
    console.log('🧮 [LiveMarketQuotes] Computing price display data');
    
    return MARKET_INSTRUMENTS.map(instrument => {
      const price = getPrice(instrument.exchange, instrument.token);
      
      // Calculate change and change percent
      let change = 0;
      let changePercent = 0;
      
      if (price?.lastTradePrice && price?.closePrice) {
        change = price.lastTradePrice - price.closePrice;
        changePercent = (change / price.closePrice) * 100;
      }

      const displayData = {
        instrument,
        priceData: price,
        change,
        changePercent,
        isPositive: change >= 0
      };

      if (price) {
        console.log(`📈 [LiveMarketQuotes] ${instrument.displayName}:`, {
          ltp: price.lastTradePrice,
          close: price.closePrice,
          change: change.toFixed(2),
          changePercent: changePercent.toFixed(2) + '%'
        });
      }

      return displayData;
    });
  }, [priceData, getPrice]);

  /**
   * Render connection status badge
   */
  const renderConnectionStatus = () => {
    if (isConnecting) {
      return (
        <Badge variant="outline" className="flex items-center gap-2 bg-yellow-50 text-yellow-700 border-yellow-300">
          <Loader2 className="h-3 w-3 animate-spin" />
          Connecting...
        </Badge>
      );
    }

    if (isConnected) {
      return (
        <Badge variant="outline" className="flex items-center gap-2 bg-green-50 text-green-700 border-green-300">
          <Wifi className="h-3 w-3" />
          Connected
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="flex items-center gap-2 bg-red-50 text-red-700 border-red-300">
        <WifiOff className="h-3 w-3" />
        Disconnected
      </Badge>
    );
  };

  /**
   * Render individual price card
   */
  const renderPriceCard = (data: PriceDisplayData) => {
    const { instrument, priceData, change, changePercent, isPositive } = data;

    return (
      <Card key={instrument.name} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          {/* Instrument Name */}
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-gray-700">
              {instrument.displayName}
            </h3>
            {priceData ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
          </div>

          {/* Price Display */}
          {priceData && priceData.lastTradePrice ? (
            <div className="space-y-2">
              {/* Last Trade Price */}
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  ₹{priceData.lastTradePrice.toFixed(2)}
                </span>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>

              {/* Change */}
              <div className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
              </div>

              {/* Details (if enabled) */}
              {showDetails && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-1 text-xs text-gray-600">
                  {priceData.openPrice && (
                    <div className="flex justify-between">
                      <span>Open:</span>
                      <span className="font-medium">₹{priceData.openPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {priceData.highPrice && (
                    <div className="flex justify-between">
                      <span>High:</span>
                      <span className="font-medium text-green-600">₹{priceData.highPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {priceData.lowPrice && (
                    <div className="flex justify-between">
                      <span>Low:</span>
                      <span className="font-medium text-red-600">₹{priceData.lowPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {priceData.volume && (
                    <div className="flex justify-between">
                      <span>Volume:</span>
                      <span className="font-medium">{priceData.volume.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {/* Exchange & Token Info */}
          <div className="mt-2 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              {instrument.exchange} • Token: {instrument.token}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Live Market Quotes
              </CardTitle>
              <CardDescription className="mt-1">
                Real-time market data via WebSocket
              </CardDescription>
            </div>
            {renderConnectionStatus()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Status</p>
              <p className="font-semibold text-gray-900">
                {isConnected ? 'Online' : isConnecting ? 'Connecting' : 'Offline'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Subscriptions</p>
              <p className="font-semibold text-gray-900">{subscriptions.length}</p>
            </div>
            <div>
              <p className="text-gray-500">Updates</p>
              <p className="font-semibold text-gray-900">{priceData.size}</p>
            </div>
            <div>
              <p className="text-gray-500">Last Update</p>
              <p className="font-semibold text-gray-900">
                {lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : 'N/A'}
              </p>
            </div>
          </div>

          {/* Error Display */}
          {wsError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Connection Error</p>
                <p className="text-sm text-red-700 mt-1">{wsError}</p>
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleToggleConnection}
              variant={isConnected ? "destructive" : "default"}
              size="sm"
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : isConnected ? (
                <>
                  <WifiOff className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4 mr-2" />
                  Connect
                </>
              )}
            </Button>

            <Button
              onClick={handleReconnect}
              variant="outline"
              size="sm"
              disabled={isConnecting}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reconnect
            </Button>

            <Button
              onClick={() => setShowDetails(!showDetails)}
              variant="outline"
              size="sm"
            >
              {showDetails ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Details
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Show Details
                </>
              )}
            </Button>
          </div>

          {/* Debug Info (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="text-xs">
              <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                Debug Information
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                {JSON.stringify({
                  isConnected,
                  isConnecting,
                  error: wsError,
                  subscriptionCount: subscriptions.length,
                  priceDataSize: priceData.size,
                  connectionCount,
                  isWebSocketConnected: isWebSocketConnected(),
                  subscriptions: subscriptions.map(s => `${s.exchange}:${s.token}:${s.mode}`)
                }, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Price Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {priceDisplayData.map(data => renderPriceCard(data))}
      </div>

      {/* Connection Count Info */}
      {connectionCount > 1 && (
        <div className="text-center text-sm text-gray-500">
          Reconnected {connectionCount - 1} time{connectionCount > 2 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default LiveMarketQuotes;