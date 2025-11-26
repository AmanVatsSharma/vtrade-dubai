/**
 * @file system-health.tsx
 * @module admin-console
 * @description Enterprise system health monitoring with metrics, alerts, and diagnostics
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  Network,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { PageHeader, RefreshButton, StatusBadge } from "./shared"

interface SystemMetric {
  name: string
  value: number
  max: number
  unit: string
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  trend?: 'up' | 'down'
}

interface ServiceStatus {
  name: string
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED'
  uptime: number
  lastCheck: Date
  responseTime: number
}

export function SystemHealth() {
  const [metrics, setMetrics] = useState<SystemMetric[]>([])
  const [services, setServices] = useState<ServiceStatus[]>([])
  const [loading, setLoading] = useState(false)

  const fetchHealthData = async () => {
    setLoading(true)
    console.log("💚 [SYSTEM-HEALTH] Fetching system health data...")

    try {
      const response = await fetch('/api/admin/system/health').catch(() => null)

      if (response && response.ok) {
        const data = await response.json()
        setMetrics(data.metrics || [])
        setServices(data.services || [])
        console.log(`✅ [SYSTEM-HEALTH] Loaded ${data.metrics?.length || 0} metrics and ${data.services?.length || 0} services`)
      } else {
        console.warn("⚠️ [SYSTEM-HEALTH] Failed to fetch health data")
        setMetrics([])
        setServices([])
      }
    } catch (error) {
      console.error("❌ [SYSTEM-HEALTH] Error fetching health data:", error)
      toast({
        title: "Error",
        description: "Failed to load system health data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
    const interval = setInterval(fetchHealthData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY':
      case 'ONLINE':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />
      case 'WARNING':
      case 'DEGRADED':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'CRITICAL':
      case 'OFFLINE':
        return <XCircle className="w-5 h-5 text-red-400" />
      default:
        return <Activity className="w-5 h-5 text-muted-foreground" />
    }
  }


  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <PageHeader
        title="System Health"
        description="Real-time system monitoring and diagnostics"
        icon={<Activity className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={<RefreshButton onClick={fetchHealthData} loading={loading} />}
      />

      {/* System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {metric.name === 'CPU Usage' && <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />}
                    {metric.name === 'Memory Usage' && <Server className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />}
                    {metric.name === 'Disk Usage' && <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />}
                    {metric.name === 'Network I/O' && <Network className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />}
                    <span className="text-xs sm:text-sm font-medium text-foreground truncate">{metric.name}</span>
                  </div>
                  <div className="flex-shrink-0">{getStatusIcon(metric.status)}</div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl sm:text-2xl font-bold text-foreground truncate">
                      {metric.value}{metric.unit}
                    </span>
                    {metric.trend && (
                      metric.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-400 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 flex-shrink-0" />
                      )
                    )}
                  </div>
                  <Progress
                    value={(metric.value / metric.max) * 100}
                    className={`h-2 ${
                      metric.status === 'CRITICAL'
                        ? 'bg-red-400/20'
                        : metric.status === 'WARNING'
                        ? 'bg-yellow-400/20'
                        : 'bg-green-400/20'
                    }`}
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate">Max: {metric.max}{metric.unit}</span>
                    <StatusBadge status={metric.status} type="system" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Service Status */}
      <Card className="bg-card border-border shadow-sm neon-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Service Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((service) => (
              <div
                key={service.name}
                className="p-4 rounded-lg border border-border bg-muted/30"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(service.status)}
                    <span className="font-medium text-foreground">{service.name}</span>
                  </div>
                  <StatusBadge status={service.status} type="system" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Uptime</span>
                    <span className="font-medium text-foreground">{service.uptime}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Response Time</span>
                    <span className="font-medium text-foreground">{service.responseTime}ms</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Check</span>
                    <span className="font-medium text-foreground">
                      {new Date(service.lastCheck).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Database Status */}
      <Card className="bg-card border-border shadow-sm neon-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Database Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">PostgreSQL</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Connections</p>
                  <p className="font-medium text-foreground">45/100</p>
                </div>
                <StatusBadge status="ONLINE" type="system" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
