# Trading Platform Enhancement Plan

## Executive Summary
Your trading platform currently has fundamental issues with order placement, fund management, position tracking, and transaction logging. This plan outlines a comprehensive solution to make your platform production-ready with support for multiple asset classes.

## Critical Issues Identified

### 1. Database Schema Limitations
- **Order Model**: Missing fields for charges breakdown, taxes, exchange fees
- **Transaction Model**: Too simplistic for detailed statements
- **No support** for different asset types (Forex, Crypto, Commodities)
- **Missing models** for charges, settlements, and detailed trade logs

### 2. Order Placement Problems
- Hardcoded brokerage calculations
- No STT, GST, exchange fees calculation
- Limited product types (only MIS/CNC)
- No validation for different segments
- Missing risk management checks

### 3. Fund Management Issues
- Basic margin blocking without proper categorization
- No tracking of different margin types (SPAN, Exposure, VaR)
- Missing settlement and clearing processes
- No proper ledger maintenance

### 4. Position Tracking Deficiencies
- Basic P&L calculation without charges
- No real-time MTM updates
- Missing support for complex positions (spreads, hedged)
- No portfolio analytics

### 5. Transaction Logging Gaps
- Minimal transaction details
- No proper audit trail
- Cannot generate comprehensive statements
- Missing regulatory compliance logs

## Proposed Solution Architecture

### Phase 1: Database Schema Enhancement (Day 1-2)

#### 1.1 Enhanced Order Model
```prisma
model Order {
  // Existing fields...
  
  // New fields for comprehensive tracking
  instrumentType    String      // EQUITY, FUTURE, OPTION, FOREX, COMMODITY, CRYPTO
  exchangeOrderId   String?     // Exchange reference
  
  // Charges breakdown
  brokerage        Decimal     @db.Decimal(10, 2)
  stt              Decimal     @db.Decimal(10, 2)
  exchangeFees     Decimal     @db.Decimal(10, 2)
  gst              Decimal     @db.Decimal(10, 2)
  stampDuty        Decimal     @db.Decimal(10, 2)
  sebiCharges      Decimal     @db.Decimal(10, 2)
  totalCharges     Decimal     @db.Decimal(10, 2)
  
  // Risk parameters
  stopLoss         Decimal?    @db.Decimal(10, 2)
  takeProfit       Decimal?    @db.Decimal(10, 2)
  trailingStop     Boolean     @default(false)
  
  // Margin details
  marginRequired   Decimal     @db.Decimal(10, 2)
  marginBlocked    Decimal     @db.Decimal(10, 2)
  leverageUsed     Int         @default(1)
  
  // Additional metadata
  ipAddress        String?
  deviceId         String?
  remarks          String?
  parentOrderId    String?     // For bracket/cover orders
  
  charges          OrderCharges[]
  executions       OrderExecution[]
}

model OrderCharges {
  id              String      @id @default(uuid())
  orderId         String
  chargeType      ChargeType
  amount          Decimal     @db.Decimal(10, 2)
  rate            Decimal?    @db.Decimal(10, 4)
  description     String?
  createdAt       DateTime    @default(now())
  
  order           Order       @relation(fields: [orderId], references: [id])
}

model OrderExecution {
  id              String      @id @default(uuid())
  orderId         String
  executionTime   DateTime
  quantity        Int
  price           Decimal     @db.Decimal(10, 2)
  exchangeRef     String?
  
  order           Order       @relation(fields: [orderId], references: [id])
}

enum ChargeType {
  BROKERAGE
  STT
  EXCHANGE_FEE
  GST
  STAMP_DUTY
  SEBI_FEE
  CLEARING_FEE
  OTHER
}
```

#### 1.2 Enhanced Transaction Model
```prisma
model Transaction {
  // Existing fields...
  
  // New categorization
  category         TransactionCategory
  subCategory      String?
  
  // Reference tracking
  referenceType    String?     // ORDER, POSITION, SETTLEMENT, DEPOSIT, WITHDRAWAL
  referenceId      String?
  
  // Balance tracking
  openingBalance   Decimal     @db.Decimal(18, 2)
  closingBalance   Decimal     @db.Decimal(18, 2)
  
  // Settlement info
  settlementDate   DateTime?
  isSettled        Boolean     @default(false)
  
  // Detailed breakdown
  baseAmount       Decimal     @db.Decimal(18, 2)
  charges          Decimal?    @db.Decimal(10, 2)
  taxes            Decimal?    @db.Decimal(10, 2)
  netAmount        Decimal     @db.Decimal(18, 2)
  
  // Audit
  approvedBy       String?
  approvedAt       DateTime?
  remarks          String?
}

enum TransactionCategory {
  TRADING
  DEPOSIT
  WITHDRAWAL
  CHARGES
  DIVIDEND
  INTEREST
  SETTLEMENT
  MARGIN
  PENALTY
  OTHER
}
```

