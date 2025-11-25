/**
 * @file edit-user-dialog.tsx
 * @module admin-console
 * @description Comprehensive user editing dialog with full profile management
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/hooks/use-toast"
import { User, Mail, Phone, Shield, Key, Save, X, CheckCircle, AlertCircle, TrendingUp, UserCheck } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: any
  onUserUpdated?: () => void
}

export function EditUserDialog({ open, onOpenChange, user, onUserUpdated }: EditUserDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "USER" as string,
    isActive: true,
    clientId: "",
    bio: ""
  })
  const [originalData, setOriginalData] = useState<any>(null)
  const [riskLimit, setRiskLimit] = useState<any>(null)
  const [baseConfigs, setBaseConfigs] = useState<any[]>([])
  const [leverageMultiplier, setLeverageMultiplier] = useState<number | null>(null)
  const [loadingRiskLimit, setLoadingRiskLimit] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [rms, setRms] = useState<any[]>([])
  const [selectedRMId, setSelectedRMId] = useState<string | null>(null)
  const [loadingRMs, setLoadingRMs] = useState(false)
  const [currentRMId, setCurrentRMId] = useState<string | null>(null)

  // Load current user role and user data when dialog opens
  useEffect(() => {
    // Get current user role from localStorage
    const storedRole = window.localStorage.getItem('session_user_role')
    setCurrentUserRole(storedRole)
    console.log("🔐 [EDIT-USER-DIALOG] Current user role:", storedRole)

    if (open && user) {
      console.log("📝 [EDIT-USER-DIALOG] Loading user data:", user)
      const data = {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "USER",
        isActive: user.isActive !== undefined ? user.isActive : (user.status === 'active'),
        clientId: user.clientId || "",
        bio: user.bio || ""
      }
      setFormData(data)
      setOriginalData(data)
      
      // Load risk limit data
      loadRiskLimit()
      
      // Load RM assignment data
      loadRMData()
    }
  }, [open, user])

  const loadRMData = async () => {
    if (!user?.id) return
    
    setLoadingRMs(true)
    try {
      // Fetch current user's RM assignment
      const userResponse = await fetch(`/api/admin/users/${user.id}`)
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setCurrentRMId(userData.user?.managedById || null)
        setSelectedRMId(userData.user?.managedById || null)
      }
      
      // Fetch all RMs for selection
      const rmsResponse = await fetch('/api/admin/rms')
      if (rmsResponse.ok) {
        const rmsData = await rmsResponse.json()
        setRms(rmsData.rms || [])
      }
    } catch (error) {
      console.error("❌ [EDIT-USER-DIALOG] Error loading RM data:", error)
    } finally {
      setLoadingRMs(false)
    }
  }

  const handleAssignRM = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/assign-rm`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rmId: selectedRMId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to assign RM")
      }

      toast({
        title: "✅ Success",
        description: selectedRMId ? "RM assigned successfully" : "RM unassigned successfully",
      })

      setCurrentRMId(selectedRMId)
      if (onUserUpdated) {
        onUserUpdated()
      }
    } catch (error: any) {
      console.error("❌ [EDIT-USER-DIALOG] Error assigning RM:", error)
      toast({
        title: "❌ Error",
        description: error.message || "Failed to assign RM",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const loadRiskLimit = async () => {
    if (!user?.id) return
    
    setLoadingRiskLimit(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/risk-limit`)
      if (response.ok) {
        const data = await response.json()
        console.log("📊 [EDIT-USER-DIALOG] Risk limit loaded:", data)
        setRiskLimit(data.riskLimit)
        setBaseConfigs(data.baseConfigs || [])
        
        // Calculate multiplier if risk limit exists
        if (data.riskLimit && data.baseConfigs?.length > 0) {
          const avgBaseLeverage = data.baseConfigs.reduce((sum: number, c: any) => sum + c.leverage, 0) / data.baseConfigs.length
          const multiplier = data.riskLimit.maxLeverage / avgBaseLeverage
          setLeverageMultiplier(multiplier)
          console.log("📊 [EDIT-USER-DIALOG] Calculated multiplier:", { avgBaseLeverage, maxLeverage: data.riskLimit.maxLeverage, multiplier })
        }
      }
    } catch (error) {
      console.error("❌ [EDIT-USER-DIALOG] Error loading risk limit:", error)
    } finally {
      setLoadingRiskLimit(false)
    }
  }

  const hasChanges = () => {
    if (!originalData) return false
    return JSON.stringify(formData) !== JSON.stringify(originalData)
  }

  const handleSave = async () => {
    if (!hasChanges()) {
      toast({
        title: "No Changes",
        description: "No changes detected",
        variant: "default"
      })
      return
    }

    setLoading(true)
    console.log("💾 [EDIT-USER-DIALOG] Saving user changes:", formData)

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update user")
      }

      const result = await response.json()
      console.log("✅ [EDIT-USER-DIALOG] User updated successfully:", result)

      toast({
        title: "✅ Success",
        description: "User profile updated successfully",
      })

      if (onUserUpdated) {
        onUserUpdated()
      }

      onOpenChange(false)
    } catch (error: any) {
      console.error("❌ [EDIT-USER-DIALOG] Error updating user:", error)
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update user",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async () => {
    const newPassword = prompt("Enter new password (min 6 characters):")
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      })

      if (!response.ok) throw new Error("Failed to reset password")

      toast({
        title: "✅ Password Reset",
        description: "User password has been reset successfully",
      })
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to reset password",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResetMPIN = async () => {
    const newMPIN = prompt("Enter new MPIN (4 digits):")
    if (!newMPIN || !/^\d{4}$/.test(newMPIN)) {
      toast({
        title: "Invalid MPIN",
        description: "MPIN must be exactly 4 digits",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-mpin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mpin: newMPIN })
      })

      if (!response.ok) throw new Error("Failed to reset MPIN")

      toast({
        title: "✅ MPIN Reset",
        description: "User MPIN has been reset successfully",
      })
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to reset MPIN",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveLeverageOverride = async () => {
    if (leverageMultiplier === null || leverageMultiplier < 0.1) {
      toast({
        title: "Invalid Multiplier",
        description: "Leverage multiplier must be at least 0.1x",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/users/${user.id}/risk-limit`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leverageMultiplier,
          maxDailyLoss: riskLimit?.maxDailyLoss || 0,
          maxPositionSize: riskLimit?.maxPositionSize || 0,
          maxDailyTrades: riskLimit?.maxDailyTrades || 0
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update leverage override")
      }

      const result = await response.json()
      console.log("✅ [EDIT-USER-DIALOG] Leverage override updated:", result)

      toast({
        title: "✅ Success",
        description: `Leverage override set to ${leverageMultiplier}x of base`,
      })

      // Reload risk limit to get updated values
      loadRiskLimit()
    } catch (error: any) {
      console.error("❌ [EDIT-USER-DIALOG] Error updating leverage override:", error)
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update leverage override",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Edit User Profile</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update user information and manage account settings
          </DialogDescription>
        </DialogHeader>

        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* User Info Section */}
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-background border-border"
                  placeholder="Enter full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-background border-border"
                  placeholder="Enter email address"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-background border-border"
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientId" className="text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Client ID
                </Label>
                <Input
                  id="clientId"
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="bg-background border-border font-mono"
                  placeholder="Enter client ID"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-foreground">Role</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={(value) => {
                      // Security check: Only SUPER_ADMIN can assign ADMIN/SUPER_ADMIN roles
                      if ((value === 'ADMIN' || value === 'SUPER_ADMIN') && currentUserRole !== 'SUPER_ADMIN') {
                        toast({
                          title: "⚠️ Security Restriction",
                          description: "Only Super Admins can assign Admin or Super Admin roles",
                          variant: "destructive"
                        })
                        return
                      }
                      setFormData({ ...formData, role: value })
                    }}
                    disabled={currentUserRole !== 'SUPER_ADMIN' && (formData.role === 'ADMIN' || formData.role === 'SUPER_ADMIN')}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="MODERATOR">Moderator</SelectItem>
                      {/* Only SUPER_ADMIN can see/assign ADMIN and SUPER_ADMIN roles */}
                      {currentUserRole === 'SUPER_ADMIN' ? (
                        <>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                        </>
                      ) : (
                        <>
                          {/* Show current role if it's ADMIN/SUPER_ADMIN but disable editing */}
                          {formData.role === 'ADMIN' && (
                            <SelectItem value="ADMIN" disabled>Admin (Super Admin Only)</SelectItem>
                          )}
                          {formData.role === 'SUPER_ADMIN' && (
                            <SelectItem value="SUPER_ADMIN" disabled>Super Admin (Super Admin Only)</SelectItem>
                          )}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {currentUserRole !== 'SUPER_ADMIN' && (formData.role === 'ADMIN' || formData.role === 'SUPER_ADMIN') && (
                    <p className="text-xs text-yellow-500/80 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Only Super Admins can modify admin roles
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-foreground">Status</Label>
                  <Select 
                    value={formData.isActive ? "active" : "inactive"} 
                    onValueChange={(value) => setFormData({ ...formData, isActive: value === "active" })}
                  >
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-foreground">Bio</Label>
                <Input
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="bg-background border-border"
                  placeholder="Enter bio (optional)"
                />
              </div>
            </CardContent>
          </Card>

          {/* RM Assignment Section */}
          {currentUserRole !== 'MODERATOR' && (
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">Relationship Manager Assignment</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Assign a Relationship Manager to provide personalized support to this user
                </p>

                {loadingRMs ? (
                  <div className="text-center py-4 text-muted-foreground">Loading RMs...</div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="rm" className="text-foreground">Select RM</Label>
                      <Select 
                        value={selectedRMId || "none"} 
                        onValueChange={(value) => setSelectedRMId(value === "none" ? null : value)}
                      >
                        <SelectTrigger className="bg-background border-border">
                          <SelectValue placeholder="Select RM" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No RM (Unassign)</SelectItem>
                          {rms.map((rm) => (
                            <SelectItem key={rm.id} value={rm.id}>
                              {rm.name || rm.email || rm.id.slice(0, 8)} ({rm.assignedUsersCount} users)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {currentRMId && (
                        <p className="text-xs text-muted-foreground">
                          Current RM: {rms.find(r => r.id === currentRMId)?.name || "N/A"}
                        </p>
                      )}
                    </div>

                    {selectedRMId !== currentRMId && (
                      <Button
                        onClick={handleAssignRM}
                        disabled={loading}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            {selectedRMId ? "Assign RM" : "Unassign RM"}
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Leverage Override Section */}
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Leverage Override</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Override user leverage as a multiplier of platform-wide base leverage
              </p>

              {loadingRiskLimit ? (
                <div className="text-center py-4 text-muted-foreground">Loading risk settings...</div>
              ) : (
                <>
                  {/* Base Leverage Info */}
                  {baseConfigs.length > 0 && (
                    <div className="bg-background/50 p-3 rounded-lg border border-border mb-4">
                      <p className="text-xs text-muted-foreground mb-2">Platform Base Leverage (by segment):</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {baseConfigs.slice(0, 4).map((config, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="text-muted-foreground">{config.segment}/{config.productType}:</span>
                            <span className="font-medium text-foreground">{config.leverage}x</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Leverage Multiplier Input */}
                  <div className="space-y-2">
                    <Label htmlFor="leverageMultiplier" className="text-foreground">
                      Leverage Multiplier (x base)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="leverageMultiplier"
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="10"
                        value={leverageMultiplier !== null ? leverageMultiplier : ''}
                        onChange={(e) => {
                          const value = e.target.value ? parseFloat(e.target.value) : null
                          setLeverageMultiplier(value)
                        }}
                        className="bg-background border-border"
                        placeholder="e.g., 1.5 for 1.5x base"
                      />
                      <span className="text-sm text-muted-foreground">x</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {leverageMultiplier !== null && baseConfigs.length > 0 ? (
                        <>
                          Effective leverage: <span className="font-medium text-foreground">
                            {(baseConfigs.reduce((sum, c) => sum + c.leverage, 0) / baseConfigs.length * leverageMultiplier).toFixed(1)}x
                          </span>
                        </>
                      ) : (
                        "Set multiplier to override user leverage"
                      )}
                    </p>
                  </div>

                  {/* Current Override Display */}
                  {riskLimit && (
                    <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/30">
                      <p className="text-xs text-muted-foreground mb-1">Current Override:</p>
                      <p className="text-sm font-medium text-foreground">
                        Max Leverage: {riskLimit.maxLeverage}x
                      </p>
                    </div>
                  )}

                  {/* Save Button */}
                  <Button
                    onClick={handleSaveLeverageOverride}
                    disabled={loading || leverageMultiplier === null}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Leverage Override
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Credential Management */}
          <Card className="bg-muted/30 border-border">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-foreground mb-3">Credential Management</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Password</p>
                  <p className="text-xs text-muted-foreground">Reset user password</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetPassword}
                  disabled={loading}
                  className="border-primary/50 text-primary hover:bg-primary/10"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Reset Password
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">MPIN</p>
                  <p className="text-xs text-muted-foreground">Reset trading MPIN</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetMPIN}
                  disabled={loading}
                  className="border-primary/50 text-primary hover:bg-primary/10"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Reset MPIN
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Changes Indicator */}
          {hasChanges() && (
            <Alert className="bg-yellow-500/10 border-yellow-500/50">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-500/80">
                You have unsaved changes
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="border-border"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading || !hasChanges()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
