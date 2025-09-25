"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { User, DollarSign, CreditCard, FileText, Upload, Check } from "lucide-react"

interface AddFundsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddFundsDialog({ open, onOpenChange }: AddFundsDialogProps) {
  const [formData, setFormData] = useState({
    userId: "",
    amount: "",
    method: "",
    utrCode: "",
    description: "",
    screenshot: null as File | null,
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitted(true)
    setTimeout(() => {
      handleClose()
    }, 2000)
  }

  const handleClose = () => {
    setFormData({
      userId: "",
      amount: "",
      method: "",
      utrCode: "",
      description: "",
      screenshot: null,
    })
    setIsSubmitted(false)
    onOpenChange(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, screenshot: file })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-primary">Add Funds Manually</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Manually add funds to a user's account with transaction details
          </DialogDescription>
        </DialogHeader>

        {!isSubmitted ? (
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-2">
              <Label htmlFor="userId" className="text-foreground">
                User ID / Client ID
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="userId"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="pl-10 bg-muted/50 border-border focus:border-primary"
                  placeholder="Enter user ID (e.g., USR_001234)"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-foreground">
                Amount
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="pl-10 bg-muted/50 border-border focus:border-primary"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method" className="text-foreground">
                Payment Method
              </Label>
              <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                <SelectTrigger className="bg-muted/50 border-border focus:border-primary">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="neft">NEFT</SelectItem>
                  <SelectItem value="rtgs">RTGS</SelectItem>
                  <SelectItem value="imps">IMPS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="utrCode" className="text-foreground">
                UTR / Transaction Code
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="utrCode"
                  value={formData.utrCode}
                  onChange={(e) => setFormData({ ...formData, utrCode: e.target.value })}
                  className="pl-10 bg-muted/50 border-border focus:border-primary"
                  placeholder="Enter UTR or transaction code"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="screenshot" className="text-foreground">
                Transaction Screenshot
              </Label>
              <div className="relative">
                <input id="screenshot" type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("screenshot")?.click()}
                  className="w-full border-border hover:bg-muted/50"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {formData.screenshot ? formData.screenshot.name : "Upload Screenshot"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">
                Description (Optional)
              </Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="pl-10 bg-muted/50 border-border focus:border-primary resize-none"
                  placeholder="Add any additional notes..."
                  rows={3}
                />
              </div>
            </div>

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              Add Funds
            </Button>
          </motion.form>
        ) : (
          <motion.div
            className="space-y-4 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="w-16 h-16 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Funds Added Successfully!</h3>
            <p className="text-sm text-muted-foreground">
              ${formData.amount} has been added to user {formData.userId}
            </p>
            <Card className="bg-muted/30 border-border">
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UTR Code:</span>
                    <code className="text-primary font-mono">{formData.utrCode}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Method:</span>
                    <span className="text-foreground capitalize">{formData.method.replace("-", " ")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </DialogContent>
    </Dialog>
  )
}
