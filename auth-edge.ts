// auth-edge.ts
// Minimal, Edge-safe NextAuth instance for middleware decoding only.
// Avoids Prisma and other Node-only modules so it can run on Vercel Edge.

import NextAuth from "next-auth"

// Edge-safe NextAuth used only to decode the session in middleware and expose
// custom claims that were added to the JWT during the primary login flow.
// Do not import Node-only modules (e.g., Prisma) here.
export const { auth: authEdge } = NextAuth({
  session: { strategy: "jwt" },
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Map custom JWT claims into the session.user for middleware checks
    async session({ session, token }) {
      if (token) {
        // Ensure user object exists
        // @ts-ignore - Edge config keeps types minimal
        session.user = session.user || {}
        // Standard fields
        // @ts-ignore
        session.user.id = token.id as string | undefined
        // @ts-ignore
        session.user.name = token.name as string | undefined
        // @ts-ignore
        session.user.email = token.email as string | undefined

        // Custom gating fields propagated from main auth.ts jwt callback
        const anySessionUser = session.user as any
        const anyToken = token as any
        anySessionUser.kycStatus = anyToken.kycStatus
        anySessionUser.tradingAccountId = anyToken.tradingAccountId
        anySessionUser.phone = anyToken.phone
        anySessionUser.clientId = anyToken.clientId
        anySessionUser.hasMpin = anyToken.hasMpin
        anySessionUser.phoneVerified = anyToken.phoneVerified
        anySessionUser.role = anyToken.role
      }
      return session
    },
    // No-op jwt callback (token already contains custom claims from main auth)
    async jwt({ token }) {
      return token
    },
  },
})