#### 1.3 New Asset Support Models
```prisma
model AssetClass {
  id              String      @id @default(uuid())
  name            String      @unique // EQUITY, FUTURES, OPTIONS, FOREX, COMMODITY, CRYPTO
  description     String?
  tradingHours    Json        // Market timings
  
  instruments     Instrument[]
  riskConfigs     RiskConfig[]
}

model Instrument {
  id              String      @id @default(uuid())
  assetClassId    String
  symbol          String
  name            String
  
  // Common fields
  exchange        String
  ticker          String
  instrumentType  String      // STOCK, INDEX, FUTURE, OPTION, CURRENCY_PAIR, COMMODITY, CRYPTO
  
  // Asset specific
  contractSize    Decimal?    @db.Decimal(10, 2)
  tickSize        Decimal?    @db.Decimal(10, 4)
  lotSize         Int?
  
  // F&O specific
  underlying      String?
  expiry          DateTime?
  strike          Decimal?    @db.Decimal(10, 2)
  optionType      String?     // CE, PE
  
  // Forex/Crypto specific
  baseCurrency    String?
  quoteCurrency   String?
  pip             Decimal?    @db.Decimal(10, 6)
  
  isActive        Boolean     @default(true)
  
  assetClass      AssetClass  @relation(fields: [assetClassId], references: [id])
}

model RiskConfig {
  id              String      @id @default(uuid())
  assetClassId    String
  productType     String      // INTRADAY, DELIVERY, FUTURES, OPTIONS
  
  // Margin parameters
  initialMargin   Decimal     @db.Decimal(5, 2)   // Percentage
  maintenanceMargin Decimal   @db.Decimal(5, 2)   // Percentage
  leverage        Int         @default(1)
  
  // Charges configuration
  brokerageType   String      // FLAT, PERCENTAGE, PER_LOT
  brokerageValue  Decimal     @db.Decimal(10, 4)
  maxBrokerage    Decimal?    @db.Decimal(10, 2)
  
  // Tax rates (percentages)
  sttRate         Decimal?    @db.Decimal(5, 4)
  gstRate         Decimal     @db.Decimal(5, 2)   @default(18.0)
  exchangeFeeRate Decimal?    @db.Decimal(5, 4)
  
  isActive        Boolean     @default(true)
  
  assetClass      AssetClass  @relation(fields: [assetClassId], references: [id])
}
```

### Phase 2: Order Execution System (Day 3-4)

#### 2.1 Enhanced Order Placement Service
```typescript
// lib/server/enhanced-order-execution.ts

interface OrderRequest {
  tradingAccountId: string
  instrumentId: string
  quantity: number
  orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SL-M'
  orderSide: 'BUY' | 'SELL'
  price?: number
  triggerPrice?: number
  productType: string
  validity: 'DAY' | 'IOC' | 'GTC'
  
  // Advanced order types
  isAMO?: boolean  // After Market Order
  isBracket?: boolean
  squareOffValue?: number
  stopLossValue?: number
  trailingStop?: number
}

class OrderExecutionService {
  async validateOrder(request: OrderRequest): Promise<ValidationResult> {
    // Check market hours
    // Validate instrument
    // Check circuit limits
    // Verify margin requirements
    // Risk management checks
  }
  
  async calculateCharges(request: OrderRequest): Promise<ChargesBreakdown> {
    const instrument = await this.getInstrument(request.instrumentId)
    const riskConfig = await this.getRiskConfig(instrument.assetClassId, request.productType)
    
    const orderValue = request.quantity * (request.price || instrument.ltp)
    
    return {
      brokerage: this.calculateBrokerage(orderValue, riskConfig),
      stt: this.calculateSTT(orderValue, instrument, request.orderSide),
      exchangeFees: this.calculateExchangeFees(orderValue, instrument),
      gst: this.calculateGST(brokerage + exchangeFees),
      stampDuty: this.calculateStampDuty(orderValue, request.orderSide),
      sebiCharges: this.calculateSEBI(orderValue),
      total: // sum of all charges
    }
  }
  
  async executeOrder(request: OrderRequest): Promise<OrderResult> {
    // Begin transaction
    const validation = await this.validateOrder(request)
    if (!validation.isValid) throw new Error(validation.message)
    
    const charges = await this.calculateCharges(request)
    const marginRequired = await this.calculateMargin(request)
    
    // Block margin
    await this.fundManager.blockMargin(
      request.tradingAccountId,
      marginRequired + charges.total
    )
    
    // Create order record
    const order = await this.createOrder({
      ...request,
      ...charges,
      marginRequired,
      status: 'PENDING'
    })
    
    // Send to exchange (simulation/real)
    const execution = await this.sendToExchange(order)
    
    // Update order status
    await this.updateOrderStatus(order.id, execution)
    
    // Update position if executed
    if (execution.status === 'EXECUTED') {
      await this.positionManager.updatePosition(order)
    }
    
    // Log transaction
    await this.transactionLogger.logOrderExecution(order, execution)
    
    return { order, execution }
  }
}
```

