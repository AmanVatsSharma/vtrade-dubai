"use client"

import type React from "react"

// Use the react entry to avoid export issues in some bundlers
import { ApolloProvider } from "@apollo/client/react"
import client from "@/lib/graphql/apollo-client"

export default function ApolloProviderWrapper({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    // Do not block rendering (marketing pages should remain accessible without GraphQL).
    // Downstream pages that depend on Apollo should handle missing config gracefully.
    return <>{children}</>
  }

  return <ApolloProvider client={client}>{children}</ApolloProvider>
}
