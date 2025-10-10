// app/(admin)/admin/auth/login/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw, Database, Key, Globe } from "lucide-react";

interface SystemStatus {
  vortexConfig: boolean;
  database: boolean;
  apiConnection: boolean;
  lastChecked: Date;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Check system status on component mount
  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    setIsCheckingStatus(true);
    try {
      const response = await fetch('/admin/api/db-status');
      const data = await response.json();
      console.log('[VORTEX_AUTH] System status payload', data);

      const vortexConfigured = Boolean(data?.config?.configOk ?? process.env.NEXT_PUBLIC_VORTEX_APPLICATION_ID);
      // Prefer server-provided normalized flag; fallback to legacy mapping
      const apiConnected = Boolean(
        data?.vortexConnected ?? (data?.vortex === 'session_available')
      );

      setSystemStatus({
        vortexConfig: vortexConfigured,
        database: data.database === 'connected',
        apiConnection: apiConnected,
        lastChecked: new Date()
      });
    } catch (error) {
      console.error('Failed to check system status:', error);
      setSystemStatus({
        vortexConfig: !!process.env.NEXT_PUBLIC_VORTEX_APPLICATION_ID,
        database: false,
        apiConnection: false,
        lastChecked: new Date()
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const appId = process.env.NEXT_PUBLIC_VORTEX_APPLICATION_ID;
      // Block login if config missing per latest status
      if (systemStatus && !systemStatus.vortexConfig) {
        throw new Error('Vortex configuration incomplete on server. Please set VORTEX_APPLICATION_ID and VORTEX_X_API_KEY.');
      }
      
      if (!appId) {
        throw new Error('Vortex Application ID is not configured. Please check environment variables.');
      }

      // Log login attempt
      console.log('[VORTEX_AUTH] Admin login attempt initiated', {
        appId: appId.substring(0, 10) + '...',
        timestamp: new Date().toISOString()
      });

      // Redirect to Rupeezy for authorization
      window.location.href = `https://flow.rupeezy.in?applicationId=${appId}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      console.error('[VORTEX_AUTH] Login failed:', {
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (status: boolean) => {
    return (
      <Badge variant={status ? "default" : "destructive"}>
        {status ? "Connected" : "Disconnected"}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>
          <p className="text-gray-600">Vortex Trading Platform</p>
        </div>

        {/* System Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">System Status</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={checkSystemStatus}
                disabled={isCheckingStatus}
              >
                {isCheckingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Key className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Vortex Config</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus?.vortexConfig ?? false)}
                {getStatusBadge(systemStatus?.vortexConfig ?? false)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-gray-500" />
                <span className="text-sm">Database</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus?.database ?? false)}
                {getStatusBadge(systemStatus?.database ?? false)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <span className="text-sm">API Connection</span>
              </div>
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemStatus?.apiConnection ?? false)}
                {getStatusBadge(systemStatus?.apiConnection ?? false)}
              </div>
            </div>

            {systemStatus?.lastChecked && (
              <p className="text-xs text-gray-500 text-center">
                Last checked: {systemStatus.lastChecked.toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Vortex Authentication</CardTitle>
            <CardDescription>
              Sign in with your Rupeezy account to access the trading platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleLogin}
              disabled={isLoading || !systemStatus?.vortexConfig}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Login with Rupeezy
                </>
              )}
            </Button>

            {!systemStatus?.vortexConfig && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Vortex configuration is missing. Please check environment variables.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Debug Information */}
        {process.env.NODE_ENV === 'development' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-medium">App ID:</span> {process.env.NEXT_PUBLIC_VORTEX_APPLICATION_ID ? 'Configured' : 'Missing'}
                </div>
                <div>
                  <span className="font-medium">Environment:</span> {process.env.NODE_ENV}
                </div>
                <div>
                  <span className="font-medium">Timestamp:</span> {new Date().toISOString()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