#### 2.2 Comprehensive Charges Calculator
```typescript
// lib/server/charges-calculator.ts

class ChargesCalculator {
  // Equity Intraday
  calculateEquityIntradayCharges(orderValue: number, side: 'BUY' | 'SELL') {
    const brokerage = Math.min(20, orderValue * 0.0003)  // 0.03% or ₹20
    const stt = side === 'SELL' ? orderValue * 0.00025 : 0  // 0.025% on sell
    const exchangeFees = orderValue * 0.0000325  // NSE fees
    const gst = (brokerage + exchangeFees) * 0.18
    const sebi = orderValue * 0.000001  // ₹10 per crore
    const stampDuty = side === 'BUY' ? orderValue * 0.00003 : 0  // 0.003% on buy
    
    return { brokerage, stt, exchangeFees, gst, sebi, stampDuty }
  }
  
  // Equity Delivery
  calculateEquityDeliveryCharges(orderValue: number, side: 'BUY' | 'SELL') {
    const brokerage = 0  // Free delivery
    const stt = orderValue * 0.001  // 0.1% on both sides
    const exchangeFees = orderValue * 0.0000325
    const gst = exchangeFees * 0.18
    const sebi = orderValue * 0.000001
    const stampDuty = side === 'BUY' ? orderValue * 0.00015 : 0  // 0.015% on buy
    
    return { brokerage, stt, exchangeFees, gst, sebi, stampDuty }
  }
  
  // F&O Futures
  calculateFuturesCharges(orderValue: number, side: 'BUY' | 'SELL') {
    const brokerage = 20  // Flat ₹20 per order
    const stt = side === 'SELL' ? orderValue * 0.0001 : 0  // 0.01% on sell
    const exchangeFees = orderValue * 0.00002
    const gst = (brokerage + exchangeFees) * 0.18
    const sebi = orderValue * 0.000001
    const stampDuty = side === 'BUY' ? orderValue * 0.00002 : 0
    
    return { brokerage, stt, exchangeFees, gst, sebi, stampDuty }
  }
  
  // F&O Options
  calculateOptionsCharges(orderValue: number, premium: number, side: 'BUY' | 'SELL') {
    const brokerage = 20  // Flat ₹20 per order
    const stt = side === 'SELL' ? orderValue * 0.0005 : 0  // 0.05% on sell (on strike)
    const exchangeFees = premium * 0.00053  // On premium
    const gst = (brokerage + exchangeFees) * 0.18
    const sebi = premium * 0.000001
    const stampDuty = side === 'BUY' ? premium * 0.00003 : 0
    
    return { brokerage, stt, exchangeFees, gst, sebi, stampDuty }
  }
  
  // Forex
  calculateForexCharges(orderValue: number, pipValue: number) {
    const brokerage = Math.min(500, orderValue * 0.0005)  // 0.05% or ₹500
    const gst = brokerage * 0.18
    const exchangeFees = orderValue * 0.00001
    
    return { brokerage, gst, exchangeFees, stt: 0, sebi: 0, stampDuty: 0 }
  }
  
  // Crypto
  calculateCryptoCharges(orderValue: number, side: 'BUY' | 'SELL') {
    const brokerage = orderValue * 0.002  // 0.2%
    const gst = brokerage * 0.18
    const tds = side === 'SELL' ? orderValue * 0.01 : 0  // 1% TDS on sell
    
    return { brokerage, gst, tds, stt: 0, exchangeFees: 0, sebi: 0, stampDuty: 0 }
  }
}
```

### Phase 3: Fund Management System (Day 5)

#### 3.1 Enhanced Fund Manager
```typescript
// lib/server/enhanced-fund-manager.ts

class EnhancedFundManager {
  async getAccountSummary(accountId: string) {
    const account = await db.tradingAccount.findUnique({
      where: { id: accountId },
      include: {
        positions: true,
        orders: { where: { status: 'PENDING' } }
      }
    })
    
    const margins = await this.calculateMargins(account)
    
    return {
      totalBalance: account.balance,
      availableCash: account.availableMargin,
      
      margins: {
        spanMargin: margins.span,
        exposureMargin: margins.exposure,
        varMargin: margins.var,
        totalMarginUsed: margins.total,
        availableMargin: account.balance - margins.total
      },
      
      positions: {
        totalValue: this.calculatePositionsValue(account.positions),
        unrealizedPnl: this.calculateUnrealizedPnl(account.positions),
        realizedPnl: await this.getRealizedPnl(accountId)
      },
      
      pendingOrders: {
        count: account.orders.length,
        marginBlocked: this.calculatePendingOrdersMargin(account.orders)
      }
    }
  }
  
  async processDeposit(accountId: string, amount: number, method: string) {
    // Create deposit transaction
    // Update account balance
    // Send confirmation
    // Log for audit
  }
  
  async processWithdrawal(accountId: string, amount: number) {
    // Validate available balance
    // Create withdrawal request
    // Block amount
    // Process settlement
  }
  
  async settleAccount(accountId: string) {
    // Calculate daily settlement
    // Process MTM
    // Update ledger
    // Generate settlement statement
  }
}
```

