/**
 * @file MarketDataConfig.tsx
 * @description Configuration component for market data enhancements (jitter, deviation, interpolation)
 */

"use client"

import { useState } from "react"
import { useMarketData } from "@/lib/hooks/MarketDataProvider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface MarketDataConfigProps {
  className?: string;
}

export function MarketDataConfig({ className }: MarketDataConfigProps) {
  const { config, updateConfig } = useMarketData()
  const [localConfig, setLocalConfig] = useState(config)

  const handleSave = () => {
    updateConfig(localConfig)
  }

  const handleReset = () => {
    setLocalConfig(config)
  }

  const handleJitterChange = (field: string, value: any) => {
    setLocalConfig((prev: any) => ({
      ...prev,
      jitter: {
        ...prev.jitter,
        [field]: value
      }
    }))
  }

  const handleDeviationChange = (field: string, value: any) => {
    setLocalConfig((prev: any) => ({
      ...prev,
      deviation: {
        ...prev.deviation,
        [field]: value
      }
    }))
  }

  const handleInterpolationChange = (field: string, value: any) => {
    setLocalConfig((prev: any) => ({
      ...prev,
      interpolation: {
        ...prev.interpolation,
        [field]: value
      }
    }))
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Market Data Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Jitter Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="jitter-enabled">Enable Jitter</Label>
            <Switch
              id="jitter-enabled"
              checked={localConfig.jitter.enabled}
              onCheckedChange={(checked: boolean) => handleJitterChange('enabled', checked)}
            />
          </div>
          
          {localConfig.jitter.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="jitter-interval">Jitter Interval (ms)</Label>
                <Input
                  id="jitter-interval"
                  type="number"
                  value={localConfig.jitter.interval}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJitterChange('interval', parseInt(e.target.value) || 250)}
                  min="100"
                  max="1000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="jitter-intensity">Jitter Intensity</Label>
                <Input
                  id="jitter-intensity"
                  type="number"
                  step="0.01"
                  value={localConfig.jitter.intensity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJitterChange('intensity', parseFloat(e.target.value) || 0.15)}
                  min="0"
                  max="1"
                />
                <p className="text-sm text-muted-foreground">
                  ±0.15 means ±0.15 or ±0.15% of price
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="jitter-convergence">Convergence Rate</Label>
                <Input
                  id="jitter-convergence"
                  type="number"
                  step="0.01"
                  value={localConfig.jitter.convergence}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleJitterChange('convergence', parseFloat(e.target.value) || 0.1)}
                  min="0"
                  max="1"
                />
                <p className="text-sm text-muted-foreground">
                  How fast jitter converges to real price (0-1)
                </p>
              </div>
            </>
          )}
        </div>

        {/* Deviation Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="deviation-enabled">Enable Deviation</Label>
            <Switch
              id="deviation-enabled"
              checked={localConfig.deviation.enabled}
              onCheckedChange={(checked: boolean) => handleDeviationChange('enabled', checked)}
            />
          </div>
          
          {localConfig.deviation.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="deviation-percentage">Percentage Deviation (%)</Label>
                <Input
                  id="deviation-percentage"
                  type="number"
                  step="0.1"
                  value={localConfig.deviation.percentage}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDeviationChange('percentage', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deviation-absolute">Absolute Deviation</Label>
                <Input
                  id="deviation-absolute"
                  type="number"
                  step="0.01"
                  value={localConfig.deviation.absolute}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDeviationChange('absolute', parseFloat(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </>
          )}
        </div>

        {/* Interpolation Configuration */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="interpolation-enabled">Enable Smooth Transitions</Label>
            <Switch
              id="interpolation-enabled"
              checked={localConfig.interpolation.enabled}
              onCheckedChange={(checked: boolean) => handleInterpolationChange('enabled', checked)}
            />
          </div>
          
          {localConfig.interpolation.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="interpolation-duration">Transition Duration (ms)</Label>
                <Input
                  id="interpolation-duration"
                  type="number"
                  value={localConfig.interpolation.duration}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInterpolationChange('duration', parseInt(e.target.value) || 4500)}
                  min="1000"
                  max="10000"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="interpolation-steps">Interpolation Steps</Label>
                <Input
                  id="interpolation-steps"
                  type="number"
                  value={localConfig.interpolation.steps}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInterpolationChange('steps', parseInt(e.target.value) || 50)}
                  min="10"
                  max="200"
                />
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} className="flex-1">
            Apply Changes
          </Button>
          <Button onClick={handleReset} variant="outline" className="flex-1">
            Reset
          </Button>
        </div>

        {/* Quick Presets */}
        <div className="space-y-2">
          <Label>Quick Presets</Label>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLocalConfig({
                  jitter: { enabled: true, interval: 250, intensity: 0.1, convergence: 0.15 },
                  deviation: { enabled: false, percentage: 0, absolute: 0 },
                  interpolation: { enabled: true, steps: 50, duration: 4500 }
                })
              }}
            >
              Subtle
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLocalConfig({
                  jitter: { enabled: true, interval: 200, intensity: 0.2, convergence: 0.1 },
                  deviation: { enabled: false, percentage: 0, absolute: 0 },
                  interpolation: { enabled: true, steps: 60, duration: 4000 }
                })
              }}
            >
              Active
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLocalConfig({
                  jitter: { enabled: false, interval: 250, intensity: 0.15, convergence: 0.1 },
                  deviation: { enabled: false, percentage: 0, absolute: 0 },
                  interpolation: { enabled: true, steps: 40, duration: 5000 }
                })
              }}
            >
              Smooth Only
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setLocalConfig({
                  jitter: { enabled: false, interval: 250, intensity: 0.15, convergence: 0.1 },
                  deviation: { enabled: false, percentage: 0, absolute: 0 },
                  interpolation: { enabled: false, steps: 50, duration: 4500 }
                })
              }}
            >
              Disable All
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
