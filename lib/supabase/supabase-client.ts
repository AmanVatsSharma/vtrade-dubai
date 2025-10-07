import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

// Use dummy values during build if env vars not available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-for-build'

console.log('🔧 [SUPABASE-CLIENT] Initializing client')

/**
 * Client-side Supabase client instance
 */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseKey,
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    }
  }
)
