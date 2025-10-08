/**
 * @file use-realtime-test.ts
 * @description Simple test hook to verify Supabase Realtime connection
 * 
 * Features:
 * - Environment variable validation
 * - Connection error handling
 * - Automatic reconnection
 * - Subscription status tracking
 */

"use client"

import { useEffect, useState, useRef } from 'react'
import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

// Types
interface UseRealtimeTestReturn {
  isConnected: boolean
  lastMessage: any | null
  error: Error | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
}

// Validate environment variables
function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    const missing = []
    if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    console.error('❌ [REALTIME-TEST] Missing environment variables:', missing.join(', '))
    return null
  }
  
  // Validate URL format
  try {
    new URL(supabaseUrl)
  } catch (error) {
    console.error('❌ [REALTIME-TEST] Invalid NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
    return null
  }
  
  return { supabaseUrl, supabaseAnonKey }
}

// Create Supabase client with error handling
function createSupabaseClient(): SupabaseClient | null {
  try {
    const config = getSupabaseConfig()
    if (!config) {
      return null
    }
    
    const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
    
    console.log('✅ [REALTIME-TEST] Supabase client created successfully')
    return client
  } catch (error) {
    console.error('❌ [REALTIME-TEST] Failed to create Supabase client:', error)
    return null
  }
}

export function useRealtimeTest(): UseRealtimeTestReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const [error, setError] = useState<Error | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabaseRef = useRef<SupabaseClient | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  useEffect(() => {
    // Initialize Supabase client
    if (!supabaseRef.current) {
      supabaseRef.current = createSupabaseClient()
      
      if (!supabaseRef.current) {
        setError(new Error('Failed to initialize Supabase client - check environment variables'))
        setConnectionStatus('error')
        return
      }
    }
    
    const supabase = supabaseRef.current
    
    // Setup realtime subscription
    const setupSubscription = () => {
      try {
        setConnectionStatus('connecting')
        console.log('🔄 [REALTIME-TEST] Setting up subscription...')
        
        const channel = supabase
          .channel('test-channel')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'Order'
            },
            (payload) => {
              console.log('✅ [REALTIME-TEST] Orders change:', payload)
              setLastMessage(payload)
              setIsConnected(true)
              setConnectionStatus('connected')
              setError(null)
              reconnectAttemptsRef.current = 0 // Reset on successful message
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'Position'
            },
            (payload) => {
              console.log('✅ [REALTIME-TEST] Positions change:', payload)
              setLastMessage(payload)
              setIsConnected(true)
              setConnectionStatus('connected')
              setError(null)
              reconnectAttemptsRef.current = 0
            }
          )
          .subscribe((status, err) => {
            console.log('📡 [REALTIME-TEST] Subscription status:', status)
            
            if (status === 'SUBSCRIBED') {
              setIsConnected(true)
              setConnectionStatus('connected')
              setError(null)
              reconnectAttemptsRef.current = 0
              console.log('✅ [REALTIME-TEST] Successfully subscribed to realtime channel')
            } else if (status === 'CHANNEL_ERROR') {
              setIsConnected(false)
              setConnectionStatus('error')
              const errorMsg = err?.message || 'Channel error'
              setError(new Error(`Subscription error: ${errorMsg}`))
              console.error('❌ [REALTIME-TEST] Channel error:', err)
              
              // Attempt to reconnect
              if (reconnectAttemptsRef.current < maxReconnectAttempts) {
                reconnectAttemptsRef.current += 1
                const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
                console.log(`🔄 [REALTIME-TEST] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`)
                
                reconnectTimeoutRef.current = setTimeout(() => {
                  console.log('🔄 [REALTIME-TEST] Attempting to reconnect...')
                  if (channelRef.current) {
                    supabase.removeChannel(channelRef.current)
                  }
                  setupSubscription()
                }, delay)
              } else {
                console.error('❌ [REALTIME-TEST] Max reconnection attempts reached')
                setError(new Error('Failed to connect after multiple attempts'))
              }
            } else if (status === 'TIMED_OUT') {
              setIsConnected(false)
              setConnectionStatus('error')
              setError(new Error('Connection timed out'))
              console.error('❌ [REALTIME-TEST] Connection timed out')
            } else if (status === 'CLOSED') {
              setIsConnected(false)
              setConnectionStatus('disconnected')
              console.log('🔌 [REALTIME-TEST] Connection closed')
            }
          })
        
        channelRef.current = channel
      } catch (error) {
        console.error('❌ [REALTIME-TEST] Error setting up subscription:', error)
        setError(error instanceof Error ? error : new Error('Unknown subscription error'))
        setConnectionStatus('error')
        setIsConnected(false)
      }
    }
    
    setupSubscription()

    // Cleanup function
    return () => {
      console.log('🧹 [REALTIME-TEST] Cleaning up subscription')
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      
      // Remove channel
      if (channelRef.current && supabaseRef.current) {
        try {
          supabaseRef.current.removeChannel(channelRef.current)
          console.log('✅ [REALTIME-TEST] Channel removed successfully')
        } catch (error) {
          console.error('❌ [REALTIME-TEST] Error removing channel:', error)
        }
      }
      
      channelRef.current = null
      setIsConnected(false)
      setConnectionStatus('disconnected')
    }
  }, [])

  return { 
    isConnected, 
    lastMessage, 
    error,
    connectionStatus 
  }
}
