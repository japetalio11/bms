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
  ExternalLink,
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
  category:
    "appointment" | "referral" | "vitals" | "team" | "message" | "system"
  syncStatus: string
  link?: string
}

export function NotificationPopover({
  align = "end",
}: {
  align?: "end" | "center" | "start"
}) {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<LocalNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [isOnline, setIsOnline] = useState<boolean>(
    syncEngine.isNetworkOnline()
  )
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

  const formattedList: FormattedNotification[] = notifications.map(
    (item: any) => {
      let category: FormattedNotification["category"] = "system"
      const typeLower = (item.notification_type || "").toLowerCase()
      if (typeLower.includes("appoint")) category = "appointment"
      else if (typeLower.includes("referral")) category = "referral"
      else if (
        typeLower.includes("vital") ||
        typeLower.includes("alert") ||
        typeLower.includes("cdss")
      )
        category = "vitals"
      else if (typeLower.includes("team")) category = "team"
      else if (typeLower.includes("msg") || typeLower.includes("message"))
        category = "message"

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
      const initials =
        words.length > 1
          ? `${words[0][0]}${words[1][0]}`.toUpperCase()
          : sender.slice(0, 2).toUpperCase() || "SYS"

      const dateObj = item.notification_date
        ? new Date(item.notification_date)
        : new Date()
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
        link:
          item.link ||
          (category === "vitals"
            ? "/dashboard/mothers"
            : category === "referral"
              ? "/dashboard/referrals"
              : category === "appointment"
                ? "/dashboard/appointments"
                : undefined),
      }
    }
  )

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
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))

    try {
      await notificationRepository.markAllAsRead()
    } catch (err) {
      console.error("[NotificationPopover] Failed to mark all as read:", err)
    }

    await fetchNotifications()
  }

  const handleToggleRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id || n.notification_id === id
          ? { ...n, is_read: !n.is_read }
          : n
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

  const getCategoryColorClasses = (
    category: FormattedNotification["category"]
  ) => {
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
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 animate-in items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-sm zoom-in-50">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        collisionPadding={8}
        className="flex w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl border-border bg-card px-4 pt-4 pb-3 text-card-foreground shadow-xl sm:w-[410px]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Facility & Care Alerts
            </span>
            {unreadCount > 0 ? (
              <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                {unreadCount} unread
              </span>
            ) : (
              <span className="text-xs font-medium text-muted-foreground">
                All caught up
              </span>
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
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`}
              />
            </Button>
            <label
              htmlFor="unreads-toggle"
              className="cursor-pointer text-[11px] select-none"
            >
              Unreads
            </label>
            <Switch
              id="unreads-toggle"
              checked={showOnlyUnread}
              onCheckedChange={setShowOnlyUnread}
              className="origin-right scale-75"
            />
          </div>
        </div>

        {!isOnline && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-400">
            <WifiOff className="h-3.5 w-3.5 shrink-0" />
            <span>Working offline. Cached facility alerts shown.</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="h-8 bg-muted/40 pl-8 text-xs"
            />
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              variant="outline"
              size="sm"
              className="h-8 shrink-0 cursor-pointer gap-1.5 border-border px-2.5 text-xs font-medium hover:bg-muted"
            >
              <CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="-mx-1 flex max-h-[340px] flex-col gap-2 overflow-y-auto border-t border-border/60 px-1 pt-2.5">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-center text-xs text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 stroke-1 text-muted-foreground/40" />
              <p className="text-xs font-medium">No alerts found</p>
              <p className="max-w-[280px] text-[11px] text-muted-foreground">
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
                className={`group relative flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                  !item.isRead
                    ? "border-primary/20 bg-primary/5 hover:border-primary/30 hover:bg-primary/10"
                    : "border-border/50 bg-card hover:border-border hover:bg-muted/30"
                }`}
              >
                <div className="relative mt-0.5 shrink-0">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border shadow-xs ${getCategoryColorClasses(item.category)}`}
                  >
                    {getCategoryIcon(item.category)}
                  </div>
                </div>

                <div className="min-w-0 flex-1 pr-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className={`truncate text-xs ${
                          !item.isRead
                            ? "font-semibold text-foreground"
                            : "font-medium text-foreground/80"
                        }`}
                      >
                        {item.sender}
                      </span>
                      {item.link && (
                        <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {item.timestamp}
                      </span>
                      {!item.isRead && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600 ring-2 ring-card dark:bg-blue-400" />
                      )}
                    </div>
                  </div>

                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {item.message}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleRead(item.id)
                  }}
                  title={item.isRead ? "Mark as unread" : "Mark as read"}
                  className="absolute right-2 bottom-2 h-6 w-6 rounded-md border border-border bg-background/90 text-muted-foreground opacity-0 shadow-xs transition-opacity group-hover:opacity-100 hover:text-foreground"
                >
                  <Check
                    className={`h-3.5 w-3.5 ${item.isRead ? "text-muted-foreground" : "text-emerald-600"}`}
                  />
                </Button>
              </div>
            ))
          )}
        </div>

        {formattedList.length > 0 && (
          <div className="flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
            <span>{formattedList.length} total active alerts</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              className="h-6 gap-1 px-2 text-[11px] text-muted-foreground hover:text-destructive"
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
