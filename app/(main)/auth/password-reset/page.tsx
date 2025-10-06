"use client"
import React, { useMemo, useTransition, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
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
import { NewPasswordSchema } from "@/schemas"
import { newPassword } from "@/actions/auth.actions"

const PasswordResetContent = () => {
  const router = useRouter()
  const params = useSearchParams()
  const token = useMemo(() => params?.get("token") ?? null, [params])

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | undefined>("")
  const [success, setSuccess] = useState<string | undefined>("")

  const form = useForm<z.infer<typeof NewPasswordSchema>>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: { password: "" },
  })

  const onSubmit = (values: z.infer<typeof NewPasswordSchema>) => {
    console.log("[PasswordReset] Submit with token:", token)
    setError("")
    setSuccess("")

    if (!token) {
      setError("Missing token in URL. Please use the link from your email.")
      return
    }

    startTransition(() => {
      newPassword(values, token)
        .then((res) => {
          console.log("[PasswordReset] newPassword response:", res)
          if (res?.error) {
            setError(res.error)
          }
          if (res?.success) {
            setSuccess(res.success)
          }
        })
        .catch((e) => {
          console.error("[PasswordReset] newPassword error:", e)
          setError("Something went wrong. Please try again.")
        })
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <CardWrapper
          headerLabel="Reset your password"
          backButtonLabel="Back to login"
          backButtonHref="/auth/login"
          showSocial={false}
        >
          {!token ? (
            <div className="space-y-4">
              <FormError message={"Missing or invalid reset token."} />
              <p className="text-sm text-gray-600">Please use the password reset link from your email.</p>
              <div className="text-center">
                <Link href="/auth/forgot-password" className="text-emerald-600 hover:text-emerald-700 font-medium">
                  Request a new reset link
                </Link>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">New password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          disabled={isPending}
                          placeholder="Enter new password"
                          type="password"
                          className="border-slate-300 focus:border-emerald-600 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 rounded-md shadow-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormError message={error} />
                <FormSucess message={success} />

                <Button
                  disabled={isPending}
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-md transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg"
                >
                  {isPending ? "Updating..." : "Update password"}
                </Button>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600">
                  <p className="font-semibold mb-1">Important:</p>
                  <ul className="space-y-1">
                    <li>• Your reset link is valid for 1 hour only</li>
                    <li>• Password must be 8-32 characters long</li>
                    <li>• If expired, request a new reset link</li>
                  </ul>
                </div>
              </form>
            </Form>
          )}
        </CardWrapper>
      </div>
    </div>
  )
}

export default function PasswordResetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-600">Loading reset page…</div>}>
      <PasswordResetContent />
    </Suspense>
  )
}


