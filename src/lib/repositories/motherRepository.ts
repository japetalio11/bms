import { db } from "@/lib/db/bmsDatabase"
import type { LocalMother, LocalPrenatalVisit, LocalPregnancy, LocalLabRecord, LocalSupplement } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

export const motherRepository = {
  /**
   * Retrieves active mothers. Reads local Dexie DB immediately, then fetches from
   * backend if online to keep local storage in sync.
   */
  async getActiveMothers(facilityId?: string): Promise<LocalMother[]> {
    let localMothers: LocalMother[] = []
    try {
      if (facilityId) {
        localMothers = await db.mothers.where("facility_id").equals(facilityId).toArray()
      } else {
        localMothers = await db.mothers.toArray()
      }
    } catch (err) {
      console.warn("[motherRepository] Local DB query error:", err)
    }

    // Non-blocking background sync if online
    if (syncEngine.isNetworkOnline()) {
      (async () => {
        try {
          const endpoint = facilityId ? `/api/v1/mother/active/${facilityId}` : "/api/v1/mother/active"
          const response = await apiClient.get(endpoint)
          const remoteList = response.data?.result || response.data?.data || []

          if (Array.isArray(remoteList) && remoteList.length > 0) {
            const pendingItems = localMothers.filter((m) => m.sync_status !== "synced")
            const pendingIds = new Set(pendingItems.map((m) => m.id))

            const formattedRemote: LocalMother[] = remoteList
              .filter((m: any) => !pendingIds.has(m._id || m.id))
              .map((m: any) => ({
                ...m,
                id: m._id || m.id,
                _id: m._id || m.id,
                sync_status: "synced" as const,
                updated_at: Date.now(),
              }))

            await db.mothers.bulkPut([...formattedRemote, ...pendingItems])
          }
        } catch (err) {
          console.warn("[motherRepository] Background fetch failed:", err)
        }
      })()
    }

    return localMothers
  },

  /**
   * Retrieves mother profile by ID. Returns local Dexie record instantly.
   */
  async getMotherProfile(targetId: string): Promise<LocalMother | null> {
    let local = await db.mothers.get(targetId)
    if (!local) {
      try {
        const allMothers = await db.mothers.toArray()
        local = allMothers.find((m) => m.id === targetId || m._id === targetId || m.mother_id === targetId || m.user_id === targetId)
      } catch (err) {
        console.warn("[motherRepository] Failed to search local Dexie mothers:", err)
      }
    }

    if (syncEngine.isNetworkOnline()) {
      (async () => {
        try {
          const response = await apiClient.get(`/api/v1/mother/get/${targetId}`)
          const remote = response.data?.result || response.data?.data
          if (remote) {
            const canonicalId = remote._id || remote.id || targetId
            const updatedRecord: LocalMother = {
              ...remote,
              id: canonicalId,
              _id: canonicalId,
              sync_status: "synced" as const,
              updated_at: Date.now(),
            }
            await db.mothers.put(updatedRecord)
          }
        } catch (err) {
          console.warn(`[motherRepository] Background profile fetch ${targetId} failed:`, err)
        }
      })()
    }

    return local || null
  },

  /**
   * Registers a new mother (offline-first).
   */
  async registerMother(payload: any): Promise<LocalMother> {
    const tempId = `temp-mother-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const firstName = payload.first_name || payload.firstName || ""
    const lastName = payload.last_name || payload.lastName || ""
    const middleName = payload.middle_name || payload.middleName || ""
    const phoneNumber = payload.phone_number || payload.phoneNumber || ""
    const address = payload.address || ""

    const newMother: LocalMother = {
      ...payload,
      id: tempId,
      _id: tempId,
      mother_id: tempId,
      user_id: tempId,
      first_name: firstName,
      last_name: lastName,
      middle_name: middleName,
      phone_number: phoneNumber,
      address: address,
      facility_id: payload.facility_id || payload.facilityId || "",
      user: {
        _id: tempId,
        user_id: tempId,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        phone_number: phoneNumber,
        address: address,
      },
      sync_status: "pending_create",
      updated_at: Date.now(),
    }

    // Save to Dexie DB immediately
    await db.mothers.put(newMother)

    // Enqueue mutation
    await syncEngine.enqueueMutation({
      entity_type: "mother",
      action: "CREATE",
      endpoint: "/api/v1/mother/register",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return newMother
  },

  /**
   * Updates an existing mother record (offline-first).
   */
  async updateMother(motherId: string, payload: any) {
    const local = await db.mothers.get(motherId)
    if (local) {
      const updatedUser = {
        ...(local.user || {}),
        ...(payload.profile_url ? { profile_url: payload.profile_url } : {}),
        ...(payload.photo_url ? { photo_url: payload.photo_url } : {}),
        ...(payload.first_name ? { first_name: payload.first_name } : {}),
        ...(payload.last_name ? { last_name: payload.last_name } : {}),
        ...(payload.address ? { address: payload.address } : {}),
        ...(payload.phone_number ? { phone_number: payload.phone_number } : {}),
      }
      await db.mothers.update(motherId, {
        ...payload,
        user: updatedUser,
        sync_status: local.sync_status === "pending_create" ? "pending_create" : "pending_update",
        updated_at: Date.now(),
      })
    }

    await syncEngine.enqueueMutation({
      entity_type: "mother",
      action: "UPDATE",
      endpoint: `/api/v1/mother/update/${motherId}`,
      method: "PUT",
      payload,
      temp_id: motherId.startsWith("temp-") ? motherId : undefined,
    })

    return { success: true }
  },

  /**
   * Registers a prenatal visit log (offline-first).
   */
  async registerPrenatalVisit(payload: any): Promise<LocalPrenatalVisit> {
    const tempId = `temp-visit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const newVisit: LocalPrenatalVisit = {
      ...payload,
      id: tempId,
      mother_id: payload.mother_id || payload.motherId,
      visit_date: payload.visit_date || new Date().toISOString(),
      sync_status: "pending_create",
      updated_at: Date.now(),
    }

    await db.prenatalVisits.put(newVisit)

    await syncEngine.enqueueMutation({
      entity_type: "prenatal_visit",
      action: "CREATE",
      endpoint: "/api/v1/prenatal-visit/register",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return newVisit
  },

  /**
   * Retrieves prenatal visits for a mother.
   */
  async getPrenatalVisits(motherId: string): Promise<LocalPrenatalVisit[]> {
    const localVisits = await db.prenatalVisits.where("mother_id").equals(motherId).toArray()

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(`/api/v1/prenatal-visit/mother/${motherId}`)
        const remoteList = response.data?.result || response.data?.data || []
        if (Array.isArray(remoteList) && remoteList.length > 0) {
          const pendingVisits = localVisits.filter((v) => v.sync_status !== "synced")
          const pendingIds = new Set(pendingVisits.map((v) => v.id))

          const formattedRemote: LocalPrenatalVisit[] = remoteList
            .filter((v: any) => !pendingIds.has(v._id || v.id))
            .map((v: any) => ({
              ...v,
              id: v._id || v.id,
              mother_id: motherId,
              sync_status: "synced" as const,
              updated_at: Date.now(),
            }))

          await db.prenatalVisits.bulkPut([...formattedRemote, ...pendingVisits])
          return await db.prenatalVisits.where("mother_id").equals(motherId).toArray()
        }
      } catch (err) {
        console.warn(`[motherRepository] Fetch prenatal visits for ${motherId} failed, returning Dexie data:`, err)
      }
    }

    return localVisits
  },

  /**
   * Registers lab record (offline-first).
   */
  async registerLabRecord(payload: any): Promise<LocalLabRecord> {
    const tempId = `temp-lab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const newLab: LocalLabRecord = {
      ...payload,
      id: tempId,
      mother_id: payload.mother_id || payload.motherId,
      sync_status: "pending_create",
      updated_at: Date.now(),
    }

    await db.labRecords.put(newLab)

    await syncEngine.enqueueMutation({
      entity_type: "lab_record",
      action: "CREATE",
      endpoint: "/api/v1/lab-screening/register",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return newLab
  },

  /**
   * Uploads file/image (lab screening file or photo avatar) supporting offline storage.
   */
  async uploadFile(file: File): Promise<{ url: string; blobId?: string }> {
    const tempBlobId = `blob-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    // Save Blob in Dexie DB
    await db.blobs.put({
      id: tempBlobId,
      data: file,
      filename: file.name,
      mime_type: file.type,
    })

    if (!syncEngine.isNetworkOnline()) {
      const base64Url = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      return { url: base64Url, blobId: tempBlobId }
    }

    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await apiClient.post("/api/v1/lab-screening/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      const remoteUrl = res.data?.url || res.data?.fileUrl || res.data?.result
      await db.blobs.delete(tempBlobId)
      return { url: remoteUrl }
    } catch (err) {
      console.warn("[motherRepository] File upload failed online, saved blob locally for sync:", err)
      const base64Url = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      return { url: base64Url, blobId: tempBlobId }
    }
  },

  /**
   * Registers a new pregnancy (offline-first).
   */
  async registerPregnancy(payload: any): Promise<LocalPregnancy> {
    const tempId = `temp-preg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const motherId = payload.motherId || payload.mother_id || payload.targetId || ""

    const newPregnancy: LocalPregnancy = {
      ...payload,
      id: tempId,
      pregnancy_id: tempId,
      mother_id: motherId,
      pregnancy_status: payload.pregnancy_status || "Active",
      sync_status: "pending_create",
      updated_at: Date.now(),
    }

    await db.pregnancies.put(newPregnancy)

    await syncEngine.enqueueMutation({
      entity_type: "pregnancy",
      action: "CREATE",
      endpoint: "/api/v1/pregnancy/register",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return newPregnancy
  },

  /**
   * Retrieves pregnancies for a mother.
   */
  async getPregnancies(motherId: string): Promise<LocalPregnancy[]> {
    let local = await db.pregnancies.where("mother_id").equals(motherId).toArray()

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(`/api/v1/pregnancy/mother/${motherId}`)
        const remoteList = response.data?.result || response.data?.data || []
        if (Array.isArray(remoteList) && remoteList.length > 0) {
          const pending = local.filter((p) => p.sync_status !== "synced")
          const pendingIds = new Set(pending.map((p) => p.id))

          const formattedRemote: LocalPregnancy[] = remoteList
            .filter((p: any) => !pendingIds.has(p.pregnancy_id || p._id || p.id))
            .map((p: any) => ({
              ...p,
              id: p.pregnancy_id || p._id || p.id,
              mother_id: motherId,
              sync_status: "synced" as const,
              updated_at: Date.now(),
            }))

          await db.pregnancies.bulkPut([...formattedRemote, ...pending])
          return await db.pregnancies.where("mother_id").equals(motherId).toArray()
        }
      } catch (err) {
        console.warn(`[motherRepository] Fetch pregnancies for ${motherId} failed:`, err)
      }
    }

    return local
  },

  /**
   * Retrieves lab records for a mother.
   */
  async getLabRecords(motherId: string): Promise<LocalLabRecord[]> {
    let local = await db.labRecords.where("mother_id").equals(motherId).toArray()

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(`/api/v1/lab-screening/get/mother/${motherId}`)
        const remoteList = response.data?.result || response.data?.data || []
        if (Array.isArray(remoteList) && remoteList.length > 0) {
          const pending = local.filter((l) => l.sync_status !== "synced")
          const pendingIds = new Set(pending.map((l) => l.id))

          const formattedRemote: LocalLabRecord[] = remoteList
            .filter((l: any) => !pendingIds.has(l._id || l.id))
            .map((l: any) => ({
              ...l,
              id: l._id || l.id,
              mother_id: motherId,
              sync_status: "synced" as const,
              updated_at: Date.now(),
            }))

          await db.labRecords.bulkPut([...formattedRemote, ...pending])
          return await db.labRecords.where("mother_id").equals(motherId).toArray()
        }
      } catch (err) {
        console.warn(`[motherRepository] Fetch lab records for ${motherId} failed:`, err)
      }
    }

    return local
  },

  /**
   * Registers a supplement record (offline-first).
   */
  async registerSupplement(payload: any): Promise<LocalSupplement> {
    const tempId = `temp-supp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const motherId = payload.motherId || payload.mother_id || payload.targetId || ""

    const newSupplement: LocalSupplement = {
      ...payload,
      id: tempId,
      supplement_id: tempId,
      mother_id: motherId,
      sync_status: "pending_create",
      updated_at: Date.now(),
    }

    await db.supplements.put(newSupplement)

    await syncEngine.enqueueMutation({
      entity_type: "supplement",
      action: "CREATE",
      endpoint: "/api/v1/supplement/register",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return newSupplement
  },

  /**
   * Retrieves supplement records for a mother.
   */
  async getSupplements(motherId: string): Promise<LocalSupplement[]> {
    let local = await db.supplements.where("mother_id").equals(motherId).toArray()

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(`/api/v1/supplement/get/mother/${motherId}`)
        const remoteList = response.data?.result || response.data?.data || []
        if (Array.isArray(remoteList) && remoteList.length > 0) {
          const pending = local.filter((s) => s.sync_status !== "synced")
          const pendingIds = new Set(pending.map((s) => s.id))

          const formattedRemote: LocalSupplement[] = remoteList
            .filter((s: any) => !pendingIds.has(s._id || s.id))
            .map((s: any) => ({
              ...s,
              id: s._id || s.id,
              mother_id: motherId,
              sync_status: "synced" as const,
              updated_at: Date.now(),
            }))

          await db.supplements.bulkPut([...formattedRemote, ...pending])
          return await db.supplements.where("mother_id").equals(motherId).toArray()
        }
      } catch (err) {
        console.warn(`[motherRepository] Fetch supplements for ${motherId} failed:`, err)
      }
    }

    return local
  },
}
