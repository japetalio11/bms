import * as React from "react"
import { CheckCheck, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { clsx } from "clsx"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { motherRepository } from "@/lib/repositories/motherRepository"
import { format, isToday, isYesterday, parseISO } from "date-fns"
import { getMessagePreview } from "@/lib/utils"

interface InboxSidebarProps {
  activeChatId: string | null
  setActiveChatId: (id: string) => void
}

export function InboxSidebar({ activeChatId, setActiveChatId }: InboxSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Resolve current user from Dexie DB or fallback to localStorage
  const sessionUser = useLiveQuery(() => db.userSession.get("current_user"))
  const currentUser = React.useMemo(() => {
    if (sessionUser) return sessionUser
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("user")
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {}
      }
    }
    return null
  }, [sessionUser])

  // Get all messages from local DB
  const messages = useLiveQuery(() => db.messages.orderBy('updated_at').reverse().toArray(), []) ?? []
  
  // Get active mothers in facility from local DB (for staff members)
  const facilityMothers = useLiveQuery(async () => {
    if (!currentUser) return []
    if (currentUser.role === 'Mother') return []

    const userFacilityId = currentUser.facility_id || currentUser.facility?.facility_id
    const allMothers = await db.mothers.toArray()

    // If local Dexie has no mothers yet and user is staff, trigger an async fetch
    if (allMothers.length === 0) {
      motherRepository.getActiveMothers(userFacilityId || undefined).catch(() => {})
    }

    // SystemAdmin sees all mothers; facility staff see mothers assigned to their facility
    if (currentUser.role === 'SystemAdmin' || !userFacilityId) {
      return allMothers
    }

    return allMothers.filter((m: any) => {
      const mFac = m.facility_id || m.user?.facility_id || m.facilityId || m.rawMother?.facility_id
      // Include if it matches facility or if facility isn't partitioned strictly
      return !mFac || mFac === userFacilityId
    })
  }, [currentUser]) ?? []

  // Group messages and facility mothers by contact
  const chatThreads = React.useMemo(() => {
    if (!currentUser) return []
    
    const threads = new Map<string, any>()
    const currentUserId = currentUser.user_id || currentUser.id
    const isStaff = currentUser.role !== 'Mother'
    
    // Index facility mothers by all possible IDs
    const motherByUserId = new Map<string, any>()
    const motherByMotherId = new Map<string, any>()

    facilityMothers.forEach((mother: any) => {
      const uId = mother.user_id || mother.user?.user_id
      const mId = mother.mother_id || mother.id
      const tempId = mother.temp_id
      if (uId) motherByUserId.set(uId, mother)
      if (mId) motherByMotherId.set(mId, mother)
      if (tempId) motherByMotherId.set(tempId, mother)
      if (mother._id) motherByMotherId.set(mother._id, mother)
    })

    // Process existing messages (strictly 1-to-1: only messages involving current user)
    messages.forEach(msg => {
      const isSentByMe = currentUserId && msg.sender_id === currentUserId
      const isReceivedByMe = currentUserId && msg.receiver_id === currentUserId

      // Skip messages that do not involve the logged-in user
      if (!isSentByMe && !isReceivedByMe) return

      let contactId: string | null = isSentByMe ? msg.receiver_id : msg.sender_id
      let contactName = msg.contact_name
      let contactAvatar = msg.contact_avatar || ""
      let isIncomingFromPatient = isReceivedByMe

      if (isStaff) {
        const senderMother =
          motherByUserId.get(contactId) ||
          motherByMotherId.get(contactId) ||
          facilityMothers.find((m: any) => m.id === contactId || m.mother_id === contactId || m.user_id === contactId || (m.user && m.user.user_id === contactId))

        if (senderMother) {
          contactId = senderMother.user_id || senderMother.user?.user_id || senderMother.mother_id || senderMother.id
          contactName = `${senderMother.first_name || senderMother.user?.first_name || ''} ${senderMother.last_name || senderMother.user?.last_name || ''}`.trim() || contactName
          contactAvatar = senderMother.photo_url || senderMother.user?.profile_url || contactAvatar
        } else if (msg.sender_role === "Mother" || msg.sender?.role === "Mother") {
          contactName = msg.sender_name || contactName
          contactAvatar = msg.sender?.profile_url || contactAvatar
        } else if (msg.receiver_role === "Mother" || msg.receiver?.role === "Mother") {
          contactName = msg.contact_name || contactName
          contactAvatar = msg.receiver?.profile_url || contactAvatar
        }
      }

      if (!contactId) return

      // Canonicalize contact ID to mother.user_id if available
      const resolvedMother = motherByMotherId.get(contactId) || motherByUserId.get(contactId)
      const validContactId: string = (resolvedMother && (resolvedMother.user_id || resolvedMother.user?.user_id)) ? (resolvedMother.user_id || resolvedMother.user?.user_id) : contactId

      const preview = getMessagePreview(msg.message_content, msg.message_type, msg.file_name)
      const isUnread = isIncomingFromPatient && !msg.is_read

      if (!threads.has(validContactId)) {
        threads.set(validContactId, {
          id: validContactId,
          name: contactName || "Unknown Contact",
          message: preview,
          rawDate: msg.message_date,
          unread: isUnread ? 1 : 0,
          avatar: contactAvatar,
          motherId: resolvedMother?.mother_id || resolvedMother?.id || null,
          userId: validContactId
        })
      } else {
        const existing = threads.get(validContactId)
        if (existing) {
          if (isUnread) {
            existing.unread += 1
          }
          // Keep the latest message preview
          if (msg.message_date && (!existing.rawDate || new Date(msg.message_date).getTime() > new Date(existing.rawDate).getTime())) {
            existing.message = preview
            existing.rawDate = msg.message_date
          }
        }
      }
    })

    // Include facility mothers in contacts for healthcare staff
    facilityMothers.forEach((mother: any) => {
      const canonicalContactId = mother.user_id || mother.user?.user_id || mother.id || mother.mother_id
      if (!canonicalContactId) return
      
      const firstName = mother.first_name || mother.user?.first_name || ''
      const lastName = mother.last_name || mother.user?.last_name || ''
      const motherName = `${firstName} ${lastName}`.trim() || mother.name || "Mother"
      const avatar = mother.photo_url || mother.user?.profile_url || mother.profile_url || ""
      const mId = mother.mother_id || mother.id

      // Check if thread already exists by ANY of the mother's identifiers
      let existingThreadKey: string | null = null
      if (threads.has(canonicalContactId)) {
        existingThreadKey = canonicalContactId
      } else if (mId && threads.has(mId)) {
        existingThreadKey = mId
      } else if (mother.id && threads.has(mother.id)) {
        existingThreadKey = mother.id
      } else if (mother.temp_id && threads.has(mother.temp_id)) {
        existingThreadKey = mother.temp_id
      } else {
        for (const [key, t] of threads.entries()) {
          if ((t.motherId && (t.motherId === mId || t.motherId === mother.id)) || (t.userId && (t.userId === canonicalContactId || t.userId === mother.user_id))) {
            existingThreadKey = key
            break
          }
        }
      }

      if (existingThreadKey) {
        const existing = threads.get(existingThreadKey)
        if (!existing.name || existing.name === "Unknown Contact" || existing.name === "Unknown User") {
          existing.name = motherName
        }
        if (!existing.avatar) {
          existing.avatar = avatar
        }
        if (!existing.motherId) {
          existing.motherId = mId
        }
      } else {
        threads.set(canonicalContactId, {
          id: canonicalContactId,
          name: motherName,
          message: "No messages yet",
          rawDate: mother.created_at || "",
          unread: 0,
          avatar: avatar,
          motherId: mId,
          userId: canonicalContactId
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
    <div className="flex flex-col h-full w-full lg:w-[350px] shrink-0 border-r border-border bg-card">
      {/* Header */}
      <div className="h-[72px] px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-card-foreground">Messages</h1>
          <span className="inline-flex items-center justify-center bg-muted text-muted-foreground text-[10px] font-medium h-5 px-2 rounded-full border border-border">
            {chatThreads.length}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
           <CheckCheck className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Search */}
      <div className="px-6 py-3 border-b border-border shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages or mothers..." 
            className="pl-8 h-8 text-xs bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-ring text-card-foreground"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {chatThreads.map((chat) => {
          const isSelected = activeChatId === chat.id || (activeChatId && (activeChatId === chat.userId || activeChatId === chat.motherId))
          return (
            <div 
              key={chat.id} 
              onClick={() => setActiveChatId(chat.id)}
              className={clsx(
                "flex items-start gap-3 px-6 py-4 border-b border-border cursor-pointer transition-colors hover:bg-muted/50",
                isSelected ? "bg-accent" : ""
              )}
            >
              <Avatar className="h-10 w-10 border border-border shrink-0">
                <AvatarImage src={chat.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">{chat.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0 gap-1 mt-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-card-foreground truncate">{chat.name}</span>
                  {chat.rawDate && <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(chat.rawDate)}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className={clsx(
                    "text-xs truncate", 
                    chat.unread > 0 ? "text-card-foreground font-medium" : "text-muted-foreground"
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
          )
        })}
        {chatThreads.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No contacts or messages found.
          </div>
        )}
      </div>
    </div>
  )
}
