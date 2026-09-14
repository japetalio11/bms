import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Paperclip, Image as ImageIcon, Send, FileText, User as UserIcon, AlertCircle, CheckCircle2, Clock, Download, ExternalLink, ArrowLeft, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { clsx } from "clsx"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { format, parseISO } from "date-fns"
import { messageRepository } from "@/lib/repositories/messageRepository"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

interface ChatAreaProps {
  activeChatId: string | null
  onBack?: () => void
}

export function ChatArea({ activeChatId, onBack }: ChatAreaProps) {
  const navigate = useNavigate()
  const [message, setMessage] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [previewImage, setPreviewImage] = React.useState<string | null>(null)
  const { isOnline } = useNetworkStatus()
  const isOffline = !isOnline
  
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
  
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const imageInputRef = React.useRef<HTMLInputElement>(null)

  const currentUserId = currentUser?.user_id || currentUser?.id

  const chatMessages = useLiveQuery(() => {
    if (!currentUserId || !activeChatId) return []
    return db.messages
      .filter(msg => 
        (msg.sender_id === currentUserId && msg.receiver_id === activeChatId) ||
        (msg.receiver_id === currentUserId && msg.sender_id === activeChatId)
      )
      .sortBy('message_date')
  }, [currentUserId, activeChatId]) ?? []

  const activeContact = useLiveQuery(async () => {
    if (!activeChatId) return null
    let mother = await db.mothers.get(activeChatId)
    if (!mother) {
      mother = await db.mothers.where('user_id').equals(activeChatId).first()
    }
    if (!mother) {
      mother = await db.mothers.where('mother_id').equals(activeChatId).first()
    }
    if (!mother) {
      // Check in-memory list if primary key differed
      const all = await db.mothers.toArray()
      mother = all.find((m: any) => m.id === activeChatId || m.user_id === activeChatId || m.mother_id === activeChatId || m.user?.user_id === activeChatId)
    }

    if (mother) {
      const firstName = mother.first_name || mother.user?.first_name || ''
      const lastName = mother.last_name || mother.user?.last_name || ''
      const photoUrl = mother.photo_url || mother.user?.profile_url || ''
      const canonicalMotherId = mother.mother_id || mother.id || activeChatId
      return {
        name: `${firstName} ${lastName}`.trim() || "Mother",
        role: "Mother",
        avatar: photoUrl,
        motherId: canonicalMotherId
      }
    }
    const msg = await db.messages.filter(m => m.sender_id === activeChatId || m.receiver_id === activeChatId).first()
    if (msg) {
      return {
        name: msg.contact_name || "Contact",
        role: "Healthcare Staff",
        avatar: msg.contact_avatar,
        motherId: null
      }
    }
    return { name: "Healthcare Contact", role: "Contact", avatar: "", motherId: null }
  }, [activeChatId])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isImageOnly = false) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser || !activeChatId || isSending) return

    setIsSending(true)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const msgType = isImageOnly || file.type.startsWith('image/') ? 'image' : 'file'

      try {
        await messageRepository.sendMessage({
          receiver_id: activeChatId,
          message_content: dataUrl,
          message_type: msgType,
          file_name: file.name,
          file_size: `${(file.size / 1024).toFixed(1)} KB`,
          contact_name: activeContact?.name,
          contact_avatar: activeContact?.avatar,
        })
      } catch (err) {
        console.error("Failed to send attachment", err)
      } finally {
        setIsSending(false)
        if (e.target) e.target.value = ""
      }
    }
    reader.onerror = () => {
      setIsSending(false)
    }
    reader.readAsDataURL(file)
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser || !activeChatId || isSending) return
    const content = message.trim()
    setMessage("")
    setIsSending(true)

    try {
      await messageRepository.sendMessage({
        receiver_id: activeChatId,
        message_content: content,
        message_type: "text",
        contact_name: activeContact?.name,
        contact_avatar: activeContact?.avatar,
      })
    } catch (e) {
      console.error("Failed to send message", e)
    } finally {
      setIsSending(false)
    }
  }

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, isSending])

  const formatTime = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "h:mm a")
    } catch {
      return ""
    }
  }

  if (!activeChatId) {
    return (
      <div className="flex flex-col flex-1 h-full bg-background items-center justify-center border-r border-border text-muted-foreground">
        Select a conversation from the sidebar to view messages.
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-background min-w-0 border-r border-border">
      {/* Hidden inputs for attachments */}
      <input type="file" ref={fileInputRef} className="hidden" accept="*/*" onChange={(e) => handleFileUpload(e, false)} />
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*,video/*" onChange={(e) => handleFileUpload(e, true)} />

      {/* Chat Header */}
      <div className="h-[72px] px-4 sm:px-6 py-4 border-b border-border shrink-0 bg-card flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="lg:hidden h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              title="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Avatar className="h-10 w-10 border border-border shrink-0">
            <AvatarImage src={activeContact?.avatar || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">{(activeContact?.name || "U").charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <h2 className="text-sm font-semibold text-card-foreground truncate">{activeContact?.name || "Loading..."}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground font-medium">{activeContact?.role}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          {activeContact?.role === "Mother" && activeContact.motherId && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(`/dashboard/mothers/${activeContact.motherId}`)}
              className="h-8 text-xs font-medium gap-1.5 border-border bg-card text-card-foreground hover:bg-accent"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View Profile</span>
            </Button>
          )}
        </div>
      </div>

      {/* Message History */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {chatMessages.map((msg) => {
          const isMe = msg.sender_id === currentUser?.user_id
          const isImage = msg.message_type === 'image' || (typeof msg.message_content === 'string' && (msg.message_content.startsWith('data:image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(msg.message_content)))
          const isFile = msg.message_type === 'file' || (typeof msg.message_content === 'string' && msg.message_content.startsWith('data:application/'))

          return (
            <div key={msg.id} className={clsx("flex flex-col gap-1 w-full max-w-[80%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
              <div className={clsx(
                "p-3 rounded-2xl text-sm leading-relaxed",
                isMe 
                  ? "bg-primary text-primary-foreground rounded-tr-sm" 
                  : "bg-card border border-border text-card-foreground rounded-tl-sm shadow-xs"
              )}>
                {isImage ? (
                  <button 
                    type="button" 
                    onClick={() => setPreviewImage(msg.message_content)}
                    className="block cursor-pointer overflow-hidden rounded-lg group p-0 text-left border-0 bg-transparent"
                  >
                    <img 
                      src={msg.message_content} 
                      alt="Shared Attachment" 
                      className="max-w-[260px] max-h-[260px] rounded-lg object-cover group-hover:opacity-90 transition-opacity" 
                    />
                  </button>
                ) : isFile ? (
                  <div className="flex items-center gap-3 p-1">
                    <div className="h-8 w-8 rounded bg-muted/60 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate max-w-[180px]">{msg.file_name || "Document.pdf"}</span>
                      <span className="text-[10px] opacity-75">{msg.file_size || "File Attachment"}</span>
                    </div>
                    <a href={msg.message_content} download={msg.file_name || "file"} className="ml-2 p-1.5 rounded hover:bg-muted/80 shrink-0">
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap break-words">{msg.message_content}</div>
                )}
              </div>
              <div className="flex items-center gap-1 px-1">
                <span className="text-[10px] text-muted-foreground">{formatTime(msg.message_date)}</span>
                {isMe && msg.sync_status === "pending_create" && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                    <Clock className="h-2.5 w-2.5 animate-pulse" /> Pending Sync
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* Sending feedback indicator bubble */}
        {isSending && (
          <div className="flex flex-col gap-1 w-full max-w-[80%] ml-auto items-end">
            <div className="p-3 rounded-2xl text-sm bg-primary/70 text-primary-foreground rounded-tr-sm shadow-xs flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              <span className="text-xs">Sending...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 pb-6 pt-4 bg-background shrink-0 border-t border-transparent flex flex-col gap-2">
        <div className={clsx(
          "flex items-end gap-2 bg-card border border-border p-2 rounded-xl focus-within:ring-1 focus-within:ring-ring transition-shadow w-full shadow-xs",
          isSending && "opacity-75"
        )}>
          <div className="flex items-center gap-1 mb-1 shrink-0">
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="ghost" 
              size="icon" 
              disabled={isSending}
              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Attach File"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button 
              onClick={() => imageInputRef.current?.click()}
              variant="ghost" 
              size="icon" 
              disabled={isSending}
              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Attach Photo or Video"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder={isSending ? "Sending message..." : "Type your message..."}
            className="flex-1 max-h-32 min-h-[40px] resize-none bg-transparent border-none focus:outline-none focus:ring-0 text-sm py-2.5 px-2 text-card-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed"
            rows={1}
          />
          
          <Button 
            onClick={handleSendMessage}
            size="icon" 
            className="h-10 w-10 shrink-0 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors mb-0.5"
            disabled={!message.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4 ml-1" />
            )}
          </Button>
        </div>
        {isOffline && (
          <div className="flex items-center gap-1.5 px-2">
            <AlertCircle className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground font-medium">Offline: Message will be sent when online</span>
          </div>
        )}
      </div>

      {/* Image Preview Lightbox Modal */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/90 border-border overflow-hidden">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {previewImage && (
            <div className="flex flex-col items-center justify-center p-2">
              <img
                src={previewImage}
                alt="Enlarged preview"
                className="max-h-[80vh] w-auto max-w-full rounded-md object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
