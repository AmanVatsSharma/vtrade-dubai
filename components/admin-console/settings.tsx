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
  RefreshCw,
  QrCode,
  CreditCard,
  Settings as SettingsIcon
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Image from "next/image"

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
  
  // File input refs
  const qrFileInputRef = useRef<HTMLInputElement>(null)
  const profileFileInputRef = useRef<HTMLInputElement>(null)

  console.log("⚙️ [SETTINGS] Component rendered")

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Configure platform settings and payment options
            </p>
          </div>
          <Button
            onClick={fetchSettings}
            variant="outline"
            size="sm"
            disabled={refreshing}
            className="border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Settings Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Tabs defaultValue="payment" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="payment">
              <CreditCard className="w-4 h-4 mr-2" />
              Payment Settings
            </TabsTrigger>
            <TabsTrigger value="general">
              <SettingsIcon className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
          </TabsList>

          {/* Payment Settings Tab */}
          <TabsContent value="payment">
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-primary">Payment Configuration</CardTitle>
                <CardDescription>
                  Configure payment QR code and UPI ID for deposit requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      <Image 
                        src={qrCodePreview} 
                        alt="Payment QR Code" 
                        fill
                        className="object-contain p-4"
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

          {/* General Settings Tab */}
          <TabsContent value="general">
            <Card className="bg-card border-border shadow-sm neon-border">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-primary">General Settings</CardTitle>
                <CardDescription>
                  Platform-wide configuration options
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert className="bg-blue-500/10 border-blue-500/50">
                  <SettingsIcon className="h-4 w-4 text-blue-500" />
                  <AlertTitle className="text-blue-500">Coming Soon</AlertTitle>
                  <AlertDescription className="text-blue-500/80">
                    Additional settings will be available in the next update
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}