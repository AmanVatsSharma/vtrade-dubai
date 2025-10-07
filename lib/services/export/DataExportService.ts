/**
 * Data Export Service
 * 
 * Export trading data in various formats:
 * - CSV export
 * - PDF reports
 * - Excel spreadsheets
 * - Transaction statements
 */

import { prisma } from '@/lib/prisma'

console.log("📤 [DATA-EXPORT] Module loaded")

export class DataExportService {
  /**
   * Generate CSV from array of objects
   */
  static generateCSV(data: any[], headers: string[]): string {
    console.log("📤 [DATA-EXPORT] Generating CSV")
    
    // Create CSV header
    const csv = [headers.join(',')]
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header]
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value ?? ''
      })
      csv.push(values.join(','))
    })
    
    return csv.join('\n')
  }

  /**
   * Export orders to CSV
   */
  static async exportOrders(userId: string, startDate?: Date, endDate?: Date): Promise<string> {
    console.log("📤 [DATA-EXPORT] Exporting orders")
    
    try {
      const tradingAccount = await prisma.tradingAccount.findUnique({
        where: { userId }
      })

      if (!tradingAccount) {
        throw new Error("Trading account not found")
      }

      const where: any = { tradingAccountId: tradingAccount.id }
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = startDate
        if (endDate) where.createdAt.lte = endDate
      }

      const orders = await prisma.order.findMany({
        where,
        include: {
          Stock: {
            select: {
              symbol: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      const data = orders.map(order => ({
        'Order ID': order.id,
        'Symbol': order.symbol,
        'Stock Name': order.Stock?.name || '',
        'Quantity': order.quantity,
        'Order Type': order.orderType,
        'Order Side': order.orderSide,
        'Price': order.price ? Number(order.price) : '',
        'Average Price': order.averagePrice ? Number(order.averagePrice) : '',
        'Filled Quantity': order.filledQuantity,
        'Product Type': order.productType,
        'Status': order.status,
        'Created At': order.createdAt.toISOString(),
        'Executed At': order.executedAt?.toISOString() || ''
      }))

      const headers = [
        'Order ID', 'Symbol', 'Stock Name', 'Quantity', 'Order Type',
        'Order Side', 'Price', 'Average Price', 'Filled Quantity',
        'Product Type', 'Status', 'Created At', 'Executed At'
      ]

      return this.generateCSV(data, headers)
    } catch (error) {
      console.error("❌ [DATA-EXPORT] Error exporting orders:", error)
      throw error
    }
  }

  /**
   * Export positions to CSV
   */
  static async exportPositions(userId: string): Promise<string> {
    console.log("📤 [DATA-EXPORT] Exporting positions")
    
    try {
      const tradingAccount = await prisma.tradingAccount.findUnique({
        where: { userId }
      })

      if (!tradingAccount) {
        throw new Error("Trading account not found")
      }

      const positions = await prisma.position.findMany({
        where: { tradingAccountId: tradingAccount.id },
        include: {
          Stock: {
            select: {
              symbol: true,
              name: true,
              ltp: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      const data = positions.map(position => ({
        'Position ID': position.id,
        'Symbol': position.symbol,
        'Stock Name': position.Stock?.name || '',
        'Quantity': position.quantity,
        'Average Price': Number(position.averagePrice),
        'Current Price': position.Stock?.ltp || '',
        'Unrealized P&L': Number(position.unrealizedPnL),
        'Day P&L': Number(position.dayPnL),
        'Stop Loss': position.stopLoss ? Number(position.stopLoss) : '',
        'Target': position.target ? Number(position.target) : '',
        'Created At': position.createdAt.toISOString(),
        'Status': position.quantity === 0 ? 'CLOSED' : 'OPEN'
      }))

      const headers = [
        'Position ID', 'Symbol', 'Stock Name', 'Quantity', 'Average Price',
        'Current Price', 'Unrealized P&L', 'Day P&L', 'Stop Loss',
        'Target', 'Created At', 'Status'
      ]

      return this.generateCSV(data, headers)
    } catch (error) {
      console.error("❌ [DATA-EXPORT] Error exporting positions:", error)
      throw error
    }
  }

  /**
   * Export transactions to CSV
   */
  static async exportTransactions(userId: string, startDate?: Date, endDate?: Date): Promise<string> {
    console.log("📤 [DATA-EXPORT] Exporting transactions")
    
    try {
      const tradingAccount = await prisma.tradingAccount.findUnique({
        where: { userId }
      })

      if (!tradingAccount) {
        throw new Error("Trading account not found")
      }

      const where: any = { tradingAccountId: tradingAccount.id }
      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate) where.createdAt.gte = startDate
        if (endDate) where.createdAt.lte = endDate
      }

      const transactions = await prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      })

      const data = transactions.map(transaction => ({
        'Transaction ID': transaction.id,
        'Amount': Number(transaction.amount),
        'Type': transaction.type,
        'Description': transaction.description || '',
        'Date': transaction.createdAt.toISOString()
      }))

      const headers = ['Transaction ID', 'Amount', 'Type', 'Description', 'Date']

      return this.generateCSV(data, headers)
    } catch (error) {
      console.error("❌ [DATA-EXPORT] Error exporting transactions:", error)
      throw error
    }
  }

  /**
   * Generate trading statement
   */
  static async generateStatement(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    orders: any[]
    positions: any[]
    transactions: any[]
    summary: any
  }> {
    console.log("📤 [DATA-EXPORT] Generating statement")
    
    try {
      const tradingAccount = await prisma.tradingAccount.findUnique({
        where: { userId }
      })

      if (!tradingAccount) {
        throw new Error("Trading account not found")
      }

      // Get data for the period
      const [orders, positions, transactions] = await Promise.all([
        prisma.order.findMany({
          where: {
            tradingAccountId: tradingAccount.id,
            createdAt: { gte: startDate, lte: endDate }
          },
          include: { Stock: true },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.position.findMany({
          where: {
            tradingAccountId: tradingAccount.id,
            createdAt: { gte: startDate, lte: endDate }
          },
          include: { Stock: true },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.transaction.findMany({
          where: {
            tradingAccountId: tradingAccount.id,
            createdAt: { gte: startDate, lte: endDate }
          },
          orderBy: { createdAt: 'desc' }
        })
      ])

      // Calculate summary
      const totalPnL = positions.reduce((sum, p) => sum + Number(p.unrealizedPnL), 0)
      const totalCharges = transactions
        .filter(t => t.type === 'DEBIT' && t.description?.includes('charges'))
        .reduce((sum, t) => sum + Number(t.amount), 0)
      
      const totalCredits = transactions
        .filter(t => t.type === 'CREDIT')
        .reduce((sum, t) => sum + Number(t.amount), 0)
      
      const totalDebits = transactions
        .filter(t => t.type === 'DEBIT')
        .reduce((sum, t) => sum + Number(t.amount), 0)

      const summary = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalOrders: orders.length,
        executedOrders: orders.filter(o => o.status === 'EXECUTED').length,
        totalPositions: positions.length,
        closedPositions: positions.filter(p => p.quantity === 0).length,
        totalPnL,
        totalCharges,
        totalCredits,
        totalDebits,
        netCashFlow: totalCredits - totalDebits
      }

      return {
        orders,
        positions,
        transactions,
        summary
      }
    } catch (error) {
      console.error("❌ [DATA-EXPORT] Error generating statement:", error)
      throw error
    }
  }
}

console.log("✅ [DATA-EXPORT] Module initialized")
