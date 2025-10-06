// components/live-trading.tsx
"use client";
import { useState, useEffect } from 'react';
import { useVortexWebSocket } from '@/hooks/use-vortex-websocket';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Square, 
  Wifi, 
  WifiOff, 
  TrendingUp, 
  Activity,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface LiveTradingProps {
  className?: string;
}

export default function LiveTrading({ className }: LiveTradingProps) {
  const [instrumentToken, setInstrumentToken] = useState('22'); // NIFTY token
  const [selectedExchange, setSelectedExchange] = useState<'NSE_EQ' | 'NSE_FO' | 'NSE_CUR' | 'MCX_FO'>('NSE_EQ');
  const [selectedMode, setSelectedMode] = useState<'ltp' | 'ohlcv' | 'full'>('ltp');

  const {
    isConnected,
    isConnecting,
    error,
    subscriptions,
    lastPriceUpdate,
    priceData,
    connect,
    disconnect,
    subscribeToLTP,
    subscribeToOHLCV,
    subscribeToFull,
    getPrice
  } = useVortexWebSocket({ autoConnect: false });

  const currentPrice = getPrice(selectedExchange, parseInt(instrumentToken));

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

  const handleSubscribe = () => {
    const token = parseInt(instrumentToken);
    if (isNaN(token)) return;

    switch (selectedMode) {
      case 'ltp':
        subscribeToLTP(selectedExchange, token);
        break;
      case 'ohlcv':
        subscribeToOHLCV(selectedExchange, token);
        break;
      case 'full':
        subscribeToFull(selectedExchange, token);
        break;
    }
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null) return 'N/A';
    return price.toFixed(2);
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleTimeString();
  };

  const getConnectionStatus = () => {
    if (isConnecting) return { icon: Loader2, text: 'Connecting...', color: 'text-yellow-500' };
    if (isConnected) return { icon: Wifi, text: 'Connected', color: 'text-green-500' };
    return { icon: WifiOff, text: 'Disconnected', color: 'text-red-500' };
  };

  const connectionStatus = getConnectionStatus();
  const StatusIcon = connectionStatus.icon;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <StatusIcon className={`h-5 w-5 ${connectionStatus.color} ${isConnecting ? 'animate-spin' : ''}`} />
            <span>Live Trading Connection</span>
          </CardTitle>
          <CardDescription>
            Real-time market data via WebSocket
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Badge variant={isConnected ? "default" : "secondary"}>
                {connectionStatus.text}
              </Badge>
              {subscriptions.length > 0 && (
                <Badge variant="outline">
                  {subscriptions.length} subscription{subscriptions.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <Button 
              onClick={handleConnect}
              disabled={isConnecting}
              variant={isConnected ? "destructive" : "default"}
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : isConnected ? (
                <Square className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isConnected ? 'Disconnect' : 'Connect'}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Subscription Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Subscribe to Instruments</CardTitle>
          <CardDescription>
            Subscribe to real-time price updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exchange">Exchange</Label>
              <select
                id="exchange"
                value={selectedExchange}
                onChange={(e) => setSelectedExchange(e.target.value as any)}
                className="w-full p-2 border rounded-md"
                disabled={!isConnected}
              >
                <option value="NSE_EQ">NSE Equity</option>
                <option value="NSE_FO">NSE F&O</option>
                <option value="NSE_CUR">NSE Currency</option>
                <option value="MCX_FO">MCX F&O</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Input
                id="token"
                value={instrumentToken}
                onChange={(e) => setInstrumentToken(e.target.value)}
                placeholder="e.g., 22 for NIFTY"
                disabled={!isConnected}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Mode</Label>
              <select
                id="mode"
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value as any)}
                className="w-full p-2 border rounded-md"
                disabled={!isConnected}
              >
                <option value="ltp">LTP Only</option>
                <option value="ohlcv">OHLCV</option>
                <option value="full">Full Data</option>
              </select>
            </div>
          </div>

          <Button 
            onClick={handleSubscribe}
            disabled={!isConnected || !instrumentToken}
            className="w-full"
          >
            <Activity className="h-4 w-4 mr-2" />
            Subscribe to {selectedExchange}:{instrumentToken}
          </Button>
        </CardContent>
      </Card>

      {/* Live Price Display */}
      {currentPrice && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span>Live Price: {selectedExchange}:{instrumentToken}</span>
            </CardTitle>
            <CardDescription>
              Real-time market data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Last Price</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{formatPrice(currentPrice.lastTradePrice)}
                </p>
              </div>

              {currentPrice.openPrice && (
                <div className="text-center">
                  <p className="text-sm text-gray-500">Open</p>
                  <p className="text-lg font-semibold">
                    ₹{formatPrice(currentPrice.openPrice)}
                  </p>
                </div>
              )}

              {currentPrice.highPrice && (
                <div className="text-center">
                  <p className="text-sm text-gray-500">High</p>
                  <p className="text-lg font-semibold text-green-600">
                    ₹{formatPrice(currentPrice.highPrice)}
                  </p>
                </div>
              )}

              {currentPrice.lowPrice && (
                <div className="text-center">
                  <p className="text-sm text-gray-500">Low</p>
                  <p className="text-lg font-semibold text-red-600">
                    ₹{formatPrice(currentPrice.lowPrice)}
                  </p>
                </div>
              )}

              {currentPrice.volume && (
                <div className="text-center">
                  <p className="text-sm text-gray-500">Volume</p>
                  <p className="text-lg font-semibold">
                    {currentPrice.volume.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="text-center">
                <p className="text-sm text-gray-500">Last Update</p>
                <p className="text-sm">
                  {formatTime(currentPrice.lastTradeTime)}
                </p>
              </div>
            </div>

            {currentPrice.depth && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h4 className="font-semibold mb-2">Market Depth</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-green-600 mb-1">Buy Orders</h5>
                    <div className="space-y-1">
                      {currentPrice.depth.buy.slice(0, 5).map((order, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>₹{order.price.toFixed(2)}</span>
                          <span>{order.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h5 className="text-sm font-medium text-red-600 mb-1">Sell Orders</h5>
                    <div className="space-y-1">
                      {currentPrice.depth.sell.slice(0, 5).map((order, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>₹{order.price.toFixed(2)}</span>
                          <span>{order.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Subscriptions List */}
      {subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Subscriptions</CardTitle>
            <CardDescription>
              Currently subscribed instruments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {subscriptions.map((sub, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{sub.exchange}:{sub.token}</span>
                    <Badge variant="outline">{sub.mode}</Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    {getPrice(sub.exchange, sub.token)?.lastTradePrice ? 
                      `₹${formatPrice(getPrice(sub.exchange, sub.token)?.lastTradePrice)}` : 
                      'No data'
                    }
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
