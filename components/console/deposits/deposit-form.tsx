"use client"

import type React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Smartphone, Building2, Banknote, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

interface DepositFormProps {
  onSubmit: (amount: number, method: string) => void
}

export function DepositForm({ onSubmit }: DepositFormProps) {
  const [amount, setAmount] = useState("")
  const [method, setMethod] = useState("upi")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const quickAmounts = [1000, 5000, 10000, 25000, 50000, 100000]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const depositAmount = Number.parseFloat(amount)

    if (!depositAmount || depositAmount < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum deposit amount is ₹100",
        variant: "destructive",
      })
      return
    }

    if (depositAmount > 200000) {
      toast({
        title: "Amount Limit Exceeded",
        description: "Maximum deposit amount is ₹2,00,000 per transaction",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    // Simulate processing delay
    setTimeout(() => {
      setIsLoading(false)
      onSubmit(depositAmount, method)
      setAmount("")
    }, 1000)
  }

  const paymentMethods = [
    {
      id: "upi",
      name: "UPI Payment",
      description: "Instant transfer via UPI",
      icon: Smartphone,
      recommended: true,
    },
    {
      id: "bank",
      name: "Bank Transfer",
      description: "NEFT/RTGS transfer",
      icon: Building2,
      recommended: false,
    },
    {
      id: "cash",
      name: "Cash Deposit",
      description: "Deposit at branch",
      icon: Banknote,
      recommended: false,
    },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Amount Input */}
      <div className="space-y-3">
        <Label htmlFor="amount" className="text-base font-medium">
          Deposit Amount
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
          <Input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            className="pl-8 text-lg h-12"
            min="100"
            max="200000"
            step="100"
            required
          />
        </div>
        <p className="text-xs text-muted-foreground">Minimum: ₹100 | Maximum: ₹2,00,000</p>
      </div>

      {/* Quick Amount Buttons */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Quick Select</Label>
        <div className="grid grid-cols-3 gap-2">
          {quickAmounts.map((quickAmount) => (
            <Button
              key={quickAmount}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAmount(quickAmount.toString())}
              className="text-xs bg-transparent"
            >
              ₹{quickAmount.toLocaleString("en-IN")}
            </Button>
          ))}
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Payment Method</Label>
        <RadioGroup value={method} onValueChange={setMethod}>
          <div className="space-y-3">
            {paymentMethods.map((paymentMethod) => {
              const Icon = paymentMethod.icon
              return (
                <motion.div key={paymentMethod.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Card
                    className={`cursor-pointer transition-all ${
                      method === paymentMethod.id ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setMethod(paymentMethod.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <RadioGroupItem value={paymentMethod.id} id={paymentMethod.id} />
                        <div className="flex items-center gap-3 flex-1">
                          <div className="p-2 bg-muted rounded-lg">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Label htmlFor={paymentMethod.id} className="font-medium cursor-pointer">
                                {paymentMethod.name}
                              </Label>
                              {paymentMethod.recommended && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                                  Recommended
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{paymentMethod.description}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </RadioGroup>
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full h-12 text-base" disabled={isLoading || !amount}>
        {isLoading ? (
          "Processing..."
        ) : (
          <>
            Proceed to Payment
            <ArrowRight className="w-4 h-4 ml-2" />
          </>
        )}
      </Button>
    </form>
  )
}
