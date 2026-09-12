import React, { useState, useEffect, useCallback } from "react"
import { Bell, Check, CheckCheck, Trash2, Search, AlertCircle, HeartPulse, Send, Calendar, Shield, MessageSquare, Info, RefreshCw, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { notificationRepository } from "@/lib/repositories/notificationRepository"
import type { LocalNotification } from "@/lib/db/bmsDatabase"
import { syncEngine } from "@/lib/sync/syncEngine"

export interface FormattedNotification {
  id: string
  sender: string
  avatar?: string
  initials: string
  message: string
  timestamp: string
  isRead: boolean
  category: "appointment" | "referral" | "vitals" | "team" | "message" | "system"
  syncStatus: string
}

const DEFAULT_SEED_NOTIFICATIONS = [
  {
    notification_type: "appointment",
    notification_message: "Joseph Angelo Petalio requested approval for an appointment reschedule.",
  },
  {
    notification_type: "referral",
    notification_message: "Dr. Maria Santos updated Emergency Referral #REF-2026-089 status to In Transit.",
  },
  {
    notification_type: "vitals",
    notification_message: "Clinical Alert: High Risk Vitals detected for Patient Ana Ramirez (BP: 145/95 mmHg).",
  },
  {
    notification_type: "team",
    notification_message: "Team Update: Dr. Sarah Lin accepted facility invitation and joined your team.",
  },
  {
    notification_type: "message",
    notification_message: "San Fernando Health Center: Received 3 offline sync messages regarding maternal transfer.",
  },
]

export function NotificationPopover({ align = "end" }: { align?: "end" | "center" | "start" }) {
  const [notifications, setNotifications] = useState<LocalNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState<boolean>(syncEngine.isNetworkOnline())
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)
  const [filterQuery, setFilterQuery] = useState("")

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      let list = await notificationRepository.getUserNotifications()

      // Seed initial default notifications into Dexie & Backend if totally empty on first load
      if (list.length === 0) {
        for (const seed of DEFAULT_SEED_NOTIFICATIONS) {
          await notificationRepository.sendNotification({
            notification_type: seed.notification_type,
            notification_message: seed.notification_message,
          })
        }
        list = await notificationRepository.getUserNotifications()
      }

      setNotifications(list)
    } catch (err) {
      console.warn("[NotificationPopover] Error loading notifications:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    const unsubscribe = syncEngine.subscribe((status: any) => {
      setIsOnline(status.isOnline)
      fetchNotifications()
    })

    return () => {
      unsubscribe()
    }
  }, [fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const formattedList: FormattedNotification[] = notifications.map((item) => {
    let category: FormattedNotification["category"] = "system"
    const typeLower = (item.notification_type || "").toLowerCase()
    if (typeLower.includes("appoint")) category = "appointment"
    else if (typeLower.includes("referral")) category = "referral"
    else if (typeLower.includes("vital") || typeLower.includes("alert")) category = "vitals"
    else if (typeLower.includes("team")) category = "team"
    else if (typeLower.includes("msg") || typeLower.includes("message")) category = "message"

    let sender = "System Alert"
    let initials = "SYS"
    const msg = item.notification_message || ""

    if (msg.includes("Joseph Angelo")) {
      sender = "Joseph Angelo Petalio"
      initials = "JP"
    } else if (msg.includes("Dr. Maria")) {
      sender = "Dr. Maria Santos"
      initials = "MS"
    } else if (msg.includes("Dr. Sarah") || category === "team") {
      sender = "Team Management"
      initials = "TM"
    } else if (msg.includes("San Fernando") || category === "message") {
      sender = "Maternal Messages"
      initials = "MM"
    } else if (category === "vitals") {
      sender = "Clinical Alert System"
      initials = "CA"
    }

    const dateObj = item.notification_date ? new Date(item.notification_date) : new Date()
    const timestampStr = isNaN(dateObj.getTime())
      ? "Just now"
      : dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    return {
      id: item.id || item.notification_id || Math.random().toString(),
      sender,
      initials,
      message: msg,
      timestamp: timestampStr,
      isRead: !!item.is_read,
      category,
      syncStatus: item.sync_status || "synced",
    }
  })

  const filteredNotifications = formattedList.filter((item) => {
    if (showOnlyUnread && item.isRead) return false
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase()
      const matchesSender = item.sender.toLowerCase().includes(q)
      const matchesMessage = item.message.toLowerCase().includes(q)
      const matchesCategory = item.category.toLowerCase().includes(q)
      return matchesSender || matchesMessage || matchesCategory
    }
    return true
  })

  const handleMarkAllAsRead = async () => {
    await notificationRepository.markAllAsRead()
    await fetchNotifications()
  }

  const handleToggleRead = async (id: string) => {
    await notificationRepository.markAsRead(id)
    await fetchNotifications()
  }

  const handleClearAll = async () => {
    await notificationRepository.clearAll()
    await fetchNotifications()
  }

  const handleResetDefaults = async () => {
    await notificationRepository.clearAll()
    for (const seed of DEFAULT_SEED_NOTIFICATIONS) {
      await notificationRepository.sendNotification({
        notification_type: seed.notification_type,
        notification_message: seed.notification_message,
      })
    }
    await fetchNotifications()
  }

  const getCategoryIcon = (category: FormattedNotification["category"]) => {
    switch (category) {
      case "vitals":
        return <HeartPulse className="h-3 w-3 text-red-500" />
      case "referral":
        return <Send className="h-3 w-3 text-blue-500" />
      case "appointment":
        return <Calendar className="h-3 w-3 text-amber-500" />
      case "team":
        return <Shield className="h-3 w-3 text-emerald-500" />
      case "message":
        return <MessageSquare className="h-3 w-3 text-purple-500" />
      default:
        return <Info className="h-3 w-3 text-muted-foreground" />
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 relative" aria-label="Notifications">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-sm animate-in zoom-in-50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        collisionPadding={8}
        className="w-[calc(100vw-2rem)] sm:w-[400px] pt-4 px-4 pb-3 flex flex-col gap-3 rounded-xl border-border shadow-xl bg-background"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unreadCount > 0 ? (
              <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-red-500/20">
                {unreadCount} unread
              </span>
            ) : (
              <span className="text-xs text-muted-foreground font-medium">All caught up</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <label htmlFor="unreads-toggle" className="cursor-pointer select-none text-[11px]">
              Unreads only
            </label>
            <Switch
              id="unreads-toggle"
              checked={showOnlyUnread}
              onCheckedChange={setShowOnlyUnread}
              className="scale-75 origin-right"
            />
          </div>
        </div>

        {/* Offline notice bar */}
        {!isOnline && (
          <div className="flex items-center gap-2 text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1.5 rounded-md">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>Working offline. Notification updates will auto-sync when online.</span>
          </div>
        )}

        {/* Filter input & Mark All as Read */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-muted/40"
            />
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs shrink-0 gap-1.5 font-medium border-border hover:bg-muted"
            >
              <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="border-t border-border pt-2 max-h-[320px] overflow-y-auto flex flex-col divide-y divide-border/50 -mx-4 px-4">
          {loading ? (
            <div className="py-8 text-center flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-muted-foreground/50 stroke-1" />
              <p className="text-xs font-medium">No notifications found</p>
              {formattedList.length === 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDefaults}
                  className="h-7 text-xs mt-1 text-primary hover:underline"
                >
                  Reset demo notifications
                </Button>
              ) : (
                <p className="text-[11px]">Try clearing your search query or unread filter.</p>
              )}
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleToggleRead(item.id)}
                className={`group relative flex items-start gap-3 py-3 px-2 transition-colors cursor-pointer rounded-lg hover:bg-muted/60 ${
                  !item.isRead ? "bg-primary/5 dark:bg-primary/10" : ""
                }`}
              >
                <div className="relative shrink-0 mt-0.5">
                  <Avatar className="h-8 w-8 border border-border">
                    <AvatarFallback className="text-xs font-semibold bg-muted text-foreground">
                      {item.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-background border border-border shadow-sm">
                    {getCategoryIcon(item.category)}
                  </span>
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={`text-xs truncate ${
                        !item.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                      }`}
                    >
                      {item.sender}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{item.timestamp}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                    {item.message}
                  </p>
                </div>

                {/* Unread indicator dot & mark read button */}
                <div className="absolute right-2 top-3 flex items-center gap-1">
                  {!item.isRead ? (
                    <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 group-hover:hidden" />
                  ) : null}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleRead(item.id)
                    }}
                    title={item.isRead ? "Mark as unread" : "Mark as read"}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                  >
                    <Check className={`h-3.5 w-3.5 ${item.isRead ? "text-muted-foreground" : "text-emerald-600"}`} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {formattedList.length > 0 && (
          <div className="border-t border-border pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{formattedList.length} total alerts</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Clear all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
