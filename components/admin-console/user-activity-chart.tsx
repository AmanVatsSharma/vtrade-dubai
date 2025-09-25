"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

const activityData = [
  { day: "Mon", active: 850, new: 45 },
  { day: "Tue", active: 920, new: 52 },
  { day: "Wed", active: 780, new: 38 },
  { day: "Thu", active: 1100, new: 67 },
  { day: "Fri", active: 1250, new: 78 },
  { day: "Sat", active: 980, new: 41 },
  { day: "Sun", active: 720, new: 29 },
]

export function UserActivityChart() {
  const maxActive = Math.max(...activityData.map((d) => d.active))

  return (
    <Card className="bg-card border-border shadow-sm neon-border">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-primary flex items-center">
          <Users className="w-5 h-5 mr-2" />
          User Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end justify-between space-x-2">
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
      </CardContent>
    </Card>
  )
}
