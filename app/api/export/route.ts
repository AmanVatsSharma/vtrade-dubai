/**
 * Data Export API
 * 
 * Export trading data in various formats
 */

import { NextResponse } from 'next/server'
import { DataExportService } from '@/lib/services/export/DataExportService'
import { auth } from '@/auth'
import { getEffectiveStatementsEnabledForUser } from '@/lib/server/console-statements'

export async function GET(req: Request) {
  console.log("📤 [API-EXPORT] GET request received")
  
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'orders'
    const startDate = searchParams.get('startDate') 
      ? new Date(searchParams.get('startDate')!) 
      : undefined
    const endDate = searchParams.get('endDate') 
      ? new Date(searchParams.get('endDate')!) 
      : undefined
    const format = searchParams.get('format') || 'csv'

    // Enforce statements feature flag (only for statement export)
    if (type === 'statement') {
      const resolution = await getEffectiveStatementsEnabledForUser(session.user.id!)
      if (!resolution.enabled) {
        console.warn("🚫 [API-EXPORT] Statement export blocked by settings", {
          userId: session.user.id,
          source: resolution.source,
        })
        return NextResponse.json(
          { success: false, error: 'Statements are disabled for this account' },
          { status: 403 }
        )
      }
    }

    let data: string | any
    let filename: string
    let contentType: string

    switch (type) {
      case 'orders':
        data = await DataExportService.exportOrders(session.user.id!, startDate, endDate)
        filename = `orders_${new Date().toISOString()}.csv`
        contentType = 'text/csv'
        break
      
      case 'positions':
        data = await DataExportService.exportPositions(session.user.id!)
        filename = `positions_${new Date().toISOString()}.csv`
        contentType = 'text/csv'
        break
      
      case 'transactions':
        data = await DataExportService.exportTransactions(session.user.id!, startDate, endDate)
        filename = `transactions_${new Date().toISOString()}.csv`
        contentType = 'text/csv'
        break
      
      case 'statement':
        if (!startDate || !endDate) {
          return NextResponse.json({
            error: 'Start date and end date required for statement'
          }, { status: 400 })
        }
        data = await DataExportService.generateStatement(session.user.id!, startDate, endDate)
        
        if (format === 'json') {
          return NextResponse.json({
            success: true,
            data
          })
        }
        
        // For CSV, export transactions
        data = DataExportService.generateCSV(
          data.transactions.map((t: any) => ({
            'Transaction ID': t.id,
            'Amount': Number(t.amount),
            'Type': t.type,
            'Description': t.description || '',
            'Date': t.createdAt
          })),
          ['Transaction ID', 'Amount', 'Type', 'Description', 'Date']
        )
        filename = `statement_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`
        contentType = 'text/csv'
        break
      
      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    console.log("✅ [API-EXPORT] Data exported successfully")
    
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    })
  } catch (error: any) {
    console.error("❌ [API-EXPORT] Error:", error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to export data'
    }, { status: 500 })
  }
}
