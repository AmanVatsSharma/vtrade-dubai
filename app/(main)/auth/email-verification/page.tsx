"use client"
import EmailVerification from '@/components/auth/EmailVerification'
import React, { Suspense } from 'react'

const EmailVerificationPage = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
                <EmailVerification />
            </div>
        </Suspense>
    )
}

export default EmailVerificationPage