### Phase 4: Position Management Enhancement (Day 6)

#### 4.1 Advanced Position Tracker
```typescript
// lib/server/enhanced-position-manager.ts

class EnhancedPositionManager {
  async updatePosition(order: Order) {
    const position = await this.getOrCreatePosition(order)
    
    if (order.orderSide === 'BUY') {
      position.quantity += order.filledQuantity
      position.averagePrice = this.calculateWeightedAverage(position, order)
    } else {
      position.quantity -= order.filledQuantity
      if (position.quantity === 0) {
        await this.closePosition(position, order)
      }
    }
    
    // Calculate MTM
    const mtm = await this.calculateMTM(position)
    position.unrealizedPnl = mtm.unrealized
    position.dayPnl = mtm.day
    
    await db.position.update({
      where: { id: position.id },
      data: position
    })
    
    // Update margin requirements
    await this.fundManager.recalculateMargins(position.tradingAccountId)
  }
  
  async calculateMTM(position: Position) {
    const ltp = await this.getLatestPrice(position.instrumentId)
    const previousClose = await this.getPreviousClose(position.instrumentId)
    
    const currentValue = position.quantity * ltp
    const costValue = position.quantity * position.averagePrice
    const previousValue = position.quantity * previousClose
    
    return {
      unrealized: currentValue - costValue,
      day: currentValue - previousValue,
      ltp,
      currentValue
    }
  }
  
  async handleSquareOff(positionId: string) {
    // Create counter order
    // Execute at market
    // Calculate P&L including charges
    // Update ledger
    // Release margin
  }
  
  async handleOptionsExpiry() {
    // Check all option positions
    // Process ITM options
    // Let OTM options expire worthless
    // Update accounts
  }
}
```

### Phase 5: Transaction Logging & Statements (Day 7)

#### 5.1 Comprehensive Transaction Logger
```typescript
// lib/server/transaction-logger.ts

class TransactionLogger {
  async logOrderExecution(order: Order, execution: Execution) {
    const transaction = {
      tradingAccountId: order.tradingAccountId,
      category: 'TRADING',
      subCategory: order.orderSide,
      type: order.orderSide === 'BUY' ? 'DEBIT' : 'CREDIT',
      
      referenceType: 'ORDER',
      referenceId: order.id,
      
      baseAmount: execution.quantity * execution.price,
      charges: order.totalCharges,
      taxes: order.gst + order.stt,
      netAmount: this.calculateNetAmount(order, execution),
      
      description: `${order.orderSide} ${execution.quantity} ${order.symbol} @ ${execution.price}`,
      
      openingBalance: await this.getBalance(order.tradingAccountId),
      closingBalance: await this.getUpdatedBalance(order.tradingAccountId),
      
      settlementDate: this.getSettlementDate(order),
      isSettled: false
    }
    
    await db.transaction.create({ data: transaction })
    
    // Create charge entries
    await this.createChargeEntries(order)
    
    // Update audit log
    await this.auditLogger.log({
      action: 'ORDER_EXECUTED',
      userId: order.userId,
      details: { order, execution, transaction }
    })
  }
  
  async generateStatement(accountId: string, fromDate: Date, toDate: Date) {
    const transactions = await db.transaction.findMany({
      where: {
        tradingAccountId: accountId,
        createdAt: { gte: fromDate, lte: toDate }
      },
      orderBy: { createdAt: 'asc' }
    })
    
    const statement = {
      accountId,
      period: { from: fromDate, to: toDate },
      openingBalance: transactions[0]?.openingBalance || 0,
      closingBalance: transactions[transactions.length - 1]?.closingBalance || 0,
      
      summary: {
        totalBuy: this.sumByCategory(transactions, 'BUY'),
        totalSell: this.sumByCategory(transactions, 'SELL'),
        totalCharges: this.sumCharges(transactions),
        totalTaxes: this.sumTaxes(transactions),
        netPnl: this.calculateNetPnl(transactions)
      },
      
      transactions: transactions.map(t => ({
        date: t.createdAt,
        description: t.description,
        debit: t.type === 'DEBIT' ? t.netAmount : null,
        credit: t.type === 'CREDIT' ? t.netAmount : null,
        balance: t.closingBalance
      }))
    }
    
    return statement
  }
}
```

