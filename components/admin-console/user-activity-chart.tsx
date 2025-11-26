"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

interface ActivityDataPoint {
  day: string
  date: string
  active: number
  new: number
}

// Mock data as fallback
const mockActivityData: ActivityDataPoint[] = [
  { day: "Mon", date: "2025-01-20", active: 850, new: 45 },
  { day: "Tue", date: "2025-01-21", active: 920, new: 52 },
  { day: "Wed", date: "2025-01-22", active: 780, new: 38 },
  { day: "Thu", date: "2025-01-23", active: 1100, new: 67 },
  { day: "Fri", date: "2025-01-24", active: 1250, new: 78 },
  { day: "Sat", date: "2025-01-25", active: 980, new: 41 },
  { day: "Sun", date: "2025-01-26", active: 720, new: 29 },
]

export function UserActivityChart() {
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>(mockActivityData)
  const [loading, setLoading] = useState(true)
  const [isUsingMockData, setIsUsingMockData] = useState(true)

  const fetchActivityData = async () => {
    console.log("👥 [USER-ACTIVITY-CHART] Fetching real activity data...")
    setLoading(true)

    try {
      const response = await fetch('/api/admin/charts/activity?days=7').catch(e => {
        console.error("❌ [USER-ACTIVITY-CHART] API failed:", e)
        return null
      })

      if (response && response.ok) {
        const data = await response.json()
        console.log("✅ [USER-ACTIVITY-CHART] Activity data received:", data)

        if (data.success && data.chartData && data.chartData.length > 0) {
          setActivityData(data.chartData)
          setIsUsingMockData(false)
          console.log("✅ [USER-ACTIVITY-CHART] Real activity data loaded!")
        } else {
          setIsUsingMockData(true)
        }
      } else {
        setIsUsingMockData(true)
      }
    } catch (error) {
      console.error("❌ [USER-ACTIVITY-CHART] Error fetching data:", error)
      setIsUsingMockData(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivityData()
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchActivityData, 300000)
    return () => clearInterval(interval)
  }, [])

  const maxActive = Math.max(...activityData.map((d) => d.active), 1)

  return (
    <Card className="bg-card border-border shadow-sm neon-border">
      <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 flex flex-row items-center justify-between">
        <CardTitle className="text-base sm:text-lg font-bold text-primary flex items-center">
          <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
          <span className="truncate">User Activity</span>
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchActivityData}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="h-48 sm:h-56 md:h-64 flex items-end justify-between space-x-1 sm:space-x-2 overflow-x-auto">
          {activityData.map((data, index) => (
            <div key={data.day} className="flex-1 flex flex-col items-center space-y-2">
              {/* Active Users Bar */}
              <motion.div
                className="w-full bg-primary/20 rounded-t-lg relative overflow-hidden"
                style={{ height: `${(data.active / maxActive) * 180}px` }}
                initial={{ height: 0 }}
                animate={{ height: `${(data.active / maxActive) * 180}px` }}
                transition={{ duration: 1, delay: index * 0.1 }}
              >
                <motion.div
                  className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-lg"
                  initial={{ height: 0 }}
                  animate={{ height: "100%" }}
                  transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                />

                {/* New Users Indicator */}
                <motion.div
                  className="absolute top-0 left-0 right-0 bg-green-400 rounded-t-lg"
                  style={{ height: `${(data.new / data.active) * 100}%` }}
                  initial={{ height: 0 }}
                  animate={{ height: `${(data.new / data.active) * 100}%` }}
                  transition={{ duration: 0.6, delay: index * 0.1 + 0.4 }}
                />
              </motion.div>

              {/* Day Label */}
              <span className="text-xs text-muted-foreground font-medium">{data.day}</span>

              {/* Values */}
              <div className="text-center">
                <p className="text-xs font-bold text-primary">{data.active}</p>
                <p className="text-xs text-green-400">+{data.new}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-4 pt-4 border-t border-border">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary rounded"></div>
            <span className="text-xs text-muted-foreground">Active Users</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-400 rounded"></div>
            <span className="text-xs text-muted-foreground">New Users</span>
          </div>
        </div>
        {isUsingMockData && (
          <p className="text-xs text-yellow-400 text-center mt-2">⚠️ Using sample data</p>
        )}
      </CardContent>
    </Card>
  )
}
