import { db } from "@/lib/db/bmsDatabase"
import type { LocalReferral } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

export const referralRepository = {
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
        const remoteList =
          response.data?.data ||
          (Array.isArray(response.data) ? response.data : [])

        if (Array.isArray(remoteList)) {
          const pendingQueue = await syncEngine.getQueue()
          const pendingTempIds = new Set(
            pendingQueue.map((m) => m.temp_id).filter(Boolean)
          )

          const formattedRemote: LocalReferral[] = remoteList.map((r: any) => {
            const canonicalId = r.referral_id || r._id || r.id
            const motherUser = r.pregnancy?.mother?.user
            const resolvedMotherName = motherUser
              ? `${motherUser.first_name || ""} ${motherUser.last_name || ""}`.trim()
              : r.pregnancy?.mother?.first_name
                ? `${r.pregnancy.mother.first_name} ${r.pregnancy.mother.last_name || ""}`.trim()
                : r.motherName || r.mother_name || undefined

            return {
              ...r,
              id: canonicalId,
              referral_id: canonicalId,
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
              updated_at: r.updated_at
                ? new Date(r.updated_at).getTime()
                : Date.now(),
              pregnancy: r.pregnancy,
              fromFacility: r.fromFacility,
              toFacility: r.toFacility,
              motherName: resolvedMotherName,
            }
          })

          const remoteIds = new Set(formattedRemote.map((r) => r.id))

          const toDelete = localList.filter((r) => {
            const isPendingInOutbox =
              (r.id && pendingTempIds.has(r.id)) ||
              (r.referral_id && pendingTempIds.has(r.referral_id))
            if (isPendingInOutbox) return false
            return (
              !remoteIds.has(r.id) &&
              (!r.referral_id || !remoteIds.has(r.referral_id))
            )
          })

          for (const item of toDelete) {
            if (item.id) await db.referrals.delete(item.id).catch(() => {})
            if (item.referral_id)
              await db.referrals
                .where("referral_id")
                .equals(item.referral_id)
                .delete()
                .catch(() => {})
          }

          const pendingItems = localList.filter(
            (r) =>
              (r.id && pendingTempIds.has(r.id)) ||
              (r.referral_id && pendingTempIds.has(r.referral_id))
          )
          if (formattedRemote.length > 0) {
            await db.referrals.bulkPut(formattedRemote)
          }

          localList = await db.referrals.toArray()
        }
      } catch (apiErr) {
        console.warn(
          "[referralRepository] Backend fetch failed, returning cached referrals:",
          apiErr
        )
      }
    }

    let currentUser: any = null
    try {
      currentUser = await db.userSession.get("current_user")
      if (!currentUser && typeof window !== "undefined") {
        const stored = localStorage.getItem("user")
        if (stored) currentUser = JSON.parse(stored)
      }
    } catch {}

    const isSysAdmin = currentUser?.role === "SystemAdmin"
    const currentFacilityId =
      currentUser?.facility_id || currentUser?.facility?.facility_id
    const currentUserId = currentUser?.user_id || currentUser?.id

    let result = localList

    if (!isSysAdmin && currentFacilityId) {
      result = result.filter(
        (r) =>
          r.from_facility_id === currentFacilityId ||
          r.to_facility_id === currentFacilityId
      )
    }

    const isHealthcareStaff =
      currentUser?.role &&
      ![
        "SystemAdmin",
        "Admin",
        "Administrator",
        "FacilityAdmin",
        "Mother",
      ].includes(currentUser.role)

    if (isHealthcareStaff && currentUserId) {
      const allMothers = await db.mothers.toArray().catch(() => [])
      const assignedMotherIds = new Set<string>()

      for (const m of allMothers) {
        const workerId =
          m.assigned_worker_id ||
          m.assignedWorker?.user_id ||
          m.assigned_worker?.user_id ||
          m.created_by_id ||
          m.creator?.user_id
        if (workerId === currentUserId) {
          if (m.id) assignedMotherIds.add(m.id)
          if (m.mother_id) assignedMotherIds.add(m.mother_id)
          if (m.user_id) assignedMotherIds.add(m.user_id)
          if (m._id) assignedMotherIds.add(m._id)
        }
      }

      result = result.filter((r: any) => {
        // 1. If referral belongs to or touches the staff's facility
        if (
          currentFacilityId &&
          (r.from_facility_id === currentFacilityId ||
            r.to_facility_id === currentFacilityId ||
            r.fromFacility?.facility_id === currentFacilityId ||
            r.toFacility?.facility_id === currentFacilityId)
        ) {
          return true
        }

        // 2. If staff is creator / user
        if (
          r.created_by_id === currentUserId ||
          r.user_id === currentUserId ||
          r.assigned_worker_id === currentUserId
        ) {
          return true
        }

        const mother = r.pregnancy?.mother
        if (mother) {
          const workerId =
            mother.assigned_worker_id ||
            mother.assignedWorker?.user_id ||
            mother.assigned_worker?.user_id ||
            mother.created_by_id ||
            mother.creator?.user_id ||
            mother.user_id
          if (workerId === currentUserId) return true

          const motherKey =
            mother.mother_id || mother.id || mother._id || mother.user_id
          if (motherKey && assignedMotherIds.has(motherKey)) return true
        }

        if (r.mother_id && assignedMotherIds.has(r.mother_id)) return true
        if (r.motherId && assignedMotherIds.has(r.motherId)) return true

        return false
      })
    }

    return result
  },

  async createReferral(payload: {
    pregnancy_id: string
    mother_id?: string
    from_facility_id: string
    to_facility_id?: string
    external_facility_name?: string
    reason: string
    mother_name?: string
  }): Promise<LocalReferral> {
    const tempId = `temp-ref-${Date.now()}`
    const nowIso = new Date().toISOString()

    let currentUser: any = null
    try {
      currentUser = await db.userSession.get("current_user")
      if (!currentUser && typeof window !== "undefined") {
        const stored = localStorage.getItem("user")
        if (stored) currentUser = JSON.parse(stored)
      }
    } catch {}
    const currentUserId = currentUser?.user_id || currentUser?.id || ""

    let targetMother: any = null
    let targetMotherId = payload.mother_id || ""
    if (!targetMotherId && payload.pregnancy_id) {
      try {
        const preg = await db.pregnancies.get(payload.pregnancy_id)
        if (preg && preg.mother_id) {
          targetMotherId = preg.mother_id
        }
      } catch {}
    }
    if (targetMotherId) {
      try {
        targetMother = await db.mothers.get(targetMotherId)
      } catch {}
    }

    const localItem: LocalReferral = {
      id: tempId,
      referral_id: tempId,
      pregnancy_id: payload.pregnancy_id,
      mother_id: targetMotherId || undefined,
      from_facility_id: payload.from_facility_id,
      to_facility_id: payload.to_facility_id || undefined,
      external_facility_name: payload.external_facility_name || undefined,
      reason: payload.reason,
      motherName:
        payload.mother_name ||
        (targetMother
          ? `${targetMother.first_name || ""} ${targetMother.last_name || ""}`.trim()
          : undefined),
      date_referred: nowIso,
      status: "pending",
      is_completed: false,
      created_by_id: currentUserId,
      user_id: currentUserId,
      pregnancy: targetMother
        ? ({
            pregnancy_id: payload.pregnancy_id,
            mother_id: targetMotherId,
            mother: targetMother,
          } as any)
        : undefined,
      sync_status: syncEngine.isNetworkOnline() ? "synced" : "pending_create",
      updated_at: Date.now(),
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const { mother_name, mother_id, ...apiPayload } = payload
        const response = await apiClient.post(
          "/api/v1/referral/register",
          apiPayload
        )
        const created = response.data?.data || response.data

        const savedItem: LocalReferral = {
          ...localItem,
          ...created,
          id: created.referral_id || created.id || tempId,
          referral_id: created.referral_id || tempId,
          motherName:
            payload.mother_name || created.motherName || localItem.motherName,
          sync_status: "synced",
          updated_at: Date.now(),
        }

        await db.referrals.put(savedItem)
        return savedItem
      } catch (err: any) {
        if (err.response?.status >= 400 && err.response?.status < 500) {
          throw err
        }
        console.warn(
          "[referralRepository] Server error, queuing offline mutation:",
          err
        )
      }
    }

    localItem.sync_status = "pending_create"
    await db.referrals.put(localItem)

    const { mother_name, mother_id, ...apiPayload } = payload

    await syncEngine.enqueueMutation({
      entity_type: "referral",
      action: "CREATE",
      endpoint: "/api/v1/referral/register",
      method: "POST",
      payload: apiPayload,
      temp_id: tempId,
    })

    return localItem
  },

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
        const response = await apiClient.put(
          `/api/v1/referral/respond/${referralId}`,
          payload
        )
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

  async deleteReferral(referralId: string): Promise<boolean> {
    try {
      await db.referrals.delete(referralId)
      await db.referrals
        .where("referral_id")
        .equals(referralId)
        .delete()
        .catch(() => {})
    } catch (err) {
      console.warn("[referralRepository] Delete local Dexie error:", err)
    }

    await syncEngine.cancelPendingMutation(referralId)

    if (referralId.startsWith("temp-")) {
      return true
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
