// import { createLoggerFromSession } from "@/lib/logger"
// import { supabaseServer } from "@/lib/supabase/supabase-server"
// import type { OrderType, OrderSide, ProductType, OrderValidity } from "@prisma/client"

// // Types
// export interface OrderRequest {
//   tradingAccountId: string
//   instrumentId: string
//   symbol: string
//   quantity: number
//   orderType: OrderType
//   orderSide: OrderSide
//   price?: number
//   triggerPrice?: number
//   productType: ProductType
//   validity?: OrderValidity
//   segment?: string
  
//   // Advanced order types
//   isAMO?: boolean  // After Market Order
//   isBracket?: boolean
//   squareOffValue?: number
//   stopLossValue?: number
//   trailingStop?: number
  
//   // Session info
//   session?: any
//   ipAddress?: string
//   deviceId?: string
// }

// export interface ChargesBreakdown {
//   brokerage: number
//   stt: number
//   exchangeFees: number
//   gst: number
//   stampDuty: number
//   sebiCharges: number
//   clearingFees?: number
//   tds?: number // For crypto
//   total: number
// }

// export interface ValidationResult {
//   isValid: boolean
//   message?: string
//   details?: any
// }

// export interface OrderResult {
//   success: boolean
//   order?: any
//   execution?: any
//   error?: string
// }

// // Main Order Execution Service
// export class OrderExecutionService {
//   private chargesCalculator: ChargesCalculator
//   private marginCalculator: MarginCalculator
//   private fundManager: FundManager
//   private positionManager: PositionManager
//   private transactionLogger: TransactionLogger

//   constructor() {
//     this.chargesCalculator = new ChargesCalculator()
//     this.marginCalculator = new MarginCalculator()
//     this.fundManager = new FundManager()
//     this.positionManager = new PositionManager()
//     this.transactionLogger = new TransactionLogger()
//   }

//   async validateOrder(request: OrderRequest): Promise<ValidationResult> {
//     // Get instrument details
//     const { data: instrument } = await supabaseServer
//       .from('instruments')
//       .select('*')
//       .eq('instrumentId', request.instrumentId)
//       .single()
    
//     if (!instrument) {
//       return { isValid: false, message: 'Invalid instrument' }
//     }

//     // Check market hours
//     const marketHours = await this.checkMarketHours(instrument)
//     if (!marketHours.isOpen && !request.isAMO) {
//       return { isValid: false, message: 'Market is closed' }
//     }

//     // Validate quantity
//     if (instrument.lot_size && request.quantity % instrument.lot_size !== 0) {
//       return { 
//         isValid: false, 
//         message: `Quantity must be in multiples of lot size: ${instrument.lot_size}` 
//       }
//     }

//     // Check circuit limits
//     if (request.orderType === 'LIMIT' && request.price) {
//       const circuitCheck = await this.checkCircuitLimits(instrument, request.price)
//       if (!circuitCheck.isValid) {
//         return circuitCheck
//       }
//     }

//     // Verify margin requirements
//     const marginRequired = await this.marginCalculator.calculate(request, instrument)
//     const account = await this.getAccount(request.tradingAccountId)
    
//     if (account.availableMargin < marginRequired) {
//       return {
//         isValid: false,
//         message: `Insufficient margin. Required: ₹${marginRequired.toFixed(2)}, Available: ₹${account.availableMargin.toFixed(2)}`
//       }
//     }

//     // Risk management checks
//     const riskCheck = await this.performRiskCheck(request, account)
//     if (!riskCheck.isValid) {
//       return riskCheck
//     }

//     return { isValid: true }
//   }

//   async calculateCharges(request: OrderRequest, instrument: any): Promise<ChargesBreakdown> {
//     const orderValue = request.quantity * (request.price || instrument.ltp)
    
