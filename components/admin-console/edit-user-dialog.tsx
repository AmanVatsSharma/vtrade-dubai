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
import { User, Mail, Phone, Shield, Key, Save, X, CheckCircle, AlertCircle } from "lucide-react"
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

  // Load user data when dialog opens
  useEffect(() => {
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
    }
  }, [open, user])

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
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">User</SelectItem>
                      <SelectItem value="MODERATOR">Moderator</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
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
