// app/(admin)/admin/dashboard/page.tsx
"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Key,
  Globe,
  TrendingUp,
  Activity,
  Settings,
  LogOut,
  Loader2,
  BarChart3,
  DollarSign,
  Users
} from "lucide-react";
import LiveTrading from "@/components/live-trading";
// import WebSocketExample from "@/components/websocket-example";
import QueueMonitor from "@/components/queue-monitor";

interface SystemStatus {
  database: string;
  vortex: string;
  token?: string;
  sessionId?: number;
  lastChecked: Date;
}

interface VortexData {
  quotes?: Record<string, any>;
  profile?: any;
  positions?: any[];
  orders?: any[];
  funds?: any;
}


export function AdminDashboard() {
  const searchParams = useSearchParams();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [vortexData, setVortexData] = useState<VortexData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Check for success/error parameters from login
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const sessionId = searchParams.get('session');

    if (success === 'true') {
      console.log('[VORTEX_AUTH] Login successful, session:', sessionId);
    }

    if (error) {
      const description = searchParams.get('description');
      setError(`${error}: ${description || 'Unknown error'}`);
    }
  }, [searchParams]);

  // Fetch system status on component mount
  useEffect(() => {
    fetchSystemStatus();
  }, []);

  const fetchSystemStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/admin/api/db-status');
      const data = await response.json();

      setSystemStatus({
        database: data.database,
        vortex: data.vortex,
        token: data.token,
        sessionId: data.sessionId,
        lastChecked: new Date()
      });

      console.log('[VORTEX_DASHBOARD] System status updated', {
        database: data.database,
        vortex: data.vortex,
        hasToken: !!data.token,
        sessionId: data.sessionId
      });
    } catch (error) {
      console.error('[VORTEX_DASHBOARD] Failed to fetch system status:', error);
      setError('Failed to fetch system status');
    } finally {
      setIsLoading(false);
    }
  };

  const testVortexConnection = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[VORTEX_DASHBOARD] Testing Vortex connection');

      // Use comprehensive test endpoint
      const testResponse = await fetch('/api/admin/vortex-test');
      const testData = await testResponse.json();

      if (testData.success) {
        console.log('[VORTEX_DASHBOARD] Comprehensive Vortex test completed', testData.data);

        // Update vortex data with test results
        setVortexData(prev => ({
          ...prev,
          testResults: testData.data,
          quotes: testData.data.quotes?.data || prev.quotes
        }));

        // Show summary
        const summary = testData.data.summary;
        if (summary.configOk && summary.sessionOk && summary.connectionOk) {
          console.log('[VORTEX_DASHBOARD] All Vortex tests passed');
        } else {
          const failedTests = [];
          if (!summary.configOk) failedTests.push('Configuration');
          if (!summary.sessionOk) failedTests.push('Session');
          if (!summary.connectionOk) failedTests.push('Connection');
          setError(`Vortex tests failed: ${failedTests.join(', ')}`);
        }
      } else {
        throw new Error(testData.error || 'Failed to run Vortex tests');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Vortex connection test failed: ${errorMessage}`);
      console.error('[VORTEX_DASHBOARD] Vortex connection test failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVortexData = async (type: 'profile' | 'positions' | 'orders' | 'funds') => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(`[VORTEX_DASHBOARD] Fetching ${type} data`);

      // This would be implemented with actual Vortex API calls
      // For now, we'll simulate the data structure
      const mockData = {
        profile: { name: 'Admin User', email: 'admin@example.com' },
        positions: [],
        orders: [],
        funds: { available: 100000, used: 0 }
      };

      setVortexData(prev => ({ ...prev, [type]: mockData[type] }));
      console.log(`[VORTEX_DASHBOARD] ${type} data fetched successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to fetch ${type}: ${errorMessage}`);
      console.error(`[VORTEX_DASHBOARD] Failed to fetch ${type}:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('[VORTEX_DASHBOARD] Logging out');
    // Clear session and redirect to login
    window.location.href = '/admin/auth/login';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Vortex Trading Platform Control Center</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={fetchSystemStatus}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Database</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus?.database || 'unknown')}
                {getStatusBadge(systemStatus?.database || 'unknown')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vortex API</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus?.vortex || 'unknown')}
                {getStatusBadge(systemStatus?.vortex || 'unknown')}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Session</CardTitle>
              <Key className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {systemStatus?.sessionId ? (
                  <span className="text-green-600">Active (ID: {systemStatus.sessionId})</span>
                ) : (
                  <span className="text-red-600">No Session</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quotes">Market Data</TabsTrigger>
            <TabsTrigger value="live">Live Trading</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="logs">System Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>System Information</CardTitle>
                    <CardDescription>Current system status and configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Environment:</span>
                      <Badge variant="outline">{process.env.NODE_ENV}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Last Checked:</span>
                      <span className="text-sm text-gray-500">
                        {systemStatus?.lastChecked?.toLocaleTimeString() || 'Never'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Access Token:</span>
                      <span className="text-sm text-gray-500 truncate max-w-32">
                        {systemStatus?.token ? `${systemStatus.token.substring(0, 20)}...` : 'Not available'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Test and manage Vortex integration</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button
                      onClick={testVortexConnection}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Activity className="h-4 w-4 mr-2" />
                      )}
                      Test Vortex Connection
                    </Button>

                    <Button
                      onClick={() => fetchVortexData('profile')}
                      disabled={isLoading}
                      variant="outline"
                      className="w-full"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Fetch User Profile
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div>
                <QueueMonitor />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quotes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Market Data</CardTitle>
                <CardDescription>Real-time quotes and market information</CardDescription>
              </CardHeader>
              <CardContent>
                {vortexData.quotes ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold">NIFTY Quote:</h3>
                    <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
                      {JSON.stringify(vortexData.quotes, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No market data available. Click "Test Vortex Connection" to fetch data.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Results */}
            {vortexData.testResults && (
              <Card>
                <CardHeader>
                  <CardTitle>Vortex Test Results</CardTitle>
                  <CardDescription>Comprehensive system test results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${vortexData.testResults.summary.configOk ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <p className="text-sm font-medium">Configuration</p>
                      </div>
                      <div className="text-center">
                        <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${vortexData.testResults.summary.sessionOk ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <p className="text-sm font-medium">Session</p>
                      </div>
                      <div className="text-center">
                        <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${vortexData.testResults.summary.connectionOk ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <p className="text-sm font-medium">Connection</p>
                      </div>
                      <div className="text-center">
                        <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${vortexData.testResults.summary.quotesOk ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <p className="text-sm font-medium">Quotes</p>
                      </div>
                    </div>

                    <div className="bg-gray-100 p-4 rounded-md">
                      <h4 className="font-semibold mb-2">Detailed Results:</h4>
                      <pre className="text-xs overflow-auto max-h-64">
                        {JSON.stringify(vortexData.testResults, null, 2)}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="live" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Live Trading Controls</h3>
                <LiveTrading />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Live Price Monitor</h3>
                {/* <WebSocketExample /> */}
                Websocket Example Here
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trading" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trading Information</CardTitle>
                <CardDescription>Positions, orders, and account details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={() => fetchVortexData('positions')}
                    disabled={isLoading}
                    variant="outline"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Positions
                  </Button>

                  <Button
                    onClick={() => fetchVortexData('orders')}
                    disabled={isLoading}
                    variant="outline"
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Orders
                  </Button>

                  <Button
                    onClick={() => fetchVortexData('funds')}
                    disabled={isLoading}
                    variant="outline"
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Funds
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
                <CardDescription>Real-time system activity and error logs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm h-64 overflow-auto">
                  <div className="space-y-1">
                    <div>[{new Date().toISOString()}] [INFO] [VORTEX_DASHBOARD] Dashboard loaded</div>
                    <div>[{new Date().toISOString()}] [INFO] [VORTEX_DASHBOARD] System status check initiated</div>
                    {systemStatus && (
                      <div>[{new Date().toISOString()}] [INFO] [VORTEX_DASHBOARD] System status updated: DB={systemStatus.database}, Vortex={systemStatus.vortex}</div>
                    )}
                    {error && (
                      <div className="text-red-400">[{new Date().toISOString()}] [ERROR] [VORTEX_DASHBOARD] {error}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
export default function DashBoard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AdminDashboard />
    </Suspense>
  );
}
