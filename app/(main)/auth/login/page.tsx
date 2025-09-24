import MobileAuthFlow from '@/components/auth/MobileAuthFlow'
import React from 'react'


const LoginPage = () => {
    return (
        <MobileAuthFlow initialStep="login" />
    )
}

export default LoginPage