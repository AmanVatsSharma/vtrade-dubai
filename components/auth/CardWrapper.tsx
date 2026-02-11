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
    backButtonAction?: () => void,
    showSocial?: boolean
}

const CardWrapper = ({
    children,
    headerLabel,
    backButtonHref,
    backButtonLabel,
    backButtonAction,
    showSocial
}: CardWrapperProps) => {
    return (
        <Card className='md:w-[420px] w-full overflow-hidden rounded-2xl border-0 bg-white/80 shadow-xl backdrop-blur-md'>
            {/* Dark header strip for logo contrast (VTrade navy) */}
            <CardHeader className="bg-[#070727] pb-3 pt-5">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                    <AuthHeader label={headerLabel}/>
                </div>
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
                onClick={backButtonAction}
                />
            </CardFooter>
        </Card>
    )
}

export default CardWrapper