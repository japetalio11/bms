import * as React from "react"
import { Paperclip, Image as ImageIcon, Send, FileText, User as UserIcon, AlertCircle, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { clsx } from "clsx"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { format, parseISO } from "date-fns"

interface ChatAreaProps {
  activeChatId: string | null
}

export function ChatArea({ activeChatId }: ChatAreaProps) {
  const [message, setMessage] = React.useState("")
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine)
  const currentUser = useLiveQuery(() => db.userSession.get("current_user"))
  
  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const chatMessages = useLiveQuery(() => {
    if (!currentUser || !activeChatId) return []
    return db.messages
      .filter(msg => 
        (msg.sender_id === currentUser.user_id && msg.receiver_id === activeChatId) ||
        (msg.receiver_id === currentUser.user_id && msg.sender_id === activeChatId)
      )
      .sortBy('message_date')
  }, [currentUser, activeChatId]) ?? []

  const activeContact = useLiveQuery(async () => {
    if (!activeChatId) return null
    const mother = await db.mothers.get(activeChatId)
    if (mother) {
      return {
        name: `${mother.first_name || ''} ${mother.last_name || ''}`.trim(),
        role: "Mother",
        avatar: mother.photo_url
      }
    }
    const msg = await db.messages.filter(m => m.sender_id === activeChatId || m.receiver_id === activeChatId).first()
    if (msg) {
      return {
        name: msg.contact_name || "Contact",
        role: "Staff",
        avatar: msg.contact_avatar
      }
    }
    return { name: "Unknown User", role: "Unknown", avatar: "" }
  }, [activeChatId])

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser || !activeChatId) return
    
    const tempId = crypto.randomUUID()
    const now = new Date()
    
    const localMsg = {
      id: tempId,
      sender_id: currentUser.user_id,
      receiver_id: activeChatId,
      message_content: message.trim(),
      message_type: "text",
      message_date: now.toISOString(),
      is_read: true, // We sent it, so it's read by us
      contact_name: activeContact?.name,
      contact_avatar: activeContact?.avatar,
      sync_status: "pending_create" as const,
      updated_at: now.getTime()
    }
    
    try {
      await db.transaction('rw', db.messages, db.offlineQueue, async () => {
        await db.messages.add(localMsg)
        await db.offlineQueue.add({
          client_mutation_id: tempId,
          entity_type: "message",
          action: "CREATE",
          endpoint: "/api/v1/message/create",
          method: "POST",
          payload: {
            receiver_id: activeChatId,
            message_content: localMsg.message_content,
            message_type: "text",
            message_date: localMsg.message_date
          },
          retry_count: 0,
          created_at: now.getTime()
        })
      })
      setMessage("")
      
      // Attempt background sync if online (simple immediate sync for messages)
      if (!isOffline) {
        const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"
        const token = localStorage.getItem("token")
        fetch(`${baseUrl}/api/v1/message/create`, {
          method: 'POST',
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(localMsg)
        }).then(res => res.json()).then(async (data) => {
          if (data && data.data) {
             // Mark synced and delete from offlineQueue
             await db.transaction('rw', db.messages, db.offlineQueue, async () => {
                await db.messages.update(tempId, { sync_status: "synced", id: data.data.message_id })
                const queueItem = await db.offlineQueue.where('client_mutation_id').equals(tempId).first()
                if (queueItem && queueItem.id) {
                  await db.offlineQueue.delete(queueItem.id)
                }
             })
          }
        }).catch(err => console.error("Sync failed, leaving in offline queue", err))
      }
    } catch (e) {
      console.error("Failed to send message", e)
    }
  }

  // Scroll to bottom helper
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const formatTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "h:mm a")
    } catch {
      return ""
    }
  }

  if (!activeChatId) {
    return (
      <div className="flex flex-col flex-1 h-full bg-background dark:bg-black items-center justify-center border-r border-sidebar-border text-muted-foreground">
        Select a conversation from the sidebar to view messages.
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-background dark:bg-black min-w-0 border-r border-sidebar-border">
      {/* Chat Header */}
      <div className="h-[72px] px-6 py-4 border-b border-sidebar-border shrink-0 bg-background dark:bg-black flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-sidebar-border">
            <AvatarImage src={activeContact?.avatar || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">{(activeContact?.name || "U").charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <h2 className="text-sm font-semibold text-foreground dark:text-white">{activeContact?.name || "Loading..."}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground font-medium">{activeContact?.role}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5 border-sidebar-border">
            <UserIcon className="h-3.5 w-3.5" />
            View Profile
          </Button>
          <Button size="sm" className="h-8 text-xs font-medium gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90">
            <FileText className="h-3.5 w-3.5" />
            Log Vitals
          </Button>
        </div>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {chatMessages.map((msg) => {
          const isMe = msg.sender_id === currentUser?.user_id
          return (
            <div key={msg.id} className={clsx("flex flex-col gap-1 w-full max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
              <div className={clsx(
                "p-3 rounded-2xl text-sm leading-relaxed",
                isMe 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-muted dark:bg-[#1a1a1a] border border-sidebar-border text-foreground dark:text-white rounded-tl-sm"
              )}>
                {msg.message_content}
              </div>
              <div className="flex items-center gap-1 px-1">
                <span className="text-[10px] text-muted-foreground">{formatTime(msg.message_date)}</span>
                {isMe && msg.sync_status === "pending_create" && (
                  <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                )}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 pb-6 pt-4 bg-background dark:bg-black shrink-0 border-t border-transparent flex flex-col gap-2">
        <div className="flex items-end gap-2 bg-muted/50 dark:bg-[#111] border border-sidebar-border p-2 rounded-xl focus-within:ring-1 focus-within:ring-ring transition-shadow w-full">
          <div className="flex items-center gap-1 mb-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Type your message..."
            className="flex-1 max-h-32 min-h-[40px] resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-sm py-2.5 px-2 text-foreground dark:text-white placeholder:text-muted-foreground"
            rows={1}
          />
          
          <Button 
            onClick={handleSendMessage}
            size="icon" 
            className="h-10 w-10 shrink-0 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors mb-0.5"
            disabled={!message.trim()}
          >
            <Send className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {isOffline && (
          <div className="flex items-center gap-1.5 px-2">
            <AlertCircle className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Offline: Message will be sent when online</span>
          </div>
        )}
      </div>
    </div>
  )
}
