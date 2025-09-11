/**
 * @file Account.tsx
 * @description Displays user account and portfolio information.
 * No major changes were needed here; it correctly consumes data from the parent.
 */
"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogOut, User, DollarSign, Briefcase, Copy, Check, LifeBuoy } from "lucide-react"
import { signOut } from "next-auth/react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/ui/modeToggle"
import { toast } from "@/hooks/use-toast"
import { addFunds, withdrawFunds, useTransactions } from "@/lib/hooks/use-trading-data"
import { Loader2 } from "lucide-react"
import Image from "next/image"

interface AccountProps {
    portfolio: any,
    user: any,
    onUpdate: () => void,
}

const StatCard = ({ icon, title, value, color }: { icon: React.ReactNode, title: string, value: string, color?: string }) => (
    <div className="flex items-center gap-4 rounded-xl border border-white/60 bg-white/70 backdrop-blur-md shadow-lg dark:bg-white/5">
        <div className={`m-3 flex-shrink-0 h-11 w-11 flex items-center justify-center rounded-full ring-1 ring-black/5 ${color || 'bg-blue-100 text-blue-600'}`}>
            {icon}
        </div>
        <div className="pr-4 py-3">
            <p className="text-xs uppercase tracking-wide text-gray-600">{title}</p>
            <p className="text-xl font-semibold font-mono text-gray-900">{value}</p>
        </div>
    </div>
)

