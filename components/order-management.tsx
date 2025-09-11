/**
 * @file order-management.tsx
 * @description Provides a UI for managing stock orders (view, modify, cancel).
 * This file was already in good shape and required no major corrections.
 */
"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Loader2, FileText } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { cancelOrder, modifyOrder, deleteOrder } from "@/lib/hooks/use-trading-data"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { OrderStatus } from "@prisma/client"
import { motion, AnimatePresence } from "framer-motion"

interface Order {
  id: string; symbol: string; quantity: number; price: number | null; orderType: string; orderSide: string; status: string; createdAt: string; filledQuantity?: number; averagePrice?: number;
}

interface OrderManagementProps {
  orders: Order[]; onOrderUpdate: () => void;
}

export function OrderManagement({ orders, onOrderUpdate }: OrderManagementProps) {
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [modifyPrice, setModifyPrice] = useState(0)
  const [modifyQuantity, setModifyQuantity] = useState(0)
  const [loading, setLoading] = useState<string | null>(null)
  const [currentOrderTab, setCurrentOrderTab] = useState("all")

  const handleAction = async (action: 'modify' | 'cancel' | 'delete', orderId: string, payload?: any) => {
    setLoading(orderId)
    try {
      if (action === 'modify') {
        await modifyOrder(orderId, payload)
        toast({ title: "Order Modified", description: "Your order has been updated." })
      } else if (action === 'cancel') {
        await cancelOrder(orderId)
        toast({ title: "Order Cancelled", description: "Your order has been cancelled." })
      } else if (action === 'delete') {
        await deleteOrder(orderId)
        toast({ title: "Order Deleted", description: "Your order has been deleted." })
      }
      onOrderUpdate()
    } catch (error) {
      console.error(error)
      toast({ title: `Failed to ${action} order`, description: "Something went wrong.", variant: "destructive" })
    } finally {
      setLoading(null)
      setModifyDialogOpen(false)
    }
  }

  const handleOpenModifyDialog = (order: Order) => {
    setSelectedOrder(order)
    setModifyPrice(order.price || 0)
    setModifyQuantity(order.quantity)
    setModifyDialogOpen(true)
  }

  const filteredOrders = useMemo(() => {
    switch (currentOrderTab) {
      case 'executed':
        return orders.filter(order => order.status === OrderStatus.EXECUTED)
      case 'pending':
        return orders.filter(order => order.status === OrderStatus.PENDING)
      case 'cancelled':
        return orders.filter(order => order.status === OrderStatus.CANCELLED)
      default:
        return orders
    }
  }, [orders, currentOrderTab])

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-2">
        <FileText className="h-7 w-7 text-blue-600" />
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Orders</h2>
      </div>

      <Tabs value={currentOrderTab} onValueChange={setCurrentOrderTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-2xl bg-gray-100 dark:bg-gray-900 p-1">
          <TabsTrigger value="all" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">All</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">Pending</TabsTrigger>
          <TabsTrigger value="executed" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">Executed</TabsTrigger>
          <TabsTrigger value="cancelled" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800">Cancelled</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4">
        <AnimatePresence>
          {filteredOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="rounded-xl shadow-sm border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500">
                <p>No {currentOrderTab} orders found.</p>
              </Card>
            </motion.div>
          ) : (
            filteredOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all bg-white dark:bg-gray-800">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex-1 space-y-1">
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{order.symbol}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Badge variant={order.orderSide === 'BUY' ? 'success' : 'destructive'}>{order.orderSide}</Badge>
                        <Badge variant="outline">{order.orderType}</Badge>
                        <Badge variant="outline">{order.status}</Badge>
                        {order.price && (<span className="font-medium">@ ₹{order.price.toFixed(2)}</span>)}
                        <span>Qty: {order.filledQuantity || 0}/{order.quantity}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl shadow-lg">
                          {order.status === 'PENDING' && (
                            <>
                              <DropdownMenuItem onClick={() => handleOpenModifyDialog(order)}>
                                <Edit className="mr-2 h-4 w-4" />Modify
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAction('cancel', order.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          {order.status !== 'PENDING' && (
                            <DropdownMenuItem onClick={() => handleAction('delete', order.id)}>
                              <Trash2 className="mr-2 h-4 w-4" />Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Edit className="h-5 w-5 text-blue-600" />Modify Order
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">{selectedOrder.symbol}</h3>
                <div className="flex gap-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                  <span>{selectedOrder.orderSide}</span>
                  <span>{selectedOrder.orderType}</span>
                  <span>Current: {selectedOrder.quantity} @ ₹{selectedOrder.price}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Quantity</Label>
                  <Input type="number" value={modifyQuantity} onChange={(e) => setModifyQuantity(Number(e.target.value))} min="1" />
                </div>
                <div className="space-y-1">
                  <Label>Price</Label>
                  <Input type="number" value={modifyPrice} onChange={(e) => setModifyPrice(Number(e.target.value))} step="0.05" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleAction('modify', selectedOrder.id, { price: modifyPrice, quantity: modifyQuantity })} disabled={loading === selectedOrder.id} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Modify Order"}
                </Button>
                <Button variant="outline" onClick={() => setModifyDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