//     // Get risk config for the instrument and product type
//     const { data: riskConfig } = await supabaseServer
//       .from('risk_configs')
//       .select('*')
//       .eq('asset_class_id', instrument.asset_class_id)
//       .eq('product_type', request.productType)
//       .eq('is_active', true)
//       .single()

//     if (!riskConfig) {
//       // Use default calculations if no config found
//       return this.chargesCalculator.calculateDefault(orderValue, request, instrument)
//     }

//     return this.chargesCalculator.calculate(orderValue, request, instrument, riskConfig)
//   }

//   async executeOrder(request: OrderRequest): Promise<OrderResult> {
//     const logger = request.session ? createLoggerFromSession(request.session, request.tradingAccountId) : null
    
//     try {
//       await logger?.logSystemEvent("ORDER_START", `Placing ${request.orderSide} order for ${request.symbol}`)
      
//       // Begin transaction
//       const validation = await this.validateOrder(request)
//       if (!validation.isValid) {
//         throw new Error(validation.message)
//       }

//       // Get instrument
//       const { data: instrument } = await supabaseServer
//         .from('instruments')
//         .select('*')
//         .eq('instrumentId', request.instrumentId)
//         .single()

//       // Calculate charges
//       const charges = await this.calculateCharges(request, instrument)
      
//       // Calculate margin
//       const marginRequired = await this.marginCalculator.calculate(request, instrument)

//       // Create order record with PENDING status
//       const orderId = crypto.randomUUID()
//       const { error: insertError } = await supabaseServer
//         .from('orders')
//         .insert({
//           id: orderId,
//           trading_account_id: request.tradingAccountId,
//           instrument_id: request.instrumentId,
//           symbol: request.symbol,
//           quantity: request.quantity,
//           order_type: request.orderType,
//           order_side: request.orderSide,
//           product_type: request.productType,
//           validity: request.validity || 'DAY',
//           price: request.price,
//           trigger_price: request.triggerPrice,
          
//           // Charges
//           brokerage: charges.brokerage,
//           stt: charges.stt,
//           exchange_fees: charges.exchangeFees,
//           gst: charges.gst,
//           stamp_duty: charges.stampDuty,
//           sebi_charges: charges.sebiCharges,
//           total_charges: charges.total,
          
//           // Margin
//           margin_required: marginRequired,
//           margin_blocked: marginRequired,
//           leverage_used: instrument.leverage || 1,
          
//           // Risk parameters
//           stop_loss: request.stopLossValue,
//           take_profit: request.squareOffValue,
//           trailing_stop: request.trailingStop,
          
//           // Metadata
//           ip_address: request.ipAddress,
//           device_id: request.deviceId,
//           status: 'PENDING'
//         })

//       if (insertError) {
//         throw new Error(`Failed to create order: ${insertError.message}`)
//       }

//       // Block margin and debit charges
//       await this.fundManager.blockMargin(request.tradingAccountId, marginRequired + charges.total, orderId)

//       // Simulate order execution (replace with actual exchange API)
//       const execution = await this.simulateExecution(orderId, request, instrument)

//       // Update order status
//       await this.updateOrderStatus(orderId, execution)

//       // Update position if executed
//       if (execution.status === 'EXECUTED') {
//         await this.positionManager.updatePosition({
//           orderId,
//           tradingAccountId: request.tradingAccountId,
//           instrumentId: request.instrumentId,
//           symbol: request.symbol,
//           quantity: execution.filledQuantity,
//           price: execution.averagePrice,
//           orderSide: request.orderSide,
//           productType: request.productType,
//           charges
//         })

//         // Log transaction
//         await this.transactionLogger.logOrderExecution({
//           orderId,
//           tradingAccountId: request.tradingAccountId,
//           execution,
//           charges
//         })
//       }

//       await logger?.logSystemEvent("ORDER_SUCCESS", `Order ${orderId} executed successfully`)

//       return { 
//         success: true, 
//         order: { id: orderId, status: execution.status },
//         execution 
//       }

