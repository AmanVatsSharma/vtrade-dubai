/**
 * API route for console data operations
 * Now uses Prisma-based ConsoleService with atomic transactions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ConsoleDataService } from '@/lib/console-data-service'

export async function GET(request: NextRequest) {
  console.log('📥 [CONSOLE-API] GET request received')
  try {
    const session = await auth()
    
    console.log('🔐 [CONSOLE-API] Session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id 
    })

    if (!session?.user?.id) {
      console.warn('⚠️ [CONSOLE-API] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('📊 [CONSOLE-API] Fetching console data for user:', session.user.id)
    const consoleData = await ConsoleDataService.getConsoleData(session.user.id)
    
    if (!consoleData) {
      console.error('❌ [CONSOLE-API] Failed to fetch console data')
      return NextResponse.json({ error: 'Failed to fetch console data' }, { status: 500 })
    }

    console.log('✅ [CONSOLE-API] Console data fetched successfully')
    return NextResponse.json(consoleData)
  } catch (error) {
    console.error('❌ [CONSOLE-API] Error in console GET:', error)
    console.error('🔍 [CONSOLE-API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  console.log('📥 [CONSOLE-API] POST request received')
  try {
    const session = await auth()
    
    console.log('🔐 [CONSOLE-API] Session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id 
    })

    if (!session?.user?.id) {
      console.warn('⚠️ [CONSOLE-API] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, data } = body

    console.log('🎯 [CONSOLE-API] Action requested:', action)
    console.log('📋 [CONSOLE-API] Action data:', data)

    let result

    switch (action) {
      case 'updateProfile':
        console.log('📝 [CONSOLE-API] Updating user profile')
        result = await ConsoleDataService.updateUserProfile(session.user.id, data)
        break
      case 'addBankAccount':
        console.log('🏦 [CONSOLE-API] Adding bank account')
        result = await ConsoleDataService.addBankAccount(session.user.id, data)
        break
      case 'updateBankAccount':
        console.log('🏦 [CONSOLE-API] Updating bank account')
        result = await ConsoleDataService.updateBankAccount(session.user.id, data.accountId, data.bankData)
        break
      case 'deleteBankAccount':
        console.log('🗑️ [CONSOLE-API] Deleting bank account')
        result = await ConsoleDataService.deleteBankAccount(session.user.id, data.accountId)
        break
      case 'createDepositRequest':
        console.log('💰 [CONSOLE-API] Creating deposit request')
        result = await ConsoleDataService.createDepositRequest(session.user.id, data)
        break
      case 'createWithdrawalRequest':
        console.log('💸 [CONSOLE-API] Creating withdrawal request')
        result = await ConsoleDataService.createWithdrawalRequest(session.user.id, data)
        break
      default:
        console.warn('⚠️ [CONSOLE-API] Invalid action:', action)
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    console.log('✅ [CONSOLE-API] Action completed:', { action, success: result.success })
    return NextResponse.json(result)
  } catch (error) {
    console.error('❌ [CONSOLE-API] Error in console POST:', error)
    console.error('🔍 [CONSOLE-API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}