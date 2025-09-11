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
                src="https://firebasestorage.googleapis.com/v0/b/theaweshop.appspot.com/o/uploads%2Flogo.png?alt=media&token=248632f8-8183-4ba0-b999-3046c165ab09" 
                alt="MarketPulse360 logo" 
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