//     } catch (error: any) {
//       await logger?.logSystemEvent("ORDER_FAILED", `Order failed: ${error.message}`)
//       return { 
//         success: false, 
//         error: error.message 
//       }
//     }
//   }

//   private async checkMarketHours(instrument: any) {
//     const now = new Date()
//     const hours = now.getHours()
//     const minutes = now.getMinutes()
//     const day = now.getDay()
    
//     // Check based on instrument type
//     switch (instrument.instrumentType) {
//       case 'CRYPTO':
//         return { isOpen: true } // 24/7
      
//       case 'FOREX':
//         // Forex: Sunday 5 PM to Friday 5 PM EST
//         if (day === 0 && hours < 17) return { isOpen: false }
//         if (day === 5 && hours >= 17) return { isOpen: false }
//         if (day === 6) return { isOpen: false }
//         return { isOpen: true }
      
//       case 'EQUITY':
//       case 'FUTURE':
//       case 'OPTION':
//         // Indian markets: 9:15 AM to 3:30 PM
//         const marketOpen = hours === 9 && minutes >= 15 || hours > 9
//         const marketClose = hours === 15 && minutes <= 30 || hours < 15
//         return { isOpen: marketOpen && marketClose && day >= 1 && day <= 5 }
      
//       case 'COMMODITY':
//         // MCX: 9:00 AM to 11:30 PM
//         const mcxOpen = hours >= 9
//         const mcxClose = hours === 23 && minutes <= 30 || hours < 23
//         return { isOpen: mcxOpen && mcxClose && day >= 1 && day <= 5 }
      
//       default:
//         return { isOpen: false }
//     }
//   }

//   private async checkCircuitLimits(instrument: any, price: number) {
//     const prevClose = instrument.prev_close || instrument.close
//     if (!prevClose) return { isValid: true }
    
//     const changePercent = ((price - prevClose) / prevClose) * 100
//     const limit = instrument.circuit_limit || 20 // Default 20% circuit
    
//     if (Math.abs(changePercent) > limit) {
//       return {
//         isValid: false,
//         message: `Price exceeds circuit limit of ${limit}%`
//       }
//     }
    
//     return { isValid: true }
//   }

//   private async performRiskCheck(request: OrderRequest, account: any) {
//     // Check max order value
//     const orderValue = request.quantity * (request.price || 0)
//     const maxOrderValue = account.balance * 0.5 // Max 50% of balance in single order
    
//     if (orderValue > maxOrderValue) {
//       return {
//         isValid: false,
//         message: 'Order value exceeds risk limits'
//       }
//     }
    
//     // Check max open positions
//     const { data: openPositions } = await supabaseServer
//       .from('positions')
//       .select('id')
//       .eq('trading_account_id', request.tradingAccountId)
    
//     if (openPositions && openPositions.length >= 20) {
//       return {
//         isValid: false,
//         message: 'Maximum open positions limit reached'
//       }
//     }
    
//     return { isValid: true }
//   }

//   private async getAccount(tradingAccountId: string) {
//     const { data } = await supabaseServer
//       .from('trading_accounts')
//       .select('*')
//       .eq('id', tradingAccountId)
//       .single()
    
//     return data
//   }

//   private async simulateExecution(orderId: string, request: OrderRequest, instrument: any) {
//     // In production, this would connect to actual exchange
//     const executionPrice = request.orderType === 'MARKET' 
//       ? instrument.ltp 
//       : request.price || instrument.ltp

//     // Simulate execution after 100ms
//     await new Promise(resolve => setTimeout(resolve, 100))

//     return {
//       status: 'EXECUTED',
//       filledQuantity: request.quantity,
//       averagePrice: executionPrice,
//       executionTime: new Date().toISOString()
//     }
//   }

//   private async updateOrderStatus(orderId: string, execution: any) {
//     await supabaseServer
//       .from('orders')
//       .update({
//         status: execution.status,
//         filled_quantity: execution.filledQuantity,
//         average_price: execution.averagePrice,
//         executed_at: execution.executionTime
//       })
//       .eq('id', orderId)
//   }
// }

