/**
 * @file Account.tsx
 * @description Displays user account and portfolio information.
 * No major changes were needed here; it correctly consumes data from the parent.
 */
"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogOut, User, DollarSign, Briefcase } from "lucide-react"
import { signOut } from "next-auth/react"

interface AccountProps {
    portfolio: any,
    user: any,
}

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string, color?: string }) => (
    <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border">
        <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full ${color || 'bg-blue-100 text-blue-600'}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-lg font-semibold font-mono text-gray-900">{value}</p>
        </div>
    </div>
)

export function Account({ portfolio, user }: AccountProps) {
    const formatCurrency = (amount: number) => `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    
    const account = portfolio?.account;

    return (
        <div className="space-y-6 pb-20">
            <Card className="overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-2xl font-bold border-2 border-white/50">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{user?.name || "Trading Account"}</h2>
                            <p className="text-sm text-gray-300">{user?.email}</p>
                        </div>
                    </div>
                </div>
                 <CardContent className="p-6 space-y-4">
                     <h3 className="text-lg font-semibold text-gray-800">Funds</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <StatCard icon={<Briefcase size={20}/>} title="Total Value" value={formatCurrency(account?.totalValue)} />
                        <StatCard icon={<DollarSign size={20}/>} title="Available Margin" value={formatCurrency(account?.availableMargin)} color="bg-green-100 text-green-600"/>
                     </div>
                     <div className="grid grid-cols-1">
                        <StatCard icon={<User size={20}/>} title="Used Margin" value={formatCurrency(account?.usedMargin)} color="bg-orange-100 text-orange-600" />
                     </div>
                 </CardContent>
            </Card>

            <div className="px-4">
                 <Button 
                    onClick={() => signOut()}
                    variant="destructive" 
                    className="w-full"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                </Button>
            </div>
        </div>
    )
}
