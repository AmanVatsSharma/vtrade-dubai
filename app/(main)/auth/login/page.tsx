import LoginForm from '@/components/auth/loginform'
import React from 'react'


const LoginPage = () => {
    return (
     <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
        <LoginForm />
     </div>
    )
}

export default LoginPage