// // Charges Calculator
// class ChargesCalculator {
//   calculate(orderValue: number, request: OrderRequest, instrument: any, riskConfig: any): ChargesBreakdown {
//     switch (instrument.instrumentType) {
//       case 'EQUITY':
//         return this.calculateEquityCharges(orderValue, request, riskConfig)
//       case 'FUTURE':
//         return this.calculateFuturesCharges(orderValue, request, riskConfig)
//       case 'OPTION':
//         return this.calculateOptionsCharges(orderValue, request, instrument, riskConfig)
//       case 'CURRENCY_PAIR':
//         return this.calculateForexCharges(orderValue, request, riskConfig)
//       case 'CRYPTO':
//         return this.calculateCryptoCharges(orderValue, request, riskConfig)
//       case 'COMMODITY':
//         return this.calculateCommodityCharges(orderValue, request, riskConfig)
//       default:
//         return this.calculateDefault(orderValue, request, instrument)
//     }
//   }

//   private calculateEquityCharges(orderValue: number, request: OrderRequest, config: any): ChargesBreakdown {
//     const isIntraday = request.productType === 'INTRADAY'
    
//     // Brokerage
//     let brokerage = 0
//     if (config.brokerage_type === 'FLAT') {
//       brokerage = Number(config.brokerage_value)
//     } else if (config.brokerage_type === 'PERCENTAGE') {
//       brokerage = orderValue * Number(config.brokerage_value)
//       if (config.max_brokerage) {
//         brokerage = Math.min(brokerage, Number(config.max_brokerage))
//       }
//     }
    
//     // STT (Securities Transaction Tax)
//     const stt = request.orderSide === 'SELL' 
//       ? orderValue * Number(config.stt_rate || 0.00025) // 0.025% on sell for intraday
//       : isIntraday ? 0 : orderValue * 0.001 // 0.1% on both sides for delivery
    
//     // Exchange fees
//     const exchangeFees = orderValue * Number(config.exchange_fee_rate || 0.0000325)
    
//     // SEBI charges
//     const sebiCharges = orderValue * Number(config.sebi_rate || 0.000001)
    
//     // GST (18% on brokerage + exchange fees)
//     const gst = (brokerage + exchangeFees) * Number(config.gst_rate) / 100
    
//     // Stamp duty
//     const stampDuty = request.orderSide === 'BUY'
//       ? orderValue * Number(config.stamp_duty_rate || (isIntraday ? 0.00003 : 0.00015))
//       : 0
    
//     return {
//       brokerage,
//       stt,
//       exchangeFees,
//       gst,
//       stampDuty,
//       sebiCharges,
//       total: brokerage + stt + exchangeFees + gst + stampDuty + sebiCharges
//     }
//   }

//   private calculateFuturesCharges(orderValue: number, request: OrderRequest, config: any): ChargesBreakdown {
//     // Flat brokerage for futures
//     const brokerage = config.brokerage_type === 'FLAT' 
//       ? Number(config.brokerage_value) 
//       : Math.min(20, orderValue * Number(config.brokerage_value || 0.0003))
    
//     // STT only on sell side
//     const stt = request.orderSide === 'SELL' 
//       ? orderValue * Number(config.stt_rate || 0.0001) 
//       : 0
    
//     const exchangeFees = orderValue * Number(config.exchange_fee_rate || 0.00002)
//     const gst = (brokerage + exchangeFees) * Number(config.gst_rate) / 100
//     const stampDuty = request.orderSide === 'BUY' 
//       ? orderValue * Number(config.stamp_duty_rate || 0.00002) 
//       : 0
//     const sebiCharges = orderValue * Number(config.sebi_rate || 0.000001)
    
