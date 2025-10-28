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
// import WebSocketExample from "@/components/websocket-example";
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


export function AdminDashboard() {
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
    fetchBatcherStatus();
  }, []);
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
 