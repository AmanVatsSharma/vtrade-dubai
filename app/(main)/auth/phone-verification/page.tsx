import MobileAuthFlow from '@/components/auth/MobileAuthFlow'
import React from 'react'

const PhoneVerificationPage = () => {
    return (
        <MobileAuthFlow initialStep="otp" />
    )
}

export default PhoneVerificationPage
