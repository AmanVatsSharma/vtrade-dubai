/**
 * @file GlobalErrorHandler.tsx
 * @module trading
 * @description Global error handler wrapper component that catches all client-side errors
 * @author BharatERP
 * @created 2024-12-19
 */

"use client"

import React, { useState, useCallback } from 'react'
import { useGlobalErrorHandler } from '@/hooks/use-global-error-handler'
import { TradingErrorDisplay } from './TradingErrorDisplay'

interface GlobalErrorHandlerProps {
  children: React.ReactNode
}

/**
 * GlobalErrorHandler Component
 * 
 * Wraps the application to catch all unhandled errors:
 * - Synchronous errors (window.onerror)
 * - Unhandled promise rejections
 * - Displays professional error UI when errors occur
 * 
 * This component should be placed high in the component tree,
 * ideally in the root layout or app component.
 */
export function GlobalErrorHandler({ children }: GlobalErrorHandlerProps) {
  const [error, setError] = useState<Error | null>(null)
  const [errorContext, setErrorContext] = useState<string>('')

  // Handle errors caught by global error handler
  const handleError = useCallback((error: Error, context?: string) => {
    console.error('🚨 [GLOBAL-ERROR-HANDLER] Error caught:', error, context)
    setError(error)
    setErrorContext(context || '')
  }, [])

  // Report errors to tracking service (if available)
  const reportError = useCallback((error: Error, context: string) => {
    // Log to console
    console.error('📊 [ERROR-REPORTING]', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    })

    // Send to error tracking service (e.g., Sentry, LogRocket, etc.)
    if (typeof window !== 'undefined' && (window as any).reportError) {
      (window as any).reportError(error, context)
    }

    // TODO: [SonuRamTODO] Integrate with error tracking service
    // Example: Sentry.captureException(error, { extra: { context } })
  }, [])

  // Set up global error handlers
  useGlobalErrorHandler({
    onError: handleError,
    logErrors: true,
    reportError
  })

  // Reset error state
  const handleRetry = useCallback(() => {
    setError(null)
    setErrorContext('')
    // Optionally reload the page
    // window.location.reload()
  }, [])

  // If there's a global error, show the error display
  if (error) {
    return (
      <TradingErrorDisplay
        error={error}
        customMessage={errorContext ? `Error occurred: ${errorContext}` : undefined}
        onRetry={handleRetry}
        showTechnicalDetails={process.env.NODE_ENV === 'development'}
      />
    )
  }

  return <>{children}</>
}