### Phase 6: Multi-Asset Support Implementation (Day 8)

#### 6.1 Asset-Specific Handlers
```typescript
// lib/server/asset-handlers/index.ts

interface AssetHandler {
  validateOrder(order: OrderRequest): Promise<ValidationResult>
  calculateMargin(order: OrderRequest): Promise<number>
  calculateCharges(order: OrderRequest): Promise<ChargesBreakdown>
  executeOrder(order: OrderRequest): Promise<ExecutionResult>
  handleSettlement(position: Position): Promise<void>
}

// Forex Handler
class ForexHandler implements AssetHandler {
  async validateOrder(order: OrderRequest) {
    // Check forex market hours (24/5)
    // Validate currency pair
    // Check lot size (usually 1000 units minimum)
    // Verify leverage limits
  }
  
  async calculateMargin(order: OrderRequest) {
    // Forex typically offers high leverage (1:50 to 1:500)
    const leverage = 50
    return (order.quantity * order.price) / leverage
  }
}

// Crypto Handler
class CryptoHandler implements AssetHandler {
  async validateOrder(order: OrderRequest) {
    // Check 24/7 availability
    // Validate crypto pair
    // Check minimum order size
    // KYC requirements for crypto
  }
  
  async calculateCharges(order: OrderRequest) {
    // Different fee structure for crypto
    // Include network fees for withdrawals
    // TDS calculations for Indian users
  }
}

// Commodity Handler
class CommodityHandler implements AssetHandler {
  async validateOrder(order: OrderRequest) {
    // MCX market hours
    // Lot sizes for gold, silver, crude
    // Delivery vs non-delivery
  }
}
```

### Phase 7: Database Migrations & Setup (Day 9)

