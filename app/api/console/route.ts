/**
 * API route for console data operations
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { ConsoleDataService } from '@/lib/console-data-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const consoleData = await ConsoleDataService.getConsoleData(session.user.id)
    
    if (!consoleData) {
      return NextResponse.json({ error: 'Failed to fetch console data' }, { status: 500 })
    }

    return NextResponse.json(consoleData)
  } catch (error) {
    console.error('Error in console GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, data } = body

    let result

    switch (action) {
      case 'updateProfile':
        result = await ConsoleDataService.updateUserProfile(session.user.id, data)
        break
      case 'addBankAccount':
        result = await ConsoleDataService.addBankAccount(session.user.id, data)
        break
      case 'updateBankAccount':
        result = await ConsoleDataService.updateBankAccount(session.user.id, data.accountId, data.bankData)
        break
      case 'deleteBankAccount':
        result = await ConsoleDataService.deleteBankAccount(session.user.id, data.accountId)
        break
      case 'createDepositRequest':
        result = await ConsoleDataService.createDepositRequest(session.user.id, data)
        break
      case 'createWithdrawalRequest':
        result = await ConsoleDataService.createWithdrawalRequest(session.user.id, data)
        break
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in console POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}