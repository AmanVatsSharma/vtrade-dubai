"use client"

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { X } from "lucide-react"
import { AnimatedBuySellSwitcher } from "@/components/trading/AnimatedBuySellSwitcher"
import { useOrderForm } from "@/lib/hooks/use-order-form"
import { OrderHeader } from "@/components/trading/order-form/OrderHeader"
import { OrderInputs } from "@/components/trading/order-form/OrderInputs"
import { OrderSummary } from "@/components/trading/order-form/OrderSummary"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface OrderDialogProps {
  isOpen: boolean
  onClose: () => void
  stock: any | null
  portfolio: any | null
  onOrderPlaced: () => void
  drawer?: boolean
  session?: any
}

export function OrderDialog(props: OrderDialogProps) {
  const { isOpen, onClose, drawer, stock } = props
  
  const {
    orderSide,
    setOrderSide,
    quantity,
    setQuantity,
    lots,
    setLots,
    price,
    setPrice,
    currentOrderType,
    setCurrentOrderType,
    selectedStock,
    isMarket,
    setIsMarket,
    quotes,
    availableMargin,
    marginRequired,
    brokerage,
    additionalCharges,
    totalCost,
    isMarketBlocked,
    sessionStatus,
    sessionReason,
    allowDevOrders,
    isDerivatives,
    lotSize,
    units,
    handleSubmit
  } = useOrderForm(props)

  if (!selectedStock) return null

  // Determine wrapper components based on drawer prop
  const Wrapper = drawer ? Drawer : ({ open, children }: any) => (open ? <>{children}</> : null)
  const Content = drawer ? DrawerContent : ({ children }: any) => <div className="p-4">{children}</div>
  
  const segmentUpper = selectedStock.segment?.toUpperCase() || "NSE"
  const isBuy = orderSide === "BUY"
  
  // Dynamic Theme Colors
  const themeGradient = isBuy 
    ? "from-emerald-50/50 via-white to-white dark:from-emerald-950/20 dark:via-gray-900 dark:to-gray-900" 
    : "from-rose-50/50 via-white to-white dark:from-rose-950/20 dark:via-gray-900 dark:to-gray-900"

  return (
    <Wrapper open={isOpen} onOpenChange={onClose} direction="bottom">
      <Content className={cn(
        "flex flex-col max-w-md mx-auto w-full shadow-2xl transition-colors duration-500",
        "bg-gradient-to-b", themeGradient,
        "rounded-t-3xl h-[90vh] sm:h-auto sm:max-h-[90vh]"
      )}>
        {/* Glassmorphism Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-100/50 dark:border-gray-800/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div 
                initial={false}
                animate={{ 
                  backgroundColor: isBuy ? "rgb(16, 185, 129)" : "rgb(244, 63, 94)",
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 0.3 }}
                className="w-2 h-8 rounded-full"
              />
              <span className="text-xl font-bold tracking-tight">Place Order</span>
            </div>
            {!drawer && (
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-hide">
          {/* Stock Header */}
          <OrderHeader stock={selectedStock} orderSide={orderSide} />

          {/* Market Status Banner */}
          <AnimatePresence>
            {isMarketBlocked && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 rounded-xl border text-xs bg-amber-50 border-amber-200 text-amber-800 flex items-start gap-2 mb-4">
                  <span className="mt-0.5 text-lg">⚠️</span>
                  <p className="font-medium">
                    {sessionStatus === 'pre-open'
                      ? 'Pre-Open (09:00–09:15 IST): Orders are temporarily blocked.'
                      : segmentUpper.includes('MCX')
                        ? 'Market Closed: MCX orders are allowed between 09:00–23:55 IST.'
                        : 'Market Closed: NSE orders are allowed between 09:15–15:30 IST.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Dev Override Banner */}
          {!isMarketBlocked && sessionStatus !== 'open' && allowDevOrders && (
            <div className="p-2 rounded-xl border text-xs bg-blue-50 border-blue-200 text-blue-800 font-medium text-center">
              Dev override active: Orders are enabled outside market hours.
            </div>
          )}

          {/* Inputs Section */}
          <OrderInputs
            isDerivatives={isDerivatives}
            lots={lots}
            setLots={setLots}
            quantity={quantity}
            setQuantity={setQuantity}
            price={price}
            setPrice={setPrice}
            isMarket={isMarket}
            setIsMarket={setIsMarket}
            currentOrderType={currentOrderType}
            setCurrentOrderType={setCurrentOrderType}
            isMarketBlocked={isMarketBlocked}
            lotSize={lotSize}
            units={units}
            segment={segmentUpper}
            orderSide={orderSide}
          />

          {/* Summary Section */}
          <OrderSummary
            price={price}
            units={units}
            marginRequired={marginRequired}
            brokerage={brokerage}
            additionalCharges={additionalCharges}
            totalCost={totalCost}
            availableMargin={availableMargin}
            orderSide={orderSide}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 p-6 space-y-4 pb-8 sm:pb-6 z-20">
          <div className="flex justify-end sm:hidden absolute top-4 right-4 pointer-events-none opacity-0">
             {/* Hidden close button for layout consistency if needed */}
          </div>
          
          <AnimatedBuySellSwitcher
            orderSide={orderSide}
            onSideChange={setOrderSide}
            onPlaceOrder={handleSubmit}
            loading={false}
            disabled={totalCost > availableMargin || isMarketBlocked}
          />
          
          <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 font-medium tracking-wide uppercase">
            {orderSide === "BUY" 
              ? "Swipe or Tap Buy to Execute" 
              : "Swipe or Tap Sell to Execute"}
          </p>
        </div>
      </Content>
    </Wrapper>
  )
}
