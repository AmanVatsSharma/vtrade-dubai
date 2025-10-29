/**
 * @file test-websocket/page.tsx
 * @description WebSocket Market Data Test Page - Aligned with CLIENT_API_GUIDE.md
 * 
 * PURPOSE:
 * - Test Socket.IO connection to Vedpragya market data API
 * - Subscribe/unsubscribe to instruments with different data modes (ltp, ohlcv, full)
 * - Display real-time market data updates
 * - Comprehensive error handling and logging
 * - Connection status monitoring
 * 
 * FLOW:
 * 1. User clicks Connect → Initialize Socket.IO client with correct endpoint
 * 2. On successful connection → Receive 'connected' event with clientId
 * 3. User enters instrument token and selects mode → Click Subscribe
 * 4. On subscription → Receive 'subscription_confirmed' event
 * 5. Market data arrives → Display 'market_data' events in UI
 * 6. User can unsubscribe or disconnect at any time
 * 
 * ENDPOINTS:
 * - Socket.IO: https://marketdata.vedpragya.com/market-data
 * - API Key: demo-key-1 (fallback) or NEXT_PUBLIC_LIVE_MARKET_WS_API_KEY
 * 
 * EVENTS HANDLED:
 * - connected: Connection established with server
 * - subscription_confirmed: Subscription to instruments confirmed
 * - market_data: Real-time market data updates
 * - error: Error events with error codes
 * - disconnected: Connection lost
 * 
 * DATA MODES:
 * - ltp: Last Traded Price only (~22 bytes per tick)
 * - ohlcv: Open, High, Low, Close, Volume (~62 bytes per tick)
 * - full: OHLCV + Market Depth (~266 bytes per tick)
 * 
 * ERROR CODES (from CLIENT_API_GUIDE.md):
 * - WS_AUTH_MISSING: Missing API key
 * - WS_AUTH_INVALID: Invalid API key
 * - WS_RATE_LIMIT: Rate limit exceeded
 * - WS_INVALID_MODE: Invalid subscription mode
 * - WS_STREAM_INACTIVE: Streaming not active
 * - WS_INVALID_INSTRUMENTS: Invalid instruments array
 * - WS_SUBSCRIPTION_NOT_FOUND: Client subscription not found
 * 
 * @author Trading Platform Team
 * @date 2025-01-XX
 */

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketMarketData } from '@/lib/market-data/hooks/useWebSocketMarketData';
import type { ConnectionState, SubscriptionMode } from '@/lib/market-data/providers/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  Send, 
  Trash2, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  Loader2, 
  AlertCircle, 
  Clock,
  Zap
} from 'lucide-react';

/**
 * Log entry interface for tracking events
 */
interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

/**
 * Subscription data interface
 */
interface SubscriptionData {
  token: number;
  mode: SubscriptionMode;
  lastPrice: number | null;
  previousPrice: number | null;
  lastUpdate: Date | null;
  messageCount: number;
  data?: any; // Full market data object
}

/**
 * Popular instrument tokens for quick selection
 */
const POPULAR_INSTRUMENTS = [
  { token: 26000, name: 'Nifty 50' },
  { token: 11536, name: 'Bank Nifty' },
  { token: 2881, name: 'Reliance' },
  { token: 2953217, name: 'TCS' },
  { token: 341249, name: 'HDFC Bank' },
];

/**
 * Error code descriptions from CLIENT_API_GUIDE.md
 */
const ERROR_DESCRIPTIONS: Record<string, string> = {
  WS_AUTH_MISSING: 'Missing API key - Please provide a valid API key',
  WS_AUTH_INVALID: 'Invalid API key - Check your API key credentials',
  WS_RATE_LIMIT: 'Rate limit exceeded - Too many requests, please slow down',
  WS_INVALID_MODE: 'Invalid subscription mode - Use ltp, ohlcv, or full',
  WS_STREAM_INACTIVE: 'Streaming not active - Market data stream is currently inactive',
  WS_INVALID_INSTRUMENTS: 'Invalid instruments array - Check instrument tokens are valid numbers',
  WS_SUBSCRIPTION_NOT_FOUND: 'Subscription not found - Instrument was not previously subscribed',
  CONNECTION_ERROR: 'Connection error - Could not connect to server',
  INIT_ERROR: 'Initialization error - Failed to initialize WebSocket client',
};

