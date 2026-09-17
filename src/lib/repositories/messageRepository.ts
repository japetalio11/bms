import { db } from "@/lib/db/bmsDatabase"
import type { LocalMessage } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

export const messageRepository = {
  /**
   * Uploads an attachment file (image or document) to the backend storage.
   */
  async uploadAttachment(file: File): Promise<{ fileUrl: string; fileName: string; fileType: string; fileSize: string }> {
    const formData = new FormData()
    formData.append("file", file)

    const response = await apiClient.post("/api/v1/message/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    })

    const data = response.data
    const fileUrl = data.file_url || data.fileUrl || data.url || ""
    const fileName = data.fileName || data.file_name || file.name
    const fileType = data.fileType || data.file_type || (file.type.startsWith("image/") ? "image" : "file")
    const fileSize = data.fileSize || data.file_size || `${(file.size / 1024).toFixed(1)} KB`

    return {
      fileUrl,
      fileName,
      fileType,
      fileSize,
    }
  },

  /**
   * Retrieves all messages for the user.
   * Reads local Dexie DB first, then syncs with backend if online.
   */
  async getAllMessages(): Promise<LocalMessage[]> {
    let localList: LocalMessage[] = []
    try {
      localList = await db.messages.toArray()
    } catch (err) {
      console.warn("[messageRepository] Failed to query local Dexie DB:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get("/api/v1/message/getAll")
        const remoteList = response.data?.data || response.data?.result || (Array.isArray(response.data) ? response.data : [])

        if (Array.isArray(remoteList)) {
          const pendingItems = localList.filter((m) => m.sync_status !== "synced")
          const pendingIds = new Set(pendingItems.map((m) => m.id))

          const userStr = typeof window !== "undefined" ? localStorage.getItem("user") : null
          const currentUserObj = userStr ? JSON.parse(userStr) : null
          const currentUserId = currentUserObj?.user_id || currentUserObj?.id
          const localById = new Map<string, LocalMessage>(localList.map((m) => [m.id, m]))

          const isStaff = currentUserObj?.role && currentUserObj.role !== "Mother"

          const formattedRemote: LocalMessage[] = remoteList
            .filter((msg: any) => !pendingIds.has(msg.message_id || msg._id || msg.id))
            .map((msg: any) => {
              const msgId = msg.message_id || msg._id || msg.id
              const existing = localById.get(msgId)
              
              // Identify the other party in the 1-to-1 conversation
              let contactUser = (currentUserId && msg.sender_id === currentUserId) ? msg.receiver : msg.sender
              if (!contactUser && isStaff) {
                contactUser = msg.sender?.role === "Mother" ? msg.sender : (msg.receiver?.role === "Mother" ? msg.receiver : null)
              }

              const contactName = contactUser
                ? `${contactUser.first_name || ""} ${contactUser.last_name || ""}`.trim()
                : msg.contact_name || existing?.contact_name || undefined
              const avatar = contactUser?.profile_url || contactUser?.photo_url || msg.contact_avatar || existing?.contact_avatar || ""

              const senderName = msg.sender ? `${msg.sender.first_name || ""} ${msg.sender.last_name || ""}`.trim() : existing?.sender_name
              const senderRole = msg.sender?.role || existing?.sender_role

              // Determine message_type
              let msgType = msg.message_type || existing?.message_type || "text"
              if (typeof msg.message_content === "string") {
                if (msg.message_content.startsWith("data:image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(msg.message_content)) {
                  msgType = "image"
                } else if (msg.message_content.startsWith("data:application/") || /\.(pdf|docx?|xlsx?|txt|csv|zip)$/i.test(msg.message_content)) {
                  msgType = "file"
                }
              }

              return {
                ...msg,
                id: msgId,
                sender_id: msg.sender_id,
                receiver_id: msg.receiver_id,
                message_type: msgType,
                message_content: msg.message_content || "",
                file_name: msg.file_name || existing?.file_name,
                file_size: msg.file_size || existing?.file_size,
                message_date: msg.message_date ? new Date(msg.message_date).toISOString() : new Date().toISOString(),
                is_read: msg.is_read ?? false,
                contact_name: contactName,
                contact_avatar: avatar,
                sender_name: senderName,
                sender_role: senderRole,
                sync_status: "synced" as const,
                updated_at: msg.updated_at ? new Date(msg.updated_at).getTime() : Date.now(),
              }
            })

          try {
            await db.transaction("rw", db.messages, async () => {
              const syncedLocalIds = localList.filter((m) => m.sync_status === "synced").map((m) => m.id)
              if (syncedLocalIds.length > 0) {
                await db.messages.bulkDelete(syncedLocalIds)
              }
              if (formattedRemote.length > 0) {
                await db.messages.bulkPut(formattedRemote)
              }
            })
          } catch (dbErr) {
            console.warn("[messageRepository] Failed to update local Dexie cache:", dbErr)
          }

          return [...pendingItems, ...formattedRemote]
        }
      } catch (apiErr) {
        console.warn("[messageRepository] Backend fetch failed, returning cached messages:", apiErr)
      }
    }

    return localList
  },

  /**
   * Sends a message or file attachment (offline-first).
   */
  async sendMessage(payload: {
    receiver_id: string
    message_content: string
    message_type?: string
    file_name?: string
    file_size?: string
    contact_name?: string
    contact_avatar?: string
  }): Promise<LocalMessage> {
    let currentUser = await db.userSession.get("current_user")
    if (!currentUser && typeof window !== "undefined") {
      const stored = localStorage.getItem("user")
      if (stored) {
        try {
          currentUser = JSON.parse(stored)
        } catch {}
      }
    }
    const senderId = currentUser?.user_id || currentUser?.id || "current-user"
    const tempId = `temp-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const nowIso = new Date().toISOString()
    const nowMs = Date.now()

    const localMsg: LocalMessage = {
      id: tempId,
      sender_id: senderId,
      receiver_id: payload.receiver_id,
      message_content: payload.message_content,
      message_type: payload.message_type || "text",
      file_name: payload.file_name,
      file_size: payload.file_size,
      message_date: nowIso,
      is_read: true,
      contact_name: payload.contact_name,
      contact_avatar: payload.contact_avatar,
      sync_status: syncEngine.isNetworkOnline() ? "synced" : "pending_create",
      updated_at: nowMs,
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post("/api/v1/message/create", {
          receiver_id: payload.receiver_id,
          message_content: payload.message_content,
          message_type: payload.message_type || "text",
          message_date: nowIso,
        })

        const created = response.data?.data || response.data?.result || response.data
        const canonicalId = created?.message_id || created?._id || created?.id || tempId

        const savedMsg: LocalMessage = {
          ...localMsg,
          id: canonicalId,
          sync_status: "synced",
        }

        await db.messages.put(savedMsg)
        return savedMsg
      } catch (err: any) {
        if (err.response?.status >= 400 && err.response?.status < 500) {
          throw err
        }
        console.warn("[messageRepository] Server error, queuing offline message mutation:", err)
      }
    }

    // Save offline in Dexie DB
    localMsg.sync_status = "pending_create"
    await db.messages.put(localMsg)

    // Enqueue mutation for background sync engine
    await syncEngine.enqueueMutation({
      entity_type: "message",
      action: "CREATE",
      endpoint: "/api/v1/message/create",
      method: "POST",
      payload: {
        receiver_id: payload.receiver_id,
        message_content: payload.message_content,
        message_type: payload.message_type || "text",
        message_date: nowIso,
      },
      temp_id: tempId,
    })

    return localMsg
  },

  /**
   * Marks unread messages from a contact as read locally.
   */
  async markAsRead(contactId: string): Promise<void> {
    try {
      const unreadMsgs = await db.messages
        .filter((m) => m.sender_id === contactId && !m.is_read)
        .toArray()

      for (const m of unreadMsgs) {
        await db.messages.update(m.id, { is_read: true, updated_at: Date.now() })
      }

      if (syncEngine.isNetworkOnline()) {
        await apiClient.put("/api/v1/message/markAllAsRead", { sender_id: contactId }).catch(() => {})
      }
    } catch (err) {
      console.warn("[messageRepository] Failed to mark messages as read:", err)
    }
  },
}
