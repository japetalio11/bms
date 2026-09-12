import * as React from "react"
import { CheckCheck, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { clsx } from "clsx"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { format, isToday, isYesterday, parseISO } from "date-fns"

interface InboxSidebarProps {
  activeChatId: string | null
  setActiveChatId: (id: string) => void
}

export function InboxSidebar({ activeChatId, setActiveChatId }: InboxSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  const currentUser = useLiveQuery(() => db.userSession.get("current_user"))
  
  // Get all messages from local DB
  const messages = useLiveQuery(() => db.messages.orderBy('updated_at').reverse().toArray(), []) ?? []
  
  // Get active mothers in facility from local DB (for staff members)
  const facilityMothers = useLiveQuery(async () => {
    if (!currentUser) return []
    if (currentUser.role !== 'Mother') {
      if (currentUser.facility_id) {
        return await db.mothers.where('facility_id').equals(currentUser.facility_id).toArray()
      }
      return await db.mothers.toArray()
    }
    return []
  }, [currentUser]) ?? []

  // Group messages and facility mothers by contact
  const chatThreads = React.useMemo(() => {
    if (!currentUser) return []
    
    const threads = new Map<string, any>()
    
    // Process existing messages
    messages.forEach(msg => {
      const isMe = msg.sender_id === currentUser.user_id
      const contactId = isMe ? msg.receiver_id : msg.sender_id
      
      if (!threads.has(contactId)) {
        threads.set(contactId, {
          id: contactId,
          name: msg.contact_name || "Unknown User",
          message: msg.message_content,
          rawDate: msg.message_date,
          unread: (!isMe && !msg.is_read) ? 1 : 0,
          avatar: msg.contact_avatar || ""
        })
      } else {
        const existing = threads.get(contactId)
        if (!isMe && !msg.is_read) {
          existing.unread += 1
        }
      }
    })

    // Include facility mothers in contacts for healthcare staff
    facilityMothers.forEach(mother => {
      const motherUserId = mother.user_id || mother.user?.user_id
      if (!motherUserId) return
      
      const motherName = `${mother.first_name || mother.user?.first_name || ''} ${mother.last_name || mother.user?.last_name || ''}`.trim() || "Mother"
      const avatar = mother.photo_url || mother.user?.profile_url || ""

      if (threads.has(motherUserId)) {
        const existing = threads.get(motherUserId)
        if (!existing.name || existing.name === "Unknown User") {
          existing.name = motherName
        }
        if (!existing.avatar) {
          existing.avatar = avatar
        }
      } else {
        threads.set(motherUserId, {
          id: motherUserId,
          name: motherName,
          message: "No messages yet",
          rawDate: mother.created_at || "",
          unread: 0,
          avatar: avatar
        })
      }
    })
    
    const allThreads = Array.from(threads.values()).sort((a, b) => {
      const timeA = a.rawDate ? new Date(a.rawDate).getTime() : 0
      const timeB = b.rawDate ? new Date(b.rawDate).getTime() : 0
      return timeB - timeA
    })

    if (!searchQuery.trim()) return allThreads

    const q = searchQuery.toLowerCase()
    return allThreads.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.message.toLowerCase().includes(q)
    )
  }, [messages, facilityMothers, currentUser, searchQuery])

  const formatTime = (dateStr: string) => {
    if (!dateStr) return ""
    try {
      const d = parseISO(dateStr)
      if (isToday(d)) return format(d, "h:mm a")
      if (isYesterday(d)) return "Yesterday"
      return format(d, "MMM d")
    } catch {
      return dateStr
    }
  }

  return (
    <div className="hidden lg:flex flex-col h-full w-[350px] shrink-0 border-r border-sidebar-border bg-background dark:bg-[#0a0a0a]">
      {/* Header */}
      <div className="h-[72px] px-6 py-4 border-b border-sidebar-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground dark:text-white">Messages</h1>
          <span className="inline-flex items-center justify-center bg-muted dark:bg-[#111] text-muted-foreground text-[10px] font-medium h-5 px-2 rounded-full border border-sidebar-border">
            {chatThreads.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
           <CheckCheck className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Search */}
      <div className="px-6 py-3 border-b border-sidebar-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages or mothers..." 
            className="pl-8 h-8 text-xs bg-muted/50 dark:bg-[#111] border-sidebar-border focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {chatThreads.map((chat) => (
          <div 
            key={chat.id} 
            onClick={() => setActiveChatId(chat.id)}
            className={clsx(
              "flex items-start gap-3 px-6 py-4 border-b border-sidebar-border cursor-pointer transition-colors hover:bg-muted/50 dark:hover:bg-[#111]",
              activeChatId === chat.id ? "bg-muted dark:bg-[#111]" : ""
            )}
          >
            <Avatar className="h-10 w-10 border border-sidebar-border shrink-0">
              <AvatarImage src={chat.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{chat.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0 gap-1 mt-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground dark:text-white truncate">{chat.name}</span>
                {chat.rawDate && <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(chat.rawDate)}</span>}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={clsx(
                  "text-xs truncate", 
                  chat.unread > 0 ? "text-foreground dark:text-white font-medium" : "text-muted-foreground"
                )}>
                  {chat.message}
                </span>
                {chat.unread > 0 && (
                  <span className="inline-flex items-center justify-center bg-primary text-primary-foreground text-[10px] font-bold h-4 min-w-4 px-1 rounded-full shrink-0">
                    {chat.unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {chatThreads.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No contacts or messages found.
          </div>
        )}
      </div>
    </div>
  )
}
