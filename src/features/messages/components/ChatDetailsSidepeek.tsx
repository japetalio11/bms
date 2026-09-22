import * as React from "react"
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  ExternalLink,
  Download,
  X,
} from "lucide-react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { format, parseISO } from "date-fns"
import { resolveFileUrl } from "@/lib/apiClient"
import { MediaPreviewModal, type MediaItem } from "./MediaPreviewModal"

interface ChatDetailsProps {
  activeChatId: string | null
}

export function ChatDetailsSidepeek({ activeChatId }: ChatDetailsProps) {
  const [openPhotos, setOpenPhotos] = React.useState(true)
  const [openFiles, setOpenFiles] = React.useState(true)
  const [openLinks, setOpenLinks] = React.useState(true)
  const [previewMediaIndex, setPreviewMediaIndex] = React.useState<number | null>(null)
  const [customMediaItem, setCustomMediaItem] = React.useState<MediaItem | null>(null)

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

  const currentUserId = currentUser?.user_id || currentUser?.id

  const messages =
    useLiveQuery(async () => {
      if (!activeChatId) return []
      let mother = await db.mothers
        .where("user_id")
        .equals(activeChatId)
        .first()
      if (!mother) mother = await db.mothers.get(activeChatId)
      if (!mother)
        mother = await db.mothers
          .where("mother_id")
          .equals(activeChatId)
          .first()
      if (!mother) {
        const all = await db.mothers.toArray()
        mother = all.find(
          (m: any) =>
            m.id === activeChatId ||
            m.user_id === activeChatId ||
            m.mother_id === activeChatId
        )
      }

      const targetUserId =
        mother?.user_id || mother?.user?.user_id || activeChatId
      const targetMotherId = mother?.mother_id || mother?.id

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
        .toArray()
    }, [currentUserId, activeChatId]) ?? []

  const ehrDocs =
    useLiveQuery(async () => {
      if (!activeChatId) return []
      let mother =
        (await db.mothers.where("user_id").equals(activeChatId).first()) ||
        (await db.mothers.get(activeChatId))
      if (!mother) {
        mother = await db.mothers
          .where("mother_id")
          .equals(activeChatId)
          .first()
      }
      if (!mother) {
        const all = await db.mothers.toArray()
        mother = all.find(
          (m: any) =>
            m.id === activeChatId ||
            m.user_id === activeChatId ||
            m.mother_id === activeChatId
        )
      }

      if (mother) {
        const motherId = mother.mother_id || mother.id
        return await db.ehrDocuments
          .where("mother_id")
          .equals(motherId)
          .toArray()
      }
      return []
    }, [activeChatId]) ?? []

  const photosAndVideos = React.useMemo(() => {
    return messages.filter((msg) => {
      const isImgType =
        msg.message_type === "image" ||
        msg.message_type === "photo" ||
        msg.message_type === "video"
      const isImgUrl =
        typeof msg.message_content === "string" &&
        (msg.message_content.startsWith("data:image/") ||
          msg.message_content.startsWith("data:video/") ||
          /\.(jpg|jpeg|png|webp|gif|mp4)$/i.test(msg.message_content))
      return isImgType || isImgUrl
    })
  }, [messages])

  const mediaItems: MediaItem[] = React.useMemo(() => {
    return photosAndVideos.map((media) => {
      let timeFormatted = ""
      try {
        if (media.message_date) {
          timeFormatted = format(parseISO(media.message_date), "MMM d, yyyy • h:mm a")
        }
      } catch {}
      return {
        url: media.message_content,
        title: media.file_name || "Photo Attachment",
        fileName: media.file_name,
        timestamp: timeFormatted,
      }
    })
  }, [photosAndVideos])

  const sharedFiles = React.useMemo(() => {
    const filesFromMessages = messages
      .filter((msg) => {
        const isFileType =
          msg.message_type === "file" ||
          msg.message_type === "pdf" ||
          msg.message_type === "document"
        const isFileExt =
          typeof msg.message_content === "string" &&
          (msg.message_content.startsWith("data:application/") ||
            /\.(pdf|docx?|xlsx?|txt|csv|zip)$/i.test(msg.message_content))
        return isFileType || isFileExt
      })
      .map((msg) => ({
        id: msg.id,
        name:
          msg.file_name ||
          (msg.message_content.startsWith("data:")
            ? "Attached_Document.pdf"
            : msg.message_content.split("/").pop() || "Document.pdf"),
        size: msg.file_size || "File Attachment",
        date: msg.message_date,
        url: resolveFileUrl(msg.file_url || msg.message_content),
      }))

    const filesFromEhr = ehrDocs.map((doc) => ({
      id: doc.id,
      name: doc.document_name || "EHR_Document.pdf",
      size: doc.category || "Medical Record",
      date: doc.created_at
        ? new Date(doc.created_at).toISOString()
        : new Date().toISOString(),
      url: doc.file_url || doc.temp_blob_id || "#",
    }))

    return [...filesFromMessages, ...filesFromEhr]
  }, [messages, ehrDocs])

  const sharedLinks = React.useMemo(() => {
    const links: { id: string; url: string; date: string }[] = []
    const urlRegex = /(https?:\/\/[^\s]+)/g

    messages.forEach((msg) => {
      if (
        typeof msg.message_content === "string" &&
        !msg.message_content.startsWith("data:")
      ) {
        const matches = msg.message_content.match(urlRegex)
        if (matches) {
          matches.forEach((url, idx) => {
            links.push({
              id: `${msg.id}-${idx}`,
              url: url,
              date: msg.message_date,
            })
          })
        }
      }
    })
    return links
  }, [messages])

  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return ""
    try {
      return format(parseISO(dateStr), "MMM d, yyyy")
    } catch {
      return dateStr
    }
  }

  if (!activeChatId) return null

  return (
    <div className="hidden h-full w-[350px] shrink-0 flex-col border-l border-border bg-card lg:flex">
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold text-card-foreground">
          Chat Details
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-border">
          <button
            onClick={() => setOpenPhotos(!openPhotos)}
            className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-card-foreground">
                Photos and Videos
              </span>
              <span className="text-xs text-muted-foreground">
                ({photosAndVideos.length})
              </span>
            </div>
            {openPhotos ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {openPhotos && (
            <div className="px-6 pb-6">
              {photosAndVideos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {photosAndVideos.map((media, index) => (
                    <button
                      key={media.id}
                      type="button"
                      onClick={() => {
                        setCustomMediaItem(null)
                        setPreviewMediaIndex(index)
                      }}
                      className="group relative block aspect-square cursor-pointer overflow-hidden rounded-md border border-border bg-muted p-0 text-left transition-transform hover:scale-[1.02]"
                      title="Click to view full image"
                    >
                      <img
                        src={resolveFileUrl(media.message_content)}
                        alt="Media"
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-2 text-center text-xs text-muted-foreground">
                  No shared photos or videos yet
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-b border-border">
          <button
            onClick={() => setOpenFiles(!openFiles)}
            className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-card-foreground">
                Shared Files
              </span>
              <span className="text-xs text-muted-foreground">
                ({sharedFiles.length})
              </span>
            </div>
            {openFiles ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {openFiles && (
            <div className="flex flex-col gap-3 px-6 pb-6">
              {sharedFiles.length > 0 ? (
                sharedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (file.url && file.url !== "#") {
                          setCustomMediaItem({
                            url: file.url,
                            title: file.name,
                            fileName: file.name,
                            timestamp: file.date ? formatDateStr(file.date) : undefined,
                          })
                        }
                      }}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-xs font-medium text-card-foreground hover:underline">
                          {file.name}
                        </span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {file.size} • {formatDateStr(file.date)}
                        </span>
                      </div>
                    </button>
                    {file.url && file.url !== "#" && (
                      <a
                        href={file.url}
                        download={file.name}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 p-1 text-muted-foreground hover:text-foreground"
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-2 text-center text-xs text-muted-foreground">
                  No shared files yet
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-b border-border">
          <button
            onClick={() => setOpenLinks(!openLinks)}
            className="flex w-full items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-card-foreground">
                Shared Links
              </span>
              <span className="text-xs text-muted-foreground">
                ({sharedLinks.length})
              </span>
            </div>
            {openLinks ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {openLinks && (
            <div className="flex flex-col gap-2 px-6 pb-6">
              {sharedLinks.length > 0 ? (
                sharedLinks.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex-1 truncate text-xs text-primary underline">
                      {item.url}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </a>
                ))
              ) : (
                <div className="py-2 text-center text-xs text-muted-foreground">
                  No shared links yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <MediaPreviewModal
        open={previewMediaIndex !== null || customMediaItem !== null}
        onClose={() => {
          setPreviewMediaIndex(null)
          setCustomMediaItem(null)
        }}
        initialIndex={previewMediaIndex ?? 0}
        items={customMediaItem ? [customMediaItem] : mediaItems}
      />
    </div>
  )
}
