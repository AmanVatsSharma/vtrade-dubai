"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Copy, Check, User, Mail, Phone, Key, Shield } from "lucide-react"

interface CreateUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    initialBalance: "",
  })
  const [generatedCredentials, setGeneratedCredentials] = useState<{
    clientId: string
    password: string
    mpin: string
  } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const generateCredentials = () => {
    const clientId = `USR_${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    const password = Math.random().toString(36).substr(2, 12)
    const mpin = Math.floor(1000 + Math.random() * 9000).toString()

    setGeneratedCredentials({ clientId, password, mpin })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    generateCredentials()
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleClose = () => {
    setFormData({ name: "", email: "", phone: "", initialBalance: "" })
    setGeneratedCredentials(null)
    setCopiedField(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Create New User</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Generate a new trading account with credentials
          </DialogDescription>
        </DialogHeader>

        {!generatedCredentials ? (
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">
                Full Name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="pl-10 bg-muted/50 border-border focus:border-primary"
                  placeholder="Enter full name"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 bg-muted/50 border-border focus:border-primary"
                  placeholder="Enter email address"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground">
                Phone Number
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="pl-10 bg-muted/50 border-border focus:border-primary"
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="balance" className="text-foreground">
                Initial Balance (Optional)
              </Label>
              <Input
                id="balance"
                type="number"
                value={formData.initialBalance}
                onChange={(e) => setFormData({ ...formData, initialBalance: e.target.value })}
                className="bg-muted/50 border-border focus:border-primary"
                placeholder="0.00"
              />
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Create User Account
            </Button>
          </motion.form>
        ) : (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-foreground">User Created Successfully!</h3>
              <p className="text-sm text-muted-foreground">Share these credentials with the user</p>
            </div>

            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Client ID</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-primary font-mono text-sm bg-primary/10 px-2 py-1 rounded">
                      {generatedCredentials.clientId}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedCredentials.clientId, "clientId")}
                      className="h-6 w-6 p-0"
                    >
                      {copiedField === "clientId" ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Key className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-foreground">Password</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-yellow-400 font-mono text-sm bg-yellow-400/10 px-2 py-1 rounded">
                      {generatedCredentials.password}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedCredentials.password, "password")}
                      className="h-6 w-6 p-0"
                    >
                      {copiedField === "password" ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-medium text-foreground">MPIN</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="text-green-400 font-mono text-sm bg-green-400/10 px-2 py-1 rounded">
                      {generatedCredentials.mpin}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedCredentials.mpin, "mpin")}
                      className="h-6 w-6 p-0"
                    >
                      {copiedField === "mpin" ? (
                        <Check className="w-3 h-3 text-green-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3">
              <p className="text-xs text-yellow-400">
                <strong>Important:</strong> Save these credentials securely. They cannot be recovered once this dialog
                is closed.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Close & Create Another
            </Button>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}
