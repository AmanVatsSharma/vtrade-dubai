// actions/auth.ts

"use server"
import { NewPasswordSchema, signInSchema, signUpSchema } from "@/schemas"
import { prisma } from "@/lib/prisma";
import { AuthError } from "next-auth";
import bcrypt from 'bcryptjs';
import * as z from 'zod'
import { generatePasswordResetVerificationToken, generateVerificationToken } from "@/lib/tokens"
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/ResendMail"
import { getUserByEmail } from "@/data/user";
import { signIn } from "@/auth";
import { nanoid } from "nanoid";
import { getVerificationTokenByToken } from "@/data/verification-token";
import { PasswordResetResponse } from "@/types/types";
import { getPasswordResetTokenByToken } from "@/data/password-reset-toke";

export const login = async (values: z.infer<typeof signInSchema>) => {
    const validatedFields = signInSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { email, password } = validatedFields.data

    // Try to find user by email or clientId
    let existingUser = await getUserByEmail(email)
    if (!existingUser) {
        existingUser = await prisma.user.findUnique({ where: { clientId: email } })
    }

    if (!existingUser || !existingUser.password) {
        return { error: "User does not exist!" }
    }

    if (!existingUser.emailVerified) {
        const verificationToken = await generateVerificationToken(existingUser.email!)
        await sendVerificationEmail(verificationToken.email ?? 'xyz', verificationToken.token)
        return { success: "Confirmation email sent!" }
    }

    // Fetch user with KYC data
    const userWithKYC = await prisma.user.findUnique({
        where: { id: existingUser.id },
        include: { kyc: true }
    })

    // Check KYC status - redirect to KYC page if not approved
    if (!userWithKYC?.kyc || userWithKYC.kyc.status !== "APPROVED") {
        try {
            await signIn("credentials", {
                email: existingUser.email,
                password,
                redirectTo: "/auth/kyc"
            })
            return {
                success: "Please complete your KYC verification.",
                redirectTo: "/auth/kyc"
            }
        } catch (error) {
            if (error instanceof AuthError) {
                switch (error.type) {
                    case "CredentialsSignin":
                        return { error: "Invalid credentials!" }
                    default:
                        return { error: "Something went wrong!" }
                }
            }
            throw error
        }
    }

    try {
        await signIn("credentials", {
            email: existingUser.email,
            password,
            redirectTo: "/dashboard"
        })
        return {
            success: "Logged in successfully!",
            redirectTo: "/dashboard"
        }
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case "CredentialsSignin":
                    return { error: "Invalid credentials!" }
                default:
                    return { error: "Something went wrong!" }
            }
        }
        throw error
    }
}

function generateClientId() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const randomLetters = Array.from({ length: 2 }, () =>
        chars.charAt(Math.floor(Math.random() * chars.length))
    ).join("");

    const randomNumbers = Math.floor(1000 + Math.random() * 9000);

    return randomLetters + randomNumbers;
}

export const register = async (values: z.infer<typeof signUpSchema>) => {
    const validatedFields = signUpSchema.safeParse(values)

    if (!validatedFields.success) {
        return { error: "Invalid fields!" }
    }

    const { email, password, name } = validatedFields.data

    const existingUser = await prisma.user.findUnique({
        where: { email }
    })

    if (existingUser) {
        return { error: "Email already in use!" }
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const clientId = generateClientId();

    try {
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                clientId,
            }
        })

        // Also create a trading account for the new user
        await prisma.tradingAccount.create({
            data: {
                userId: newUser.id,
                balance: 0,
                availableMargin: 0, // Demo margin for trading
                usedMargin: 0,
                clientId,
                orders:{
                    create: {
                        orderSide: "BUY",
                        orderType: "MARKET",
                        quantity: 0,
                        price: 0,
                        status: "EXECUTED",
                        symbol: "NIFTY50",
                        averagePrice: 25000,
                        filledQuantity: 75,
                    },
                },
                positions: {
                    create: {
                        symbol: "TATASTEEL",
                        averagePrice: 210,
                        quantity: 1,
                    }
                },
            }
        })

        const verificationToken = await generateVerificationToken(email)
        await sendVerificationEmail(verificationToken.email, verificationToken.token)

        return {
            success: "Confirmation email sent! Please verify your email to continue.",
            clientId
        }
    } catch (error) {
        console.error("Registration error:", error)
        return { error: "Something went wrong during registration!" }
    }
}

export const newVerification = async (token: string) => {

    const existingToken = await getVerificationTokenByToken(token)

    if (!existingToken) {
        return { error: "Token does not exist!" }
    }

    const hasExpired = new Date(existingToken.expires) < new Date();

    if (hasExpired) {
        return { error: "Token has expired!" }
    }

    const existingUser = await getUserByEmail(existingToken.email)

    if (!existingUser) {
        return { error: "Email does not exist!" }
    }

    await prisma.user.update({
        where: { id: existingUser.id },
        data: {
            emailVerified: new Date(),
            email: existingToken.email
        }
    });

    await prisma.verificationToken.delete({
        where: { token },
    })

    return { success: "Email verified! You can now login and complete KYC verification." }
}

export const resetPassword = async (values: { email: string }): Promise<PasswordResetResponse> => {
    if (!values.email) {
        return { error: "Email is required" };
    }

    try {
        const existingUser = await getUserByEmail(values.email);

        // For security, we don't want to reveal if an email exists or not
        if (!existingUser) {
            return {
                success: "If an account exists with this email, you will receive password reset instructions shortly"
            };
        }

        const passwordResetToken = await generatePasswordResetVerificationToken(values.email);
        await sendPasswordResetEmail(passwordResetToken.email, passwordResetToken.token);

        return {
            success: "If an account exists with this email, you will receive password reset instructions shortly"
        };
    } catch (error) {
        console.error("Password reset error:", error);
        return {
            error: "Something went wrong. Please try again later."
        };
    }
};

export const newPassword = async (
    values: z.infer<typeof NewPasswordSchema>,
    token?: string | null
) => {
    if (!token) {
        return { error: "Missing token!" }
    }

    const validatedFields = NewPasswordSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }
    const { password } = validatedFields.data

    const existingToken = await getPasswordResetTokenByToken(token)

    if (!existingToken) {
        return { error: "Invalid token!" }
    }

    const hasExpired = new Date(existingToken.expires) < new Date();

    if (hasExpired) {
        return { error: "Token has expired!" }
    }

    const existingUser = await getUserByEmail(existingToken.email)

    if (!existingUser) {
        return { error: "Email does not exist!" }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.update({
        where: { id: existingUser.id },
        data: { password: hashedPassword }
    });

    await prisma.passwordResetToken.delete({
        where: { id: existingToken.id }
    });

    return { success: "Password updated!" }
}

export const sendVerificationEmailAgain = async (email :string, token: string) => {
    await sendVerificationEmail(email, token);
}