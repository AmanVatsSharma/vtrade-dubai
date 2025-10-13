"use client"

/**
 * Console Topbar Component
 * 
 * Optimized for mobile with:
 * - Real user data from session
 * - Responsive design (compact on mobile)
 * - Touch-friendly buttons
 * - Market status indicator
 */

import { Bell, Menu, Settings, User, LogOut, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"
import { ThemeToggle } from "./theme-toggle"
import { useSession, signOut } from "next-auth/react"
import { useConsoleData } from "@/lib/hooks/use-console-data"
import { useEffect, useMemo, useState } from "react"
import { getMarketSession } from "@/lib/hooks/market-timing"
import { formatTimeIST, getCurrentISTDate } from "@/lib/date-utils"

import { useSidebar } from "@/components/ui/sidebar"

export function Topbar() {
  const { open, setOpen } = useSidebar()
  console.log('🎯 [TOPBAR] Rendering with sidebarOpen:', open)

  // Get real user data
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  const { consoleData } = useConsoleData(userId)

  // Extract user info
  const user = useMemo(() => {
    console.log('👤 [TOPBAR] User data:', { session, consoleData })
    const sessionUser = session?.user as any
    return {
      name: consoleData?.user?.name || sessionUser?.name || 'User',
      email: consoleData?.user?.email || sessionUser?.email || '',
      phone: consoleData?.user?.phone || sessionUser?.phone || '',
      clientId: consoleData?.user?.clientId || sessionUser?.clientId || '',
      initials: (consoleData?.user?.name || sessionUser?.name || 'U')
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
  }, [session, consoleData])

  // Centralized market status in IST (open/pre-open/closed) with periodic refresh
  const [marketStatus, setMarketStatus] = useState<{isOpen: boolean; label: string}>(() => {
    const session = getMarketSession()
    return { isOpen: session === 'open', label: session === 'open' ? 'Market Open' : session === 'pre-open' ? 'Pre-Open' : 'Market Closed' }
  })
  useEffect(() => {
    const t = setInterval(() => {
      const session = getMarketSession()
      setMarketStatus({ isOpen: session === 'open', label: session === 'open' ? 'Market Open' : session === 'pre-open' ? 'Pre-Open' : 'Market Closed' })
    }, 15000)
    return () => clearInterval(t)
  }, [])

  // Keep a ticking IST clock (optional use)
  const [currentTime, setCurrentTime] = useState<Date>(getCurrentISTDate())
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(getCurrentISTDate()), 1000)
    return () => clearInterval(t)
  }, [])

  console.log('📊 [TOPBAR] Market status:', marketStatus)

  const handleLogout = async () => {
    console.log('🚪 [TOPBAR] User logging out')
    await signOut({ callbackUrl: '/' })
  }

  return (
    <header className="sticky top-0 z-40 h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 md:px-6 shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        {/* Menu Toggle Button for Mobile */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            console.log('🍔 [TOPBAR] Menu button clicked')
            setOpen(!open)
          }}
          className="lg:hidden h-9 w-9 p-0 hover:bg-accent"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </Button>

        {/* Title - Hidden on small mobile */}
        <div className="hidden sm:block min-w-0">
          <h2 className="text-base md:text-lg font-semibold text-foreground truncate">
            Trading Console
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            Welcome back, {user.name.split(' ')[0]}
          </p>
        </div>

        {/* Mobile Title - Shown only on small screens */}
        <div className="sm:hidden">
          <h2 className="text-sm font-semibold text-foreground">Console</h2>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
        {/* Market Status - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
          <div className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs font-medium text-muted-foreground">{marketStatus.label}</span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative h-9 w-9 p-0 hover:bg-accent"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 p-0 flex items-center justify-center text-[10px] sm:text-xs"
          >
            3
          </Badge>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="relative h-9 w-9 rounded-full p-0 hover:bg-accent"
              aria-label="User menu"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={session?.user?.image || undefined} alt={user.name} />
                <AvatarFallback className="text-xs sm:text-sm font-semibold">
                  {user.initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64 sm:w-72" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1.5">
                <p className="text-sm font-medium leading-none">{user.name}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user.email}
                </p>
                {user.clientId && (
                  <p className="text-xs leading-none text-muted-foreground">
                    ID: {user.clientId}
                  </p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive cursor-pointer focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
