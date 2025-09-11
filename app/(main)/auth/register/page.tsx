// @ts-nocheck
import SignUpForm from '@/components/auth/SignUpForm'
import React from 'react'


const RegisterPage = () => {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
            <SignUpForm />
        </div>
    )
}

export default RegisterPage