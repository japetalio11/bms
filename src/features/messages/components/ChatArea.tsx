import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  Paperclip,
  Image as ImageIcon,
  Send,
  FileText,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { clsx } from "clsx"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { format, parseISO } from "date-fns"
import { messageRepository } from "@/lib/repositories/messageRepository"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { resolveFileUrl } from "@/lib/apiClient"

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
  const isStaff = currentUser?.role && currentUser.role !== "Mother"

  const targetContactInfo = useLiveQuery(async () => {
    if (!activeChatId) return null
    let mother = await db.mothers.where("user_id").equals(activeChatId).first()
    if (!mother) mother = await db.mothers.get(activeChatId)
    if (!mother)
      mother = await db.mothers.where("mother_id").equals(activeChatId).first()
    if (!mother) {
      const all = await db.mothers.toArray()
      mother = all.find(
        (m: any) =>
          m.id === activeChatId ||
          m.user_id === activeChatId ||
          m.mother_id === activeChatId ||
          m.user?.user_id === activeChatId
      )
    }

    if (mother) {
      const uId = mother.user_id || mother.user?.user_id || activeChatId
      const mId = mother.mother_id || mother.id || activeChatId
      const firstName = mother.first_name || mother.user?.first_name || ""
      const lastName = mother.last_name || mother.user?.last_name || ""
      const photoUrl = mother.photo_url || mother.user?.profile_url || ""
      return {
        isMother: true,
        userId: uId,
        motherId: mId,
        name: `${firstName} ${lastName}`.trim() || "Mother",
        role: "Mother",
        avatar: photoUrl,
      }
    }

    const msg = await db.messages
      .filter(
        (m) => m.sender_id === activeChatId || m.receiver_id === activeChatId
      )
      .first()
    if (msg) {
      return {
        isMother: false,
        userId: activeChatId,
        motherId: null,
        name: msg.contact_name || "Contact",
        role: "Healthcare Staff",
        avatar: msg.contact_avatar || "",
      }
    }

    return {
      isMother: false,
      userId: activeChatId,
      motherId: null,
      name: "Contact",
      role: "Contact",
      avatar: "",
    }
  }, [activeChatId])

  const activeContact = React.useMemo(() => {
    if (!targetContactInfo) return null
    return {
      name: targetContactInfo.name,
      role: targetContactInfo.role,
      avatar: targetContactInfo.avatar,
      motherId: targetContactInfo.motherId,
    }
  }, [targetContactInfo])

  const chatMessages =
    useLiveQuery(() => {
      if (!activeChatId) return []
      const targetUserId = targetContactInfo?.userId || activeChatId
      const targetMotherId = targetContactInfo?.motherId

      return db.messages
        .filter((msg) => {
          return (
            (msg.sender_id === currentUserId &&
              (msg.receiver_id === targetUserId ||
                msg.receiver_id === targetMotherId)) ||
            (msg.receiver_id === currentUserId &&
              (msg.sender_id === targetUserId ||
                msg.sender_id === targetMotherId))
          )
        })
        .sortBy("message_date")
    }, [currentUserId, activeChatId, targetContactInfo]) ?? []

  React.useEffect(() => {
    if (activeChatId) {
      const targetUserId = targetContactInfo?.userId || activeChatId
      messageRepository.markAsRead(targetUserId).catch(() => {})
      if (
        targetContactInfo?.motherId &&
        targetContactInfo.motherId !== targetUserId
      ) {
        messageRepository.markAsRead(targetContactInfo.motherId).catch(() => {})
      }
    }
  }, [activeChatId, targetContactInfo])

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isImageOnly = false
  ) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser || !activeChatId || isSending) return

    const targetReceiverId = targetContactInfo?.userId || activeChatId
    const msgType =
      isImageOnly || file.type.startsWith("image/") ? "image" : "file"

    setIsSending(true)
    try {
      if (isOnline) {
        const uploadRes = await messageRepository.uploadAttachment(file)
        const serverUrl = uploadRes.fileUrl || uploadRes.fileName

        await messageRepository.sendMessage({
          receiver_id: targetReceiverId,
          message_content: serverUrl,
          message_type: msgType,
          file_name: uploadRes.fileName || file.name,
          file_size:
            uploadRes.fileSize || `${(file.size / 1024).toFixed(1)} KB`,
          contact_name: activeContact?.name,
          contact_avatar: activeContact?.avatar,
        })
      } else {
        const reader = new FileReader()
        reader.onload = async () => {
          const dataUrl = reader.result as string
          try {
            await messageRepository.sendMessage({
              receiver_id: targetReceiverId,
              message_content: dataUrl,
              message_type: msgType,
              file_name: file.name,
              file_size: `${(file.size / 1024).toFixed(1)} KB`,
              contact_name: activeContact?.name,
              contact_avatar: activeContact?.avatar,
            })
          } catch (err) {
            console.error("Failed to send offline attachment", err)
          } finally {
            setIsSending(false)
            if (e.target) e.target.value = ""
          }
        }
        reader.onerror = () => {
          setIsSending(false)
        }
        reader.readAsDataURL(file)
        return
      }
    } catch (err) {
      console.error("Failed to send attachment", err)
    } finally {
      setIsSending(false)
      if (e.target) e.target.value = ""
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !currentUser || !activeChatId || isSending) return
    const content = message.trim()
    const targetReceiverId = targetContactInfo?.userId || activeChatId
    setMessage("")
    setIsSending(true)

    try {
      await messageRepository.sendMessage({
        receiver_id: targetReceiverId,
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
      <div className="flex h-full flex-1 flex-col items-center justify-center border-r border-border bg-background text-muted-foreground">
        Select a conversation from the sidebar to view messages.
      </div>
    )
  }

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col border-r border-border bg-background">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="*/*"
        onChange={(e) => handleFileUpload(e, false)}
      />
      <input
        type="file"
        ref={imageInputRef}
        className="hidden"
        accept="image/*,video/*"
        onChange={(e) => handleFileUpload(e, true)}
      />

      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-border bg-card px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground lg:hidden"
              title="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Avatar className="h-10 w-10 shrink-0 border border-border">
            <AvatarImage src={activeContact?.avatar || ""} />
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {(activeContact?.name || "U").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <h2 className="truncate text-sm font-semibold text-card-foreground">
              {activeContact?.name || "Loading..."}
            </h2>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground">
                {activeContact?.role}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {activeContact?.role === "Mother" && activeContact.motherId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                navigate(`/dashboard/mothers/${activeContact.motherId}`)
              }
              className="h-8 gap-1.5 border-border bg-card text-xs font-medium text-card-foreground hover:bg-accent"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">View Profile</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
        {chatMessages.map((msg) => {
          const isSentByMe = msg.sender_id === currentUserId
          const isOutgoing = isSentByMe
          const isImage =
            msg.message_type === "image" ||
            (typeof msg.message_content === "string" &&
              (msg.message_content.startsWith("data:image/") ||
                /\.(jpg|jpeg|png|webp|gif)$/i.test(msg.message_content)))
          const isFile =
            msg.message_type === "file" ||
            (typeof msg.message_content === "string" &&
              (msg.message_content.startsWith("data:application/") ||
                /\.(pdf|docx?|xlsx?|txt|csv|zip)$/i.test(msg.message_content)))

          return (
            <div
              key={msg.id}
              className={clsx(
                "flex w-full max-w-[80%] flex-col gap-1",
                isOutgoing ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div
                className={clsx(
                  "rounded-2xl p-3 text-sm leading-relaxed",
                  isOutgoing
                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm border border-border bg-card text-card-foreground shadow-xs"
                )}
              >
                {isImage ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewImage(resolveFileUrl(msg.message_content))
                    }
                    className="group block cursor-pointer overflow-hidden rounded-lg border-0 bg-transparent p-0 text-left"
                  >
                    <img
                      src={resolveFileUrl(msg.message_content)}
                      alt="Shared Attachment"
                      className="max-h-[260px] max-w-[260px] rounded-lg object-cover transition-opacity group-hover:opacity-90"
                    />
                  </button>
                ) : isFile ? (
                  <div className="flex items-center gap-3 p-1">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted/60">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="max-w-[180px] truncate text-xs font-semibold">
                        {msg.file_name || "Document.pdf"}
                      </span>
                      <span className="text-[10px] opacity-75">
                        {msg.file_size || "File Attachment"}
                      </span>
                    </div>
                    <a
                      href={resolveFileUrl(msg.message_content)}
                      download={msg.file_name || "file"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 shrink-0 rounded p-1.5 hover:bg-muted/80"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ) : (
                  <div className="break-words whitespace-pre-wrap">
                    {msg.message_content}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 px-1">
                <span className="text-[10px] text-muted-foreground">
                  {formatTime(msg.message_date)}
                </span>
                {isSentByMe && msg.sync_status === "pending_create" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-500">
                    <Clock className="h-2.5 w-2.5 animate-pulse" /> Pending Sync
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {isSending && (
          <div className="ml-auto flex w-full max-w-[80%] flex-col items-end gap-1">
            <div className="flex items-center gap-2 rounded-2xl rounded-tr-sm bg-primary/70 p-3 text-sm text-primary-foreground shadow-xs">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              <span className="text-xs">Sending...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-transparent bg-background px-6 pt-4 pb-6">
        <div
          className={clsx(
            "flex w-full items-end gap-2 rounded-xl border border-border bg-card p-2 shadow-xs transition-shadow focus-within:ring-1 focus-within:ring-ring",
            isSending && "opacity-75"
          )}
        >
          <div className="mb-1 flex shrink-0 items-center gap-1">
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
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder={
              isSending ? "Sending message..." : "Type your message..."
            }
            className="max-h-32 min-h-[40px] flex-1 resize-none border-none bg-transparent px-2 py-2.5 text-sm text-card-foreground placeholder:text-muted-foreground focus:ring-0 focus:outline-none disabled:cursor-not-allowed"
            rows={1}
          />

          <Button
            onClick={handleSendMessage}
            size="icon"
            className="mb-0.5 h-10 w-10 shrink-0 rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            disabled={!message.trim() || isSending}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="ml-1 h-4 w-4" />
            )}
          </Button>
        </div>
        {isOffline && (
          <div className="flex items-center gap-1.5 px-2">
            <AlertCircle className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">
              Offline: Message will be sent when online
            </span>
          </div>
        )}
      </div>

      <Dialog
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
      >
        <DialogContent className="max-w-3xl overflow-hidden border-border bg-black/90 p-2">
          <DialogTitle className="sr-only">Image Preview</DialogTitle>
          {previewImage && (
            <div className="flex flex-col items-center justify-center p-2">
              <img
                src={resolveFileUrl(previewImage)}
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
