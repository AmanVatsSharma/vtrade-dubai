// actions/auth.ts

"use server"
import { NewPasswordSchema, signInSchema, signUpSchema } from "@/schemas"
import { prisma } from "@/lib/prisma";
import { AuthError } from "next-auth";
import bcrypt from 'bcryptjs';
import * as z from 'zod'
import { generatePasswordResetVerificationToken, generateVerificationToken } from "@/lib/tokens"
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/ResendMail"
import { getUserByEmail, getUserByIdentifier } from "@/data/user";
import { signIn } from "@/auth";
import { getVerificationTokenByToken } from "@/data/verification-token";
import { PasswordResetResponse } from "@/types/types";
import { getPasswordResetTokenByToken } from "@/data/password-reset-toke";

export const login = async (values: z.infer<typeof signInSchema>) => {
    const validatedFields = signInSchema.safeParse(values)

    if (!validatedFields.success) {
        const errors = validatedFields.error.issues.map((e: any) => e.message).join(", ")
        return { error: `Validation error: ${errors}` }
    }

    const { email, password } = validatedFields.data

    try {
        // Try to find user by email or clientId
        let existingUser = await getUserByEmail(email)
        if (!existingUser) {
            existingUser = await prisma.user.findUnique({ where: { clientId: email } })
        }

        if (!existingUser || !existingUser.password) {
            return { error: "Invalid credentials. Please check your email/Client ID and password." }
        }

        // Verify password first
        const passwordsMatch = await bcrypt.compare(password, existingUser.password)
        if (!passwordsMatch) {
            return { error: "Invalid credentials. Please check your email/Client ID and password." }
        }

        // Check email verification
        if (!existingUser.emailVerified) {
            try {
                const verificationToken = await generateVerificationToken(existingUser.email!)
                await sendVerificationEmail(verificationToken.email ?? existingUser.email!, verificationToken.token)
                return { 
                    success: "Please verify your email first. A new verification link has been sent to your email.",
                    requiresEmailVerification: true 
                }
            } catch (emailError) {
                console.error("Failed to send verification email:", emailError)
                return { error: "Your email is not verified. Please contact support." }
            }
        }

        // Fetch user with KYC data
        const userWithKYC = await prisma.user.findUnique({
            where: { id: existingUser.id },
            include: { kyc: true }
        })

        // Check phone verification first
        if (!existingUser.phoneVerified && existingUser.phone) {
            return {
                success: "Please verify your phone number to continue.",
                redirectTo: "/auth/phone-verification",
                requiresPhoneVerification: true
            }
        }

        // Check mPin setup
        if (!existingUser.mPin) {
            return {
                success: "Please set up your mPin to secure your account.",
                redirectTo: "/auth/mpin-setup",
                requiresMpinSetup: true
            }
        }

        // Check KYC status - redirect to KYC page if not approved
        if (!userWithKYC?.kyc || userWithKYC.kyc.status !== "APPROVED") {
            try {
                await signIn("credentials", {
                    email: existingUser.email,
                    password,
                    redirectTo: "/auth/kyc"
                })
                const kycMessage = !userWithKYC?.kyc 
                    ? "Please complete your KYC verification to start trading."
                    : userWithKYC.kyc.status === "PENDING"
                    ? "Your KYC verification is pending approval."
                    : "Your KYC was rejected. Please resubmit with correct information."
                
                return {
                    success: kycMessage,
                    redirectTo: "/auth/kyc",
                    requiresKyc: true
                }
            } catch (error) {
                if (error instanceof AuthError) {
                    switch (error.type) {
                        case "CredentialsSignin":
                            return { error: "Authentication failed. Please try again." }
                        default:
                            return { error: "An error occurred during login. Please try again." }
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
                success: "Welcome back! Logged in successfully.",
                redirectTo: "/dashboard"
            }
        } catch (error) {
            if (error instanceof AuthError) {
                switch (error.type) {
                    case "CredentialsSignin":
                        return { error: "Authentication failed. Please verify your credentials." }
                    default:
                        return { error: "Login failed. Please try again later." }
                }
            }
            throw error
        }
    } catch (error) {
        console.error("Login error:", error)
        if (error instanceof Error) {
            return { error: `Login failed: ${error.message}` }
        }
        return { error: "An unexpected error occurred. Please try again later." }
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
        const errors = validatedFields.error.issues.map((e: any) => e.message).join(", ")
        return { error: `Invalid fields: ${errors}` }
    }

    const { email, password, name, phone } = validatedFields.data

    try {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return { error: "Email already registered. Please login or use forgot password." }
        }

        // Check if phone number is already in use
        if (phone) {
            const existingPhone = await prisma.user.findUnique({
                where: { phone }
            })

            if (existingPhone) {
                return { error: "Mobile number already registered. Please login or use a different number." }
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const clientId = generateClientId();

        // Create user and trading account in a transaction
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                phone,
                password: hashedPassword,
                clientId,
            }
        })

        // Create a trading account for the new user
        await prisma.tradingAccount.create({
            data: {
                userId: newUser.id,
                balance: 0,
                availableMargin: 0,
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

        // Send verification email
        try {
            const verificationToken = await generateVerificationToken(email)
            await sendVerificationEmail(verificationToken.email, verificationToken.token)
        } catch (emailError) {
            console.error("Failed to send verification email:", emailError)
            // Continue registration even if email fails
        }

        return {
            success: "Registration successful! Please check your email to verify your account.",
            clientId
        }
    } catch (error) {
        console.error("Registration error:", error)
        if (error instanceof Error) {
            if (error.message.includes("Unique constraint")) {
                return { error: "An account with this information already exists." }
            }
            return { error: `Registration failed: ${error.message}` }
        }
        return { error: "Registration failed. Please try again later." }
    }
}

export const newVerification = async (token: string) => {
    try {
        if (!token || !token.trim()) {
            return { error: "Invalid verification link. Please request a new one." }
        }

        const existingToken = await getVerificationTokenByToken(token)

        if (!existingToken) {
            return { error: "Invalid or expired verification link. Please request a new one." }
        }

        const hasExpired = new Date(existingToken.expires) < new Date();

        if (hasExpired) {
            // Clean up expired token
            await prisma.verificationToken.delete({ where: { token } })
            return { error: "Verification link has expired. Please request a new one from the login page." }
        }

        const existingUser = await getUserByEmail(existingToken.email)

        if (!existingUser) {
            return { error: "User account not found. Please register again." }
        }

        if (existingUser.emailVerified) {
            // Already verified, clean up token
            await prisma.verificationToken.delete({ where: { token } })
            return { success: "Email already verified! You can now login." }
        }

        // Update user email verification
        await prisma.user.update({
            where: { id: existingUser.id },
            data: {
                emailVerified: new Date(),
                email: existingToken.email
            }
        });

        // Delete the used token
        await prisma.verificationToken.delete({
            where: { token },
        })

        return { success: "Email verified successfully! You can now login and complete your profile." }
    } catch (error) {
        console.error("Email verification error:", error)
        if (error instanceof Error) {
            return { error: `Verification failed: ${error.message}` }
        }
        return { error: "Failed to verify email. Please try again or contact support." }
    }
}

export const resetPassword = async (values: { identifier: string }): Promise<PasswordResetResponse> => {
    // Robust validation
    if (!values.identifier || !values.identifier.trim()) {
        return { error: "Email, mobile number, or Client ID is required" };
    }

    try {
        // Find user by email OR phone OR clientId
        const existingUser = await getUserByIdentifier(values.identifier.trim());

        // For security, never reveal whether the user exists
        if (!existingUser) {
            return {
                success: "If an account exists, you will receive password reset instructions shortly"
            };
        }

        // Generate a password reset token tied to the user's email
        if (existingUser.email) {
            const passwordResetToken = await generatePasswordResetVerificationToken(existingUser.email, existingUser.id);

            // Send password reset email with link
            await sendPasswordResetEmail(passwordResetToken.email, passwordResetToken.token);
        }

        return {
            success: "If an account exists, you will receive password reset instructions shortly"
        };
    } catch (error) {
        console.error("Password reset error:", error);
        return {
            error: "Failed to process password reset request. Please try again later."
        };
    }
};

export const newPassword = async (
    values: z.infer<typeof NewPasswordSchema>,
    token?: string | null
) => {
    try {
        if (!token || !token.trim()) {
            return { error: "Invalid password reset link. Please request a new one." }
        }

        const validatedFields = NewPasswordSchema.safeParse(values);

        if (!validatedFields.success) {
            const errors = validatedFields.error.issues.map((e: any) => e.message).join(", ")
            return { error: `Invalid password: ${errors}` };
        }
        
        const { password } = validatedFields.data

        const existingToken = await getPasswordResetTokenByToken(token)

        if (!existingToken) {
            return { error: "Invalid or expired reset link. Please request a new one." }
        }

        const hasExpired = new Date(existingToken.expires) < new Date();

        if (hasExpired) {
            // Clean up expired token
            await prisma.passwordResetToken.delete({ where: { id: existingToken.id } })
            return { error: "Reset link has expired (valid for 1 hour). Please request a new one." }
        }

        const existingUser = await getUserByEmail(existingToken.email)

        if (!existingUser) {
            return { error: "User account not found. Please contact support." }
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10)

        // Update user password
        await prisma.user.update({
            where: { id: existingUser.id },
            data: { password: hashedPassword }
        });

        // Delete the used token
        await prisma.passwordResetToken.delete({
            where: { id: existingToken.id }
        });

        return { success: "Password updated successfully! You can now login with your new password." }
    } catch (error) {
        console.error("Password reset error:", error)
        if (error instanceof Error) {
            return { error: `Failed to reset password: ${error.message}` }
        }
        return { error: "Failed to reset password. Please try again or contact support." }
    }
}

export const sendVerificationEmailAgain = async (email :string, token: string) => {
    await sendVerificationEmail(email, token);
}