//     return {
//       brokerage,
//       stt,
//       exchangeFees,
//       gst,
//       stampDuty,
//       sebiCharges,
//       total: brokerage + stt + exchangeFees + gst + stampDuty + sebiCharges
//     }
//   }

//   private calculateOptionsCharges(orderValue: number, request: OrderRequest, instrument: any, config: any): ChargesBreakdown {
//     const premium = orderValue // For options, order value is premium
//     const strikeValue = Number(instrument.strike) * request.quantity
    
//     // Flat brokerage per lot
//     const brokerage = config.brokerage_type === 'FLAT'
//       ? Number(config.brokerage_value)
//       : Math.min(20, premium * Number(config.brokerage_value || 0.0003))
    
//     // STT on intrinsic value for sell, on premium for buy
//     const stt = request.orderSide === 'SELL'
//       ? Math.max(0, strikeValue - premium) * 0.0005 // 0.05% on intrinsic value
//       : 0
    
//     const exchangeFees = premium * Number(config.exchange_fee_rate || 0.00053)
//     const gst = (brokerage + exchangeFees) * Number(config.gst_rate) / 100
//     const stampDuty = request.orderSide === 'BUY'
//       ? premium * Number(config.stamp_duty_rate || 0.00003)
//       : 0
//     const sebiCharges = premium * Number(config.sebi_rate || 0.000001)
    
//     return {
//       brokerage,
//       stt,
//       exchangeFees,
//       gst,
//       stampDuty,
//       sebiCharges,
//       total: brokerage + stt + exchangeFees + gst + stampDuty + sebiCharges
//     }
//   }

//   private calculateForexCharges(orderValue: number, request: OrderRequest, config: any): ChargesBreakdown {
//     const brokerage = Math.min(500, orderValue * Number(config.brokerage_value || 0.0005))
//     const exchangeFees = orderValue * Number(config.exchange_fee_rate || 0.00001)
//     const gst = brokerage * Number(config.gst_rate) / 100
    
//     return {
//       brokerage,
//       stt: 0,
//       exchangeFees,
//       gst,
//       stampDuty: 0,
//       sebiCharges: 0,
//       total: brokerage + exchangeFees + gst
//     }
//   }

//   private calculateCryptoCharges(orderValue: number, request: OrderRequest, config: any): ChargesBreakdown {
//     const brokerage = orderValue * Number(config.brokerage_value || 0.002) // 0.2%
//     const gst = brokerage * Number(config.gst_rate) / 100
//     const tds = request.orderSide === 'SELL' ? orderValue * 0.01 : 0 // 1% TDS on sell
    
//     return {
//       brokerage,
//       stt: 0,
//       exchangeFees: 0,
//       gst,
//       stampDuty: 0,
//       sebiCharges: 0,
//       tds,
//       total: brokerage + gst + tds
//     }
//   }

//   private calculateCommodityCharges(orderValue: number, request: OrderRequest, config: any): ChargesBreakdown {
//     const brokerage = config.brokerage_type === 'FLAT'
//       ? Number(config.brokerage_value)
//       : Math.min(20, orderValue * Number(config.brokerage_value || 0.0003))
    
//     const exchangeFees = orderValue * Number(config.exchange_fee_rate || 0.00002)
//     const gst = (brokerage + exchangeFees) * Number(config.gst_rate) / 100
//     const stampDuty = request.orderSide === 'BUY'
//       ? orderValue * Number(config.stamp_duty_rate || 0.00002)
//       : 0
//     const sebiCharges = orderValue * Number(config.sebi_rate || 0.000001)
    
//     return {
//       brokerage,
//       stt: 0, // No STT on commodities
//       exchangeFees,
//       gst,
//       stampDuty,
//       sebiCharges,
//       total: brokerage + exchangeFees + gst + stampDuty + sebiCharges
//     }
//   }

