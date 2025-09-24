"use client"

import { useState } from "react"
import { Download, FileText, File } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import type { Transaction } from "./statements-section"

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactions: Transaction[]
}

export function ExportDialog({ open, onOpenChange, transactions }: ExportDialogProps) {
  const [format, setFormat] = useState("csv")
  const [includeBalance, setIncludeBalance] = useState(true)
  const [includeCategory, setIncludeCategory] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const handleExport = async () => {
    setIsExporting(true)

    // Simulate export process
    setTimeout(() => {
      setIsExporting(false)
      toast({
        title: "Export Successful",
        description: `${transactions.length} transactions exported as ${format.toUpperCase()}`,
      })
      onOpenChange(false)
    }, 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export Statements
          </DialogTitle>
          <DialogDescription>Export {transactions.length} transactions to your preferred format.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Export Format</Label>
            <RadioGroup value={format} onValueChange={setFormat}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="w-4 h-4" />
                  CSV (Comma Separated Values)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                  <File className="w-4 h-4" />
                  PDF (Portable Document Format)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Include Fields</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="balance"
                  checked={includeBalance}
                  onCheckedChange={(checked) => setIncludeBalance(checked as boolean)}
                />
                <Label htmlFor="balance" className="cursor-pointer">
                  Account Balance
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="category"
                  checked={includeCategory}
                  onCheckedChange={(checked) => setIncludeCategory(checked as boolean)}
                />
                <Label htmlFor="category" className="cursor-pointer">
                  Transaction Category
                </Label>
              </div>
            </div>
          </div>

          {/* Export Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Transactions:</span>
                <span className="font-medium">{transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="font-medium">{format.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>File size (approx):</span>
                <span className="font-medium">
                  {format === "csv"
                    ? `${Math.ceil(transactions.length * 0.2)}KB`
                    : `${Math.ceil(transactions.length * 0.5)}KB`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
