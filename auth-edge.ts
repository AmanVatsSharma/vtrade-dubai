// auth-edge.ts
// Minimal, Edge-safe NextAuth instance for middleware decoding only.
// Avoids Prisma and other Node-only modules so it can run on Vercel Edge.

import NextAuth from "next-auth"

export const { auth: authEdge } = NextAuth({
  session: { strategy: "jwt" },
  providers: [],
  secret: process.env.NEXTAUTH_SECRET,
})
