/**
 * @file use-realtime-test.ts
 * @description Simple test hook to verify Supabase Realtime connection
 */

"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export function useRealtimeTest() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)

  useEffect(() => {
    const channel = supabase
      .channel('test-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Realtime test - Orders change:', payload)
          setLastMessage(payload)
          setIsConnected(true)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'positions'
        },
        (payload) => {
          console.log('Realtime test - Positions change:', payload)
          setLastMessage(payload)
          setIsConnected(true)
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { isConnected, lastMessage }
}
