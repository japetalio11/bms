import { db } from "@/lib/db/bmsDatabase"
import type { LocalMessage } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

export const messageRepository = {
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

          const formattedRemote: LocalMessage[] = remoteList
            .filter((msg: any) => !pendingIds.has(msg.message_id || msg._id || msg.id))
            .map((msg: any) => {
              const msgId = msg.message_id || msg._id || msg.id
              const otherUser = msg.sender || msg.receiver
              const contactName = otherUser
                ? `${otherUser.first_name || ""} ${otherUser.last_name || ""}`.trim()
                : msg.contact_name || undefined
              const avatar = otherUser?.profile_url || otherUser?.photo_url || msg.contact_avatar || ""

              return {
                ...msg,
                id: msgId,
                sender_id: msg.sender_id,
                receiver_id: msg.receiver_id,
                message_type: msg.message_type || "text",
                message_content: msg.message_content || "",
                message_date: msg.message_date ? new Date(msg.message_date).toISOString() : new Date().toISOString(),
                is_read: msg.is_read ?? false,
                contact_name: contactName,
                contact_avatar: avatar,
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
    const currentUser = await db.userSession.get("current_user")
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
          ...created,
          id: canonicalId,
          sync_status: "synced",
          updated_at: nowMs,
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
      const currentUser = await db.userSession.get("current_user")
      if (!currentUser) return
      const unreadMsgs = await db.messages
        .filter((m) => m.sender_id === contactId && m.receiver_id === currentUser.user_id && !m.is_read)
        .toArray()

      for (const m of unreadMsgs) {
        await db.messages.update(m.id, { is_read: true, updated_at: Date.now() })
      }
    } catch (err) {
      console.warn("[messageRepository] Failed to mark messages as read:", err)
    }
  },
}
