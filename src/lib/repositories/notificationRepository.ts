import { db } from "@/lib/db/bmsDatabase"
import type { LocalNotification } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

export const notificationRepository = {
  async getCurrentUserId(): Promise<string> {
    try {
      const currentUser = await db.userSession.get("current_user")
      if (currentUser?.user_id || currentUser?.id) {
        return currentUser.user_id || currentUser.id
      }
      const rawStoredUser = localStorage.getItem("user")
      if (rawStoredUser) {
        const parsed = JSON.parse(rawStoredUser)
        if (parsed?.user_id || parsed?.id) {
          return parsed.user_id || parsed.id
        }
      }
      const tokenUser = localStorage.getItem("bms_user_id")
      if (tokenUser) return tokenUser
    } catch {}
    return ""
  },

  async getUserNotifications(): Promise<LocalNotification[]> {
    const userId = await this.getCurrentUserId()
    if (!userId) return []
    let localList: LocalNotification[] = []

    try {
      localList = await db.notifications
        .where("user_id")
        .equals(userId)
        .toArray()
    } catch (err) {
      console.warn(
        "[notificationRepository] Failed to query local Dexie DB:",
        err
      )
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(
          `/api/v1/notification/get/user/${userId}`
        )
        const remoteList =
          response.data?.notifications ||
          response.data?.data ||
          response.data?.result ||
          (Array.isArray(response.data) ? response.data : [])

        if (Array.isArray(remoteList)) {
          const pendingItems = localList.filter(
            (n) => n.sync_status !== "synced"
          )
          const pendingIds = new Set(pendingItems.map((n) => n.id))

          const formattedRemote: LocalNotification[] = remoteList
            .filter(
              (notif: any) =>
                !pendingIds.has(notif.notification_id || notif._id || notif.id)
            )
            .map((notif: any) => {
              const notifId = notif.notification_id || notif._id || notif.id
              const localExisting = localList.find(
                (l) => l.id === notifId || l.notification_id === notifId
              )
              const isRead = Boolean(
                notif.is_read || (localExisting ? localExisting.is_read : false)
              )

              return {
                ...notif,
                id: notifId,
                notification_id: notifId,
                user_id: userId,
                notification_type: notif.notification_type || "system",
                notification_message: notif.notification_message || "",
                notification_date: notif.notification_date
                  ? new Date(notif.notification_date).toISOString()
                  : new Date().toISOString(),
                is_read: isRead,
                sync_status: "synced" as const,
                updated_at: notif.updated_at
                  ? new Date(notif.updated_at).getTime()
                  : Date.now(),
              }
            })

          try {
            await db.transaction("rw", db.notifications, async () => {
              const syncedLocalIds = localList
                .filter((n) => n.sync_status === "synced")
                .map((n) => n.id)
              if (syncedLocalIds.length > 0) {
                await db.notifications.bulkDelete(syncedLocalIds)
              }
              if (formattedRemote.length > 0) {
                await db.notifications.bulkPut(formattedRemote)
              }
            })
          } catch (dbErr) {
            console.warn(
              "[notificationRepository] Failed to update local Dexie cache:",
              dbErr
            )
          }

          return [...pendingItems, ...formattedRemote]
        }
      } catch (apiErr) {
        console.warn(
          "[notificationRepository] Backend fetch failed, returning cached notifications:",
          apiErr
        )
      }
    }

    return localList
  },

  async markAsRead(notificationId: string): Promise<void> {
    const userId = await this.getCurrentUserId()
    const nowMs = Date.now()

    try {
      const existing = await db.notifications.get(notificationId)
      if (existing) {
        await db.notifications.update(notificationId, {
          is_read: true,
          sync_status: syncEngine.isNetworkOnline()
            ? "synced"
            : "pending_update",
          updated_at: nowMs,
        })
      }
    } catch (err) {
      console.warn(
        "[notificationRepository] Failed to update local notification:",
        err
      )
    }

    const endpoint = `/api/v1/notification/update/${notificationId}`
    const payload = { is_read: true, user_id: userId }

    if (syncEngine.isNetworkOnline()) {
      try {
        await apiClient.put(endpoint, payload)
      } catch (err) {
        console.warn(
          "[notificationRepository] Failed to update backend, enqueuing offline mutation:",
          err
        )
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

  async markAllAsRead(): Promise<void> {
    const userId = await this.getCurrentUserId()
    if (!userId) return
    const nowMs = Date.now()

    try {
      const userLocal = await db.notifications
        .where("user_id")
        .equals(userId)
        .toArray()
      const updatedList = userLocal.map((n) => ({
        ...n,
        is_read: true,
        sync_status: (syncEngine.isNetworkOnline()
          ? "synced"
          : "pending_update") as "synced" | "pending_update",
        updated_at: nowMs,
      }))
      if (updatedList.length > 0) {
        await db.notifications.bulkPut(updatedList)
      }
    } catch (err) {
      console.warn(
        "[notificationRepository] Failed to mark all local notifications as read:",
        err
      )
    }

    const endpoint = `/api/v1/notification/mark/read/${userId}`
    const payload = {}

    if (syncEngine.isNetworkOnline()) {
      try {
        await apiClient.put(endpoint, payload)
      } catch (err) {
        console.warn(
          "[notificationRepository] Failed to mark all read on backend, enqueuing offline mutation:",
          err
        )
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

  async clearAll(): Promise<void> {
    const userId = await this.getCurrentUserId()
    if (!userId) return
    try {
      await db.notifications.where("user_id").equals(userId).delete()
    } catch (err) {
      console.warn(
        "[notificationRepository] Failed to clear local notifications:",
        err
      )
    }
  },

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
      console.warn(
        "[notificationRepository] Failed to save local notification:",
        err
      )
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
        console.warn(
          "[notificationRepository] Backend send failed, enqueuing offline mutation:",
          err
        )
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
