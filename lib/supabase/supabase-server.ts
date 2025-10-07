import { createClient } from '@supabase/supabase-js'

// Use dummy values during build if env vars not available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-for-build'

console.log('🔧 [SUPABASE-SERVER] Initializing with URL:', supabaseUrl.substring(0, 30) + '...')

/**
 * This client should only be used on the server-side.
 * For client-side, use the client from supabase-client.ts
 */
export const supabaseServer = createClient(
  supabaseUrl,
  supabaseKey,
  {
    db: {
      schema: 'public'
    },
    auth: {
      persistSession: false
    }
  }
)
