import MobileAuthFlow from '@/components/auth/MobileAuthFlow'
import React from 'react'

const OtpVerificationPage = () => {
    return (
        <MobileAuthFlow initialStep="otp" />
    )
}

export default OtpVerificationPage
