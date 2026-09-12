import * as React from "react"
import { ChevronRight, ChevronDown, FileText, Link as LinkIcon, Image as ImageIcon, ExternalLink, Download } from "lucide-react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db/bmsDatabase"
import { format, parseISO } from "date-fns"

interface ChatDetailsProps {
  activeChatId: string | null
}

export function ChatDetailsSidepeek({ activeChatId }: ChatDetailsProps) {
  const [openPhotos, setOpenPhotos] = React.useState(true)
  const [openFiles, setOpenFiles] = React.useState(true)
  const [openLinks, setOpenLinks] = React.useState(true)

  const currentUser = useLiveQuery(() => db.userSession.get("current_user"))

  // Query all messages in this conversation
  const messages = useLiveQuery(() => {
    if (!currentUser || !activeChatId) return []
    return db.messages
      .filter(msg => 
        (msg.sender_id === currentUser.user_id && msg.receiver_id === activeChatId) ||
        (msg.receiver_id === currentUser.user_id && msg.sender_id === activeChatId)
      )
      .toArray()
  }, [currentUser, activeChatId]) ?? []

  // Query EHR documents for this contact if contact is a mother
  const ehrDocs = useLiveQuery(async () => {
    if (!activeChatId) return []
    const mother = (await db.mothers.where('user_id').equals(activeChatId).first()) || (await db.mothers.get(activeChatId))
    if (mother) {
      const motherId = mother.mother_id || mother.id
      return await db.ehrDocuments.where('mother_id').equals(motherId).toArray()
    }
    return []
  }, [activeChatId]) ?? []

  // Extract shared photos and videos
  const photosAndVideos = React.useMemo(() => {
    return messages.filter(msg => {
      const isImgType = msg.message_type === 'image' || msg.message_type === 'photo' || msg.message_type === 'video'
      const isImgUrl = typeof msg.message_content === 'string' && (
        msg.message_content.startsWith('data:image/') ||
        msg.message_content.startsWith('data:video/') ||
        /\.(jpg|jpeg|png|webp|gif|mp4)$/i.test(msg.message_content)
      )
      return isImgType || isImgUrl
    })
  }, [messages])

  // Extract shared files
  const sharedFiles = React.useMemo(() => {
    const filesFromMessages = messages.filter(msg => {
      const isFileType = msg.message_type === 'file' || msg.message_type === 'pdf' || msg.message_type === 'document'
      const isFileExt = typeof msg.message_content === 'string' && (
        msg.message_content.startsWith('data:application/') ||
        /\.(pdf|docx?|xlsx?|txt|csv|zip)$/i.test(msg.message_content)
      )
      return isFileType || isFileExt
    }).map(msg => ({
      id: msg.id,
      name: msg.file_name || (msg.message_content.startsWith('data:') ? 'Attached_Document.pdf' : msg.message_content.split('/').pop() || 'Document.pdf'),
      size: msg.file_size || 'File Attachment',
      date: msg.message_date,
      url: msg.file_url || msg.message_content
    }))

    const filesFromEhr = ehrDocs.map(doc => ({
      id: doc.id,
      name: doc.document_name || 'EHR_Document.pdf',
      size: doc.category || 'Medical Record',
      date: doc.created_at ? new Date(doc.created_at).toISOString() : new Date().toISOString(),
      url: doc.file_url || doc.temp_blob_id || '#'
    }))

    return [...filesFromMessages, ...filesFromEhr]
  }, [messages, ehrDocs])

  // Extract shared links
  const sharedLinks = React.useMemo(() => {
    const links: { id: string; url: string; date: string }[] = []
    const urlRegex = /(https?:\/\/[^\s]+)/g

    messages.forEach(msg => {
      if (typeof msg.message_content === 'string' && !msg.message_content.startsWith('data:')) {
        const matches = msg.message_content.match(urlRegex)
        if (matches) {
          matches.forEach((url, idx) => {
            links.push({
              id: `${msg.id}-${idx}`,
              url: url,
              date: msg.message_date
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
    <div className="hidden lg:flex flex-col h-full w-[350px] shrink-0 border-l border-border bg-card">
      {/* Header */}
      <div className="h-[72px] px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="text-base font-semibold text-card-foreground">Chat Details</h2>
      </div>

      {/* Accordions / Lists */}
      <div className="flex-1 overflow-y-auto">
        
        {/* Photos and Videos */}
        <div className="border-b border-border">
          <button 
            onClick={() => setOpenPhotos(!openPhotos)}
            className="flex items-center justify-between w-full px-6 py-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-card-foreground">Photos and Videos</span>
              <span className="text-xs text-muted-foreground">({photosAndVideos.length})</span>
            </div>
            {openPhotos ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          
          {openPhotos && (
            <div className="px-6 pb-6">
              {photosAndVideos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {photosAndVideos.map((media) => (
                    <a key={media.id} href={media.message_content} target="_blank" rel="noreferrer" className="aspect-square bg-muted rounded-md border border-border overflow-hidden group block relative">
                      <img src={media.message_content} alt="Media" className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground py-2 text-center">
                  No shared photos or videos yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shared Files */}
        <div className="border-b border-border">
          <button 
            onClick={() => setOpenFiles(!openFiles)}
            className="flex items-center justify-between w-full px-6 py-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-card-foreground">Shared Files</span>
              <span className="text-xs text-muted-foreground">({sharedFiles.length})</span>
            </div>
            {openFiles ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          
          {openFiles && (
            <div className="flex flex-col gap-3 px-6 pb-6">
              {sharedFiles.length > 0 ? (
                sharedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs font-medium text-card-foreground truncate">{file.name}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{file.size} • {formatDateStr(file.date)}</span>
                      </div>
                    </div>
                    {file.url && file.url !== '#' && (
                      <a href={file.url} download={file.name} target="_blank" rel="noreferrer" className="p-1 text-muted-foreground hover:text-foreground shrink-0">
                        <Download className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-2 text-center">
                  No shared files yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Shared Links */}
        <div className="border-b border-border">
          <button 
            onClick={() => setOpenLinks(!openLinks)}
            className="flex items-center justify-between w-full px-6 py-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-card-foreground">Shared Links</span>
              <span className="text-xs text-muted-foreground">({sharedLinks.length})</span>
            </div>
            {openLinks ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          
          {openLinks && (
            <div className="flex flex-col gap-2 px-6 pb-6">
              {sharedLinks.length > 0 ? (
                sharedLinks.map((item) => (
                  <a key={item.id} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                    <span className="text-xs text-primary underline truncate flex-1">{item.url}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </a>
                ))
              ) : (
                <div className="text-xs text-muted-foreground py-2 text-center">
                  No shared links yet
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
