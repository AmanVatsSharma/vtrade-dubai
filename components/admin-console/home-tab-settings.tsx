/**
 * @file home-tab-settings.tsx
 * @module admin-console-home-tab-settings
 * @description Admin console component for configuring home tab widgets and stocks
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/hooks/use-toast"
import { Save, Plus, X, RefreshCw, Eye, EyeOff } from "lucide-react"
import { motion } from "framer-motion"

interface HomeTabConfig {
  tickerTapeSymbols: string[]
  chartSymbol: string
  enabledWidgets: {
    tickerTape: boolean
    chart: boolean
    heatmap: boolean
    screener: boolean
    topMovers: boolean
    sectorPerformance: boolean
    ipoEvents: boolean
    marketNews: boolean
    marketStats: boolean
  }
  defaultSectors: string[]
}

const DEFAULT_CONFIG: HomeTabConfig = {
  tickerTapeSymbols: [
    'NSE:NIFTY',
    'NSE:BANKNIFTY',
    'NSE:RELIANCE',
    'NSE:TCS',
    'NSE:HDFCBANK',
    'NSE:INFY',
    'NSE:ICICIBANK',
    'NSE:SBIN',
    'NSE:BHARTIARTL',
    'NSE:ITC',
  ],
  chartSymbol: 'NSE:NIFTY',
  enabledWidgets: {
    tickerTape: true,
    chart: true,
    heatmap: true,
    screener: false,
    topMovers: true,
    sectorPerformance: true,
    ipoEvents: true,
    marketNews: true,
    marketStats: true,
  },
  defaultSectors: ['IT', 'Banking', 'Pharma', 'Auto', 'FMCG', 'Energy'],
}

export function HomeTabSettings() {
  const [config, setConfig] = useState<HomeTabConfig>(DEFAULT_CONFIG)
  const [newSymbol, setNewSymbol] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      // Load from system settings
      const response = await fetch('/api/admin/settings?category=HOME_TAB')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.settings?.length > 0) {
          const homeTabSetting = data.settings.find((s: any) => s.key === 'home_tab_config')
          if (homeTabSetting) {
            const parsed = JSON.parse(homeTabSetting.value)
            setConfig({ ...DEFAULT_CONFIG, ...parsed })
            console.log('✅ [HOME-TAB-SETTINGS] Config loaded:', parsed)
          }
        }
      }
    } catch (error) {
      console.error('❌ [HOME-TAB-SETTINGS] Error loading config:', error)
      toast({
        title: "Error",
        description: "Failed to load configuration",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'home_tab_config',
          value: JSON.stringify(config),
          description: 'Home tab widget and stock configuration',
          category: 'HOME_TAB',
          isActive: true,
        }),
      })

      if (response.ok) {
        toast({
          title: "✅ Saved",
          description: "Home tab configuration saved successfully",
        })
        console.log('✅ [HOME-TAB-SETTINGS] Config saved:', config)
      } else {
        throw new Error('Failed to save')
      }
    } catch (error) {
      console.error('❌ [HOME-TAB-SETTINGS] Error saving config:', error)
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const addSymbol = () => {
    if (newSymbol.trim() && !config.tickerTapeSymbols.includes(newSymbol.trim())) {
      setConfig({
        ...config,
        tickerTapeSymbols: [...config.tickerTapeSymbols, newSymbol.trim()],
      })
      setNewSymbol("")
    }
  }

  const removeSymbol = (symbol: string) => {
    setConfig({
      ...config,
      tickerTapeSymbols: config.tickerTapeSymbols.filter((s) => s !== symbol),
    })
  }

  const toggleWidget = (widget: keyof HomeTabConfig['enabledWidgets']) => {
    setConfig({
      ...config,
      enabledWidgets: {
        ...config.enabledWidgets,
        [widget]: !config.enabledWidgets[widget],
      },
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Home Tab Configuration</CardTitle>
          <CardDescription>
            Configure which widgets and stocks to display on the home tab
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ticker Tape Symbols */}
          <div className="space-y-3">
            <Label>Ticker Tape Symbols (NSE/BSE)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., NSE:RELIANCE or BSE:500325"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSymbol()}
              />
              <Button onClick={addSymbol} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.tickerTapeSymbols.map((symbol) => (
                <Badge key={symbol} variant="secondary" className="flex items-center gap-1">
                  {symbol}
                  <button
                    onClick={() => removeSymbol(symbol)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Format: NSE:SYMBOL or BSE:SYMBOL (e.g., NSE:RELIANCE, BSE:500325)
            </p>
          </div>

          <Separator />

          {/* Chart Symbol */}
          <div className="space-y-2">
            <Label>Default Chart Symbol</Label>
            <Input
              value={config.chartSymbol}
              onChange={(e) => setConfig({ ...config, chartSymbol: e.target.value })}
              placeholder="NSE:NIFTY"
            />
            <p className="text-xs text-muted-foreground">
              Default symbol to show in the main chart widget
            </p>
          </div>

          <Separator />

          {/* Widget Toggles */}
          <div className="space-y-4">
            <Label>Enabled Widgets</Label>
            {Object.entries(config.enabledWidgets).map(([key, enabled]) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-2">
                  {enabled ? (
                    <Eye className="h-4 w-4 text-green-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Label className="font-normal capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </Label>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={() => toggleWidget(key as keyof HomeTabConfig['enabledWidgets'])}
                />
              </div>
            ))}
          </div>

          <Separator />

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={saveConfig} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
