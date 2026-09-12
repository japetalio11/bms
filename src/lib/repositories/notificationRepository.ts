import { db } from "@/lib/db/bmsDatabase"
import type { LocalNotification } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

export const notificationRepository = {
  /**
    * Helper to get current authenticated user ID
    */
  async getCurrentUserId(): Promise<string> {
    try {
      const currentUser = await db.userSession.get("current_user")
      if (currentUser?.user_id || currentUser?.id) {
        return currentUser.user_id || currentUser.id
      }
      const tokenUser = localStorage.getItem("bms_user_id")
      if (tokenUser) return tokenUser
    } catch {
      // fallback
    }
    return "USR-1001" // default fallback user ID
  },

  /**
   * Retrieves all notifications for the current user.
   * Reads local Dexie DB cache first, then syncs with backend if online.
   */
  async getUserNotifications(): Promise<LocalNotification[]> {
    const userId = await this.getCurrentUserId()
    let localList: LocalNotification[] = []

    try {
      localList = await db.notifications.where("user_id").equals(userId).toArray()
      if (localList.length === 0) {
        // Fallback to all local notifications if query by user_id returned none
        localList = await db.notifications.toArray()
      }
    } catch (err) {
      console.warn("[notificationRepository] Failed to query local Dexie DB:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(`/api/v1/notification/get/user/${userId}`)
        const remoteList =
          response.data?.notifications ||
          response.data?.data ||
          response.data?.result ||
          (Array.isArray(response.data) ? response.data : [])

        if (Array.isArray(remoteList)) {
          const pendingItems = localList.filter((n) => n.sync_status !== "synced")
          const pendingIds = new Set(pendingItems.map((n) => n.id))

          const formattedRemote: LocalNotification[] = remoteList
            .filter((notif: any) => !pendingIds.has(notif.notification_id || notif._id || notif.id))
            .map((notif: any) => {
              const notifId = notif.notification_id || notif._id || notif.id
              return {
                ...notif,
                id: notifId,
                notification_id: notifId,
                user_id: notif.user_id || userId,
                notification_type: notif.notification_type || "system",
                notification_message: notif.notification_message || "",
                notification_date: notif.notification_date
                  ? new Date(notif.notification_date).toISOString()
                  : new Date().toISOString(),
                is_read: notif.is_read ?? false,
                sync_status: "synced" as const,
                updated_at: notif.updated_at ? new Date(notif.updated_at).getTime() : Date.now(),
              }
            })

          try {
            await db.transaction("rw", db.notifications, async () => {
              const syncedLocalIds = localList.filter((n) => n.sync_status === "synced").map((n) => n.id)
              if (syncedLocalIds.length > 0) {
                await db.notifications.bulkDelete(syncedLocalIds)
              }
              if (formattedRemote.length > 0) {
                await db.notifications.bulkPut(formattedRemote)
              }
            })
          } catch (dbErr) {
            console.warn("[notificationRepository] Failed to update local Dexie cache:", dbErr)
          }

          return [...pendingItems, ...formattedRemote]
        }
      } catch (apiErr) {
        console.warn("[notificationRepository] Backend fetch failed, returning cached notifications:", apiErr)
      }
    }

    return localList
  },

  /**
   * Marks a single notification as read (offline-first).
   */
  async markAsRead(notificationId: string): Promise<void> {
    const userId = await this.getCurrentUserId()
    const nowMs = Date.now()

    try {
      const existing = await db.notifications.get(notificationId)
      if (existing) {
        await db.notifications.update(notificationId, {
          is_read: true,
          sync_status: syncEngine.isNetworkOnline() ? "synced" : "pending_update",
          updated_at: nowMs,
        })
      }
    } catch (err) {
      console.warn("[notificationRepository] Failed to update local notification:", err)
    }

    const endpoint = `/api/v1/notification/update/${notificationId}`
    const payload = { is_read: true, user_id: userId }

    if (syncEngine.isNetworkOnline()) {
      try {
        await apiClient.put(endpoint, payload)
      } catch (err) {
        console.warn("[notificationRepository] Failed to update backend, enqueuing offline mutation:", err)
        await syncEngine.enqueueMutation({
          entity_type: "notification",
          action: "UPDATE",
          endpoint,
          method: "PUT",
          payload,
          temp_id: notificationId,
        })
      }
    } else {
      await syncEngine.enqueueMutation({
        entity_type: "notification",
        action: "UPDATE",
        endpoint,
        method: "PUT",
        payload,
        temp_id: notificationId,
      })
    }
  },

  /**
   * Marks all notifications as read for current user (offline-first).
   */
  async markAllAsRead(): Promise<void> {
    const userId = await this.getCurrentUserId()
    const nowMs = Date.now()

    try {
      const allLocal = await db.notifications.toArray()
      const updatedList = allLocal.map((n) => ({
        ...n,
        is_read: true,
        sync_status: (syncEngine.isNetworkOnline() ? "synced" : "pending_update") as "synced" | "pending_update",
        updated_at: nowMs,
      }))
      if (updatedList.length > 0) {
        await db.notifications.bulkPut(updatedList)
      }
    } catch (err) {
      console.warn("[notificationRepository] Failed to mark all local notifications as read:", err)
    }

    const endpoint = `/api/v1/notification/mark/read/${userId}`
    const payload = {}

    if (syncEngine.isNetworkOnline()) {
      try {
        await apiClient.put(endpoint, payload)
      } catch (err) {
        console.warn("[notificationRepository] Failed to mark all read on backend, enqueuing offline mutation:", err)
        await syncEngine.enqueueMutation({
          entity_type: "notification",
          action: "UPDATE",
          endpoint,
          method: "PUT",
          payload,
        })
      }
    } else {
      await syncEngine.enqueueMutation({
        entity_type: "notification",
        action: "UPDATE",
        endpoint,
        method: "PUT",
        payload,
      })
    }
  },

  /**
   * Clears all local notifications (useful for reset or purge).
   */
  async clearAll(): Promise<void> {
    try {
      await db.notifications.clear()
    } catch (err) {
      console.warn("[notificationRepository] Failed to clear local notifications:", err)
    }
  },

  /**
   * Sends or creates a new notification (offline-first).
   */
  async sendNotification(params: {
    target_user_id?: string
    notification_type: string
    notification_message: string
  }): Promise<LocalNotification> {
    const currentUserId = await this.getCurrentUserId()
    const targetUserId = params.target_user_id || currentUserId
    const tempId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const nowIso = new Date().toISOString()
    const nowMs = Date.now()

    const newNotif: LocalNotification = {
      id: tempId,
      notification_id: tempId,
      user_id: targetUserId,
      notification_type: params.notification_type,
      notification_message: params.notification_message,
      notification_date: nowIso,
      is_read: false,
      sync_status: syncEngine.isNetworkOnline() ? "synced" : "pending_create",
      updated_at: nowMs,
    }

    try {
      await db.notifications.put(newNotif)
    } catch (err) {
      console.warn("[notificationRepository] Failed to save local notification:", err)
    }

    const endpoint = "/api/v1/notification/send"
    const payload = {
      user_id: targetUserId,
      notification_type: params.notification_type,
      notification_message: params.notification_message,
      notification_date: nowIso,
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post(endpoint, payload)
        const created = response.data?.notification || response.data?.data
        if (created) {
          const canonicalId = created.notification_id || created._id || tempId
          const syncedNotif: LocalNotification = {
            ...newNotif,
            id: canonicalId,
            notification_id: canonicalId,
            sync_status: "synced",
          }
          await db.notifications.delete(tempId)
          await db.notifications.put(syncedNotif)
          return syncedNotif
        }
      } catch (err) {
        console.warn("[notificationRepository] Backend send failed, enqueuing offline mutation:", err)
        await syncEngine.enqueueMutation({
          entity_type: "notification",
          action: "CREATE",
          endpoint,
          method: "POST",
          payload,
          temp_id: tempId,
        })
      }
    } else {
      await syncEngine.enqueueMutation({
        entity_type: "notification",
        action: "CREATE",
        endpoint,
        method: "POST",
        payload,
        temp_id: tempId,
      })
    }

    return newNotif
  },
}
