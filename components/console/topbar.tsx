"use client"

import { Bell, Menu, Settings, User } from "lucide-react"
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

interface TopbarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export function Topbar({ sidebarOpen, setSidebarOpen }: TopbarProps) {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden">
          <Menu className="w-5 h-5" />
        </Button>

        <div className="hidden lg:block">
          <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Welcome back, John Doe</p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-3">
        {/* Market Status */}
        <div className="hidden md:flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Market Open</span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
          >
            3
          </Badge>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/professional-trader-avatar.png" alt="User" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">John Doe</p>
                <p className="text-xs leading-none text-muted-foreground">john.doe@example.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
