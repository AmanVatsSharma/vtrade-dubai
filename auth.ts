// auth.ts
// @ts-nocheck
import { prisma } from "@/lib/prisma"
import { signInSchema, mobileSignInSchema } from "@/schemas"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { getUserById, getUserByIdentifier } from "./data/user"

/**
 * NextAuth Configuration
 * Handles authentication for both web and mobile platforms
 */
export const authOptions = {
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: {},
                password: {},
                identifier: {},
            },
            async authorize(credentials) {
                // Handle legacy email login
                if (credentials.email) {
                    const validatedFields = signInSchema.safeParse(credentials)

                    if (!validatedFields.success) {
                        return null
                    }

                    const { email, password } = validatedFields.data

                    const user = await prisma.user.findUnique({
                        where: { email }
                    })

                    if (!user || !user.password) {
                        return null
                    }

                    const passwordsMatch = await bcrypt.compare(password, user.password)

                    if (!passwordsMatch) {
                        return null
                    }

                    return user
                }

                // Handle mobile/clientId login
                if (credentials.identifier) {
                    const validatedFields = mobileSignInSchema.safeParse(credentials)

                    if (!validatedFields.success) {
                        return null
                    }

                    const { identifier, password } = validatedFields.data

                    const user = await getUserByIdentifier(identifier)

                    if (!user || !user.password) {
                        return null
                    }

                    const passwordsMatch = await bcrypt.compare(password, user.password)

                    if (!passwordsMatch) {
                        return null
                    }

                    return user
                }

                // Handle mobile authentication with session token
                if (credentials.sessionToken) {
                    const sessionAuth = await prisma.sessionAuth.findUnique({
                        where: { sessionToken: credentials.sessionToken },
                        include: { user: true }
                    })

                    if (!sessionAuth || sessionAuth.expiresAt < new Date()) {
                        return null
                    }

                    // Verify mPin if required
                    if (sessionAuth.isMpinVerified) {
                        return sessionAuth.user
                    }

                    return null
                }

                return null
            },
        }),
    ],
    session: {
        strategy: "jwt"
    },
    pages: {
        signIn: '/auth/login',
        error: '/auth/error',
    },
    events: {
        async linkAccount({ user }) {
            await prisma.user.update({
                where: { id: user.id },
                data: { emailVerified: new Date() }
            })
        }
    },
    callbacks: {
        // async signIn({ user, account }) {
        //     // allow OAuth without email verification
        //     if (account?.provider !== "credentials")
        //         return true;

        //     const existingUser = await getUserById(user.id)

        //     // prevent sign in without email verification
        //     if (!existingUser?.kyc?.status) return false

        //     // Todo: Add 2FA check
        //     return true;
        // },
        async session({ session, token }) {
            if (token) {
                session.user = session.user || {}; // Ensure `user` object is initialized
                session.user.id = token.id as string;
                session.user.name = token.name;
                session.user.email = token.email;
                // Expose custom fields to the client session for gating and data access
                const anySessionUser = session.user as any;
                const anyToken = token as any;
                anySessionUser.kycStatus = anyToken.kycStatus as string | undefined;
                anySessionUser.tradingAccountId = anyToken.tradingAccountId as string | undefined;
                anySessionUser.phone = anyToken.phone as string | undefined;
                anySessionUser.clientId = anyToken.clientId as string | undefined;
                anySessionUser.hasMpin = anyToken.hasMpin as boolean | undefined;
                anySessionUser.phoneVerified = anyToken.phoneVerified as boolean | undefined;
                anySessionUser.role = anyToken.role as string | undefined;
            }
            return session;
        },
        async jwt({ token, user }) {
            // When user logs in first time in the session lifecycle
            if (user) {
                token.id = user.id
                token.name = user.name
                token.email = user.email
                token.phone = user.phone
                token.clientId = user.clientId
                token.role = user.role
            }

            // Always ensure KYC status and mPin status are present on the token
            if (token.id) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.id as string },
                        include: { kyc: true, tradingAccount: true },
                    })
                    const anyToken = token as any;
                    anyToken.kycStatus = dbUser?.kyc?.status ?? undefined
                    anyToken.tradingAccountId = dbUser?.tradingAccount?.id ?? undefined
                    anyToken.hasMpin = !!dbUser?.mPin
                    anyToken.phoneVerified = !!dbUser?.phoneVerified
                    anyToken.role = dbUser?.role ?? undefined
                } catch (e) {
                    // noop: if prisma fails, keep token as-is
                }
            }
            return token
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
}

// Export NextAuth instance with configuration
export const { handlers, signIn, signOut, auth } = NextAuth(authOptions)