```sql
-- migrations/enhance_trading_system.sql

-- Add new tables for enhanced trading
CREATE TABLE asset_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  trading_hours JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_class_id UUID REFERENCES asset_classes(id),
  symbol VARCHAR(50) NOT NULL,
  name VARCHAR(200) NOT NULL,
  exchange VARCHAR(20),
  instrument_type VARCHAR(50),
  contract_size DECIMAL(10,2),
  tick_size DECIMAL(10,4),
  lot_size INT,
  -- F&O fields
  underlying VARCHAR(50),
  expiry DATE,
  strike DECIMAL(10,2),
  option_type VARCHAR(2),
  -- Forex/Crypto fields
  base_currency VARCHAR(10),
  quote_currency VARCHAR(10),
  pip DECIMAL(10,6),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced orders table
ALTER TABLE orders ADD COLUMN instrument_type VARCHAR(50);
ALTER TABLE orders ADD COLUMN exchange_order_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN brokerage DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN stt DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN exchange_fees DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN gst DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN stamp_duty DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN sebi_charges DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN total_charges DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN margin_required DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN margin_blocked DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN leverage_used INT DEFAULT 1;
ALTER TABLE orders ADD COLUMN stop_loss DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN take_profit DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN trailing_stop BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN parent_order_id UUID;
ALTER TABLE orders ADD COLUMN ip_address VARCHAR(50);
ALTER TABLE orders ADD COLUMN device_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN remarks TEXT;

-- Order charges breakdown
CREATE TABLE order_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  charge_type VARCHAR(50),
  amount DECIMAL(10,2),
  rate DECIMAL(10,4),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Order executions
CREATE TABLE order_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  execution_time TIMESTAMP,
  quantity INT,
  price DECIMAL(10,2),
  exchange_ref VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enhanced transactions
ALTER TABLE transactions ADD COLUMN category VARCHAR(50);
ALTER TABLE transactions ADD COLUMN sub_category VARCHAR(50);
ALTER TABLE transactions ADD COLUMN reference_type VARCHAR(50);
ALTER TABLE transactions ADD COLUMN reference_id UUID;
ALTER TABLE transactions ADD COLUMN opening_balance DECIMAL(18,2);
ALTER TABLE transactions ADD COLUMN closing_balance DECIMAL(18,2);
ALTER TABLE transactions ADD COLUMN settlement_date DATE;
ALTER TABLE transactions ADD COLUMN is_settled BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN base_amount DECIMAL(18,2);
ALTER TABLE transactions ADD COLUMN charges DECIMAL(10,2);
ALTER TABLE transactions ADD COLUMN taxes DECIMAL(10,2);
ALTER TABLE transactions ADD COLUMN net_amount DECIMAL(18,2);
ALTER TABLE transactions ADD COLUMN approved_by VARCHAR(100);
ALTER TABLE transactions ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN remarks TEXT;

-- Risk configurations
CREATE TABLE risk_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_class_id UUID REFERENCES asset_classes(id),
  product_type VARCHAR(50),
  initial_margin DECIMAL(5,2),
  maintenance_margin DECIMAL(5,2),
  leverage INT DEFAULT 1,
  brokerage_type VARCHAR(20),
  brokerage_value DECIMAL(10,4),
  max_brokerage DECIMAL(10,2),
  stt_rate DECIMAL(5,4),
  gst_rate DECIMAL(5,2) DEFAULT 18.0,
  exchange_fee_rate DECIMAL(5,4),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_instruments_symbol ON instruments(symbol);
CREATE INDEX idx_instruments_asset_class ON instruments(asset_class_id);
CREATE INDEX idx_order_charges_order ON order_charges(order_id);
CREATE INDEX idx_order_executions_order ON order_executions(order_id);
CREATE INDEX idx_transactions_reference ON transactions(reference_type, reference_id);
CREATE INDEX idx_transactions_settlement ON transactions(settlement_date, is_settled);

-- Insert default asset classes
INSERT INTO asset_classes (name, description, trading_hours) VALUES
('EQUITY', 'Stocks and ETFs', '{"open": "09:15", "close": "15:30", "days": ["MON","TUE","WED","THU","FRI"]}'),
('FUTURES', 'Future Contracts', '{"open": "09:15", "close": "15:30", "days": ["MON","TUE","WED","THU","FRI"]}'),
('OPTIONS', 'Option Contracts', '{"open": "09:15", "close": "15:30", "days": ["MON","TUE","WED","THU","FRI"]}'),
('FOREX', 'Foreign Exchange', '{"open": "00:00", "close": "23:59", "days": ["MON","TUE","WED","THU","FRI"]}'),
('COMMODITY', 'MCX Commodities', '{"open": "09:00", "close": "23:30", "days": ["MON","TUE","WED","THU","FRI"]}'),
('CRYPTO', 'Cryptocurrencies', '{"open": "00:00", "close": "23:59", "days": ["MON","TUE","WED","THU","FRI","SAT","SUN"]}');

-- Insert default risk configurations
INSERT INTO risk_configs (asset_class_id, product_type, initial_margin, maintenance_margin, leverage, brokerage_type, brokerage_value, max_brokerage, stt_rate, exchange_fee_rate)
SELECT id, 'INTRADAY', 5.0, 3.0, 20, 'PERCENTAGE', 0.0003, 20, 0.00025, 0.0000325
FROM asset_classes WHERE name = 'EQUITY';

INSERT INTO risk_configs (asset_class_id, product_type, initial_margin, maintenance_margin, leverage, brokerage_type, brokerage_value, stt_rate, exchange_fee_rate)
SELECT id, 'DELIVERY', 20.0, 15.0, 5, 'PERCENTAGE', 0, null, 0.001, 0.0000325
FROM asset_classes WHERE name = 'EQUITY';

-- Create functions for calculations
CREATE OR REPLACE FUNCTION calculate_brokerage(
  p_order_value DECIMAL,
  p_brokerage_type VARCHAR,
  p_brokerage_value DECIMAL,
  p_max_brokerage DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  IF p_brokerage_type = 'FLAT' THEN
    RETURN p_brokerage_value;
  ELSIF p_brokerage_type = 'PERCENTAGE' THEN
    IF p_max_brokerage IS NOT NULL THEN
      RETURN LEAST(p_order_value * p_brokerage_value, p_max_brokerage);
    ELSE
      RETURN p_order_value * p_brokerage_value;
    END IF;
  END IF;
  RETURN 0;
END;
$$ LANGUAGE plpgsql;

-- Enhanced order execution function
CREATE OR REPLACE FUNCTION fn_execute_order_enhanced(
  p_order_id UUID,
  p_account_id UUID,
  p_instrument_id UUID,
  p_qty INT,
  p_side VARCHAR,
  p_price DECIMAL,
  p_charges JSONB
) RETURNS VOID AS $$
DECLARE
  v_margin_required DECIMAL;
  v_total_charges DECIMAL;
BEGIN
  -- Calculate total charges
  v_total_charges := (p_charges->>'brokerage')::DECIMAL +
                     (p_charges->>'stt')::DECIMAL +
                     (p_charges->>'exchange_fees')::DECIMAL +
                     (p_charges->>'gst')::DECIMAL +
                     (p_charges->>'stamp_duty')::DECIMAL +
                     (p_charges->>'sebi_charges')::DECIMAL;
  
  -- Begin transaction
  PERFORM pg_advisory_xact_lock(hashtext(p_account_id::TEXT));
  
  -- Block margin and debit charges
  UPDATE trading_accounts
  SET available_margin = available_margin - (v_margin_required + v_total_charges),
      used_margin = used_margin + v_margin_required,
      updated_at = NOW()
  WHERE id = p_account_id
    AND available_margin >= (v_margin_required + v_total_charges);
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient margin';
  END IF;
  
  -- Update order with charges
  UPDATE orders
  SET status = 'EXECUTED',
      filled_quantity = p_qty,
      average_price = p_price,
      executed_at = NOW(),
      brokerage = (p_charges->>'brokerage')::DECIMAL,
      stt = (p_charges->>'stt')::DECIMAL,
      exchange_fees = (p_charges->>'exchange_fees')::DECIMAL,
      gst = (p_charges->>'gst')::DECIMAL,
      stamp_duty = (p_charges->>'stamp_duty')::DECIMAL,
      sebi_charges = (p_charges->>'sebi_charges')::DECIMAL,
      total_charges = v_total_charges
  WHERE id = p_order_id;
  
  -- Create transaction entries
  INSERT INTO transactions (
    trading_account_id, amount, type, category, sub_category,
    reference_type, reference_id, description
  ) VALUES
    (p_account_id, p_qty * p_price, 
     CASE WHEN p_side = 'BUY' THEN 'DEBIT' ELSE 'CREDIT' END,
     'TRADING', p_side, 'ORDER', p_order_id,
     FORMAT('%s %s shares @ %s', p_side, p_qty, p_price)),
    (p_account_id, v_total_charges, 'DEBIT', 'CHARGES', 'BROKERAGE',
     'ORDER', p_order_id, 'Trading charges');
  
  -- Update or create position
  PERFORM update_position_for_order(p_order_id);
END;
$$ LANGUAGE plpgsql;
```

