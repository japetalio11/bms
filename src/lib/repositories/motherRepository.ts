import { db } from "@/lib/db/bmsDatabase"
import type { LocalMother, LocalPrenatalVisit, LocalPregnancy, LocalLabRecord, LocalSupplement } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

import { extractRiskLevel } from "@/lib/riskUtils"

export const motherRepository = {
  /**
   * Retrieves active mothers. Reads local Dexie DB immediately, then fetches from
   * backend if online to keep local storage in sync.
   */
  async getActiveMothers(facilityId?: string): Promise<LocalMother[]> {
    let localMothers: LocalMother[] = []
    let allPregnancies: LocalPregnancy[] = []
    let allVisits: LocalPrenatalVisit[] = []

    try {
      localMothers = await db.mothers.toArray()
      allPregnancies = await db.pregnancies.toArray()
      allVisits = await db.prenatalVisits.toArray()
    } catch (err) {
      console.warn("[motherRepository] Local DB query error:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const endpoint = facilityId ? `/api/v1/mother/active/${facilityId}` : "/api/v1/mother/active"
        const response = await apiClient.get(endpoint)
        const remoteList = response.data?.result || response.data?.data || (Array.isArray(response.data) ? response.data : [])

        if (Array.isArray(remoteList)) {
          const pendingItems = localMothers.filter((m) => m.sync_status !== "synced")
          const pendingTempIds = new Set(pendingItems.map((m) => m.id))

          const remotePregs: LocalPregnancy[] = []
          const remoteVisits: LocalPrenatalVisit[] = []

          const formattedRemote: LocalMother[] = remoteList
            .filter((m: any) => !pendingTempIds.has(m._id || m.id || m.mother_id))
            .map((m: any) => {
              const motherId = m.mother_id || m._id || m.id
              const firstName = m.first_name || m.user?.first_name || ""
              const lastName = m.last_name || m.user?.last_name || ""
              const middleName = m.middle_name || m.user?.middle_name || ""
              const phoneNumber = m.phone_number || m.user?.phone_number || ""
              const photoUrl = m.photo_url || m.user?.profile_url || ""
              const userId = m.user_id || m.user?.user_id

              if (Array.isArray(m.pregnancies)) {
                for (const p of m.pregnancies) {
                  const pId = p.pregnancy_id || p._id || p.id
                  remotePregs.push({
                    ...p,
                    id: pId,
                    pregnancy_id: pId,
                    mother_id: motherId,
                    sync_status: "synced",
                    updated_at: Date.now(),
                  })
                  if (Array.isArray(p.prenatalVisits)) {
                    for (const v of p.prenatalVisits) {
                      const vId = v.visit_id || v._id || v.id
                      remoteVisits.push({
                        ...v,
                        id: vId,
                        visit_id: vId,
                        pregnancy_id: pId,
                        mother_id: motherId,
                        sync_status: "synced",
                        updated_at: Date.now(),
                      })
                    }
                  }
                }
              }

              return {
                ...m,
                id: motherId,
                _id: motherId,
                mother_id: motherId,
                user_id: userId,
                first_name: firstName,
                last_name: lastName,
                middle_name: middleName,
                phone_number: phoneNumber,
                photo_url: photoUrl,
                facility_id: m.facility_id || m.user?.facility_id || facilityId,
                sync_status: "synced" as const,
                updated_at: Date.now(),
              }
            })

          // Safe reconciliation: do NOT clear whole table
          const remoteIds = new Set(formattedRemote.map((m) => m.id))
          const staleMothers = localMothers.filter((m) => m.sync_status === "synced" && !remoteIds.has(m.id))
          for (const sm of staleMothers) {
            await db.mothers.delete(sm.id).catch(() => {})
          }
          await db.mothers.bulkPut([...formattedRemote, ...pendingItems])
          if (remotePregs.length > 0) await db.pregnancies.bulkPut(remotePregs).catch(() => {})
          if (remoteVisits.length > 0) await db.prenatalVisits.bulkPut(remoteVisits).catch(() => {})

          localMothers = await db.mothers.toArray()
          allPregnancies = await db.pregnancies.toArray()
          allVisits = await db.prenatalVisits.toArray()
        }
      } catch (err) {
        console.warn("[motherRepository] Remote fetch failed, returning local Dexie mothers:", err)
      }
    }

    // Map pregnancies and visits to mothers
    const pregMap = new Map<string, LocalPregnancy[]>()
    for (const p of allPregnancies) {
      const mid = p.mother_id || p.motherId || p.targetId
      if (mid) {
        if (!pregMap.has(mid)) pregMap.set(mid, [])
        pregMap.get(mid)!.push(p)
      }
    }

    const visitMap = new Map<string, LocalPrenatalVisit[]>()
    for (const v of allVisits) {
      const mid = v.mother_id || v.motherId || v.targetId
      if (mid) {
        if (!visitMap.has(mid)) visitMap.set(mid, [])
        visitMap.get(mid)!.push(v)
      }
    }

    // Deduplication solely by canonical ID, never drop different mothers with same name
    const seen = new Set<string>()
    const deduplicated: LocalMother[] = []

    for (const mother of localMothers) {
      const motherId = mother.mother_id || mother._id || mother.id
      const userId = mother.user_id || mother.user?.user_id

      if (
        (motherId && seen.has(`mid:${motherId}`)) ||
        (userId && seen.has(`uid:${userId}`))
      ) {
        continue
      }

      if (motherId) seen.add(`mid:${motherId}`)
      if (userId) seen.add(`uid:${userId}`)

      const pregs = mother.pregnancies?.length ? mother.pregnancies : (motherId && pregMap.get(motherId)) || (userId && pregMap.get(userId)) || []
      const visits = mother.prenatalVisits?.length ? mother.prenatalVisits : (motherId && visitMap.get(motherId)) || (userId && visitMap.get(userId)) || []
      const computedRisk = extractRiskLevel(mother, pregs, visits)

      deduplicated.push({
        ...mother,
        pregnancies: pregs,
        prenatalVisits: visits,
        risk_flag: mother.risk_flag || mother.risk_level || computedRisk,
        risk_level: mother.risk_level || mother.risk_flag || computedRisk,
        risk: mother.risk || mother.risk_flag || computedRisk,
      })
    }

    let result = deduplicated
    if (facilityId) {
      result = deduplicated.filter((m) => !m.facility_id || m.facility_id === facilityId)
    }

    return result.length > 0 ? result : deduplicated
  },

  /**
   * Retrieves full composite profile (mother, pregnancies, visits, appointments, labs, supplements).
   * Reads local Dexie first, fetches /api/v1/mother/composite/:id in background, and updates Dexie atomically.
   */
  async getCompositeProfile(targetId: string): Promise<any> {
    let localMother: any = await db.mothers.get(targetId)
    if (!localMother) {
      const allM = await db.mothers.toArray()
      localMother = allM.find((m: any) => m.id === targetId || m._id === targetId || m.mother_id === targetId || m.user_id === targetId) || null
    }

    const mid = localMother?.mother_id || localMother?.id || targetId
    const uid = localMother?.user_id || localMother?.user?.user_id || targetId

    const [allPregs, allVisits, allLabs, allSupps, allAppts] = await Promise.all([
      db.pregnancies.toArray().catch(() => []),
      db.prenatalVisits.toArray().catch(() => []),
      db.labRecords.toArray().catch(() => []),
      db.supplements.toArray().catch(() => []),
      db.appointments.toArray().catch(() => []),
    ])

    const localPregs = allPregs.filter((p: any) => p.mother_id === mid || p.mother_id === uid || p.id === mid)
    const pregIds = new Set(localPregs.map((p: any) => p.pregnancy_id || p.id).filter(Boolean))
    const localVisits = allVisits.filter((v: any) => v.mother_id === mid || (v.pregnancy_id && pregIds.has(v.pregnancy_id)))
    const localLabs = allLabs.filter((l: any) => l.mother_id === mid || (l.pregnancy_id && pregIds.has(l.pregnancy_id)))
    const localSupps = allSupps.filter((s: any) => s.mother_id === mid || (s.pregnancy_id && pregIds.has(s.pregnancy_id)))
    const localAppts = allAppts.filter((a: any) => a.user_id === uid || a.mother_id === mid)

    const localComposite = localMother ? {
      ...localMother,
      mother_id: mid,
      user_id: uid,
      pregnancies: localPregs,
      prenatalVisits: localVisits,
      labRecords: localLabs,
      supplements: localSupps,
      appointments: localAppts,
    } : null

    // Background or fresh network sync if online
    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(`/api/v1/mother/composite/${targetId}`)
        const data = response.data?.result || response.data?.data || response.data
        if (data) {
          const canonicalId = data.mother_id || data.id || targetId
          const canonicalUid = data.user_id || data.user?.user_id || uid
          const photoUrl = data.photo_url || data.user?.profile_url || data.user?.photo_url || data.profile_url || ""

          const syncedMother: LocalMother = {
            ...data,
            id: canonicalId,
            _id: canonicalId,
            mother_id: canonicalId,
            user_id: canonicalUid,
            photo_url: photoUrl,
            profile_url: photoUrl,
            user: {
              ...(data.user || {}),
              ...(photoUrl ? { profile_url: photoUrl, photo_url: photoUrl } : {}),
            },
            sync_status: "synced",
            updated_at: Date.now(),
          }

          const pregs = (data.pregnancies || []).map((p: any) => ({
            ...p,
            id: p.pregnancy_id || p.id,
            pregnancy_id: p.pregnancy_id || p.id,
            mother_id: canonicalId,
            sync_status: "synced" as const,
            updated_at: Date.now(),
          }))

          const visits = (data.prenatalVisits || []).map((v: any) => ({
            ...v,
            id: v.visit_id || v.id,
            visit_id: v.visit_id || v.id,
            mother_id: canonicalId,
            sync_status: "synced" as const,
            updated_at: Date.now(),
          }))

          const labs = (data.labRecords || []).map((l: any) => ({
            ...l,
            id: l.screening_id || l.id,
            screening_id: l.screening_id || l.id,
            mother_id: canonicalId,
            sync_status: "synced" as const,
            updated_at: Date.now(),
          }))

          const supps = (data.supplements || []).map((s: any) => ({
            ...s,
            id: s.supplement_id || s.id,
            supplement_id: s.supplement_id || s.id,
            mother_id: canonicalId,
            sync_status: "synced" as const,
            updated_at: Date.now(),
          }))

          const appts = (data.appointments || []).map((a: any) => ({
            ...a,
            id: a.appointment_id || a.id,
            appointment_id: a.appointment_id || a.id,
            user_id: canonicalUid,
            mother_id: canonicalId,
            sync_status: "synced" as const,
            updated_at: Date.now(),
          }))

          // Atomic Dexie update
          await db.transaction("rw", [db.mothers, db.pregnancies, db.prenatalVisits, db.labRecords, db.supplements, db.appointments], async () => {
            await db.mothers.put(syncedMother)
            if (pregs.length > 0) await db.pregnancies.bulkPut(pregs)
            if (visits.length > 0) await db.prenatalVisits.bulkPut(visits)
            if (labs.length > 0) await db.labRecords.bulkPut(labs)
            if (supps.length > 0) await db.supplements.bulkPut(supps)
            if (appts.length > 0) await db.appointments.bulkPut(appts)
          })

          return {
            ...syncedMother,
            pregnancies: pregs,
            prenatalVisits: visits,
            labRecords: labs,
            supplements: supps,
            appointments: appts,
          }
        }
      } catch (err) {
        console.warn(`[motherRepository] Fetch composite profile ${targetId} failed, returning local:`, err)
      }
    }

    return localComposite
  },

  /**
   * Retrieves mother profile by ID. Returns composite profile with fast local first.
   */
  async getMotherProfile(targetId: string): Promise<LocalMother | null> {
    return await this.getCompositeProfile(targetId)
  },

  /**
   * Registers a new mother (offline-first).
   */
  async registerMother(payload: any): Promise<LocalMother> {
    const firstName = payload.first_name || payload.firstName || ""
    const lastName = payload.last_name || payload.lastName || ""
    const middleName = payload.middle_name || payload.middleName || ""
    const phoneNumber = payload.phone_number || payload.phoneNumber || ""
    const address = payload.address || ""

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post("/api/v1/mother/register", payload)
        const m = response.data?.mother || response.data?.result?.mother || response.data?.result || response.data
        const canonicalId = m.mother_id || m.id || m._id
        const canonicalUserId = m.user_id || m.user?.user_id

        const syncedMother: LocalMother = {
          ...m,
          id: canonicalId,
          _id: canonicalId,
          mother_id: canonicalId,
          user_id: canonicalUserId,
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName,
          phone_number: phoneNumber,
          address: address,
          facility_id: payload.facility_id || payload.facilityId || m.facility_id || "",
          user: {
            ...(m.user || {}),
            _id: canonicalUserId,
            user_id: canonicalUserId,
            first_name: firstName,
            last_name: lastName,
            middle_name: middleName,
            phone_number: phoneNumber,
            address: address,
          },
          sync_status: "synced",
          updated_at: Date.now(),
        }
        await db.mothers.put(syncedMother)
        return syncedMother
      } catch (err) {
        console.warn("[motherRepository] Online registerMother failed, falling back to offline outbox:", err)
      }
    }

    const tempId = `temp-mother-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

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

    await db.mothers.put(newMother)

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
    let local: any = await db.mothers.get(motherId)
    if (!local) {
      const all = await db.mothers.toArray()
      local = all.find((m: any) => m.id === motherId || m._id === motherId || m.mother_id === motherId || m.user_id === motherId) || null
    }

    const photoUrl = payload.photo_url || payload.profile_url || ""
    if (local) {
      const actualKey = local.id
      const updatedUser = {
        ...(local.user || {}),
        ...(photoUrl ? { profile_url: photoUrl, photo_url: photoUrl } : {}),
        ...(payload.first_name ? { first_name: payload.first_name } : {}),
        ...(payload.last_name ? { last_name: payload.last_name } : {}),
        ...(payload.address ? { address: payload.address } : {}),
        ...(payload.phone_number ? { phone_number: payload.phone_number } : {}),
      }
      await db.mothers.update(actualKey, {
        ...payload,
        ...(photoUrl ? { photo_url: photoUrl, profile_url: photoUrl } : {}),
        user: updatedUser,
        sync_status: local.sync_status === "pending_create" ? "pending_create" : "pending_update",
        updated_at: Date.now(),
      })
    }

    // Queue mutation: syncEngine automatically runs processQueue immediately if online, or stores for later if offline
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
   * Deletes a mother profile (offline-first).
   * Soft-deletes online or enqueues DELETE mutation offline; cleans up Dexie and outbox.
   */
  async deleteMother(motherId: string) {
    // 1. If temp ID, cancel any pending creation mutation
    if (motherId.startsWith("temp-")) {
      await syncEngine.cancelPendingMutation(motherId)
    }

    // 2. Clean up local IndexedDB
    try {
      await db.transaction("rw", [db.mothers, db.pregnancies, db.prenatalVisits, db.labRecords, db.supplements, db.appointments], async () => {
        await db.mothers.delete(motherId).catch(() => {})
        await db.mothers.where("mother_id").equals(motherId).delete().catch(() => {})
        await db.pregnancies.where("mother_id").equals(motherId).delete().catch(() => {})
        await db.prenatalVisits.where("mother_id").equals(motherId).delete().catch(() => {})
        await db.labRecords.where("mother_id").equals(motherId).delete().catch(() => {})
        await db.supplements.where("mother_id").equals(motherId).delete().catch(() => {})
        await db.appointments.where("mother_id").equals(motherId).delete().catch(() => {})
      })
    } catch (dbErr) {
      console.warn("[motherRepository] Local deletion error:", dbErr)
    }

    // 3. Online call or offline queue
    if (!motherId.startsWith("temp-")) {
      if (syncEngine.isNetworkOnline()) {
        try {
          await apiClient.delete(`/api/v1/mother/delete/soft/${motherId}`)
          return { success: true }
        } catch (apiErr) {
          console.warn("[motherRepository] Online deleteMother failed, queueing mutation:", apiErr)
        }
      }

      await syncEngine.enqueueMutation({
        entity_type: "mother",
        action: "DELETE",
        endpoint: `/api/v1/mother/delete/soft/${motherId}`,
        method: "DELETE",
        payload: {},
      })
    }

    return { success: true }
  },

  async deletePregnancy(pregnancyId: string) {
    if (pregnancyId.startsWith("temp-")) {
      await syncEngine.cancelPendingMutation(pregnancyId)
    }
    await db.pregnancies.delete(pregnancyId).catch(() => {})
    await db.pregnancies.where("pregnancy_id").equals(pregnancyId).delete().catch(() => {})
    await db.prenatalVisits.where("pregnancy_id").equals(pregnancyId).delete().catch(() => {})

    if (!pregnancyId.startsWith("temp-")) {
      if (syncEngine.isNetworkOnline()) {
        try {
          await apiClient.delete(`/api/v1/pregnancy/delete/${pregnancyId}`)
          return { success: true }
        } catch (err) {
          console.warn("[motherRepository] Online deletePregnancy failed, queueing:", err)
        }
      }
      await syncEngine.enqueueMutation({
        entity_type: "pregnancy",
        action: "DELETE",
        endpoint: `/api/v1/pregnancy/delete/${pregnancyId}`,
        method: "DELETE",
        payload: {},
      })
    }
    return { success: true }
  },

  async deletePrenatalVisit(visitId: string) {
    if (visitId.startsWith("temp-")) {
      await syncEngine.cancelPendingMutation(visitId)
    }
    await db.prenatalVisits.delete(visitId).catch(() => {})
    await db.prenatalVisits.where("visit_id").equals(visitId).delete().catch(() => {})

    if (!visitId.startsWith("temp-")) {
      if (syncEngine.isNetworkOnline()) {
        try {
          await apiClient.delete(`/api/v1/prenatal-visit/delete/${visitId}`)
          return { success: true }
        } catch (err) {
          console.warn("[motherRepository] Online deletePrenatalVisit failed, queueing:", err)
        }
      }
      await syncEngine.enqueueMutation({
        entity_type: "prenatal_visit",
        action: "DELETE",
        endpoint: `/api/v1/prenatal-visit/delete/${visitId}`,
        method: "DELETE",
        payload: {},
      })
    }
    return { success: true }
  },

  async deleteLabRecord(screeningId: string) {
    if (screeningId.startsWith("temp-")) {
      await syncEngine.cancelPendingMutation(screeningId)
    }
    await db.labRecords.delete(screeningId).catch(() => {})
    await db.labRecords.where("screening_id").equals(screeningId).delete().catch(() => {})

    if (!screeningId.startsWith("temp-")) {
      if (syncEngine.isNetworkOnline()) {
        try {
          await apiClient.delete(`/api/v1/lab-screening/delete/${screeningId}`)
          return { success: true }
        } catch (err) {
          console.warn("[motherRepository] Online deleteLabRecord failed, queueing:", err)
        }
      }
      await syncEngine.enqueueMutation({
        entity_type: "lab_record",
        action: "DELETE",
        endpoint: `/api/v1/lab-screening/delete/${screeningId}`,
        method: "DELETE",
        payload: {},
      })
    }
    return { success: true }
  },

  async deleteSupplement(supplementId: string) {
    if (supplementId.startsWith("temp-")) {
      await syncEngine.cancelPendingMutation(supplementId)
    }
    await db.supplements.delete(supplementId).catch(() => {})
    await db.supplements.where("supplement_id").equals(supplementId).delete().catch(() => {})

    if (!supplementId.startsWith("temp-")) {
      if (syncEngine.isNetworkOnline()) {
        try {
          await apiClient.delete(`/api/v1/supplement/delete/${supplementId}`)
          return { success: true }
        } catch (err) {
          console.warn("[motherRepository] Online deleteSupplement failed, queueing:", err)
        }
      }
      await syncEngine.enqueueMutation({
        entity_type: "supplement",
        action: "DELETE",
        endpoint: `/api/v1/supplement/delete/${supplementId}`,
        method: "DELETE",
        payload: {},
      })
    }
    return { success: true }
  },

  /**
   * Registers a prenatal visit log (offline-first).
   */
  async registerPrenatalVisit(payload: any): Promise<LocalPrenatalVisit> {
    let motherId = payload.mother_id || payload.motherId || payload.targetId || ""
    let pregnancyId = payload.pregnancy_id || payload.pregnancyId || ""

    if (pregnancyId && pregnancyId.startsWith("temp-")) {
      try {
        const allPregs = await db.pregnancies.toArray()
        const matched = allPregs.find((p) => p.id === pregnancyId || p.temp_id === pregnancyId || (motherId && (p.mother_id === motherId || p.motherId === motherId)))
        if (matched && matched.pregnancy_id && !matched.pregnancy_id.startsWith("temp-")) {
          pregnancyId = matched.pregnancy_id
          payload.pregnancy_id = matched.pregnancy_id
        }
      } catch (e) {}
    }

    if (!motherId && pregnancyId) {
      try {
        const preg = await db.pregnancies.get(pregnancyId)
        if (preg) {
          motherId = preg.mother_id || preg.motherId || preg.targetId || ""
        }
      } catch (err) {
        console.warn("[motherRepository] Failed to resolve motherId from pregnancy:", err)
      }
    }

    if (motherId && motherId.startsWith("temp-")) {
      try {
        const allMothers = await db.mothers.toArray()
        const matched = allMothers.find((m) => m.id === motherId || m.temp_id === motherId || m._id === motherId)
        if (matched && matched.mother_id && !matched.mother_id.startsWith("temp-")) {
          motherId = matched.mother_id
          payload.mother_id = matched.mother_id
        }
      } catch (e) {}
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post("/api/v1/prenatal-visit/register", payload)
        const v = response.data?.prenatalVisit || response.data?.result || response.data
        const canonicalId = v.visit_id || v._id || v.id

        const syncedVisit: LocalPrenatalVisit = {
          ...payload,
          ...v,
          id: canonicalId,
          visit_id: canonicalId,
          mother_id: motherId || v.mother_id,
          visit_date: payload.visit_date || v.visit_date || new Date().toISOString(),
          sync_status: "synced",
          updated_at: Date.now(),
        }
        await db.prenatalVisits.put(syncedVisit)

        if (payload.risk_level_assessed) {
          try {
            if (payload.pregnancy_id) {
              await db.pregnancies.update(payload.pregnancy_id, { risk_flag: payload.risk_level_assessed, risk_level: payload.risk_level_assessed })
            }
            if (motherId) {
              await db.mothers.update(motherId, { risk_flag: payload.risk_level_assessed, risk_level: payload.risk_level_assessed, risk: payload.risk_level_assessed })
            }
          } catch (err) {
            console.warn("[motherRepository] Failed to sync risk flag to pregnancy/mother:", err)
          }
        }

        return syncedVisit
      } catch (err) {
        console.warn("[motherRepository] Online registerPrenatalVisit failed, falling back to offline outbox:", err)
      }
    }

    const tempId = `temp-visit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const newVisit: LocalPrenatalVisit = {
      ...payload,
      id: tempId,
      visit_id: tempId,
      mother_id: motherId,
      visit_date: payload.visit_date || new Date().toISOString(),
      sync_status: "pending_create",
      updated_at: Date.now(),
    }

    await db.prenatalVisits.put(newVisit)

    if (payload.risk_level_assessed) {
      try {
        if (payload.pregnancy_id) {
          await db.pregnancies.update(payload.pregnancy_id, { risk_flag: payload.risk_level_assessed, risk_level: payload.risk_level_assessed })
        }
        if (motherId) {
          await db.mothers.update(motherId, { risk_flag: payload.risk_level_assessed, risk_level: payload.risk_level_assessed, risk: payload.risk_level_assessed })
        }
      } catch (err) {
        console.warn("[motherRepository] Failed to sync risk flag to pregnancy/mother:", err)
      }
    }

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
    let localVisits: LocalPrenatalVisit[] = []
    try {
      const allVisits = await db.prenatalVisits.toArray()
      const allPreg = await db.pregnancies.toArray()

      // Backfill missing mother_id on any orphaned visits in IndexedDB
      const pregMap = new Map(allPreg.map((p) => [p.pregnancy_id || p.id || p._id, p.mother_id || p.motherId || p.targetId]))
      for (const v of allVisits) {
        if (!v.mother_id && v.pregnancy_id && pregMap.has(v.pregnancy_id)) {
          const parentMid = pregMap.get(v.pregnancy_id)
          if (parentMid && v.id) {
            v.mother_id = parentMid
            await db.prenatalVisits.update(v.id, { mother_id: parentMid })
          }
        }
      }

      const motherPregIds = new Set(
        allPreg
          .filter((p) => {
            const pMid = p.mother_id || p.motherId || p.targetId
            return pMid === motherId || (pMid && motherId && (pMid.includes(motherId) || motherId.includes(pMid)))
          })
          .map((p) => p.pregnancy_id || p.id || p._id)
          .filter(Boolean)
      )

      localVisits = allVisits.filter((v) => {
        const vMid = v.mother_id || v.motherId || v.targetId
        const vPid = v.pregnancy_id || v.pregnancyId
        const matchesMother = Boolean(vMid === motherId || (vMid && motherId && (vMid.includes(motherId) || motherId.includes(vMid))))
        const matchesPregnancy = Boolean(vPid && motherPregIds.has(vPid))
        return matchesMother || matchesPregnancy
      })
    } catch (err) {
      console.warn("[motherRepository] Local visits query failed:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(`/api/v1/prenatal-visit/mother/${motherId}`)
        const remoteList = response.data?.result || response.data?.data || (Array.isArray(response.data) ? response.data : [])
        if (Array.isArray(remoteList)) {
          const pendingVisits = localVisits.filter((v) => v.sync_status !== "synced")
          const pendingIds = new Set(pendingVisits.map((v) => v.id))

          const formattedRemote: LocalPrenatalVisit[] = remoteList
            .filter((v: any) => !pendingIds.has(v.visit_id || v._id || v.id))
            .map((v: any) => ({
              ...v,
              id: v.visit_id || v._id || v.id,
              mother_id: motherId,
              sync_status: "synced" as const,
              updated_at: Date.now(),
            }))

          const pendingQueue = await syncEngine.getQueue()
          const pendingTempIds = new Set(pendingQueue.map((m) => m.temp_id).filter(Boolean))

          const remoteIds = new Set(formattedRemote.map((v) => v.id))
          const remoteVisitIds = new Set(remoteList.map((v: any) => v.visit_id || v._id || v.id).filter(Boolean))

          const toDelete = localVisits.filter((v) => {
            const isPendingInOutbox = (v.id && pendingTempIds.has(v.id)) || (v.visit_id && pendingTempIds.has(v.visit_id))
            if (isPendingInOutbox) return false
            return !remoteIds.has(v.id) && (!v.visit_id || !remoteVisitIds.has(v.visit_id))
          })

          for (const item of toDelete) {
            if (item.id) await db.prenatalVisits.delete(item.id).catch(() => {})
            if (item.visit_id) await db.prenatalVisits.where("visit_id").equals(item.visit_id).delete().catch(() => {})
          }

          if (formattedRemote.length > 0 || pendingVisits.length > 0) {
            await db.prenatalVisits.bulkPut([...formattedRemote, ...pendingVisits])
          }
        }
      } catch (err) {
        console.warn(`[motherRepository] Fetch prenatal visits for ${motherId} failed, returning Dexie data:`, err)
      }
    }

    const finalAllVisits = await db.prenatalVisits.toArray()
    const finalAllPreg = await db.pregnancies.toArray()
    const finalMotherPregIds = new Set(
      finalAllPreg
        .filter((p) => {
          const pMid = p.mother_id || p.motherId || p.targetId
          return pMid === motherId || (pMid && motherId && (pMid.includes(motherId) || motherId.includes(pMid)))
        })
        .map((p) => p.pregnancy_id || p.id || p._id)
        .filter(Boolean)
    )

    return finalAllVisits.filter((v) => {
      const vMid = v.mother_id || v.motherId || v.targetId
      const vPid = v.pregnancy_id || v.pregnancyId
      const matchesMother = Boolean(vMid === motherId || (vMid && motherId && (vMid.includes(motherId) || motherId.includes(vMid))))
      const matchesPregnancy = Boolean(vPid && finalMotherPregIds.has(vPid))
      return matchesMother || matchesPregnancy
    })
  },

  /**
   * Registers lab record (offline-first).
   */
  async registerLabRecord(payload: any): Promise<LocalLabRecord> {
    let motherId = payload.mother_id || payload.motherId || payload.targetId || ""
    let pregnancyId = payload.pregnancy_id || payload.pregnancyId || ""

    if (pregnancyId && pregnancyId.startsWith("temp-")) {
      try {
        const allPregs = await db.pregnancies.toArray()
        const matched = allPregs.find((p) => p.id === pregnancyId || p.temp_id === pregnancyId || (motherId && (p.mother_id === motherId || p.motherId === motherId)))
        if (matched && matched.pregnancy_id && !matched.pregnancy_id.startsWith("temp-")) {
          pregnancyId = matched.pregnancy_id
          payload.pregnancy_id = matched.pregnancy_id
        }
      } catch (e) {}
    }

    if (!motherId && pregnancyId) {
      try {
        const preg = await db.pregnancies.get(pregnancyId)
        if (preg) motherId = preg.mother_id || preg.motherId || ""
      } catch {
        // ignore
      }
    }

    if (motherId && motherId.startsWith("temp-")) {
      try {
        const allMothers = await db.mothers.toArray()
        const matched = allMothers.find((m) => m.id === motherId || m.temp_id === motherId || m._id === motherId)
        if (matched && matched.mother_id && !matched.mother_id.startsWith("temp-")) {
          motherId = matched.mother_id
          payload.mother_id = matched.mother_id
        }
      } catch (e) {}
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post("/api/v1/lab-screening/register", payload)
        const l = response.data?.result || response.data?.data || response.data
        const canonicalId = l.screening_id || l._id || l.id

        const syncedLab: LocalLabRecord = {
          ...payload,
          ...l,
          id: canonicalId,
          screening_id: canonicalId,
          mother_id: motherId,
          sync_status: "synced",
          updated_at: Date.now(),
        }
        await db.labRecords.put(syncedLab)
        return syncedLab
      } catch (err) {
        console.warn("[motherRepository] Online registerLabRecord failed, falling back to offline outbox:", err)
      }
    }

    const tempId = `temp-lab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const newLab: LocalLabRecord = {
      ...payload,
      id: tempId,
      mother_id: motherId,
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
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB limit
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of 10 MB.`)
    }

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

      const remoteUrl = res.data?.file_url || res.data?.fileUrl || res.data?.url || res.data?.result || ""
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
    let motherId = payload.motherId || payload.mother_id || payload.targetId || ""

    if (motherId && motherId.startsWith("temp-")) {
      try {
        const allMothers = await db.mothers.toArray()
        const matched = allMothers.find((m) => m.id === motherId || m.temp_id === motherId || m._id === motherId)
        if (matched && matched.mother_id && !matched.mother_id.startsWith("temp-")) {
          motherId = matched.mother_id
          payload.motherId = matched.mother_id
          payload.mother_id = matched.mother_id
        }
      } catch (e) {}
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post("/api/v1/pregnancy/register", payload)
        const p = response.data?.pregnancy || response.data?.result || response.data
        const canonicalId = p.pregnancy_id || p._id || p.id

        const syncedPreg: LocalPregnancy = {
          ...payload,
          ...p,
          id: canonicalId,
          pregnancy_id: canonicalId,
          mother_id: motherId,
          pregnancy_status: payload.pregnancy_status || p.pregnancy_status || "Active",
          sync_status: "synced",
          updated_at: Date.now(),
        }
        await db.pregnancies.put(syncedPreg)
        return syncedPreg
      } catch (err) {
        console.warn("[motherRepository] Online registerPregnancy failed, falling back to offline outbox:", err)
      }
    }

    const tempId = `temp-preg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

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
    let local: LocalPregnancy[] = []
    try {
      const allPreg = await db.pregnancies.toArray()
      local = allPreg.filter((p) => {
        const pMid = p.mother_id || p.motherId || p.targetId
        return pMid === motherId || pMid.includes(motherId) || motherId.includes(pMid)
      })
    } catch (err) {
      console.warn("[motherRepository] Local pregnancies query failed:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(`/api/v1/pregnancy/mother/${motherId}`)
        const remoteList = response.data?.result || response.data?.data || (Array.isArray(response.data) ? response.data : [])
        if (Array.isArray(remoteList)) {
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

          const remoteIds = new Set(formattedRemote.map((p) => p.id))
          const toDelete = local.filter((p) => p.sync_status === "synced" && !remoteIds.has(p.id))
          for (const item of toDelete) {
            await db.pregnancies.delete(item.id)
            if (item.pregnancy_id) await db.pregnancies.where("pregnancy_id").equals(item.pregnancy_id).delete()
          }

          if (formattedRemote.length > 0 || pending.length > 0) {
            await db.pregnancies.bulkPut([...formattedRemote, ...pending])
          }
          const allUpdated = await db.pregnancies.toArray()
          return allUpdated.filter((p) => {
            const pMid = p.mother_id || p.motherId || p.targetId
            return pMid === motherId || pMid.includes(motherId) || motherId.includes(pMid)
          })
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
    let local: LocalLabRecord[] = []
    try {
      const allLabs = await db.labRecords.toArray()
      local = allLabs.filter((l) => {
        const lMid = l.mother_id || l.motherId || l.targetId
        return lMid === motherId || lMid.includes(motherId) || motherId.includes(lMid)
      })
    } catch (err) {
      console.warn("[motherRepository] Local lab records query failed:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.get(`/api/v1/lab-screening/get/mother/${motherId}`)
        const remoteList = response.data?.result || response.data?.data || (Array.isArray(response.data) ? response.data : [])
        if (Array.isArray(remoteList)) {
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

          const remoteIds = new Set(formattedRemote.map((l) => l.id))
          const toDelete = local.filter((l) => l.sync_status === "synced" && !remoteIds.has(l.id))
          for (const item of toDelete) {
            await db.labRecords.delete(item.id)
            if (item.screening_id) await db.labRecords.where("screening_id").equals(item.screening_id).delete()
          }

          if (formattedRemote.length > 0 || pending.length > 0) {
            await db.labRecords.bulkPut([...formattedRemote, ...pending])
          }
          const allUpdated = await db.labRecords.toArray()
          return allUpdated.filter((l) => {
            const lMid = l.mother_id || l.motherId || l.targetId
            return lMid === motherId || lMid.includes(motherId) || motherId.includes(lMid)
          })
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
    let motherId = payload.motherId || payload.mother_id || payload.targetId || ""
    let pregnancyId = payload.pregnancy_id || payload.pregnancyId || ""

    if (pregnancyId && pregnancyId.startsWith("temp-")) {
      try {
        const allPregs = await db.pregnancies.toArray()
        const matched = allPregs.find((p) => p.id === pregnancyId || p.temp_id === pregnancyId || (motherId && (p.mother_id === motherId || p.motherId === motherId)))
        if (matched && matched.pregnancy_id && !matched.pregnancy_id.startsWith("temp-")) {
          pregnancyId = matched.pregnancy_id
          payload.pregnancy_id = matched.pregnancy_id
        }
      } catch (e) {}
    }

    if (!motherId && pregnancyId) {
      try {
        const preg = await db.pregnancies.get(pregnancyId)
        if (preg) motherId = preg.mother_id || preg.motherId || ""
      } catch {
        // ignore
      }
    }

    if (motherId && motherId.startsWith("temp-")) {
      try {
        const allMothers = await db.mothers.toArray()
        const matched = allMothers.find((m) => m.id === motherId || m.temp_id === motherId || m._id === motherId)
        if (matched && matched.mother_id && !matched.mother_id.startsWith("temp-")) {
          motherId = matched.mother_id
          payload.mother_id = matched.mother_id
          payload.motherId = matched.mother_id
        }
      } catch (e) {}
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const response = await apiClient.post("/api/v1/supplement/register", payload)
        const s = response.data?.result || response.data?.supplement_record || response.data
        const canonicalId = s.supplement_id || s._id || s.id

        const syncedSupp: LocalSupplement = {
          ...payload,
          ...s,
          id: canonicalId,
          supplement_id: canonicalId,
          mother_id: motherId,
          sync_status: "synced",
          updated_at: Date.now(),
        }
        await db.supplements.put(syncedSupp)
        return syncedSupp
      } catch (err) {
        console.warn("[motherRepository] Online registerSupplement failed, falling back to offline outbox:", err)
      }
    }

    const tempId = `temp-supp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

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
        if (Array.isArray(remoteList)) {
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

          const remoteIds = new Set(formattedRemote.map((s) => s.id))
          const toDelete = local.filter((s) => s.sync_status === "synced" && !remoteIds.has(s.id))
          for (const item of toDelete) {
            await db.supplements.delete(item.id)
            if (item.supplement_id) await db.supplements.where("supplement_id").equals(item.supplement_id).delete()
          }

          if (formattedRemote.length > 0 || pending.length > 0) {
            await db.supplements.bulkPut([...formattedRemote, ...pending])
          }
          return await db.supplements.where("mother_id").equals(motherId).toArray()
        }
      } catch (err) {
        console.warn(`[motherRepository] Fetch supplements for ${motherId} failed:`, err)
      }
    }

    return local
  },

  async assignFacility(motherCode: string): Promise<any> {
    if (syncEngine.isNetworkOnline()) {
      const response = await apiClient.post("/api/v1/mother/assign-facility", { mother_code: motherCode })
      if (response.data?.mother) {
        const m = response.data.mother
        const motherId = m.mother_id || m.id
        await db.mothers.put({
          ...m,
          id: motherId,
          _id: motherId,
          mother_id: motherId,
          user_id: m.user_id || m.user?.user_id,
          sync_status: "synced",
          updated_at: Date.now(),
        })
      }
      return response.data
    } else {
      throw new Error("Connecting a mother via code requires an active network connection.")
    }
  },
}
