// components/vortex/WebSocketErrorBoundary.tsx
"use client";

import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

/**
 * Props for WebSocketErrorBoundary component
 */
interface WebSocketErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * State for WebSocketErrorBoundary component
 */
interface WebSocketErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorCount: number;
}

/**
 * WebSocketErrorBoundary Component
 * 
 * Error boundary specifically designed for WebSocket components.
 * Provides:
 * - Graceful error handling for WebSocket failures
 * - Error logging to console
 * - User-friendly error display
 * - Retry mechanism
 * - Detailed error information in development mode
 * 
 * @example
 * ```tsx
 * <WebSocketErrorBoundary>
 *   <LiveMarketQuotes />
 * </WebSocketErrorBoundary>
 * ```
 */
export class WebSocketErrorBoundary extends Component<
  WebSocketErrorBoundaryProps,
  WebSocketErrorBoundaryState
> {
  constructor(props: WebSocketErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<WebSocketErrorBoundaryState> {
    console.error('🚨 [WebSocketErrorBoundary] Error caught:', error);
    return {
      hasError: true,
      error
    };
  }

  /**
   * Log error details to console
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 [WebSocketErrorBoundary] Component error details:', {
      error: error.toString(),
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    });

    this.setState(prevState => ({
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to external error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
      console.log('📊 [WebSocketErrorBoundary] Would send error to tracking service');
    }
  }

  /**
   * Reset error state and retry
   */
  handleRetry = () => {
    console.log('🔄 [WebSocketErrorBoundary] Retrying after error');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  /**
   * Render error UI when an error occurs
   */
  renderErrorUI() {
    const { error, errorInfo, errorCount } = this.state;

    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            WebSocket Connection Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Message */}
          <div className="text-sm text-red-800">
            <p className="font-semibold">Something went wrong with the WebSocket connection.</p>
            {error && (
              <p className="mt-2 text-red-700">
                Error: {error.message || error.toString()}
              </p>
            )}
          </div>

          {/* Error Count */}
          {errorCount > 1 && (
            <div className="text-xs text-red-600">
              This error has occurred {errorCount} time{errorCount > 1 ? 's' : ''}.
            </div>
          )}

          {/* Retry Button */}
          <Button
            onClick={this.handleRetry}
            variant="outline"
            className="bg-white hover:bg-red-50 border-red-300 text-red-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
          </Button>

          {/* Detailed Error Info (Development Only) */}
          {process.env.NODE_ENV === 'development' && errorInfo && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-red-700 hover:text-red-900 font-semibold">
                Developer Information
              </summary>
              <div className="mt-2 space-y-4">
                {/* Error Stack */}
                {error?.stack && (
                  <div>
                    <p className="text-xs font-semibold text-red-800 mb-1">Error Stack:</p>
                    <pre className="text-xs bg-white p-2 rounded border border-red-200 overflow-auto max-h-40">
                      {error.stack}
                    </pre>
                  </div>
                )}

                {/* Component Stack */}
                <div>
                  <p className="text-xs font-semibold text-red-800 mb-1">Component Stack:</p>
                  <pre className="text-xs bg-white p-2 rounded border border-red-200 overflow-auto max-h-40">
                    {errorInfo.componentStack}
                  </pre>
                </div>

                {/* Troubleshooting Tips */}
                <div>
                  <p className="text-xs font-semibold text-red-800 mb-1">Troubleshooting Tips:</p>
                  <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                    <li>Check if Vortex API credentials are configured correctly</li>
                    <li>Verify that a valid session exists (login to Vortex first)</li>
                    <li>Check browser console for WebSocket connection errors</li>
                    <li>Ensure network connectivity to wss://wire.rupeezy.in</li>
                    <li>Try refreshing the page</li>
                  </ul>
                </div>
              </div>
            </details>
          )}

          {/* Production Help Text */}
          {process.env.NODE_ENV === 'production' && (
            <div className="text-xs text-red-600 bg-white p-2 rounded border border-red-200">
              <p className="font-semibold mb-1">Possible solutions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Refresh the page</li>
                <li>Check your internet connection</li>
                <li>Clear browser cache and try again</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  render() {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided, otherwise use default error UI
      return fallback || this.renderErrorUI();
    }

    return children;
  }
}

export default WebSocketErrorBoundary;