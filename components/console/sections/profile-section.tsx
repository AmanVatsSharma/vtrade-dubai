"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Copy, Check, Edit, Shield, User, Mail, Phone, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { ChangeMPINDialog } from "../dialogs/change-mpin-dialog"
import { useSession } from "next-auth/react"
import { useConsoleData } from "@/lib/hooks/use-console-data"

export function ProfileSection() {
  const [copied, setCopied] = useState(false)
  const [showMPINDialog, setShowMPINDialog] = useState(false)
  const { toast } = useToast()

  // Read session details and console data
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  const { consoleData, isLoading, error } = useConsoleData(userId)
  
  const sUser = (session?.user || {}) as any
  const clientId = consoleData?.user?.clientId ?? sUser?.clientId ?? "-"
  const userProfile = {
    name: consoleData?.user?.name ?? sUser?.name ?? "-",
    email: consoleData?.user?.email ?? sUser?.email ?? "-",
    mobile: consoleData?.user?.phone ?? sUser?.phone ?? "-",
    joinDate: consoleData?.user?.createdAt ? new Date(consoleData.user.createdAt).toLocaleDateString() : "-",
    kycStatus: consoleData?.user?.kycStatus ?? "-",
    accountType: consoleData?.user?.role ?? (sUser?.role as string | undefined) ?? "USER",
    tradingStatus: consoleData?.tradingAccount ? "Active" : "Inactive",
  }
  
  console.log("ProfileSection: console data", consoleData)
  console.log("ProfileSection: session user", sUser)

  const copyClientId = async () => {
    try {
      await navigator.clipboard.writeText(clientId)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Client ID copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Loading profile data...
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-xl font-semibold text-destructive">Error loading profile</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
          <p className="text-muted-foreground">Manage your account information and security settings</p>
        </div>
        <Button variant="outline" className="gap-2 bg-transparent">
          <Edit className="w-4 h-4" />
          Edit Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Your account details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client ID Section */}
            <div className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Client ID</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-mono font-semibold text-foreground">{clientId}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyClientId}
                      className="h-8 w-8 p-0 hover:bg-primary/10"
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {userProfile.accountType}
                </Badge>
              </div>
            </div>

            {/* User Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{userProfile.name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{userProfile.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Mobile Number</label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{userProfile.mobile}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Member Since</label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{userProfile.joinDate}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Status Badges */}
            <div className="flex flex-wrap gap-3">
              <Badge
                variant="outline"
                className="border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950"
              >
                KYC: {userProfile.kycStatus}
              </Badge>
              <Badge
                variant="outline"
                className="border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950"
              >
                Trading: {userProfile.tradingStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button onClick={() => setShowMPINDialog(true)} variant="outline" className="w-full justify-start gap-2">
                <Shield className="w-4 h-4" />
                Change MPIN
              </Button>

              <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                <Shield className="w-4 h-4" />
                Two-Factor Auth
              </Button>

              <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                <Shield className="w-4 h-4" />
                Login History
              </Button>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Security Tips:</p>
              <ul className="space-y-1 text-xs">
                <li>• Change your MPIN regularly</li>
                <li>• Enable two-factor authentication</li>
                <li>• Never share your credentials</li>
                <li>• Log out from shared devices</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change MPIN Dialog */}
      <ChangeMPINDialog open={showMPINDialog} onOpenChange={setShowMPINDialog} />
    </motion.div>
  )
}
