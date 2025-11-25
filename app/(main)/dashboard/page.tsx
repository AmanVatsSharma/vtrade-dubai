"use client"

import TradingDashboard from "@/components/trading/TradingDashboard"
import { ErrorBoundary } from "@/components/error-boundary"
import { Suspense } from "react"

// Loading component for Suspense fallback
const DashboardLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
    </div>
  </div>
)

export default function DashboardPage() {
  return (
    <ErrorBoundary showTechnicalDetails={process.env.NODE_ENV === 'development'}>
      <Suspense fallback={<DashboardLoading />}>
        <TradingDashboard />
      </Suspense>
    </ErrorBoundary>
  )
}
