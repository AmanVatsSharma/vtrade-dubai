/**
 * @file notification-center.tsx
 * @module admin-console
 * @description Enterprise notification center for system-wide announcements and alerts
 * @author BharatERP
 * @created 2025-01-27
 */

"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Bell,
  Plus,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  Trash2,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface Notification {
  id: string
  title: string
  message: string
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  target: 'ALL' | 'ADMINS' | 'USERS' | 'SPECIFIC'
  createdAt: Date
  expiresAt?: Date
  read: boolean
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'INFO' as string,
    priority: 'MEDIUM' as string,
    target: 'ALL' as string,
  })

  const fetchNotifications = async () => {
    setLoading(true)
    console.log("🔔 [NOTIFICATION-CENTER] Fetching notifications...")

    try {
      const response = await fetch('/api/admin/notifications').catch(() => null)

      if (response && response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      } else {
        // Mock data
        setNotifications([
          {
            id: '1',
            title: 'System Maintenance Scheduled',
            message: 'Scheduled maintenance on January 30, 2025 from 2:00 AM to 4:00 AM IST',
            type: 'WARNING',
            priority: 'HIGH',
            target: 'ALL',
            createdAt: new Date(),
            read: false,
          },
          {
            id: '2',
            title: 'New Feature Released',
            message: 'Advanced analytics dashboard is now available',
            type: 'INFO',
            priority: 'MEDIUM',
            target: 'ADMINS',
            createdAt: new Date(Date.now() - 3600000),
            read: true,
          },
        ])
      }
    } catch (error) {
      console.error("❌ [NOTIFICATION-CENTER] Error fetching notifications:", error)
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const handleCreateNotification = async () => {
    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotification),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Notification created successfully",
        })
        setShowCreateDialog(false)
        setNewNotification({
          title: '',
          message: '',
          type: 'INFO',
          priority: 'MEDIUM',
          target: 'ALL',
        })
        fetchNotifications()
      } else {
        throw new Error('Failed to create notification')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create notification",
        variant: "destructive",
      })
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />
      case 'WARNING':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'INFO':
      default:
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'INFO': 'bg-blue-400/20 text-blue-400 border-blue-400/30',
      'WARNING': 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30',
      'ERROR': 'bg-red-400/20 text-red-400 border-red-400/30',
      'SUCCESS': 'bg-green-400/20 text-green-400 border-green-400/30',
    }
    return <Badge className={colors[type] || colors['INFO']}>{type}</Badge>
  }

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      'LOW': 'bg-gray-400/20 text-gray-400 border-gray-400/30',
      'MEDIUM': 'bg-blue-400/20 text-blue-400 border-blue-400/30',
      'HIGH': 'bg-orange-400/20 text-orange-400 border-orange-400/30',
      'URGENT': 'bg-red-400/20 text-red-400 border-red-400/30',
    }
    return <Badge className={colors[priority] || colors['MEDIUM']}>{priority}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-primary mb-2 flex items-center gap-2">
            <Bell className="w-8 h-8" />
            Notification Center
          </h1>
          <p className="text-muted-foreground">Manage system-wide announcements and alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchNotifications}
            disabled={loading}
            className="border-primary/50 text-primary hover:bg-primary/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Notification
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Create Notification</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                    placeholder="Notification title"
                  />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={newNotification.message}
                    onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                    placeholder="Notification message"
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select value={newNotification.type} onValueChange={(value) => setNewNotification({ ...newNotification, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INFO">Info</SelectItem>
                        <SelectItem value="WARNING">Warning</SelectItem>
                        <SelectItem value="ERROR">Error</SelectItem>
                        <SelectItem value="SUCCESS">Success</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={newNotification.priority} onValueChange={(value) => setNewNotification({ ...newNotification, priority: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Target Audience</Label>
                  <Select value={newNotification.target} onValueChange={(value) => setNewNotification({ ...newNotification, target: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Users</SelectItem>
                      <SelectItem value="ADMINS">Admins Only</SelectItem>
                      <SelectItem value="USERS">Users Only</SelectItem>
                      <SelectItem value="SPECIFIC">Specific Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateNotification} className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Send Notification
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Notifications List */}
      <div className="space-y-4">
        {loading && notifications.length === 0 ? (
          <Card className="bg-card border-border shadow-sm neon-border">
            <CardContent className="p-6 text-center text-muted-foreground">
              Loading notifications...
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card className="bg-card border-border shadow-sm neon-border">
            <CardContent className="p-6 text-center text-muted-foreground">
              No notifications found
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className={`bg-card border-border shadow-sm neon-border ${!notification.read ? 'border-primary/50' : ''}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {getTypeIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-foreground">{notification.title}</h3>
                          {getTypeBadge(notification.type)}
                          {getPriorityBadge(notification.priority)}
                          {!notification.read && (
                            <Badge className="bg-primary/20 text-primary border-primary/30">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Target: {notification.target}</span>
                          <span>•</span>
                          <span>{new Date(notification.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
