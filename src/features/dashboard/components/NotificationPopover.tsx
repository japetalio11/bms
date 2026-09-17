import React, { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Search, 
  AlertCircle, 
  HeartPulse, 
  Send, 
  Calendar, 
  Shield, 
  MessageSquare, 
  Info, 
  RefreshCw, 
  WifiOff, 
  ExternalLink 
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
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
  link?: string
}

export function NotificationPopover({ align = "end" }: { align?: "end" | "center" | "start" }) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<LocalNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState<boolean>(syncEngine.isNetworkOnline())
  const [showOnlyUnread, setShowOnlyUnread] = useState(false)
  const [filterQuery, setFilterQuery] = useState("")

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const list = await notificationRepository.getUserNotifications()
      setNotifications(list)
    } catch (err) {
      console.warn("[NotificationPopover] Error loading notifications:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const unsubscribe = syncEngine.subscribe((status: any) => {
      setIsOnline(status.isOnline)
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fetchNotifications()
      }, 600)
    })

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      unsubscribe()
    }
  }, [fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const formattedList: FormattedNotification[] = notifications.map((item: any) => {
    let category: FormattedNotification["category"] = "system"
    const typeLower = (item.notification_type || "").toLowerCase()
    if (typeLower.includes("appoint")) category = "appointment"
    else if (typeLower.includes("referral")) category = "referral"
    else if (typeLower.includes("vital") || typeLower.includes("alert") || typeLower.includes("cdss")) category = "vitals"
    else if (typeLower.includes("team")) category = "team"
    else if (typeLower.includes("msg") || typeLower.includes("message")) category = "message"

    let sender = item.sender || ""
    if (!sender) {
      if (category === "vitals") sender = "Clinical CDSS Alert"
      else if (category === "referral") sender = "Inter-Clinic Referral"
      else if (category === "appointment") sender = "Appointment Service"
      else if (category === "team") sender = "Team Management"
      else if (category === "message") sender = "Facility Messages"
      else sender = "System Alert"
    }

    const words = sender.trim().split(" ").filter(Boolean)
    const initials = words.length > 1
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : (sender.slice(0, 2).toUpperCase() || "SYS")

    const dateObj = item.notification_date ? new Date(item.notification_date) : new Date()
    const timestampStr = isNaN(dateObj.getTime())
      ? "Recently"
      : dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    return {
      id: item.id || item.notification_id || Math.random().toString(),
      sender,
      initials,
      message: item.notification_message || "",
      timestamp: timestampStr,
      isRead: Boolean(item.is_read),
      category,
      syncStatus: item.sync_status || "synced",
      link: item.link || (
        category === "vitals" ? "/dashboard/mothers" :
        category === "referral" ? "/dashboard/referrals" :
        category === "appointment" ? "/dashboard/appointments" :
        undefined
      ),
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
    // 1. Optimistically update local UI state immediately
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    // 2. Persist to Dexie and backend
    try {
      await notificationRepository.markAllAsRead()
    } catch (err) {
      console.error("[NotificationPopover] Failed to mark all as read:", err)
    }
    // 3. Re-fetch
    await fetchNotifications()
  }

  const handleToggleRead = async (id: string) => {
    // Optimistically update UI state
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id || n.notification_id === id ? { ...n, is_read: !n.is_read } : n
      )
    )
    try {
      await notificationRepository.markAsRead(id)
    } catch (err) {
      console.error("[NotificationPopover] Failed to toggle read status:", err)
    }
    await fetchNotifications()
  }

  const handleItemClick = async (item: FormattedNotification) => {
    if (!item.isRead) {
      await handleToggleRead(item.id)
    }
    if (item.link) {
      navigate(item.link)
    }
  }

  const handleClearAll = async () => {
    setNotifications([])
    try {
      await notificationRepository.clearAll()
    } catch (err) {
      console.error("[NotificationPopover] Failed to clear alerts:", err)
    }
    await fetchNotifications()
  }

  const getCategoryIcon = (category: FormattedNotification["category"]) => {
    switch (category) {
      case "vitals":
        return <HeartPulse className="h-4 w-4" />
      case "referral":
        return <Send className="h-4 w-4" />
      case "appointment":
        return <Calendar className="h-4 w-4" />
      case "team":
        return <Shield className="h-4 w-4" />
      case "message":
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  const getCategoryColorClasses = (category: FormattedNotification["category"]) => {
    switch (category) {
      case "vitals":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
      case "referral":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
      case "appointment":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      case "team":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      case "message":
        return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
      default:
        return "bg-muted text-muted-foreground border-border"
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
        className="w-[calc(100vw-2rem)] sm:w-[410px] pt-4 px-4 pb-3 flex flex-col gap-3 rounded-xl border-border shadow-xl bg-card text-card-foreground"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Facility & Care Alerts</span>
            {unreadCount > 0 ? (
              <span className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold px-2 py-0.5 rounded-full border border-red-500/20">
                {unreadCount} unread
              </span>
            ) : (
              <span className="text-xs text-muted-foreground font-medium">All caught up</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={fetchNotifications}
              title="Refresh alerts"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            </Button>
            <label htmlFor="unreads-toggle" className="cursor-pointer select-none text-[11px]">
              Unreads
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
            <span>Working offline. Cached facility alerts shown.</span>
          </div>
        )}

        {/* Filter input & Mark All as Read */}
        <div className="flex items-center gap-2">
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
              className="h-8 px-2.5 text-xs shrink-0 gap-1.5 font-medium border-border hover:bg-muted cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="border-t border-border/60 pt-2.5 max-h-[340px] overflow-y-auto flex flex-col gap-2 -mx-1 px-1">
          {loading && notifications.length === 0 ? (
            <div className="py-8 text-center flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <AlertCircle className="h-8 w-8 text-muted-foreground/40 stroke-1" />
              <p className="text-xs font-medium">No alerts found</p>
              <p className="text-[11px] text-muted-foreground max-w-[280px]">
                {filterQuery || showOnlyUnread 
                  ? "Try clearing your search query or unread filter." 
                  : "Clinical alerts, incoming referrals, and appointments will appear here."}
              </p>
            </div>
          ) : (
            filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`group relative flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  !item.isRead 
                    ? "bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30" 
                    : "bg-card border-border/50 hover:bg-muted/30 hover:border-border"
                }`}
              >
                {/* Category Icon */}
                <div className="relative shrink-0 mt-0.5">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg border shadow-xs ${getCategoryColorClasses(item.category)}`}>
                    {getCategoryIcon(item.category)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-xs truncate ${
                          !item.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                        }`}
                      >
                        {item.sender}
                      </span>
                      {item.link && (
                        <ExternalLink className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      )}
                    </div>
                    
                    {/* Timestamp & Unread indicator in one aligned flow */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {item.timestamp}
                      </span>
                      {!item.isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400 shrink-0 ring-2 ring-card" />
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {item.message}
                  </p>
                </div>

                {/* Mark as read quick toggle on hover */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleRead(item.id)
                  }}
                  title={item.isRead ? "Mark as unread" : "Mark as read"}
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute right-2 bottom-2 text-muted-foreground hover:text-foreground bg-background/90 border border-border shadow-xs rounded-md"
                >
                  <Check className={`h-3.5 w-3.5 ${item.isRead ? "text-muted-foreground" : "text-emerald-600"}`} />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        {formattedList.length > 0 && (
          <div className="border-t border-border pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{formattedList.length} total active alerts</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive gap-1"
            >
              <Trash2 className="h-3 w-3" />
              Clear local alerts
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
