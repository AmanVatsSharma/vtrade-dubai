"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { QrCode, Clock, CheckCircle, Copy, Camera } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface UPIPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  amount: number
  onSuccess: (data: { utr?: string; screenshotUrl?: string; screenshotKey?: string }) => void
  upiId?: string
  qrCodeUrl?: string
}

export function UPIPaymentModal({ open, onOpenChange, amount, onSuccess, upiId, qrCodeUrl }: UPIPaymentModalProps) {
  const [step, setStep] = useState<"qr" | "details" | "success">("qr")
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const [utr, setUtr] = useState("")
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const fallbackUpiId = "trading@paytm"
  const fallbackQrCodeUrl = `/placeholder.svg?height=200&width=200&query=UPI QR code for payment of ₹${amount}`

  const effectiveUpiId = upiId || fallbackUpiId
  const effectiveQrCodeUrl = qrCodeUrl || fallbackQrCodeUrl
  console.log("💳 [UPI-MODAL] Payment settings:", { providedUpiId: upiId, providedQr: qrCodeUrl, usingUpiId: effectiveUpiId, usingQr: effectiveQrCodeUrl })

  // Countdown timer
  useEffect(() => {
    if (!open || step !== "qr") return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          toast({
            title: "Session Expired",
            description: "Please try again with a new payment session",
            variant: "destructive",
          })
          onOpenChange(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [open, step, onOpenChange, toast])

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep("qr")
      setTimeLeft(300)
      setUtr("")
      setScreenshot(null)
      setIsSubmitting(false)
    }
  }, [open])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const copyUPIId = async () => {
    try {
      await navigator.clipboard.writeText(effectiveUpiId)
      toast({
        title: "Copied!",
        description: "UPI ID copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy manually",
        variant: "destructive",
      })
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        })
        return
      }
      setScreenshot(file)
    }
  }

  const handleSubmit = async () => {
    // UTR optional; validate only if provided
    if (utr && utr.length !== 12) {
      toast({
        title: "Invalid UTR",
        description: "UTR number must be exactly 12 digits",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    let uploadedUrl: string | undefined
    let uploadedKey: string | undefined

    try {
      if (screenshot) {
        const formData = new FormData()
        formData.append('file', screenshot)
        formData.append('folder', 'uploads/deposits')
        formData.append('isPublic', 'true')

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        const json = await res.json()
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || 'Upload failed')
        }
        uploadedUrl = json.url as string
        uploadedKey = json.key as string
      }

      setStep("success")
      setTimeout(() => {
        onSuccess({ utr: utr || undefined, screenshotUrl: uploadedUrl, screenshotKey: uploadedKey })
      }, 600)
    } catch (e: any) {
      console.error('❌ [UPI-MODAL] Upload failed', e)
      toast({ title: 'Upload failed', description: e?.message || 'Please try again', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            UPI Payment
          </DialogTitle>
          <DialogDescription>Complete your deposit of ₹{amount.toLocaleString("en-IN")}</DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "qr" && (
            <motion.div
              key="qr"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Timer */}
              <div className="flex items-center justify-center">
                <Badge variant="outline" className="gap-2">
                  <Clock className="w-4 h-4" />
                  {formatTime(timeLeft)}
                </Badge>
              </div>

              {/* QR Code */}
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="flex justify-center mb-4">
                    <img
                      src={effectiveQrCodeUrl || "/placeholder.svg"}
                      alt="UPI QR Code"
                      className="w-48 h-48 border rounded-lg"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Scan with any UPI app</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm font-mono">{effectiveUpiId}</span>
                    <Button variant="ghost" size="sm" onClick={copyUPIId} className="h-6 w-6 p-0">
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Instructions */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. Scan the QR code with your UPI app</p>
                <p>2. Verify the amount: ₹{amount.toLocaleString("en-IN")}</p>
                <p>3. Complete the payment</p>
                <p>4. Note down the UTR number</p>
              </div>

              <Button onClick={() => setStep("details")} className="w-full">
                I've Made the Payment
              </Button>
            </motion.div>
          )}

          {step === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* UTR Input */}
              <div className="space-y-2">
                <Label htmlFor="utr">UTR Number (Optional but Recommended)</Label>
                <Input
                  id="utr"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="Enter 12-digit UTR number"
                  maxLength={12}
                />
                <p className="text-xs text-muted-foreground">UTR helps us process your deposit faster</p>
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label>Payment Screenshot (Optional)</Label>
                <div className="border-2 border-dashed border-muted rounded-lg p-4">
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="screenshot" />
                  <label htmlFor="screenshot" className="cursor-pointer">
                    <div className="text-center">
                      {screenshot ? (
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-sm">{screenshot.name}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Camera className="w-8 h-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Click to upload payment screenshot</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("qr")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Submitting..." : "Submit Details"}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center space-y-4"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Payment Submitted!</h3>
                <p className="text-muted-foreground">Your deposit request has been submitted for processing</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-sm">
                <p>Amount: ₹{amount.toLocaleString("en-IN")}</p>
                {utr && <p>UTR: {utr}</p>}
                <p className="text-muted-foreground mt-2">Processing time: 5-10 minutes</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}
