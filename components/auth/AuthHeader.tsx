/**
 * File: components/auth/AuthHeader.tsx
 * Module: components/auth
 * Purpose: Auth header branding for login/register flows.
 * Author: Cursor / BharatERP
 * Last-updated: 2026-02-11
 * Notes:
 * - Updated branding from MarketPulse360 to VTrade.
 */

import { cn } from '@/lib/utils';
import { Poppins } from 'next/font/google'
import Image from 'next/image';

const font = Poppins({
    subsets: ["latin"],
    weight: ["600"]
})

interface HeaderProps {
    label: string;
}

export const AuthHeader = ({ label }: HeaderProps) => {
    return (
        <div className='w-full flex flex-col gap-y-4 items-center justify-center'>
            <h1 className={cn(
                "text-3xl font-semibold",
                font.className
            )}>
                <Image 
                src="/vtrade/logo.png"
                alt="VTrade logo"
                className='h-1/2 aspect-auto' 
                width={500}
                height={200}
                />
            </h1>
            <p className='text-muted-foreground text-sm'>
                {label}
            </p>
        </div>
    )
}