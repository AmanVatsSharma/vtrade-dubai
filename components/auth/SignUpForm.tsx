/**
 * File: components/auth/SignUpForm.tsx
 * Module: components/auth
 * Purpose: Email/password registration form UI.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Rebranded user-facing copy from MarketPulse360 to VTrade.
 */

"use client"
import React, { useState, useTransition } from 'react'
import CardWrapper from './CardWrapper'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { signUpSchema } from '@/schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import FormError from '../form-error'
import FormSucess from '../form-sucess'
import { register } from '@/actions/auth.actions'
import { FaEnvelope, FaLock, FaUser } from 'react-icons/fa'
import {  useRouter } from 'next/navigation'


const SignUpForm = () => {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string | undefined>("")
    const [success, setSuccess] = useState<string | undefined>("")

    const form = useForm<z.infer<typeof signUpSchema>>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            email: "",
            password: "",
            name: "",
        }
    })

    const onSubmit = (values: z.infer<typeof signUpSchema>) => {
        setError("")
        setSuccess("")

        startTransition(() => {
            register(values)
                .then((data) => {
                    if (data.error) {
                        setError(data.error)
                    }
                    if (data.success) {
                        setSuccess(data.success)
                        // router.push('/auth/email-verification')
                    }
                })
                .catch((error) => {
                    console.error("Registration error:", error)
                    setError("Something went wrong! Please try again.")
                })
        })
    }



    return (
        <CardWrapper
            headerLabel='Join VTrade Today'
            backButtonLabel="Already have an account?"
            backButtonHref='/auth/login'
            // showSocial
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
                    <div className='space-y-4'>
                        <FormField
                            control={form.control}
                            name='name'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-gray-700">
                                        Full Name
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <Input
                                                {...field}
                                                disabled={isPending}
                                                placeholder="John Doe"
                                                type='text'
                                                className="pl-10 border-slate-300 focus:border-emerald-600 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 rounded-md shadow-sm"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='email'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-gray-700">
                                        Email Address
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <Input
                                                {...field}
                                                disabled={isPending}
                                                placeholder="john.doe@example.com"
                                                type='email'
                                                className="pl-10 border-slate-300 focus:border-emerald-600 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 rounded-md shadow-sm"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name='password'
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-gray-700">
                                        Password
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <Input
                                                {...field}
                                                disabled={isPending}
                                                placeholder="••••••••"
                                                type='password'
                                                className="pl-10 border-slate-300 focus:border-emerald-600 focus:ring focus:ring-emerald-200 focus:ring-opacity-50 rounded-md shadow-sm"
                                            />
                                        </div>

                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormError message={error} />
                    <FormSucess message={success} />

                    <Button
                        disabled={isPending}
                        type='submit'
                        className='w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg'
                    >
                        {isPending ? (
                            <div className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating your account...
                            </div>
                        ) : (
                            "Create Your VTrade Account"
                        )}
                    </Button>
                </form>
            </Form>
        </CardWrapper>
    )
}

export default SignUpForm