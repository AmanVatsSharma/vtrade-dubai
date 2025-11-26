/**
 * @file status-badge.tsx
 * @module admin-console/shared
 * @description Enhanced status badge component combining best features from all admin console components
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { Badge } from "@/components/ui/badge"

export type StatusType = 
  | 'user' 
  | 'order' 
  | 'fund' 
  | 'kyc' 
  | 'system' 
  | 'risk' 
  | 'audit' 
  | 'notification'
  | 'general'

export type StatusValue = 
  // User statuses
  | 'active' | 'inactive' | 'suspended' | 'pending'
  // Order statuses
  | 'PENDING' | 'EXECUTED' | 'CANCELLED' | 'PARTIALLY_FILLED'
  // Fund statuses
  | 'COMPLETED' | 'PENDING' | 'FAILED' | 'REJECTED'
  // KYC statuses
  | 'VERIFIED' | 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_SUBMITTED'
  // System statuses
  | 'HEALTHY' | 'ONLINE' | 'WARNING' | 'CRITICAL' | 'OFFLINE' | 'DEGRADED'
  // Risk statuses
  | 'ACTIVE' | 'SUSPENDED' | 'WARNING' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  // Audit statuses
  | 'SUCCESS' | 'FAILED'
  // Notification types
  | 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'

interface StatusBadgeProps {
  status: StatusValue | string
  type?: StatusType
  className?: string
  children?: React.ReactNode
}

/**
 * Enhanced Status Badge Component
 * 
 * Combines all status badge logic from:
 * - user-management.tsx
 * - fund-management.tsx
 * - orders-management.tsx
 * - risk-management.tsx
 * - system-health.tsx
 * - audit-trail.tsx
 * - kyc-management-dialog.tsx
 * - enhanced-notification-center.tsx
 * 
 * Features:
 * - Consistent color schemes across all components
 * - Type-safe status values
 * - Support for all status types
 * - Customizable styling
 */
export function StatusBadge({ status, type, className = "", children }: StatusBadgeProps) {
  const statusUpper = status.toUpperCase()
  
  // Color mapping combining best from all components
  const getBadgeClasses = (): string => {
    // User statuses
    if (statusUpper === 'ACTIVE') {
      return 'bg-green-400/20 text-green-400 border-green-400/30'
    }
    if (statusUpper === 'INACTIVE' || statusUpper === 'SUSPENDED') {
      return 'bg-red-400/20 text-red-400 border-red-400/30'
    }
    if (statusUpper === 'PENDING') {
      return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30'
    }
    
    // Order statuses
    if (statusUpper === 'EXECUTED' || statusUpper === 'COMPLETED' || statusUpper === 'SUCCESS') {
      return 'bg-green-400/20 text-green-400 border-green-400/30'
    }
    if (statusUpper === 'CANCELLED' || statusUpper === 'FAILED' || statusUpper === 'REJECTED' || statusUpper === 'OFFLINE') {
      return 'bg-red-400/20 text-red-400 border-red-400/30'
    }
    if (statusUpper === 'PARTIALLY_FILLED') {
      return 'bg-blue-400/20 text-blue-400 border-blue-400/30'
    }
    
    // KYC statuses
    if (statusUpper === 'VERIFIED' || statusUpper === 'APPROVED') {
      return 'bg-green-400/20 text-green-400 border-green-400/30'
    }
    if (statusUpper === 'NOT_SUBMITTED') {
      return 'bg-gray-400/20 text-gray-400 border-gray-400/30'
    }
    
    // System statuses
    if (statusUpper === 'HEALTHY' || statusUpper === 'ONLINE') {
      return 'bg-green-400/20 text-green-400 border-green-400/30'
    }
    if (statusUpper === 'WARNING' || statusUpper === 'DEGRADED') {
      return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30'
    }
    if (statusUpper === 'CRITICAL') {
      return 'bg-red-400/20 text-red-400 border-red-400/30'
    }
    
    // Risk severity
    if (statusUpper === 'LOW') {
      return 'bg-blue-400/20 text-blue-400 border-blue-400/30'
    }
    if (statusUpper === 'MEDIUM') {
      return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30'
    }
    if (statusUpper === 'HIGH') {
      return 'bg-orange-400/20 text-orange-400 border-orange-400/30'
    }
    
    // Notification types
    if (statusUpper === 'INFO') {
      return 'bg-blue-400/20 text-blue-400 border-blue-400/30'
    }
    if (statusUpper === 'ERROR') {
      return 'bg-red-400/20 text-red-400 border-red-400/30'
    }
    
    // Transaction types
    if (statusUpper === 'CREDIT') {
      return 'bg-emerald-400/20 text-emerald-400 border-emerald-400/30'
    }
    if (statusUpper === 'DEBIT') {
      return 'bg-rose-400/20 text-rose-400 border-rose-400/30'
    }
    
    // Default
    return 'bg-gray-400/20 text-gray-400 border-gray-400/30'
  }

  return (
    <Badge className={`${getBadgeClasses()} ${className}`}>
      {children || status}
    </Badge>
  )
}
