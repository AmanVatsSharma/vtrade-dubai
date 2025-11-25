/**
 * @file error-boundary.tsx
 * @module components
 * @description Error Boundary Component - Catches and handles React component errors gracefully
 * @author BharatERP
 * @created 2024-12-19
 */

"use client"

import React, { Component, ReactNode } from 'react'
import { TradingErrorDisplay } from '@/components/trading/TradingErrorDisplay'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /**
   * Whether to show technical details (default: false in production)
   */
  showTechnicalDetails?: boolean
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * ErrorBoundary Component
 * 
 * Catches and handles errors gracefully in the UI:
 * - Prevents entire app crash
 * - Shows professional trading-focused error message
 * - Logs error for debugging
 * - Provides retry functionality
 * - Integrates with global error handlers
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ [ERROR-BOUNDARY] Caught error:', error)
    console.error('❌ [ERROR-BOUNDARY] Error info:', errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to monitoring service (if available)
    if (typeof window !== 'undefined' && (window as any).logError) {
      (window as any).logError(error, errorInfo)
    }

    // Report to error tracking service (if available)
    if (typeof window !== 'undefined' && (window as any).reportError) {
      (window as any).reportError(error, `React Error Boundary: ${errorInfo.componentStack}`)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Use professional TradingErrorDisplay component
      return (
        <TradingErrorDisplay
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleReset}
          showTechnicalDetails={this.props.showTechnicalDetails}
        />
      )
    }

    return this.props.children
  }
}

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
