/**
 * @file order-management.tsx
 * @description Provides a UI for managing stock orders (view, modify, cancel).
 * This file was already in good shape and required no major corrections.
 */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { cancelOrder, modifyOrder, deleteOrder } from "@/lib/hooks/use-trading-data"

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

  const handleAction = async (action: 'cancel' | 'modify' | 'delete', orderId: string, params?: any) => {
    setLoading(orderId);
    try {
        if(action === 'cancel') await cancelOrder(orderId);
        if(action === 'delete') await deleteOrder(orderId);
        if(action === 'modify') await modifyOrder(orderId, params);
        
        onOrderUpdate();
        if(action === 'modify') setModifyDialogOpen(false);
        
        toast({ title: `Order ${action === 'modify' ? 'Modified' : action === 'cancel' ? 'Cancelled' : 'Deleted'}`, description: `Your order was updated successfully.` });
    } catch (error) {
        toast({ title: `${action.charAt(0).toUpperCase() + action.slice(1)} Failed`, description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" });
    } finally {
        setLoading(null);
    }
  }

  const openModifyDialog = (order: Order) => {
    setSelectedOrder(order)
    setModifyPrice(order.price || 0)
    setModifyQuantity(order.quantity)
    setModifyDialogOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "EXECUTED": return "bg-green-100 text-green-800";
      case "CANCELLED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  }
  
  if(orders.length === 0) {
    return <div className="text-center py-10 text-gray-500">No orders to display.</div>
  }

  return (
    <>
      <div className="space-y-2">
        {orders.map((order) => (
          <Card key={order.id} className="bg-white border shadow-sm rounded-lg">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm">{order.symbol}</h3>
                    <Badge variant={order.orderSide === "BUY" ? "default" : "destructive"} className={`text-xs px-2 py-0.5 ${order.orderSide === "BUY" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>{order.orderSide}</Badge>
                    <Badge variant="outline" className={`text-xs px-2 py-0.5 border-transparent ${getStatusColor(order.status)}`}>{order.status}</Badge>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>{order.quantity} qty</span>
                    <span>@ ₹{order.price || "Market"}</span>
                    <span>{order.orderType}</span>
                    <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                  </div>
                  {order.filledQuantity && order.filledQuantity > 0 && (
                    <div className="flex gap-4 mt-1 text-xs text-green-600">
                      <span>Filled: {order.filledQuantity} qty</span>
                      {order.averagePrice && <span>Avg: ₹{order.averagePrice}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {order.status === "PENDING" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => handleAction('cancel', order.id)} disabled={loading === order.id} className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50">Cancel</Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => openModifyDialog(order)}><Edit className="h-3 w-3 mr-2" />Modify</DropdownMenuItem></DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                  {(order.status === "EXECUTED" || order.status === "CANCELLED") && (
                    <Button size="sm" variant="ghost" onClick={() => handleAction('delete', order.id)} disabled={loading === order.id} className="h-7 w-7" aria-label="Delete Order"><Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" /></Button>
                  )}
                   {loading === order.id && <Loader2 className="h-4 w-4 animate-spin text-gray-500" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={modifyDialogOpen} onOpenChange={setModifyDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Edit className="h-5 w-5 text-blue-600" />Modify Order</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-md border"><h3 className="font-semibold text-gray-900">{selectedOrder.symbol}</h3><div className="flex gap-4 mt-1 text-sm text-gray-600"><span>{selectedOrder.orderSide}</span><span>{selectedOrder.orderType}</span><span>Current: {selectedOrder.quantity} @ ₹{selectedOrder.price}</span></div></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Quantity</Label><Input type="number" value={modifyQuantity} onChange={(e) => setModifyQuantity(Number(e.target.value))} min="1" /></div>
                <div className="space-y-1"><Label>Price</Label><Input type="number" value={modifyPrice} onChange={(e) => setModifyPrice(Number(e.target.value))} step="0.05" /></div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handleAction('modify', selectedOrder.id, { price: modifyPrice, quantity: modifyQuantity })} disabled={loading === selectedOrder.id} className="flex-1 bg-blue-600 hover:bg-blue-700">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Modify Order"}</Button>
                <Button variant="outline" onClick={() => setModifyDialogOpen(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