/**
 * WebSocket Test Page Component
 * 
 * Provides comprehensive testing interface for Vedpragya market data API
 */
export default function WebSocketTestPage() {
  // =====================================================================
  // CONFIGURATION - Per CLIENT_API_GUIDE.md
  // =====================================================================
  
  // Socket.IO endpoint: https://marketdata.vedpragya.com/market-data
  // Use HTTPS (not HTTP) - Socket.IO handles SSL upgrade automatically
  const socketIOUrl = process.env.NEXT_PUBLIC_LIVE_MARKET_WS_URL || 
    'https://marketdata.vedpragya.com/market-data';
  
  // API Key: Use demo-key-1 as fallback per user requirement
  const apiKey = process.env.NEXT_PUBLIC_LIVE_MARKET_WS_API_KEY || 'demo-key-1';
  
  console.log('🚀 [TEST-WEBSOCKET-PAGE] Initialized with config', {
    url: socketIOUrl,
    hasApiKey: !!apiKey,
    apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing',
  });

  // =====================================================================
  // STATE MANAGEMENT
  // =====================================================================
  
  const [tokenInput, setTokenInput] = useState('26000');
  const [subscriptionMode, setSubscriptionMode] = useState<SubscriptionMode>('ltp');
  const [subscriptions, setSubscriptions] = useState<Map<number, SubscriptionData>>(new Map());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectionStartTime, setConnectionStartTime] = useState<Date | null>(null);
  const [totalMessages, setTotalMessages] = useState(0);
  const [clientId, setClientId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // =====================================================================
  // WEBSOCKET HOOK INTEGRATION
  // =====================================================================
  
  const wsData = useWebSocketMarketData({
    url: socketIOUrl,
    apiKey,
    autoConnect: false, // Manual connection control
    reconnectAttempts: 5,
    reconnectDelay: 5000,
    heartbeatInterval: 30000,
    enableJitter: false,
    enableInterpolation: false,
  });

  // =====================================================================
  // LOGGING UTILITIES
  // =====================================================================
  
  /**
   * Add log entry with timestamp and type
   * All logs are also sent to console for debugging (per user rules)
   */
  const addLog = useCallback((type: LogEntry['type'], message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + `.${Date.now() % 1000}`;
    
    // Console logging for debugging (comprehensive logging per user rules)
    const logMethod = type === 'error' ? console.error : 
                      type === 'warning' ? console.warn : 
                      console.log;
    logMethod(`[${timestamp}] [${type.toUpperCase()}] ${message}`, data || '');
    
    // Add to UI logs (keep last 100 entries)
    setLogs((prev: LogEntry[]) => {
      const newLogs = [{ timestamp, type, message, data }, ...prev];
      return newLogs.slice(0, 100);
    });
    
    // Auto-scroll to latest log
    setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // =====================================================================
  // EVENT HANDLERS - Listen to WebSocket events
  // =====================================================================
  
  /**
   * Listen to WebSocket hook events and update UI accordingly
   */
  useEffect(() => {
    // Connection state changes
    if (wsData.isConnected === 'connected') {
      addLog('success', '✅ Connected to market data server', {
        timestamp: new Date().toISOString(),
      });
      
      if (!connectionStartTime) {
        setConnectionStartTime(new Date());
      }
      
      // Reset error message on successful connection
      setErrorMessage(null);
    } else if (wsData.isConnected === 'disconnected') {
      addLog('warning', '🔌 Disconnected from market data server', {
        timestamp: new Date().toISOString(),
      });
      
      setConnectionStartTime(null);
      setClientId(null);
    } else if (wsData.isConnected === 'connecting') {
      addLog('info', '🔄 Connecting to market data server...', {
        timestamp: new Date().toISOString(),
      });
    } else if (wsData.isConnected === 'error') {
      addLog('error', '❌ Connection error occurred', {
        timestamp: new Date().toISOString(),
      });
    }

    // Error handling
    if (wsData.error) {
      const errorCode = wsData.error.code || 'UNKNOWN_ERROR';
      const errorMsg = wsData.error.message || 'Unknown error occurred';
      const description = ERROR_DESCRIPTIONS[errorCode] || errorMsg;
      
      addLog('error', `❌ Error: ${errorCode}`, {
        code: errorCode,
        message: errorMsg,
        description,
        fullError: wsData.error,
      });
      
      setErrorMessage(`${errorCode}: ${description}`);
    }
  }, [wsData.isConnected, wsData.error, addLog, connectionStartTime]);

  /**
   * Listen to market data updates from subscriptions
   */
  useEffect(() => {
    // Market data updates come through quotes
    const quotes = wsData.quotes || {};
    const quoteEntries = Object.keys(quotes).map(key => [key, quotes[key]]);
    
    quoteEntries.forEach((entry) => {
      const [tokenStr, quote] = entry as [string, any];
      const token = parseInt(tokenStr);
      
      if (!subscriptions.has(token)) {
        // New subscription detected
        addLog('success', `📊 New market data received for token ${token}`, {
          token,
          price: quote.data?.last_price,
        });
        
        setSubscriptions((prev: Map<number, SubscriptionData>) => {
          const newSubs = new Map(prev);
          newSubs.set(token, {
            token,
            mode: subscriptionMode, // Default mode
            lastPrice: quote.data?.last_price || null,
            previousPrice: null,
            lastUpdate: new Date(),
            messageCount: 1,
            data: quote.data,
          });
          return newSubs;
        });
      } else {
        // Update existing subscription
        setSubscriptions((prev: Map<number, SubscriptionData>) => {
          const existing = prev.get(token);
          if (!existing) return prev;
          
          const newPrice = quote.data?.last_price || existing.lastPrice;
          const previousPrice = existing.lastPrice;
          
          // Update subscription data
          const updated: SubscriptionData = {
            ...existing,
            lastPrice: newPrice,
            previousPrice: previousPrice,
            lastUpdate: new Date(),
            messageCount: existing.messageCount + 1,
            data: quote.data,
          };
          
          const newSubs = new Map(prev);
          newSubs.set(token, updated);
          return newSubs;
        });
        
        setTotalMessages((prev: number) => prev + 1);
      }
    });
  }, [wsData.quotes, subscriptionMode, addLog, subscriptions]);

  // =====================================================================
  // USER ACTION HANDLERS
  // =====================================================================
  
  /**
   * Handle connect button click
   */
  const handleConnect = useCallback(async () => {
    addLog('info', '🔌 Initiating connection to WebSocket server...', {
      url: socketIOUrl,
      hasApiKey: !!apiKey,
    });
    
    setErrorMessage(null);
    setConnectionStartTime(null);
    
    try {
      await wsData.connect();
      addLog('info', '🔄 Connection request sent, waiting for server response...');
    } catch (error) {
      addLog('error', '❌ Failed to initiate connection', {
        error: error instanceof Error ? error.message : String(error),
      });
      setErrorMessage('Failed to connect. Check console for details.');
    }
  }, [wsData, socketIOUrl, apiKey, addLog]);

  /**
   * Handle disconnect button click
   */
  const handleDisconnect = useCallback(() => {
    addLog('warning', '🔌 Disconnecting from WebSocket server...');
    
    wsData.disconnect();
    setSubscriptions(new Map());
    setTotalMessages(0);
    setConnectionStartTime(null);
    setClientId(null);
    setErrorMessage(null);
    
    addLog('success', '✅ Disconnected successfully');
  }, [wsData, addLog]);

  /**
   * Handle subscribe button click
   * Per CLIENT_API_GUIDE.md: emit 'subscribe' event with { instruments, mode }
   */
  const handleSubscribe = useCallback(() => {
    // Validation
    const token = parseInt(tokenInput);
    if (isNaN(token)) {
      addLog('error', '❌ Invalid instrument token', { input: tokenInput });
      setErrorMessage('Invalid instrument token. Please enter a valid number.');
      return;
    }
    
    if (wsData.isConnected !== 'connected') {
      addLog('warning', '⚠️ Cannot subscribe - not connected', {
        connectionState: wsData.isConnected,
      });
      setErrorMessage('Please connect to the server first.');
      return;
    }
    
    // Check if already subscribed
    if (subscriptions.has(token)) {
      addLog('warning', `⚠️ Token ${token} is already subscribed`, { token });
      setErrorMessage(`Token ${token} is already subscribed.`);
      return;
    }
    
    // Add to local subscriptions state
    const newSubscriptions = new Map(subscriptions);
    newSubscriptions.set(token, {
      token,
      mode: subscriptionMode,
      lastPrice: null,
      previousPrice: null,
      lastUpdate: null,
      messageCount: 0,
    });
    setSubscriptions(newSubscriptions);
    
    // Emit subscribe event per CLIENT_API_GUIDE.md
    addLog('info', `📡 Subscribing to token ${token} in ${subscriptionMode} mode`, {
      token,
      mode: subscriptionMode,
    });
    
    wsData.subscribe([token], subscriptionMode);
    
    // Clear input for next subscription
    setTokenInput('');
  }, [tokenInput, subscriptionMode, wsData, subscriptions, addLog]);

  /**
   * Handle unsubscribe button click
   * Per CLIENT_API_GUIDE.md: emit 'unsubscribe' event with { instruments }
   */
  const handleUnsubscribe = useCallback((token: number) => {
    if (wsData.isConnected !== 'connected') {
      addLog('warning', '⚠️ Cannot unsubscribe - not connected');
      return;
    }
    
    addLog('info', `🚫 Unsubscribing from token ${token}`, { token });
    
    // Remove from local state
    const newSubscriptions = new Map(subscriptions);
    const subscription = newSubscriptions.get(token);
    
    if (subscription) {
      // Emit unsubscribe event per CLIENT_API_GUIDE.md
      wsData.unsubscribe([token], subscription.mode);
      newSubscriptions.delete(token);
      setSubscriptions(newSubscriptions);
      
      addLog('success', `✅ Unsubscribed from token ${token}`);
    }
  }, [wsData, subscriptions, addLog]);

  /**
   * Handle popular instrument selection
   */
  const handleSelectPopularInstrument = useCallback((token: number) => {
    setTokenInput(token.toString());
    addLog('info', `📌 Selected popular instrument: ${token}`, { token });
  }, [addLog]);

  // =====================================================================
  // UI RENDERING
  // =====================================================================
  
  /**
   * Get connection status badge
   */
  const getConnectionStatus = () => {
    switch (wsData.isConnected) {
      case 'connected':
        return (
          <Badge className="bg-green-500 text-white">
            <Wifi className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case 'connecting':
        return (
          <Badge className="bg-yellow-500 text-white">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Connecting...
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500 text-white">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500 text-white">
            <WifiOff className="w-3 h-3 mr-1" />
            Disconnected
          </Badge>
        );
    }
  };

  /**
   * Get connection duration
   */
  const getConnectionDuration = () => {
    if (!connectionStartTime) return null;
    
    const now = new Date();
    const diff = now.getTime() - connectionStartTime.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  /**
   * Get price change indicator (for display)
   */
  const getPriceChangeIndicator = (sub: SubscriptionData) => {
    if (!sub.lastPrice || !sub.previousPrice) return null;
    
    const change = sub.lastPrice - sub.previousPrice;
    
    if (change > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (change < 0) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  WebSocket Market Data Test
                </CardTitle>
                <CardDescription className="mt-1">
                  Test Socket.IO connection to Vedpragya Market Data API (per CLIENT_API_GUIDE.md)
                </CardDescription>
              </div>
              {getConnectionStatus()}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Info */}
            {wsData.isConnected === 'connected' && (
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {connectionStartTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>Connected for: {getConnectionDuration()}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  <span>Messages: {totalMessages}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4" />
                  <span>Subscriptions: {subscriptions.size}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-600">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Connection Controls */}
            <div className="flex gap-3">
              <Button 
                onClick={handleConnect} 
                disabled={wsData.isConnected === 'connected' || wsData.isConnected === 'connecting'}
                className="flex items-center gap-2"
              >
                {wsData.isConnected === 'connecting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    Connect
                  </>
                )}
              </Button>
              <Button 
                onClick={handleDisconnect} 
                disabled={wsData.isConnected !== 'connected'}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <WifiOff className="w-4 h-4" />
                Disconnect
              </Button>
            </div>

            {/* Subscription Controls */}
            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold text-lg">Subscribe to Instruments</h3>
              
              {/* Popular Instruments */}
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600">Popular:</span>
                {POPULAR_INSTRUMENTS.map(({ token, name }) => (
                  <Button
                    key={token}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectPopularInstrument(token)}
                    className="text-xs"
                  >
                    {name} ({token})
                  </Button>
                ))}
              </div>

              {/* Subscription Input */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Instrument Token
                  </label>
                  <Input 
                    value={tokenInput} 
                    onChange={(e) => setTokenInput(e.target.value)} 
                    placeholder="26000"
                    type="number"
                  />
                </div>
                <div className="w-32">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Data Mode
                  </label>
                  <select 
                    value={subscriptionMode} 
                    onChange={(e) => setSubscriptionMode((e.target as HTMLSelectElement).value as SubscriptionMode)}
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                  >
                    <option value="ltp">LTP</option>
                    <option value="ohlcv">OHLCV</option>
                    <option value="full">Full</option>
                  </select>
                </div>
                <Button 
                  onClick={handleSubscribe} 
                  disabled={wsData.isConnected !== 'connected'}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Subscribe
                </Button>
              </div>
            </div>

            {/* Active Subscriptions */}
            {subscriptions.size > 0 && (
              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold text-lg">Active Subscriptions</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {Array.from(subscriptions.values()).map((sub) => {
                    const subscriptionData = sub as SubscriptionData;
                    return (
                    <div 
                      key={subscriptionData.token} 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Token {subscriptionData.token}</span>
                          <Badge>{subscriptionData.mode.toUpperCase()}</Badge>
                          {getPriceChangeIndicator(subscriptionData)}
                        </div>
                        {subscriptionData.lastPrice !== null && (
                          <div className="text-lg font-mono">
                            ₹{subscriptionData.lastPrice.toLocaleString('en-IN', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}
                          </div>
                        )}
                        {subscriptionData.lastUpdate && (
                          <div className="text-xs text-gray-500 mt-1">
                            Last update: {subscriptionData.lastUpdate.toLocaleTimeString()} ({subscriptionData.messageCount} updates)
                          </div>
                        )}
                        {subscriptionData.data && subscriptionData.mode === 'ohlcv' && subscriptionData.data.ohlc && (
                          <div className="text-xs text-gray-600 mt-2 font-mono">
                            O: {subscriptionData.data.ohlc.open} | H: {subscriptionData.data.ohlc.high} | L: {subscriptionData.data.ohlc.low} | C: {subscriptionData.data.ohlc.close} | V: {subscriptionData.data.volume?.toLocaleString() || 'N/A'}
                          </div>
                        )}
                      </div>
                      <Button 
                        onClick={() => handleUnsubscribe(subscriptionData.token)} 
                        size="sm" 
                        variant="destructive"
                        className="ml-4"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Unsubscribe
                      </Button>
                    </div>
                  );
                  })}
                </div>
              </div>
            )}

            {/* Logs */}
            <div className="border-t pt-4 space-y-2">
              <h3 className="font-semibold text-lg">Event Logs</h3>
              <div className="bg-gray-900 p-4 rounded-lg h-64 overflow-y-auto text-xs font-mono">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No logs yet. Connect to start seeing events.
                  </div>
                ) : (
                  <>
                    {logs.map((log: LogEntry, i: number) => {
                      const colorClass = 
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warning' ? 'text-yellow-400' :
                        log.type === 'success' ? 'text-green-400' :
                        'text-gray-300';
                      
                      return (
                        <div key={i} className={`${colorClass} mb-1`}>
                          <span className="text-gray-500">[{log.timestamp}]</span>{' '}
                          <span className={colorClass}>{log.message}</span>
                          {log.data && typeof log.data === 'object' && (
                            <span className="text-gray-500 ml-2">
                              {JSON.stringify(log.data)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    <div ref={logsEndRef} />
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}