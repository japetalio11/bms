import { db } from "@/lib/db/bmsDatabase"
import type { LocalReferral } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

export const referralRepository = {
  /**
   * Retrieves all referrals for the user's facility.
   * Reads local Dexie DB first, then syncs with backend if online.
   */
  async getAllReferrals(): Promise<LocalReferral[]> {
    let localList: LocalReferral[] = []
    try {
      localList = await db.referrals.toArray()
    } catch (err) {
      console.warn("[referralRepository] Failed to query local Dexie DB:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get("/api/v1/referral/getAll")
        const remoteList = response.data?.data || (Array.isArray(response.data) ? response.data : [])

        if (Array.isArray(remoteList)) {
          const pendingItems = localList.filter((r) => r.sync_status !== "synced")
          const pendingIds = new Set(pendingItems.map((r) => r.id))

          const formattedRemote: LocalReferral[] = remoteList
            .filter((r: any) => !pendingIds.has(r.referral_id || r._id || r.id))
            .map((r: any) => ({
              ...r,
              id: r.referral_id || r._id || r.id,
              referral_id: r.referral_id || r._id || r.id,
              pregnancy_id: r.pregnancy_id,
              from_facility_id: r.from_facility_id,
              to_facility_id: r.to_facility_id,
              external_facility_name: r.external_facility_name,
              reason: r.reason,
              date_referred: r.date_referred,
              secure_link: r.secure_link,
              shared_pin: r.shared_pin,
              is_completed: r.is_completed ?? false,
              status: r.status || "pending",
              response_notes: r.response_notes,
              outcome: r.outcome,
              date_responded: r.date_responded,
              sync_status: "synced",
              updated_at: r.updated_at ? new Date(r.updated_at).getTime() : Date.now(),
              pregnancy: r.pregnancy,
              fromFacility: r.fromFacility,
              toFacility: r.toFacility,
            }))

          try {
            await db.transaction("rw", db.referrals, async () => {
              const syncedLocalIds = localList.filter((r) => r.sync_status === "synced").map((r) => r.id)
              if (syncedLocalIds.length > 0) {
                await db.referrals.bulkDelete(syncedLocalIds)
              }
              if (formattedRemote.length > 0) {
                await db.referrals.bulkPut(formattedRemote)
              }
            })
          } catch (dbErr) {
            console.warn("[referralRepository] Failed to update local Dexie cache:", dbErr)
          }

          return [...pendingItems, ...formattedRemote]
        }
      } catch (apiErr) {
        console.warn("[referralRepository] Backend fetch failed, returning cached referrals:", apiErr)
      }
    }

    return localList
  },

  /**
   * Creates a new referral.
   */
  async createReferral(payload: {
    pregnancy_id: string
    from_facility_id: string
    to_facility_id?: string
    external_facility_name?: string
    reason: string
  }): Promise<LocalReferral> {
    const tempId = `temp-ref-${Date.now()}`
    const nowIso = new Date().toISOString()

    const localItem: LocalReferral = {
      id: tempId,
      referral_id: tempId,
      pregnancy_id: payload.pregnancy_id,
      from_facility_id: payload.from_facility_id,
      to_facility_id: payload.to_facility_id || undefined,
      external_facility_name: payload.external_facility_name || undefined,
      reason: payload.reason,
      date_referred: nowIso,
      status: "pending",
      is_completed: false,
      sync_status: syncEngine.isNetworkOnline() ? "synced" : "pending_create",
      updated_at: Date.now(),
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post("/api/v1/referral/register", payload)
        const created = response.data?.data || response.data

        const savedItem: LocalReferral = {
          ...localItem,
          ...created,
          id: created.referral_id || created.id || tempId,
          referral_id: created.referral_id || tempId,
          sync_status: "synced",
          updated_at: Date.now(),
        }

        await db.referrals.put(savedItem)
        return savedItem
      } catch (err: any) {
        if (err.response?.status >= 400 && err.response?.status < 500) {
          throw err
        }
        console.warn("[referralRepository] Server error, queuing offline mutation:", err)
      }
    }

    // Save offline
    localItem.sync_status = "pending_create"
    await db.referrals.put(localItem)

    await syncEngine.enqueueMutation({
      entity_type: "custom_request",
      action: "CREATE",
      endpoint: "/api/v1/referral/register",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return localItem
  },

  /**
   * Responds to a referral (accept, reject, complete).
   */
  async respondToReferral(
    referralId: string,
    payload: {
      status: string
      response_notes?: string
      outcome?: string
      is_completed?: boolean
    }
  ): Promise<LocalReferral | null> {
    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.put(`/api/v1/referral/respond/${referralId}`, payload)
        const updated = response.data?.data || response.data

        if (updated) {
          const savedItem: LocalReferral = {
            ...updated,
            id: updated.referral_id || referralId,
            sync_status: "synced",
            updated_at: Date.now(),
          }
          await db.referrals.put(savedItem)
          return savedItem
        }
      } catch (err) {
        console.error("[referralRepository] Respond to referral failed:", err)
      }
    }

    // Update locally
    const existing = await db.referrals.get(referralId)
    if (existing) {
      const updatedLocal: LocalReferral = {
        ...existing,
        ...payload,
        status: payload.status,
        response_notes: payload.response_notes ?? existing.response_notes,
        outcome: payload.outcome ?? existing.outcome,
        is_completed: payload.is_completed ?? existing.is_completed,
        sync_status: "pending_update",
        updated_at: Date.now(),
      }
      await db.referrals.put(updatedLocal)

      await syncEngine.enqueueMutation({
        entity_type: "custom_request",
        action: "UPDATE",
        endpoint: `/api/v1/referral/respond/${referralId}`,
        method: "PUT",
        payload,
      })

      return updatedLocal
    }

    return null
  },

  /**
   * Deletes a referral.
   */
  async deleteReferral(referralId: string): Promise<boolean> {
    try {
      await db.referrals.delete(referralId)
    } catch (err) {
      console.warn("[referralRepository] Delete local Dexie error:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        await apiClient.delete(`/api/v1/referral/delete/${referralId}`)
        return true
      } catch (err) {
        console.error("[referralRepository] Online delete failed:", err)
      }
    }

    await syncEngine.enqueueMutation({
      entity_type: "custom_request",
      action: "DELETE",
      endpoint: `/api/v1/referral/delete/${referralId}`,
      method: "DELETE",
      payload: {},
    })

    return true
  },
}
