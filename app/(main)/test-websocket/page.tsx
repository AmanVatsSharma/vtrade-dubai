/**
 * @file test-websocket/page.tsx
 * @description Comprehensive WebSocket Market Data Test Page
 */

"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketMarketData } from '@/lib/market-data/hooks/useWebSocketMarketData';
import type { ConnectionState, SubscriptionMode } from '@/lib/market-data/providers/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Send, Trash2, Activity, TrendingUp, TrendingDown, Minimize2, Maximize2, XCircle, CheckCircle, Loader2, AlertCircle, Clock, Signal } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

export default function WebSocketTestPage() {
  const wsUrl = process.env.NEXT_PUBLIC_LIVE_MARKET_WS_URL || 'ws://marketdata.vedpragya.com:3000';
  const apiKey = process.env.NEXT_PUBLIC_LIVE_MARKET_WS_API_KEY || 'demo-key-1';
  const [tokenInput, setTokenInput] = useState('26000');
  const [subscriptionMode, setSubscriptionMode] = useState<SubscriptionMode>('ltp');
  const [subscriptions, setSubscriptions] = useState<Map<number, any>>(new Map());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connectionStartTime, setConnectionStartTime] = useState<Date | null>(null);
  const [totalMessages, setTotalMessages] = useState(0);
  
  const wsData = useWebSocketMarketData({
    url: wsUrl,
    apiKey,
    autoConnect: false,
    reconnectAttempts: 5,
    reconnectDelay: 5000,
    heartbeatInterval: 30000,
    enableJitter: false,
    enableInterpolation: false,
  });

  const addLog = useCallback((type: LogEntry['type'], message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`, data || '');
    setLogs(prev => {
      const newLogs = [{ timestamp, type, message, data }, ...prev];
      return newLogs.slice(0, 50);
    });
  }, []);

  useEffect(() => {
    addLog('info', '🚀 WebSocket Test Page Initialized', { wsUrl, hasApiKey: !!apiKey });
  }, [wsUrl, apiKey, addLog]);

  const handleConnect = useCallback(async () => {
    addLog('info', '🔌 Connecting to WebSocket...');
    await wsData.connect();
  }, [wsData, addLog]);

  const handleDisconnect = useCallback(() => {
    addLog('warning', '🔌 Disconnecting...');
    wsData.disconnect();
    setSubscriptions(new Map());
  }, [wsData, addLog]);

  const handleSubscribe = useCallback(() => {
    const token = parseInt(tokenInput);
    if (isNaN(token) || wsData.isConnected !== 'connected') return;
    
    const newSubscriptions = new Map(subscriptions);
    newSubscriptions.set(token, { token, mode: subscriptionMode, lastPrice: null, lastUpdate: null, messageCount: 0 });
    setSubscriptions(newSubscriptions);
    wsData.subscribe([token], subscriptionMode);
    addLog('info', '📡 Subscribed', { token });
  }, [tokenInput, subscriptionMode, wsData, subscriptions, addLog]);

  const handleUnsubscribe = useCallback((token: number) => {
    wsData.unsubscribe([token], subscriptions.get(token)?.mode || 'ltp');
    const newSubscriptions = new Map(subscriptions);
    newSubscriptions.delete(token);
    setSubscriptions(newSubscriptions);
  }, [wsData, subscriptions]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>WebSocket Market Data Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button onClick={handleConnect} disabled={wsData.isConnected === 'connected'}>
                Connect
              </Button>
              <Button onClick={handleDisconnect} disabled={wsData.isConnected !== 'connected'}>
                Disconnect
              </Button>
            </div>
            
            <div className="flex gap-3 items-end">
              <Input value={tokenInput} onChange={(e) => setTokenInput(e.target.value)} placeholder="26000" />
              <select value={subscriptionMode} onChange={(e) => setSubscriptionMode(e.target.value as SubscriptionMode)}>
                <option value="ltp">LTP</option>
                <option value="ohlcv">OHLCV</option>
                <option value="full">Full</option>
              </select>
              <Button onClick={handleSubscribe} disabled={wsData.isConnected !== 'connected'}>
                Subscribe
              </Button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Array.from(subscriptions.values()).map(sub => (
                <div key={sub.token} className="flex items-center justify-between p-3 bg-gray-100 rounded">
                  <div>Token {sub.token}</div>
                  <Button onClick={() => handleUnsubscribe(sub.token)} size="sm" variant="destructive">
                    Unsubscribe
                  </Button>
                </div>
              ))}
            </div>

            <div className="bg-gray-900 p-4 rounded h-64 overflow-y-auto text-xs font-mono">
              {logs.map((log, i) => (
                <div key={i} className="text-gray-300 mb-1">
                  [{log.timestamp}] {log.message}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
