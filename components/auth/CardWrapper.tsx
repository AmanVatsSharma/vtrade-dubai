import React from 'react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { AuthHeader } from './AuthHeader'
import AuthSocial from './AuthSocial'
import AuthBackButton from './AuthBackButton'

type CardWrapperProps = {
    children: React.ReactNode,
    headerLabel: string,
    backButtonLabel: string,
    backButtonHref: string,
    showSocial?: boolean
}

const CardWrapper = ({
    children,
    headerLabel,
    backButtonHref,
    backButtonLabel,
    showSocial
}: CardWrapperProps) => {
    return (
        <Card className='w-[420px] shadow-xl border-0 bg-white/80 backdrop-blur-md rounded-2xl'>
            <CardHeader className="pb-2">
                <AuthHeader label={headerLabel}/>
            </CardHeader>
            <CardContent className="pt-0">
            {children}
            </CardContent>
            {showSocial && (
                <CardFooter className="pt-0">
                    <AuthSocial/>
                </CardFooter>
            )}
            <CardFooter className="pt-0">
                <AuthBackButton
                label={backButtonLabel}
                href={backButtonHref}
                />
            </CardFooter>
        </Card>
    )
}

export default CardWrapper