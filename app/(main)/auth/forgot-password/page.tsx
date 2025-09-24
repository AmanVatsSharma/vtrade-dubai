"use client"
import React, { useTransition, useState } from "react"
import CardWrapper from "@/components/auth/CardWrapper"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import FormError from "@/components/form-error"
import FormSucess from "@/components/form-sucess"
import Link from "next/link"
import { resetPassword } from "@/actions/auth.actions"

// Local schema for forgot password identifier input (email / mobile / clientId)
const ForgotPasswordSchema = z.object({
  identifier: z
    .string()
    .min(1, "Identifier is required"),
})

const ForgotPasswordPage = () => {
  // Transition for non-blocking UI updates
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | undefined>("")
  const [success, setSuccess] = useState<string | undefined>("")

  // Initialize form with zod validation
  const form = useForm<z.infer<typeof ForgotPasswordSchema>>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { identifier: "" },
  })

  // Handle form submission
  const onSubmit = (values: z.infer<typeof ForgotPasswordSchema>) => {
    console.log("[ForgotPassword] Submit initiated with:", values)
    setError("")
    setSuccess("")
    startTransition(() => {
      resetPassword(values)
        .then((res) => {
          console.log("[ForgotPassword] resetPassword response:", res)
          if (res?.error) {
            setError(res.error)
          }
          if (res?.success) {
            setSuccess(res.success)
          }
        })
        .catch((e) => {
          console.error("[ForgotPassword] resetPassword error:", e)
          setError("Something went wrong. Please try again.")
        })
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <CardWrapper
          headerLabel="Forgot your password?"
          backButtonLabel="Back to login"
          backButtonHref="/auth/login"
          showSocial={false}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Email input */}
              <FormField
                control={form.control}
                name="identifier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700 font-medium">Email / Mobile / Client ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={isPending}
                        placeholder="you@example.com or 98XXXXXXXX or AB1234"
                        type="text"
                        className="border-slate-300 focus:border-emerald-600 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 rounded-md shadow-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Feedback messages */}
              <FormError message={error} />
              <FormSucess message={success} />

              {/* Submit */}
              <Button
                disabled={isPending}
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg"
              >
                {isPending ? "Sending reset link..." : "Send reset link"}
              </Button>

              {/* Info */}
              <p className="text-xs text-center text-gray-500">
                If the identifier matches an account with an email, we’ll send a reset link (expires in 1 hour).
              </p>

              <div className="text-center text-sm text-gray-600 mt-2">
                <Link href="/auth/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                  Back to login
                </Link>
              </div>
            </form>
          </Form>
        </CardWrapper>
      </div>
    </div>
  )
}

export default ForgotPasswordPage


