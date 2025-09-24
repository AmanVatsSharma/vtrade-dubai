import MobileAuthFlow from '@/components/auth/MobileAuthFlow'
import React from 'react'


const RegisterPage = () => {
    return (
        <MobileAuthFlow initialStep="register" />
    )
}

export default RegisterPage