//   calculateDefault(orderValue: number, request: OrderRequest, instrument: any): ChargesBreakdown {
//     // Default calculation when no config is found
//     const brokerage = Math.min(20, orderValue * 0.0003)
//     const stt = request.orderSide === 'SELL' ? orderValue * 0.00025 : 0
//     const exchangeFees = orderValue * 0.0000325
//     const gst = (brokerage + exchangeFees) * 0.18
//     const stampDuty = request.orderSide === 'BUY' ? orderValue * 0.00003 : 0
//     const sebiCharges = orderValue * 0.000001
    
//     return {
//       brokerage,
//       stt,
//       exchangeFees,
//       gst,
//       stampDuty,
//       sebiCharges,
//       total: brokerage + stt + exchangeFees + gst + stampDuty + sebiCharges
//     }
//   }
// }

// // Margin Calculator
// class MarginCalculator {
//   async calculate(request: OrderRequest, instrument: any): Promise<number> {
//     const orderValue = request.quantity * (request.price || instrument.ltp)
    
//     // Get risk config
//     const { data: riskConfig } = await supabaseServer
//       .from('risk_configs')
//       .select('*')
//       .eq('asset_class_id', instrument.asset_class_id)
//       .eq('product_type', request.productType)
//       .eq('is_active', true)
//       .single()
    
//     if (!riskConfig) {
//       // Default margins
//       return this.calculateDefault(orderValue, instrument.instrumentType, request.productType)
//     }
    
//     const leverage = Number(riskConfig.leverage) || 1
//     return orderValue / leverage
//   }

//   private calculateDefault(orderValue: number, instrumentType: string, productType: ProductType): number {
//     switch (instrumentType) {
//       case 'EQUITY':
//         return productType === 'INTRADAY' ? orderValue / 5 : orderValue // 5x for intraday, 1x for delivery
//       case 'FUTURE':
//         return orderValue / 10 // 10x leverage
//       case 'OPTION':
//         return orderValue // Full premium required
//       case 'CURRENCY_PAIR':
//         return orderValue / 50 // 50x leverage
//       case 'CRYPTO':
//         return orderValue / 2 // 2x leverage
//       case 'COMMODITY':
//         return orderValue / 10 // 10x leverage
//       default:
//         return orderValue // No leverage
//     }
//   }
// }

// // Fund Manager
// class FundManager {
//   async blockMargin(tradingAccountId: string, amount: number, orderId: string) {
//     const { error } = await supabaseServer.rpc('fn_block_margin', {
//       account_id: tradingAccountId,
//       p_amount: amount,
//       p_idem_key: orderId
//     })
    
//     if (error) {
//       throw new Error(`Failed to block margin: ${error.message}`)
//     }
//   }

//   async releaseMargin(tradingAccountId: string, amount: number, orderId: string) {
//     const { error } = await supabaseServer.rpc('fn_release_margin', {
//       account_id: tradingAccountId,
//       p_amount: amount,
//       p_idem_key: orderId
//     })
    
//     if (error) {
//       throw new Error(`Failed to release margin: ${error.message}`)
//     }
//   }
// }

// // Position Manager
// class PositionManager {
//   async updatePosition(data: any) {
//     // Check if position exists
//     const { data: existingPosition } = await supabaseServer
//       .from('positions')
//       .select('*')
//       .eq('trading_account_id', data.tradingAccountId)
//       .eq('symbol', data.symbol)
//       .eq('product_type', data.productType)
//       .single()
    
//     if (existingPosition) {
//       // Update existing position
//       const newQuantity = data.orderSide === 'BUY' 
//         ? existingPosition.quantity + data.quantity
//         : existingPosition.quantity - data.quantity
      
//       if (newQuantity === 0) {
//         // Close position
//         await supabaseServer
//           .from('positions')
//           .delete()
//           .eq('id', existingPosition.id)
//       } else {
//         // Update position
//         const newAvgPrice = data.orderSide === 'BUY'
//           ? ((existingPosition.average_price * existingPosition.quantity) + (data.price * data.quantity)) / (existingPosition.quantity + data.quantity)
//           : existingPosition.average_price
        
