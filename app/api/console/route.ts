/**
 * API route for console data operations
 * Now uses Prisma-based ConsoleService with atomic transactions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { ConsoleDataService } from '@/lib/console-data-service'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  console.log('📥 [CONSOLE-API] GET request received')
  
  try {
    // Step 1: Authenticate
    const session = await auth()
    console.log('🔐 [CONSOLE-API] Session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id,
      elapsed: `${Date.now() - startTime}ms`
    })

    if (!session?.user?.id) {
      console.warn('⚠️ [CONSOLE-API] Unauthorized access attempt')
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          message: 'Please sign in to access your console' 
        }, 
        { status: 401 }
      )
    }

    // Step 2: Fetch console data
    console.log('📊 [CONSOLE-API] Fetching console data for user:', session.user.id)
    const consoleData = await ConsoleDataService.getConsoleData(session.user.id)
    
    if (!consoleData) {
      console.error('❌ [CONSOLE-API] Failed to fetch console data - null returned')
      return NextResponse.json(
        { 
          error: 'Failed to fetch console data',
          message: 'Unable to load your console data. Please try again.'
        }, 
        { status: 500 }
      )
    }

    // Step 3: Return success
    const elapsed = Date.now() - startTime
    console.log('✅ [CONSOLE-API] Console data fetched successfully', { 
      userId: session.user.id,
      elapsed: `${elapsed}ms`,
      dataKeys: Object.keys(consoleData)
    })
    
    return NextResponse.json(consoleData)
    
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error('❌ [CONSOLE-API] Error in console GET:', error)
    console.error('🔍 [CONSOLE-API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      elapsed: `${elapsed}ms`
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  console.log('📥 [CONSOLE-API] POST request received')
  
  try {
    // Step 1: Authenticate
    const session = await auth()
    console.log('🔐 [CONSOLE-API] Session check:', { 
      hasSession: !!session, 
      userId: session?.user?.id 
    })

    if (!session?.user?.id) {
      console.warn('⚠️ [CONSOLE-API] Unauthorized access attempt')
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Please sign in to perform this action'
        }, 
        { status: 401 }
      )
    }

    // Step 2: Parse request body
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('❌ [CONSOLE-API] Failed to parse request body:', parseError)
      return NextResponse.json(
        { 
          error: 'Invalid request',
          message: 'Request body must be valid JSON'
        }, 
        { status: 400 }
      )
    }

    const { action, data } = body

    if (!action) {
      console.warn('⚠️ [CONSOLE-API] Missing action in request')
      return NextResponse.json(
        { 
          error: 'Invalid request',
          message: 'Action is required'
        }, 
        { status: 400 }
      )
    }

    console.log('🎯 [CONSOLE-API] Action requested:', action)
    console.log('📋 [CONSOLE-API] Action data:', data)

    // Step 3: Execute action
    let result

    try {
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
          return NextResponse.json(
            { 
              error: 'Invalid action',
              message: `Action '${action}' is not supported`
            }, 
            { status: 400 }
          )
      }
    } catch (actionError) {
      console.error(`❌ [CONSOLE-API] Error executing action '${action}':`, actionError)
      return NextResponse.json(
        { 
          error: 'Action failed',
          message: actionError instanceof Error ? actionError.message : 'Failed to execute action'
        }, 
        { status: 500 }
      )
    }

    // Step 4: Return result
    const elapsed = Date.now() - startTime
    console.log('✅ [CONSOLE-API] Action completed:', { 
      action, 
      success: result.success,
      elapsed: `${elapsed}ms`
    })
    
    return NextResponse.json(result)
    
  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error('❌ [CONSOLE-API] Error in console POST:', error)
    console.error('🔍 [CONSOLE-API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown',
      elapsed: `${elapsed}ms`
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}