export function Account({ portfolio, user, onUpdate }: AccountProps) {
    const formatCurrency = (amount: number) => `₹${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const [fundDialogOpen, setFundDialogOpen] = useState(false)
    const [fundAmount, setFundAmount] = useState(0)
    const [loading, setLoading] = useState(false)
    const [copied, setCopied] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)

    const account = portfolio?.account;
    const { transactions, isLoading: txLoading } = useTransactions(account?.id)

    // CSV Export
    const exportCSV = () => {
        if (!transactions?.length) return
        const header = 'Date,Type,Amount,Description\n'
        const rows = transactions.map((t: any) => `${new Date(t.createdAt).toLocaleDateString()},${t.type},${t.amount},"${t.description || ''}"`).join('\n')
        const csv = header + rows
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'statement.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleFundAction = async (type: 'CREDIT' | 'DEBIT') => {
        if (!fundAmount || fundAmount <= 0) {
            toast({
                title: "Invalid Amount",
                description: "Please enter a valid amount.",
                variant: "destructive",
            })
            return
        }

        setLoading(true)
        try {
            const payload = {
                tradingAccountId: account?.id,
                amount: fundAmount,
                type,
                description: type === 'CREDIT' ? 'Funds Added by User' : 'Funds Withdrawn by User'
            }

            if (type === 'CREDIT') {
                await addFunds(payload)
            } else {
                await withdrawFunds(payload)
            }

            toast({
                title: "Success",
                description: `₹${fundAmount} has been ${type === 'CREDIT' ? 'added' : 'withdrawn'} successfully.`,
            })
            onUpdate()
            setFundDialogOpen(false)
            setFundAmount(0)
        } catch (error) {
            console.error(error)
            toast({
                title: "Failed",
                description: "Something went wrong. Please try again.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const clientId = portfolio?.account?.client_id as string | undefined
    const accountId = portfolio?.account?.id as string | undefined
    const userName = user?.name || "Trader"
    const userEmail = user?.email || ""
    const userImage = user?.image as string | undefined

    const initials = (userName || "").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()

    const copyClientId = async () => {
        if (!clientId) return
        try {
            await navigator.clipboard.writeText(clientId)
            setCopied(true)
            setTimeout(() => setCopied(false), 1200)
        } catch {}
    }

    function ToggleRow({ label }: { label: string }) {
        const [enabled, setEnabled] = useState(true)
        return (
            <div className="flex items-center justify-between rounded border p-2 bg-white">
                <span className="text-xs text-gray-700">{label}</span>
                <button
                    onClick={() => { setEnabled(v => !v); toast({ title: label, description: `Turned ${enabled ? 'off' : 'on'}.` }) }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                >
                    <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`}
                    />
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <Card className="rounded-2xl shadow-xl border-gray-100">
                <CardContent className="p-0">
                    {/* Premium-style header - restored and enhanced for mobile */}
                    <div className="rounded-t-2xl px-4 py-5 sm:px-6 sm:py-6 bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4 w-full sm:w-auto">
                            {userImage ? (
                                <div className="h-16 w-16 relative rounded-full overflow-hidden ring-4 ring-white/20 shadow-lg">
                                    <Image src={userImage} alt={userName} fill sizes="64px" className="object-cover" />
                                </div>
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-white/15 text-white flex items-center justify-center text-xl font-semibold ring-4 ring-white/10 shadow-lg">
                                    {initials}
                                </div>
                            )}
                            <div className="min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                                    <h2 className="text-2xl font-bold truncate">{userName}</h2>
                                    <button onClick={() => setProfileOpen(true)} className="text-xs px-2 py-1 rounded border border-white/20 bg-white/10 hover:bg-white/15 transition">View Profile</button>
                                </div>
                                <p className="text-sm text-white/70 truncate">{userEmail}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs font-medium text-white bg-white/10 px-2 py-0.5 rounded">Client ID: {clientId || "—"}</span>
                                    {clientId && (
                                        <button onClick={copyClientId} className="inline-flex items-center text-white/70 hover:text-white">
                                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <a aria-label="Support" href="mailto:support@tradingpro.app" className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white">
                                <LifeBuoy className="h-5 w-5" />
                            </a>
                            <Button onClick={() => signOut()} variant="destructive" className="bg-white/10 hover:bg-white/20 border-white/20 text-white text-sm px-3 py-2">
                                <LogOut className="mr-2 h-5 w-5" /> Log Out
                            </Button>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 space-y-6">
                        {/* Funds summary - premium card look, mobile stacking */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <StatCard icon={<DollarSign size={22} />} title="Total Balance" value={formatCurrency(account?.balance)} color="bg-emerald-100 text-emerald-600" />
                            <StatCard icon={<Briefcase size={22} />} title="Available Margin" value={formatCurrency(account?.availableMargin)} color="bg-sky-100 text-sky-600" />
                            <StatCard icon={<User size={22} />} title="Used Margin" value={formatCurrency(account?.usedMargin)} color="bg-orange-100 text-orange-600" />
                        </div>

                        {/* Actions - premium button, mobile stacking */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Button onClick={() => setFundDialogOpen(true)} className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-base py-3 rounded-xl shadow">Add / Withdraw Funds</Button>
                            <div className="hidden sm:block" />
                            <div className="flex items-center justify-end text-xs text-gray-500">
                                {accountId && <span>Account: {accountId.slice(0, 8)}…{accountId.slice(-4)}</span>}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Profile Drawer */}
            <Drawer open={profileOpen} onOpenChange={setProfileOpen}>
                <DrawerContent className="max-h-[85vh] bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100">
                    <DrawerHeader className="border-b">
                        <DrawerTitle>My Profile</DrawerTitle>
                        <DrawerDescription>Manage your personal information and trading preferences</DrawerDescription>
                    </DrawerHeader>
                    <div className="p-4 sm:p-6 space-y-8 overflow-y-auto">
                        {/* Personal Details */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Personal</h3>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div>
                                    <Label>Name</Label>
                                    <Input value={userName} disabled />
                                </div>
                                <div>
                                    <Label>Email</Label>
                                    <Input value={userEmail} disabled />
                                </div>
                                <div>
                                    <Label>Client Code</Label>
                                    <Input value={clientId || ''} disabled />
                                </div>
                            </div>
                        </div>

                        {/* Nominee */}
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Nominee</h3>
                                <Button size="sm" variant="outline" onClick={() => toast({ title: "Nominee", description: "Nominee details editor coming soon." })}>Add / Edit</Button>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-slate-400">Add a nominee for seamless asset transfer.</p>
                        </div>

                        {/* Bank Accounts */}
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Bank</h3>
                                <Button size="sm" onClick={() => toast({ title: "Bank Linking", description: "Secure bank linking flow coming soon." })}>Link Bank</Button>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">No bank linked yet.</div>
                        </div>

                        {/* Brokerage Plan */}
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Brokerage Plan</h3>
                                <Button size="sm" variant="outline" onClick={() => toast({ title: "Brokerage Plan", description: "Plan selection coming soon." })}>Change</Button>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-slate-400">Current: Standard (₹20/order). Contact support for premium plans.</div>
                        </div>

                        {/* Segments & MTF */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Segments & MTF</h3>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <ToggleRow label="Equity Delivery / Intraday" />
                                <ToggleRow label="NSE Futures" />
                                <ToggleRow label="NSE Options" />
                                <ToggleRow label="MCX Commodities" />
                                <ToggleRow label="MTF (Margin Trading Facility)" />
                            </div>
                            <div className="mt-2 p-3 rounded border bg-yellow-50 text-yellow-900 dark:bg-yellow-900/30 dark:text-yellow-200 text-xs">
                                PayLater activation: Inactive. Can be activated by support team.
                            </div>
                        </div>

                        <ModeToggle/>

                        {/* Footer */}
                        <div className="pt-2 text-xs text-gray-500 dark:text-slate-400">
                            Need help? <a className="text-blue-600 dark:text-blue-400 hover:underline" href="mailto:support@tradingpro.app">Contact Support</a>
                        </div>
                    </div>
                </DrawerContent>
            </Drawer>

            <Dialog open={fundDialogOpen} onOpenChange={setFundDialogOpen}>
                <DialogContent className="sm:max-w-sm bg-white">
                    <DialogHeader>
                        <DialogTitle>Add / Withdraw Funds</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="fund-amount">Amount</Label>
                            <Input
                                id="fund-amount"
                                type="number"
                                value={fundAmount}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFundAmount(Number(e.target.value))}
                                min="1"
                                className="w-full"
                            />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                                onClick={() => handleFundAction('CREDIT')}
                                disabled={loading || fundAmount <= 0}
                                className="w-full sm:flex-1 bg-green-600 hover:bg-green-700"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Funds"}
                            </Button>
                            <Button
                                onClick={() => handleFundAction('DEBIT')}
                                disabled={loading || fundAmount <= 0 || fundAmount > account?.availableMargin}
                                className="w-full sm:flex-1 bg-red-600 hover:bg-red-700"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Withdraw Funds"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Statement Section */}
            <Card className="rounded-2xl shadow-lg border-gray-100">
                <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 gap-2">
                        <h2 className="text-xl font-bold text-gray-900">Statement</h2>
                        <Button size="sm" variant="outline" onClick={exportCSV}>Export CSV</Button>
                    </div>
                    <div className="overflow-x-auto w-full">
                        <table className="min-w-[400px] w-full text-xs md:text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-2 py-2 text-left font-semibold text-gray-700">Date</th>
                                    <th className="px-2 py-2 text-left font-semibold text-gray-700">Type</th>
                                    <th className="px-2 py-2 text-right font-semibold text-gray-700">Amount</th>
                                    <th className="px-2 py-2 text-left font-semibold text-gray-700">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {txLoading ? (
                                    <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={4} className="text-center py-4 text-gray-400">No transactions yet.</td></tr>
                                ) : transactions.map((t: any) => (
                                    <tr key={t.id} className="border-b hover:bg-gray-50">
                                        <td className="px-2 py-1 whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString()}</td>
                                        <td className="px-2 py-1 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.type === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{t.type}</span>
                                        </td>
                                        <td className={`px-2 py-1 whitespace-nowrap text-right font-mono ${t.type === 'CREDIT' ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(Number(t.amount))}</td>
                                        <td className="px-2 py-1 whitespace-nowrap text-gray-600">{t.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