### Phase 8: API Updates (Day 10)

#### 8.1 Enhanced REST APIs
```typescript
// app/api/trading/v2/orders/route.ts

export async function POST(req: Request) {
  const session = await getSession()
  const body = await req.json()
  
  // Enhanced validation
  const validation = await validateOrderRequest(body, session)
  if (!validation.success) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }
  
  // Get instrument details
  const instrument = await getInstrument(body.instrumentId)
  
  // Calculate charges upfront
  const charges = await calculateCharges({
    instrument,
    quantity: body.quantity,
    price: body.price || instrument.ltp,
    orderSide: body.orderSide,
    productType: body.productType
  })
  
  // Check margin
  const marginRequired = await calculateMarginRequired({
    instrument,
    quantity: body.quantity,
    price: body.price || instrument.ltp,
    productType: body.productType
  })
  
  const account = await getTradingAccount(body.tradingAccountId)
  if (account.availableMargin < marginRequired + charges.total) {
    return NextResponse.json({
      error: 'Insufficient margin',
      required: marginRequired + charges.total,
      available: account.availableMargin
    }, { status: 400 })
  }
  
  // Execute order
  try {
    const result = await orderExecutionService.executeOrder({
      ...body,
      charges,
      marginRequired,
      session
    })
    
    // Send real-time update
    await sendRealtimeUpdate('order.placed', result)
    
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Order execution failed', error)
    return NextResponse.json({ 
      error: 'Order execution failed',
      details: error.message 
    }, { status: 500 })
  }
}

// Get order history with filters
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  
  const filters = {
    tradingAccountId: searchParams.get('accountId'),
    status: searchParams.get('status'),
    instrumentType: searchParams.get('type'),
    fromDate: searchParams.get('from'),
    toDate: searchParams.get('to'),
    page: parseInt(searchParams.get('page') || '1'),
    limit: parseInt(searchParams.get('limit') || '50')
  }
  
  const orders = await getOrders(filters)
  
  return NextResponse.json({
    orders: orders.data,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total: orders.total,
      hasMore: orders.hasMore
    }
  })
}
```

### Phase 9: Real-time Updates & WebSocket (Day 11)

