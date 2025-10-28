// app/(admin)/admin/vortex-dashboard/page.tsx
"use client";

// Disable static generation for this page (requires runtime data)
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { useEffect, useState } from "react";
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
import QueueMonitor from "@/components/queue-monitor";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

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

export default function VortexDashboard() {
  const searchParams = useSearchParams();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [vortexData, setVortexData] = useState<VortexData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [batcherConfig, setBatcherConfig] = useState<any | null>(null);
  const [batcherState, setBatcherState] = useState<any | null>(null);
  const [batcherLoading, setBatcherLoading] = useState(false);

  // Check for success/error parameters from login
  useEffect(() => {
    if (!searchParams) return;
    try {
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
    } catch (e) {
      console.error('[VORTEX_DASHBOARD] Error reading search params', e);
    }
  }, [searchParams]);

  // Fetch system status on component mount
  useEffect(() => {
    fetchSystemStatus();
    fetchBatcherStatus();
  }, []);

  const fetchSystemStatus = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch('/api/admin/vortex-status');
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch system status');
      setSystemStatus(json.data);
      console.log('[VORTEX_DASHBOARD] System status loaded', json.data);
    } catch (e) {
      console.error('[VORTEX_DASHBOARD] Failed to fetch system status', e);
      setError('Failed to fetch system status');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBatcherStatus = async () => {
    setBatcherLoading(true);
    try {
      const resp = await fetch('/api/admin/quotes-batcher-status');
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch batcher status');
      setBatcherConfig(json.data?.config);
      setBatcherState({ activeBatches: json.data?.activeBatches, lastFlushMeta: json.data?.lastFlushMeta });
      console.log('[VORTEX_DASHBOARD] Batcher status loaded', json.data);
    } catch (e) {
      console.error('[VORTEX_DASHBOARD] Failed to fetch batcher status', e);
      setError('Failed to fetch quotes batcher status');
    } finally {
      setBatcherLoading(false);
    }
  };

  const updateBatcherConfig = async (next: any) => {
    try {
      const resp = await fetch('/api/admin/quotes-batcher-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setConfig', config: next })
      });
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || 'Failed to update config');
      setBatcherConfig(json.data.config);
      console.log('[VORTEX_DASHBOARD] Batcher config updated', json.data.config);
    } catch (e) {
      console.error('[VORTEX_DASHBOARD] Failed to update batcher config', e);
      setError('Failed to update quotes batcher config');
    }
  };

  const flushBatcher = async (mode: string) => {
    try {
      const resp = await fetch('/api/admin/quotes-batcher-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flush', mode })
      });
      const json = await resp.json();
      if (!json.success) throw new Error(json.error || 'Failed to flush batcher');
      await fetchBatcherStatus();
      console.log('[VORTEX_DASHBOARD] Batcher flushed', mode);
    } catch (e) {
      console.error('[VORTEX_DASHBOARD] Failed to flush batcher', e);
      setError('Failed to flush quotes batcher');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Vortex Dashboard</h1>
          <p className="text-gray-600">Monitor Vortex integration status and configuration</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="batcher">Quotes Batcher</TabsTrigger>
            <TabsTrigger value="queue">Queue Monitor</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Database Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <Badge variant={systemStatus?.database === 'connected' ? 'default' : 'destructive'}>
                        {systemStatus?.database || 'Unknown'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Vortex Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <Badge variant={systemStatus?.vortex === 'connected' ? 'default' : 'destructive'}>
                        {systemStatus?.vortex || 'Unknown'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="batcher">
            {batcherLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Quotes Batcher Configuration</CardTitle>
                  <CardDescription>Manage quotes batcher settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {batcherConfig && (
                    <div className="space-y-2">
                      <p>Interval: {batcherConfig.interval}ms</p>
                      <p>Batch Size: {batcherConfig.batchSize}</p>
                      <Button onClick={() => flushBatcher('immediate')} className="mr-2">
                        Flush Now
                      </Button>
                      <Button onClick={() => flushBatcher('manual')} variant="outline">
                        Flush Manual
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="queue">
            <QueueMonitor />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
