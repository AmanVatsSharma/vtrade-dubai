"use client"

/**
 * Admin Console Settings Component
 * 
 * Allows admin to:
 * - Upload payment QR code
 * - Set UPI ID
 * - Configure platform settings
 * - Update profile image
 * 
 * Features:
 * - Image upload with preview
 * - Real-time validation
 * - AWS S3 integration
 * - Comprehensive error handling
 */

import { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { 
  Upload, 
  Image as ImageIcon, 
  Save, 
  Loader2, 
  CheckCircle, 
  XCircle,
  QrCode,
  CreditCard,
  Settings as SettingsIcon,
  DollarSign,
  Edit
} from "lucide-react"
import { PageHeader, RefreshButton } from "./shared"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { getMarketSession, setNSEHolidays, setMarketForceClosed } from "@/lib/hooks/market-timing"
import { HomeTabSettings } from "./home-tab-settings"

interface SystemSetting {
  id: string
  key: string
  value: string
  description: string | null
  category: string
  isActive: boolean
}

export function Settings() {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  // QR Code settings
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null)
  const [qrCodePreview, setQrCodePreview] = useState<string>("")
  
  // UPI settings
  const [upiId, setUpiId] = useState<string>("")
  
  // Profile settings
  const [profileImage, setProfileImage] = useState<string>("")
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profileImagePreview, setProfileImagePreview] = useState<string>("")
  const [adminName, setAdminName] = useState<string>("")
  const [adminEmail, setAdminEmail] = useState<string>("")

  // Market controls
  const [forceClosed, setForceClosed] = useState<boolean>(false)
  const [holidaysCsv, setHolidaysCsv] = useState<string>("")
  const [marketControlsSaving, setMarketControlsSaving] = useState<boolean>(false)
  
  // Maintenance mode settings
  const [maintenanceEnabled, setMaintenanceEnabled] = useState<boolean>(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>("")
  const [maintenanceEndTime, setMaintenanceEndTime] = useState<string>("")
  const [maintenanceAllowBypass, setMaintenanceAllowBypass] = useState<boolean>(true)
  const [maintenanceSaving, setMaintenanceSaving] = useState<boolean>(false)

  // Console feature toggles
  const [statementsEnabledGlobal, setStatementsEnabledGlobal] = useState<boolean>(true)
  const [consoleTogglesSaving, setConsoleTogglesSaving] = useState<boolean>(false)
  
  // Brokerage settings
  const [brokerageConfigs, setBrokerageConfigs] = useState<any[]>([])
  const [loadingBrokerages, setLoadingBrokerages] = useState(false)
  const [showBrokerageDialog, setShowBrokerageDialog] = useState(false)
  const [selectedBrokerageConfig, setSelectedBrokerageConfig] = useState<any>(null)
  const [brokerageForm, setBrokerageForm] = useState({
    segment: '',
    productType: '',
    brokerageFlat: null as number | null,
    brokerageRate: null as number | null,
    brokerageCap: null as number | null,
  })
  
  // File input refs
  const qrFileInputRef = useRef<HTMLInputElement>(null)
  const profileFileInputRef = useRef<HTMLInputElement>(null)

  console.log("⚙️ [SETTINGS] Component rendered")

  /**
   * Fetch brokerage configurations
   */
  const fetchBrokerageConfigs = async () => {
    console.log("💰 [SETTINGS] Fetching brokerage configs...")
    setLoadingBrokerages(true)
    try {
      const response = await fetch('/api/admin/risk/config')
      if (response.ok) {
        const data = await response.json()
        setBrokerageConfigs(data.configs || [])
        console.log("✅ [SETTINGS] Brokerage configs loaded:", data.configs?.length)
      }
    } catch (error) {
      console.error("❌ [SETTINGS] Error fetching brokerage configs:", error)
      toast({
        title: "Error",
        description: "Failed to load brokerage configurations",
        variant: "destructive"
      })
    } finally {
      setLoadingBrokerages(false)
    }
  }

  /**
   * Save brokerage configuration
   */
  const saveBrokerageConfig = async () => {
    if (!brokerageForm.segment || !brokerageForm.productType) {
      toast({
        title: "Validation Error",
        description: "Segment and Product Type are required",
        variant: "destructive"
      })
      return
    }

    setLoadingBrokerages(true)
    try {
      const url = selectedBrokerageConfig
        ? `/api/admin/risk/config/${selectedBrokerageConfig.id}`
        : '/api/admin/risk/config'
      const method = selectedBrokerageConfig ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brokerageForm)
      })

      if (response.ok) {
        toast({
          title: "✅ Success",
          description: selectedBrokerageConfig ? "Brokerage updated" : "Brokerage created",
        })
        setShowBrokerageDialog(false)
        setSelectedBrokerageConfig(null)
        setBrokerageForm({
          segment: '',
          productType: '',
          brokerageFlat: null,
          brokerageRate: null,
          brokerageCap: null,
        })
        fetchBrokerageConfigs()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save brokerage')
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save brokerage configuration",
        variant: "destructive"
      })
    } finally {
      setLoadingBrokerages(false)
    }
  }

  /**
   * Fetch current settings
   */
  const fetchSettings = async () => {
    console.log("📥 [SETTINGS] Fetching current settings...")
    setRefreshing(true)

    try {
      const response = await fetch('/api/admin/settings')
      const data = await response.json()

      if (data.success && data.settings) {
        console.log(`✅ [SETTINGS] Loaded ${data.settings.length} settings`)
        
        // Parse settings
        data.settings.forEach((setting: SystemSetting) => {
          console.log("📋 [SETTINGS] Setting:", setting.key, setting.value.substring(0, 50))
          
          if (setting.key === 'payment_qr_code') {
            setQrCodeUrl(setting.value)
            setQrCodePreview(setting.value)
          } else if (setting.key === 'payment_upi_id') {
            setUpiId(setting.value)
          } else if (setting.key === 'market_force_closed') {
            const forceClosedValue = setting.value === 'true'
            setForceClosed(forceClosedValue)
            // Update the market timing cache
            setMarketForceClosed(forceClosedValue)
          } else if (setting.key === 'market_holidays_csv') {
            setHolidaysCsv(setting.value)
            try {
              const parsed = setting.value
                .split(/[,\n\r]+/)
                .map(s => s.trim())
                .filter(Boolean)
              setNSEHolidays(parsed)
            } catch (e) {
              console.warn('[SETTINGS] Failed to apply holidays from settings', e)
            }
          } else if (setting.key === 'maintenance_mode_enabled') {
            setMaintenanceEnabled(setting.value === 'true')
          } else if (setting.key === 'maintenance_message') {
            setMaintenanceMessage(setting.value)
          } else if (setting.key === 'maintenance_end_time') {
            setMaintenanceEndTime(setting.value)
          } else if (setting.key === 'maintenance_allow_admin_bypass') {
            setMaintenanceAllowBypass(setting.value !== 'false')
          } else if (setting.key === 'console_statements_enabled_global') {
            setStatementsEnabledGlobal(setting.value !== 'false')
          }
        })
      }
    } catch (error: any) {
      console.error("❌ [SETTINGS] Error fetching settings:", error)
      toast({
        title: "❌ Error",
        description: "Failed to load settings",
        variant: "destructive"
      })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSettings()
    fetchMaintenanceSettings()
    fetchBrokerageConfigs()
  }, [])

  /**
   * Handle QR code file selection
   */
  const handleQrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("📁 [SETTINGS] QR file selected")
    const file = e.target.files?.[0]
    
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "❌ Invalid File",
        description: "Please select an image file",
        variant: "destructive"
      })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "❌ File Too Large",
        description: "Maximum file size is 5MB",
        variant: "destructive"
      })
      return
    }

    console.log("✅ [SETTINGS] QR file validated:", file.name)
    setQrCodeFile(file)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setQrCodePreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  /**
   * Upload QR code to S3
   */
  const uploadQrCode = async (): Promise<string | null> => {
    if (!qrCodeFile) return null

    console.log("📤 [SETTINGS] Uploading QR code to S3...")

    try {
      const formData = new FormData()
      formData.append('file', qrCodeFile)
      formData.append('folder', 'payment-qr-codes')
      formData.append('isPublic', 'true') // Make QR code publicly accessible

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Upload failed')
      }

      console.log("✅ [SETTINGS] QR code uploaded:", data.url)
      return data.url

    } catch (error: any) {
      console.error("❌ [SETTINGS] Upload failed:", error)
      toast({
        title: "❌ Upload Failed",
        description: error.message,
        variant: "destructive"
      })
      return null
    }
  }

  /**
   * Save payment settings
   */
  const savePaymentSettings = async () => {
    console.log("💾 [SETTINGS] Saving payment settings...")
    setSaving(true)

    try {
      let finalQrCodeUrl = qrCodeUrl

      // Upload new QR code if selected
      if (qrCodeFile) {
        const uploadedUrl = await uploadQrCode()
        if (!uploadedUrl) {
          setSaving(false)
          return
        }
        finalQrCodeUrl = uploadedUrl
      }

      // Validate UPI ID
      if (!upiId) {
        toast({
          title: "⚠️ Validation Error",
          description: "UPI ID is required",
          variant: "destructive"
        })
        setSaving(false)
        return
      }

      console.log("📡 [SETTINGS] Saving settings to database...")

      // Save QR code URL
      if (finalQrCodeUrl) {
        const qrResponse = await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: 'payment_qr_code',
            value: finalQrCodeUrl,
            description: 'Payment QR Code for deposits',
            category: 'PAYMENT'
          })
        })

        if (!qrResponse.ok) {
          throw new Error('Failed to save QR code')
        }
      }

      // Save UPI ID
      const upiResponse = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'payment_upi_id',
          value: upiId,
          description: 'UPI ID for payments',
          category: 'PAYMENT'
        })
      })

      if (!upiResponse.ok) {
        throw new Error('Failed to save UPI ID')
      }

      console.log("✅ [SETTINGS] Payment settings saved successfully!")

      toast({
        title: "✅ Settings Saved",
        description: "Payment settings updated successfully"
      })

      // Reset file input
      setQrCodeFile(null)
      setQrCodeUrl(finalQrCodeUrl)
      
      // Refresh settings
      await fetchSettings()

    } catch (error: any) {
      console.error("❌ [SETTINGS] Save failed:", error)
      toast({
        title: "❌ Save Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  /**
   * Fetch maintenance settings
   */
  const fetchMaintenanceSettings = async () => {
    console.log("📥 [SETTINGS] Fetching maintenance settings...")
    try {
      const response = await fetch('/api/admin/settings?category=MAINTENANCE')
      const data = await response.json()

      if (data.success && data.settings) {
        console.log(`✅ [SETTINGS] Loaded ${data.settings.length} maintenance settings`)
        
        data.settings.forEach((setting: SystemSetting) => {
          if (setting.key === 'maintenance_mode_enabled') {
            setMaintenanceEnabled(setting.value === 'true')
          } else if (setting.key === 'maintenance_message') {
            setMaintenanceMessage(setting.value)
          } else if (setting.key === 'maintenance_end_time') {
            setMaintenanceEndTime(setting.value)
          } else if (setting.key === 'maintenance_allow_admin_bypass') {
            setMaintenanceAllowBypass(setting.value !== 'false')
          }
        })
      }
    } catch (error: any) {
      console.error("❌ [SETTINGS] Error fetching maintenance settings:", error)
    }
  }

  /**
   * Save maintenance settings
   */
  const saveMaintenanceSettings = async () => {
    console.log("💾 [SETTINGS] Saving maintenance settings...", {
      enabled: maintenanceEnabled,
      hasMessage: !!maintenanceMessage,
      endTime: maintenanceEndTime,
      allowBypass: maintenanceAllowBypass
    })
    setMaintenanceSaving(true)
    try {
      const response = await fetch('/api/maintenance/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: maintenanceEnabled,
          message: maintenanceMessage || undefined,
          endTime: maintenanceEndTime || undefined,
          allowAdminBypass: maintenanceAllowBypass
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save maintenance settings')
      }

      console.log("✅ [SETTINGS] Maintenance settings saved successfully")
      toast({
        title: "✅ Saved",
        description: "Maintenance mode settings updated successfully"
      })

      // Refresh settings
      await fetchMaintenanceSettings()
    } catch (error: any) {
      console.error("❌ [SETTINGS] Save maintenance settings failed:", error)
      toast({
        title: "❌ Save Failed",
        description: error.message || "Unable to save maintenance settings",
        variant: "destructive"
      })
    } finally {
      setMaintenanceSaving(false)
    }
  }

  /**
   * Save console feature toggles
   */
  const saveConsoleToggles = async () => {
    console.log("💾 [SETTINGS] Saving console toggles...", { statementsEnabledGlobal })
    setConsoleTogglesSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "console_statements_enabled_global",
          value: String(statementsEnabledGlobal),
          description: "App-wide toggle for end-user statements UI (dashboard + console)",
          category: "CONSOLE",
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || "Failed to save console settings")
      }

      toast({
        title: "✅ Saved",
        description: "Console feature toggles updated successfully",
      })
      await fetchSettings()
    } catch (e: any) {
      console.error("❌ [SETTINGS] Save console toggles failed", e)
      toast({
        title: "❌ Save Failed",
        description: e?.message || "Unable to save console feature toggles",
        variant: "destructive",
      })
    } finally {
      setConsoleTogglesSaving(false)
    }
  }

  /**
   * Save market controls
   */
  const saveMarketControls = async () => {
    console.log("💾 [SETTINGS] Saving market controls...", { forceClosed, holidaysCsv })
    setMarketControlsSaving(true)
    try {
      // Persist force closed toggle
      const r1 = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'market_force_closed', value: String(forceClosed), category: 'MARKET' })
      })
      if (!r1.ok) throw new Error('Failed to save market_force_closed')

      // Persist holidays
      const normalized = holidaysCsv
        .split(/[\n,\r]+/)
        .map(s => s.trim())
        .filter(Boolean)
        .join(',')
      const r2 = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'market_holidays_csv', value: normalized, category: 'MARKET' })
      })
      if (!r2.ok) throw new Error('Failed to save market_holidays_csv')

      // Apply to runtime helper immediately
      try { 
        setNSEHolidays(normalized.split(',').filter(Boolean))
        setMarketForceClosed(forceClosed)
      } catch {}

      toast({ title: '✅ Saved', description: 'Market controls updated successfully' })
    } catch (e: any) {
      console.error('❌ [SETTINGS] Save market controls failed', e)
      toast({ title: '❌ Save Failed', description: e?.message || 'Unable to save market controls', variant: 'destructive' })
    } finally {
      setMarketControlsSaving(false)
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <PageHeader
        title="Settings"
        description="Configure platform settings and payment options"
        icon={<SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />}
        actions={<RefreshButton onClick={fetchSettings} loading={refreshing} />}
      />

      {/* Settings Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs defaultValue="payment" className="space-y-3 sm:space-y-4 md:space-y-6">
          <TabsList className="bg-muted/50 w-full sm:w-auto flex flex-col sm:flex-row">
            <TabsTrigger value="payment" className="text-xs sm:text-sm w-full sm:w-auto">
              <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Payment Settings</span>
              <span className="sm:hidden">Payment</span>
            </TabsTrigger>
            <TabsTrigger value="brokerage" className="text-xs sm:text-sm w-full sm:w-auto">
              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Brokerage
            </TabsTrigger>
            <TabsTrigger value="general" className="text-xs sm:text-sm w-full sm:w-auto">
              <SettingsIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="market" className="text-xs sm:text-sm w-full sm:w-auto">
              <SettingsIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Market Controls</span>
              <span className="sm:hidden">Market</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="text-xs sm:text-sm w-full sm:w-auto">
              <SettingsIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Maintenance Mode</span>
              <span className="sm:hidden">Maintenance</span>
            </TabsTrigger>
            <TabsTrigger value="home-tab" className="text-xs sm:text-sm w-full sm:w-auto">
              <SettingsIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Home Tab</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
          </TabsList>

          {/* Payment Settings Tab */}
          <TabsContent value="payment">
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-lg sm:text-xl font-bold text-primary">Payment Configuration</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Configure payment QR code and UPI ID for deposit requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-3 sm:pb-6">
                {/* QR Code Upload */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="qrCode" className="text-foreground font-medium">
                      Payment QR Code
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload QR code image that users will see when making deposits
                    </p>
                  </div>

                  {/* QR Code Preview */}
                  {qrCodePreview && (
                    <div className="relative w-64 h-64 border-2 border-primary/30 rounded-lg overflow-hidden">
                      <img
                        src={qrCodePreview}
                        alt="Payment QR Code"
                        className="w-full h-full object-contain p-4"
                      />
                    </div>
                  )}

                  {/* Upload Button */}
                  <div>
                    <input
                      ref={qrFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleQrFileChange}
                      className="hidden"
                      id="qrCodeInput"
                    />
                    <Button
                      onClick={() => qrFileInputRef.current?.click()}
                      variant="outline"
                      className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {qrCodeFile ? 'Change QR Code' : 'Upload QR Code'}
                    </Button>
                    {qrCodeFile && (
                      <p className="text-sm text-green-400 mt-2">
                        ✓ {qrCodeFile.name} selected
                      </p>
                    )}
                  </div>
                </div>

                {/* UPI ID */}
                <div className="space-y-2">
                  <Label htmlFor="upiId" className="text-foreground font-medium">
                    UPI ID
                  </Label>
                  <Input
                    id="upiId"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="example@upi"
                    className="bg-muted/50 border-border focus:border-primary"
                  />
                  <p className="text-sm text-muted-foreground">
                    This UPI ID will be displayed to users for payments
                  </p>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={savePaymentSettings}
                    disabled={saving || (!qrCodeFile && !qrCodeUrl && !upiId)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brokerage Settings Tab */}
          <TabsContent value="brokerage">
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl font-bold text-primary break-words">Platform Brokerage Configuration</CardTitle>
                    <CardDescription className="text-xs sm:text-sm break-words">
                      Manage brokerage rates by segment and product type. Changes apply to all new orders.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <RefreshButton onClick={fetchBrokerageConfigs} loading={loadingBrokerages} size="sm" />
                    <Dialog open={showBrokerageDialog} onOpenChange={setShowBrokerageDialog}>
                      <DialogTrigger asChild>
                        <Button 
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => {
                            setSelectedBrokerageConfig(null)
                            setBrokerageForm({
                              segment: '',
                              productType: '',
                              brokerageFlat: null,
                              brokerageRate: null,
                              brokerageCap: null,
                            })
                          }}
                        >
                          <DollarSign className="w-4 h-4 mr-2" />
                          Add Brokerage Config
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            {selectedBrokerageConfig ? 'Edit Brokerage Configuration' : 'Create Brokerage Configuration'}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Segment *</Label>
                            <Select
                              value={brokerageForm.segment}
                              onValueChange={(value) => setBrokerageForm({ ...brokerageForm, segment: value })}
                              disabled={!!selectedBrokerageConfig}
                            >
                              <SelectTrigger className="bg-background border-border">
                                <SelectValue placeholder="Select segment" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NSE">NSE (Equity)</SelectItem>
                                <SelectItem value="NFO">NFO (F&O)</SelectItem>
                                <SelectItem value="MCX">MCX (Commodity)</SelectItem>
                                <SelectItem value="BSE">BSE</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Product Type *</Label>
                            <Select
                              value={brokerageForm.productType}
                              onValueChange={(value) => setBrokerageForm({ ...brokerageForm, productType: value })}
                              disabled={!!selectedBrokerageConfig}
                            >
                              <SelectTrigger className="bg-background border-border">
                                <SelectValue placeholder="Select product type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MIS">MIS (Intraday)</SelectItem>
                                <SelectItem value="CNC">CNC (Delivery)</SelectItem>
                                <SelectItem value="NRML">NRML (Carry Forward)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <p className="text-xs text-blue-500/80 mb-2 font-medium">Brokerage Type:</p>
                            <p className="text-xs text-blue-500/60">
                              Choose either Flat (fixed amount) OR Rate (percentage). If both are set, Flat takes priority.
                            </p>
                          </div>
                          <div>
                            <Label>Brokerage Flat (₹)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={brokerageForm.brokerageFlat || ''}
                              onChange={(e) => {
                                const value = e.target.value ? parseFloat(e.target.value) : null
                                setBrokerageForm({ ...brokerageForm, brokerageFlat: value })
                              }}
                              placeholder="e.g., 20 for ₹20 flat per order"
                              className="bg-background border-border"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Fixed brokerage amount per order</p>
                          </div>
                          <div>
                            <Label>Brokerage Rate (%)</Label>
                            <Input
                              type="number"
                              step="0.0001"
                              min="0"
                              max="100"
                              value={brokerageForm.brokerageRate || ''}
                              onChange={(e) => {
                                const value = e.target.value ? parseFloat(e.target.value) : null
                                setBrokerageForm({ ...brokerageForm, brokerageRate: value })
                              }}
                              placeholder="e.g., 0.03 for 0.03% of turnover"
                              className="bg-background border-border"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Percentage of order turnover (e.g., 0.03 = 0.03%)</p>
                          </div>
                          <div>
                            <Label>Brokerage Cap (₹)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={brokerageForm.brokerageCap || ''}
                              onChange={(e) => {
                                const value = e.target.value ? parseFloat(e.target.value) : null
                                setBrokerageForm({ ...brokerageForm, brokerageCap: value })
                              }}
                              placeholder="e.g., 20 for maximum ₹20"
                              className="bg-background border-border"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Maximum brokerage when using rate-based calculation</p>
                          </div>
                          <Button 
                            onClick={saveBrokerageConfig} 
                            disabled={loadingBrokerages || !brokerageForm.segment || !brokerageForm.productType}
                            className="w-full bg-primary hover:bg-primary/90"
                          >
                            {loadingBrokerages ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                {selectedBrokerageConfig ? 'Update Configuration' : 'Create Configuration'}
                              </>
                            )}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingBrokerages ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading brokerage configurations...
                  </div>
                ) : brokerageConfigs.length === 0 ? (
                  <Alert className="bg-yellow-500/10 border-yellow-500/50">
                    <DollarSign className="h-4 w-4 text-yellow-500" />
                    <AlertTitle className="text-yellow-500">No Brokerage Configurations</AlertTitle>
                    <AlertDescription className="text-yellow-500/80">
                      No brokerage configurations found. Create one to set platform-wide brokerage rates.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border">
                          <TableHead>Segment</TableHead>
                          <TableHead>Product Type</TableHead>
                          <TableHead>Brokerage Type</TableHead>
                          <TableHead>Brokerage Value</TableHead>
                          <TableHead>Cap</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Updated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {brokerageConfigs.map((config) => (
                          <TableRow key={config.id} className="border-border">
                            <TableCell className="font-medium text-foreground">{config.segment}</TableCell>
                            <TableCell>{config.productType}</TableCell>
                            <TableCell>
                              {config.brokerageFlat ? (
                                <Badge className="bg-blue-400/20 text-blue-400 border-blue-400/30">Flat</Badge>
                              ) : config.brokerageRate ? (
                                <Badge className="bg-green-400/20 text-green-400 border-green-400/30">Rate</Badge>
                              ) : (
                                <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">Default</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {config.brokerageFlat ? (
                                <span className="font-mono">₹{config.brokerageFlat.toFixed(2)}</span>
                              ) : config.brokerageRate ? (
                                <span className="font-mono">{config.brokerageRate.toFixed(4)}%</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {config.brokerageCap ? (
                                <span className="font-mono">₹{config.brokerageCap.toFixed(2)}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {config.active ? (
                                <Badge className="bg-green-400/20 text-green-400 border-green-400/30">Active</Badge>
                              ) : (
                                <Badge className="bg-gray-400/20 text-gray-400 border-gray-400/30">Inactive</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(config.updatedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedBrokerageConfig(config)
                                  setBrokerageForm({
                                    segment: config.segment,
                                    productType: config.productType,
                                    brokerageFlat: config.brokerageFlat,
                                    brokerageRate: config.brokerageRate,
                                    brokerageCap: config.brokerageCap,
                                  })
                                  setShowBrokerageDialog(true)
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Settings Tab */}
          <TabsContent value="general">
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-lg sm:text-xl font-bold text-primary">General Settings</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Platform-wide configuration options
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 space-y-4">
                {/* Statements toggle */}
                <div className="flex items-center justify-between p-4 rounded-md bg-muted/50 border border-border">
                  <div className="space-y-1">
                    <Label className="text-foreground font-medium">Enable Statements (app-wide)</Label>
                    <p className="text-xs text-muted-foreground">
                      When disabled, end users will not see statement sections in dashboard or console.
                    </p>
                  </div>
                  <Switch checked={statementsEnabledGlobal} onCheckedChange={setStatementsEnabledGlobal} />
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveConsoleToggles} disabled={consoleTogglesSaving} className="bg-primary text-primary-foreground">
                    {consoleTogglesSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>Save Settings</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Market Controls Tab */}
          <TabsContent value="market">
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-lg sm:text-xl font-bold text-primary">Market Controls (IST)</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Manually toggle market closed and manage NSE holidays (YYYY-MM-DD). Affects order placement and live prices.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-3 sm:pb-6">
                {/* Current Session Indicator */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 p-2 sm:p-3 rounded-md bg-muted/50">
                  <div className="text-sm">
                    Current session: <span className="font-semibold">{getMarketSession()}</span>
                  </div>
                </div>

                {/* Force Closed Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground font-medium">Force Market Closed</Label>
                    <p className="text-xs text-muted-foreground">Overrides normal hours; blocks orders and live polling.</p>
                  </div>
                  <Switch checked={forceClosed} onCheckedChange={setForceClosed} />
                </div>

                {/* Holidays textarea */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">NSE Holidays (YYYY-MM-DD, comma or newline separated)</Label>
                  <textarea
                    value={holidaysCsv}
                    onChange={(e) => setHolidaysCsv(e.target.value)}
                    className="w-full min-h-[120px] text-sm p-3 rounded-md border bg-muted/50"
                    placeholder="2025-01-26, 2025-03-14\n2025-08-15"
                  />
                  <p className="text-xs text-muted-foreground">Applied instantly to market session calculations.</p>
                </div>

                <div className="flex justify-end">
                  <Button onClick={saveMarketControls} disabled={marketControlsSaving} className="bg-primary text-primary-foreground">
                    {marketControlsSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>) : (<>Save Controls</>)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Mode Tab */}
          <TabsContent value="maintenance">
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-lg sm:text-xl font-bold text-primary">Maintenance Mode</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Control platform maintenance mode. When enabled, all users except admins will see the maintenance page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 px-3 sm:px-6 pb-3 sm:pb-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
                  <div>
                    <Label className="text-foreground font-medium text-lg">Enable Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      When enabled, all non-admin users will be redirected to the maintenance page
                    </p>
                  </div>
                  <Switch 
                    checked={maintenanceEnabled} 
                    onCheckedChange={setMaintenanceEnabled}
                    className="data-[state=checked]:bg-orange-500"
                  />
                </div>

                {/* Maintenance Message */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Maintenance Message</Label>
                  <textarea
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    className="w-full min-h-[100px] text-sm p-3 rounded-md border bg-muted/50 border-border focus:border-primary"
                    placeholder="We're performing scheduled maintenance to improve your experience. We'll be back shortly!"
                  />
                  <p className="text-xs text-muted-foreground">
                    This message will be displayed to users during maintenance
                  </p>
                </div>

                {/* End Time */}
                <div className="space-y-2">
                  <Label className="text-foreground font-medium">Expected End Time</Label>
                  <Input
                    value={maintenanceEndTime}
                    onChange={(e) => setMaintenanceEndTime(e.target.value)}
                    placeholder="2025-01-27T18:00:00Z or '24Hrs'"
                    className="bg-muted/50 border-border focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground">
                    ISO timestamp or descriptive text (e.g., "24Hrs", "2 hours")
                  </p>
                </div>

                {/* Admin Bypass Toggle */}
                <div className="flex items-center justify-between p-4 rounded-md bg-muted/50">
                  <div>
                    <Label className="text-foreground font-medium">Allow Admin Bypass</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Allow ADMIN and SUPER_ADMIN users to access the platform during maintenance
                    </p>
                  </div>
                  <Switch 
                    checked={maintenanceAllowBypass} 
                    onCheckedChange={setMaintenanceAllowBypass}
                  />
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <Button
                    onClick={saveMaintenanceSettings}
                    disabled={maintenanceSaving}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {maintenanceSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Maintenance Settings
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Home Tab Settings Tab */}
          <TabsContent value="home-tab">
            <HomeTabSettings />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}