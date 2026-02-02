"use client"

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { DollarSign, X } from "lucide-react"
import { AnimatedBuySellSwitcher } from "@/components/trading/AnimatedBuySellSwitcher"
import { useOrderForm } from "@/lib/hooks/use-order-form"
import { OrderHeader } from "@/components/trading/order-form/OrderHeader"
import { OrderInputs } from "@/components/trading/order-form/OrderInputs"
import { OrderSummary } from "@/components/trading/order-form/OrderSummary"

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
  const Header = drawer ? DrawerHeader : ({ children }: any) => <div className="p-4">{children}</div>
  const Title = drawer ? DrawerTitle : ({ children }: any) => <div className="p-4">{children}</div>

  const segmentUpper = selectedStock.segment?.toUpperCase() || "NSE"

  return (
    <Wrapper open={isOpen} onOpenChange={onClose} direction="bottom">
      <Content className="bg-white dark:bg-gray-900 rounded-t-xl h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col max-w-md mx-auto w-full shadow-2xl">
        <Header className="flex-shrink-0 pb-2 border-b border-gray-100 dark:border-gray-800">
          <Title className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${orderSide === 'BUY' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                <DollarSign className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">Place Order</span>
            </div>
            {!drawer && (
              <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </Title>
        </Header>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Stock Header */}
          <OrderHeader stock={selectedStock} />

          {/* Market Status Banner */}
          {isMarketBlocked && (
            <div className="p-3 rounded-md border text-xs bg-yellow-50 border-yellow-200 text-yellow-800 flex items-start gap-2">
              <span className="mt-0.5">⚠️</span>
              <p>
                {sessionStatus === 'pre-open'
                  ? 'Pre-Open (09:00–09:15 IST): Orders are temporarily blocked.'
                  : segmentUpper.includes('MCX')
                    ? 'Market Closed: MCX orders are allowed between 09:00–23:55 IST.'
                    : 'Market Closed: NSE orders are allowed between 09:15–15:30 IST.'}
              </p>
            </div>
          )}
          
          {/* Dev Override Banner */}
          {!isMarketBlocked && sessionStatus !== 'open' && allowDevOrders && (
            <div className="p-2 rounded-md border text-xs bg-blue-50 border-blue-200 text-blue-800">
              Dev override active: Orders are enabled outside market hours (testing).
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
          />

          {/* Market Depth (Simplified) */}
          {(quotes as any)?.depth && (
            <div className="grid grid-cols-2 gap-4 text-[10px] font-mono bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
              <div>
                <p className="font-bold text-green-600 mb-1 border-b pb-0.5 border-green-100">Bids</p>
                {(quotes as any).depth.buy.slice(0, 3).map((b: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>{b.qty}</span>
                    <span>₹{b.price}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="font-bold text-red-600 mb-1 border-b pb-0.5 border-red-100 text-right">Asks</p>
                {(quotes as any).depth.sell.slice(0, 3).map((a: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span>₹{a.price}</span>
                    <span>{a.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Section */}
          <OrderSummary
            price={price}
            units={units}
            marginRequired={marginRequired}
            brokerage={brokerage}
            additionalCharges={additionalCharges}
            totalCost={totalCost}
            availableMargin={availableMargin}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4 space-y-3 pb-6 sm:pb-4">
          <div className="flex justify-end sm:hidden">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          
          <AnimatedBuySellSwitcher
            orderSide={orderSide}
            onSideChange={setOrderSide}
            onPlaceOrder={handleSubmit}
            loading={false}
            disabled={totalCost > availableMargin || isMarketBlocked}
          />
          
          <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
            {orderSide === "BUY" 
              ? "Tap Buy to place order • Tap Sell to switch" 
              : "Tap Sell to place order • Tap Buy to switch"}
          </p>
        </div>
      </Content>
    </Wrapper>
  )
}
