//schemas/index.ts
import { object, string } from "zod"

// Legacy email-based sign in (keeping for backward compatibility)
export const signInSchema = object({
    email: string({ required_error: "Email is required" })
        .min(1, "Email is required")
        .email("Invalid email"),
    password: string({ required_error: "Password is required" })
        .min(1, "Password is required")
        .min(8, "Password must be more than 8 characters")
        .max(32, "Password must be less than 32 characters"),
})

// New mobile/clientId based login schema
export const mobileSignInSchema = object({
    identifier: string({ required_error: "Mobile number or Client ID is required" })
        .min(1, "Mobile number or Client ID is required"),
    password: string({ required_error: "Password is required" })
        .min(1, "Password is required")
        .min(8, "Password must be more than 8 characters")
        .max(32, "Password must be less than 32 characters"),
})

// OTP verification schema
export const otpVerificationSchema = object({
    otp: string({ required_error: "OTP is required" })
        .min(6, "OTP must be 6 digits")
        .max(6, "OTP must be 6 digits")
        .regex(/^\d{6}$/, "OTP must contain only numbers"),
    sessionToken: string({ required_error: "Session token is required" }),
})

// mPin setup schema
export const mpinSetupSchema = object({
    mpin: string({ required_error: "mPin is required" })
        .min(4, "mPin must be 4 digits")
        .max(6, "mPin must be 4-6 digits")
        .regex(/^\d{4,6}$/, "mPin must contain only numbers"),
    confirmMpin: string({ required_error: "Please confirm your mPin" }),
}).refine((data) => data.mpin === data.confirmMpin, {
    message: "mPin confirmation does not match",
    path: ["confirmMpin"],
})

// mPin verification schema
export const mpinVerificationSchema = object({
    mpin: string({ required_error: "mPin is required" })
        .min(4, "mPin must be 4 digits")
        .max(6, "mPin must be 4-6 digits")
        .regex(/^\d{4,6}$/, "mPin must contain only numbers"),
    sessionToken: string({ required_error: "Session token is required" }),
})

export const signUpSchema = object({
    email: string({ required_error: "Email is required" })
        .min(1, "Email is required")
        .email("Invalid email"),
    phone: string({ required_error: "Mobile number is required" })
        .min(10, "Please enter a valid mobile number")
        .regex(/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"),
    password: string({ required_error: "Password is required" })
        .min(1, "Password is required")
        .min(8, "Password must be more than 8 characters")
        .max(32, "Password must be less than 32 characters"),
    name: string({required_error: "Name is required"})
        .min(3, "Name is required")
        .max(64, "Name must be less than 64 characters"),
})

export const NewPasswordSchema = object({
    password: string({ required_error: "Password is required" })
        .min(1, "Password is required")
        .min(8, "Password must be more than 8 characters")
        .max(32, "Password must be less than 32 characters"),
})

// Phone verification schema
export const phoneVerificationSchema = object({
    phone: string({ required_error: "Mobile number is required" })
        .min(10, "Please enter a valid mobile number")
        .regex(/^[6-9]\d{9}$/, "Please enter a valid Indian mobile number"),
})