```typescript
// app/api/ws/enhanced-trading/route.ts

class EnhancedTradingWebSocket {
  private connections: Map<string, WebSocket> = new Map()
  private subscriptions: Map<string, Set<string>> = new Map()
  
  async handleConnection(ws: WebSocket, userId: string) {
    this.connections.set(userId, ws)
    
    ws.on('message', async (message) => {
      const data = JSON.parse(message)
      
      switch(data.type) {
        case 'SUBSCRIBE_ORDERS':
          await this.subscribeToOrders(userId, data.accountId)
          break
        case 'SUBSCRIBE_POSITIONS':
          await this.subscribeToPositions(userId, data.accountId)
          break
        case 'SUBSCRIBE_MARKET_DEPTH':
          await this.subscribeToMarketDepth(userId, data.instrumentIds)
          break
        case 'SUBSCRIBE_PORTFOLIO':
          await this.subscribeToPortfolio(userId, data.accountId)
          break
      }
    })
    
    // Send initial data
    await this.sendInitialData(ws, userId)
  }
  
  async broadcastOrderUpdate(order: Order) {
    const message = {
      type: 'ORDER_UPDATE',
      data: order,
      timestamp: new Date().toISOString()
    }
    
    const subscribers = this.subscriptions.get(`order:${order.tradingAccountId}`)
    subscribers?.forEach(userId => {
      const ws = this.connections.get(userId)
      ws?.send(JSON.stringify(message))
    })
  }
  
  async broadcastPositionUpdate(position: Position) {
    const message = {
      type: 'POSITION_UPDATE',
      data: {
        ...position,
        mtm: await this.calculateMTM(position)
      },
      timestamp: new Date().toISOString()
    }
    
    const subscribers = this.subscriptions.get(`position:${position.tradingAccountId}`)
    subscribers?.forEach(userId => {
      const ws = this.connections.get(userId)
      ws?.send(JSON.stringify(message))
    })
  }
}
```

### Phase 10: Testing & Deployment (Day 12)

#### 10.1 Comprehensive Testing Suite
```typescript
// tests/trading-system.test.ts

describe('Enhanced Trading System', () => {
  describe('Order Placement', () => {
    it('should calculate correct charges for equity intraday', async () => {
      const charges = await calculateCharges({
        instrumentType: 'EQUITY',
        productType: 'INTRADAY',
        orderValue: 100000,
        orderSide: 'BUY'
      })
      
      expect(charges.brokerage).toBe(20) // Capped at ₹20
      expect(charges.stt).toBe(0) // No STT on buy
      expect(charges.gst).toBeCloseTo(3.6) // 18% of brokerage
    })
    
    it('should handle F&O orders correctly', async () => {
      const order = await placeOrder({
        instrumentType: 'OPTION',
        symbol: 'NIFTY24DEC25000CE',
        quantity: 50, // 1 lot
        orderType: 'LIMIT',
        price: 150,
        productType: 'NORMAL'
      })
      
      expect(order.status).toBe('PENDING')
      expect(order.marginRequired).toBeGreaterThan(0)
    })
    
    it('should reject orders with insufficient margin', async () => {
      const result = await placeOrder({
        tradingAccountId: 'test-account',
        instrumentId: 'test-stock',
        quantity: 10000,
        price: 1000
      })
      
      expect(result.error).toBe('Insufficient margin')
    })
  })
  
  describe('Multi-Asset Support', () => {
    it('should handle forex orders', async () => {
      const order = await placeForexOrder({
        pair: 'USD/INR',
        quantity: 1000,
        orderType: 'MARKET'
      })
      
      expect(order.leverage).toBe(50)
      expect(order.pip).toBe(0.0001)
    })
    
    it('should handle crypto orders with TDS', async () => {
      const order = await placeCryptoOrder({
        pair: 'BTC/USDT',
        quantity: 0.1,
        orderSide: 'SELL'
      })
      
      expect(order.charges.tds).toBeGreaterThan(0)
    })
  })
})
```

## Implementation Timeline

### Week 1 (Days 1-7)
- **Days 1-2**: Database schema enhancement and migrations
- **Days 3-4**: Order execution system revamp
- **Day 5**: Fund management implementation
- **Day 6**: Position tracking enhancement
- **Day 7**: Transaction logging and statements

### Week 2 (Days 8-12)
- **Day 8**: Multi-asset support implementation
- **Day 9**: Database setup and data migration
- **Day 10**: API updates and integration
- **Day 11**: Real-time updates and WebSocket
- **Day 12**: Testing and deployment

## Quick Start Implementation

To get started immediately, focus on these critical fixes:

1. **Update Database Schema** (2 hours)
   - Run the migration script to add missing fields
   - Add risk_config table for charge calculations

2. **Fix Order Placement** (4 hours)
   - Implement proper charge calculations
   - Add margin validation
   - Create order execution service

3. **Enhance Transaction Logging** (2 hours)
   - Add detailed transaction entries
   - Implement charge breakdown

4. **Update APIs** (2 hours)
   - Enhance order placement API
   - Add validation and error handling

## Monitoring & Maintenance

### Key Metrics to Track
- Order success rate
- Average execution time
- Margin utilization
- P&L accuracy
- System uptime
- API response times

### Regular Tasks
- Daily settlement processing
- MTM calculations
- Risk monitoring
- Audit log review
- Performance optimization

## Conclusion

This comprehensive plan addresses all the critical issues in your trading platform. The implementation is structured to deliver quick wins while building towards a robust, production-ready system that supports multiple asset classes with proper fund management, accurate charge calculations, and detailed transaction logging.

Start with Phase 1 and 2 for immediate improvements, then progressively implement other phases based on your priorities.