//         await supabaseServer
//           .from('positions')
//           .update({
//             quantity: newQuantity,
//             average_price: newAvgPrice,
//             total_brokerage: existingPosition.total_brokerage + data.charges.brokerage,
//             total_taxes: existingPosition.total_taxes + (data.charges.total - data.charges.brokerage)
//           })
//           .eq('id', existingPosition.id)
//       }
//     } else if (data.orderSide === 'BUY') {
//       // Create new position
//       await supabaseServer
//         .from('positions')
//         .insert({
//           trading_account_id: data.tradingAccountId,
//           instrument_id: data.instrumentId,
//           symbol: data.symbol,
//           product_type: data.productType,
//           quantity: data.quantity,
//           average_price: data.price,
//           buy_quantity: data.quantity,
//           buy_average: data.price,
//           total_brokerage: data.charges.brokerage,
//           total_taxes: data.charges.total - data.charges.brokerage
//         })
//     }
//   }
// }

// // Transaction Logger
// class TransactionLogger {
//   async logOrderExecution(data: any) {
//     const { orderId, tradingAccountId, execution, charges } = data
    
//     // Get current balance
//     const { data: account } = await supabaseServer
//       .from('trading_accounts')
//       .select('balance')
//       .eq('id', tradingAccountId)
//       .single()
    
//     const openingBalance = Number(account?.balance || 0)
//     const netAmount = (execution.filledQuantity * execution.averagePrice) + charges.total
//     const closingBalance = openingBalance - netAmount
    
//     // Create transaction record
//     await supabaseServer
//       .from('transactions')
//       .insert({
//         trading_account_id: tradingAccountId,
//         amount: netAmount,
//         type: 'DEBIT',
//         category: 'TRADING',
//         sub_category: 'ORDER_EXECUTION',
//         reference_type: 'ORDER',
//         reference_id: orderId,
//         opening_balance: openingBalance,
//         closing_balance: closingBalance,
//         base_amount: execution.filledQuantity * execution.averagePrice,
//         charges: charges.brokerage + charges.exchangeFees + charges.clearingFees,
//         taxes: charges.stt + charges.gst + charges.stampDuty + charges.sebiCharges,
//         net_amount: netAmount,
//         description: `Order ${orderId} executed`,
//         is_settled: false,
//         settlement_date: this.getSettlementDate()
//       })
    
//     // Create charge entries
//     await this.createChargeEntries(orderId, charges)
//   }

//   private async createChargeEntries(orderId: string, charges: ChargesBreakdown) {
//     const entries = [
//       { charge_type: 'BROKERAGE', amount: charges.brokerage },
//       { charge_type: 'STT', amount: charges.stt },
//       { charge_type: 'EXCHANGE_FEE', amount: charges.exchangeFees },
//       { charge_type: 'GST', amount: charges.gst },
//       { charge_type: 'STAMP_DUTY', amount: charges.stampDuty },
//       { charge_type: 'SEBI_FEE', amount: charges.sebiCharges }
//     ].filter(e => e.amount > 0)
    
//     if (entries.length > 0) {
//       await supabaseServer
//         .from('order_charges')
//         .insert(entries.map(e => ({ ...e, order_id: orderId })))
//     }
//   }

//   private getSettlementDate(): Date {
//     const today = new Date()
//     const settlementDate = new Date(today)
//     settlementDate.setDate(today.getDate() + 2) // T+2 settlement
    
//     // Skip weekends
//     if (settlementDate.getDay() === 6) settlementDate.setDate(settlementDate.getDate() + 2)
//     if (settlementDate.getDay() === 0) settlementDate.setDate(settlementDate.getDate() + 1)
    
//     return settlementDate
//   }
// }

// // Export singleton instance
// export const orderExecutionService = new OrderExecutionService()
