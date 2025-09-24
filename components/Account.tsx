/**
 * @file Account.tsx
 * @description Displays user account and portfolio information.
 * No major changes were needed here; it correctly consumes data from the parent.
 */
"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogOut, User, DollarSign, Briefcase, Copy, Check, LifeBuoy, ArrowRight } from "lucide-react"
import { signOut } from "next-auth/react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { ModeToggle } from "@/components/ui/modeToggle"
import { toast } from "@/hooks/use-toast"
import { useTransactions } from "@/lib/hooks/use-trading-data"
import Image from "next/image"
import Link from "next/link"

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
    const [copied, setCopied] = useState(false)
    const [profileOpen, setProfileOpen] = useState(false)

    const account = portfolio?.account;
    const { transactions, isLoading: txLoading } = useTransactions(account?.id)

    // CSV Export
    const exportCSV = () => {
        if (!transactions?.length) return
        const header = 'Date,Time (IST),Type,Amount,Description\n'
        const rows = transactions.map((t: any) => {
            const date = new Date(t.createdAt);
            const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' });
            const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
            return `${dateStr},${timeStr},${t.type},${t.amount},"${t.description || ''}"`;
        }).join('\n')
        const csv = header + rows
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'statement.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    // CTA click logger for debugging navigation events
    const logConsoleCtaClick = () => {
        try {
            console.log('[Account] CTA clicked: Navigating to /console')
        } catch (e) {
            // No-op: console shouldn't fail, but keep robust guard
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
        <div className="space-y-6 overflow-y-auto pb-20">
            <Card className="rounded-2xl shadow-xl border-gray-100">
                <CardContent className="p-0">
                    {/* Premium-style header - restored and enhanced for mobile */}
                    <div className="rounded-t-2xl px-4 py-5 sm:px-6 sm:py-6 bg-gradient-to-r from-slate-900 via-indigo-900 to-blue-800 text-white flex  sm:flex-row items-start sm:items-center justify-between gap-4">
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
                        <div className="flex flex-col md:flex-row items-center gap-2 w-full sm:w-auto justify-end">
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

                        {/* Actions - premium console CTA with modern gradient and subtle motion */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <Button
                                asChild
                                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-cyan-500 text-white text-base py-3 shadow-lg ring-1 ring-white/10 transition-all duration-200 hover:shadow-xl hover:ring-white/30 hover:scale-[1.01]"
                                aria-label="Open Trading Console"
                            >
                                <Link href="/console" prefetch onClick={logConsoleCtaClick}>
                                    <span className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-white/40 transition-opacity" />
                                    <div className="relative flex items-center justify-center gap-2">
                                        <span className="font-semibold tracking-wide">Open Trading Console</span>
                                        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                                    </div>
                                </Link>
                            </Button>
                            <div className="hidden sm:block" />
                            <div className="flex items-center justify-end text-xs text-gray-500">
                                {accountId && <span>Account: {accountId.slice(0, 8)}…{accountId.slice(-4)}</span>}
                            </div>
                        </div>

                        {/* Premium Relationship Manager Card */}
                        <div className="mt-6">
                            <div className="relative overflow-hidden rounded-2xl shadow-xl border border-white/20 bg-gradient-to-br from-slate-900 via-indigo-900 to-blue-900">
                                {/* Background Pattern */}
                                <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:20px_20px]" />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30" />
                                
                                {/* Decorative Elements */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
                                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl transform -translate-x-10 translate-y-10" />
                                
                                {/* Content */}
                                <div className="relative p-6 sm:p-8">
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                                        {/* RM Image/Avatar Section */}
                                        <div className="relative">
                                            <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 p-1">
                                                <div className="h-full w-full rounded-xl bg-white/95 dark:bg-slate-900 relative overflow-hidden">
                                                    <Image
                                                        src="/rm_dp-01.webp"
                                                        alt="Relationship Manager"
                                                        fill
                                                        className="object-cover"
                                                        sizes="96px"
                                                    />
                                                </div>
                                            </div>
                                            <div className="absolute -bottom-2 -right-2 h-6 w-6 bg-green-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                                                <div className="h-2 w-2 bg-white rounded-full animate-pulse" />
                                            </div>
                                        </div>

                                        {/* RM Info Section */}
                                        <div className="flex-1 text-center sm:text-left">
                                            <h3 className="text-xl font-bold text-white mb-1">Your Personal Relationship Manager</h3>
                                            <div className="space-y-2">
                                                <p className="text-lg font-semibold text-blue-200">Dev Gupta</p>
                                                <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-blue-100/80">
                                                    <div className="flex items-center">
                                                        <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                                                        <span>Online Now</span>
                                                    </div>
                                                    <span className="hidden sm:inline-block">•</span>
                                                    <span>Available: Mon-Fri, 9:30 AM - 6:00 PM IST</span>
                                                </div>
                                            </div>

                                            {/* Quick Stats */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 mb-6">
                                                <div className="rounded-lg bg-white/10 backdrop-blur-sm p-3">
                                                    <p className="text-xs text-blue-200/80">Response Time</p>
                                                    <p className="text-lg font-semibold text-white">&lt; 30 mins</p>
                                                </div>
                                                <div className="rounded-lg bg-white/10 backdrop-blur-sm p-3">
                                                    <p className="text-xs text-blue-200/80">Experience</p>
                                                    <p className="text-lg font-semibold text-white">8+ Years</p>
                                                </div>
                                                <div className="rounded-lg bg-white/10 backdrop-blur-sm p-3 sm:col-span-1 col-span-2">
                                                    <p className="text-xs text-blue-200/80">Client Rating</p>
                                                    <p className="text-lg font-semibold text-white">4.9/5.0 ⭐</p>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                                                <Button 
                                                    onClick={() => window.open('tel:+916307656991')}
                                                    className="bg-white/95 hover:bg-white text-blue-900 font-medium px-6"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                                    </svg>
                                                    Schedule a Call
                                                </Button>
                                                <Button 
                                                    onClick={() => window.open('https://wa.me/916307656991')}
                                                    className="bg-green-500 hover:bg-green-600 text-white font-medium px-6"
                                                >
                                                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                                    </svg>
                                                    Chat on WhatsApp
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Profile Drawer */}
            <Drawer open={profileOpen} onOpenChange={setProfileOpen}>
                <DrawerContent className="h-[85vh] flex flex-col bg-white text-gray-900 dark:bg-slate-900 dark:text-slate-100">
                    <DrawerHeader className="border-b">
                        <DrawerTitle>My Profile</DrawerTitle>
                        <DrawerDescription>Manage your personal information and trading preferences</DrawerDescription>
                    </DrawerHeader>
                    <div className="flex-1 p-4 sm:p-6 space-y-8 overflow-y-auto">
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

            {/* Fund transfer is handled within the Trading Console. Inline dialog removed in favor of a unified console experience. */}

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
                                    <th className="px-2 py-2 text-left font-semibold text-gray-700">Time</th>
                                    <th className="px-2 py-2 text-left font-semibold text-gray-700">Type</th>
                                    <th className="px-2 py-2 text-right font-semibold text-gray-700">Amount</th>
                                    <th className="px-2 py-2 text-left font-semibold text-gray-700">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {txLoading ? (
                                    <tr><td colSpan={5} className="text-center py-4">Loading...</td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-4 text-gray-400">No transactions yet.</td></tr>
                                ) : transactions.map((t: any) => (
                                    <tr key={t.id} className="border-b hover:bg-gray-50">
                                        <td className="px-2 py-1 whitespace-nowrap text-black">{new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' })}</td>
                                        <td className="px-2 py-1 whitespace-nowrap text-black">{new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</td>
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
