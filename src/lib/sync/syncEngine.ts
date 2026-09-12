import { db } from "@/lib/db/bmsDatabase"
import type { OfflineQueueItem } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { settingsStore } from "@/lib/settingsStore"

type SyncListener = (status: { isSyncing: boolean; pendingCount: number; lastSyncedAt: number | null; error: string | null }) => void

class SyncEngine {
  private isSyncing = false
  private listeners: Set<SyncListener> = new Set()
  private lastSyncedAt: number | null = null
  private lastError: string | null = null
  private isOnlineState: boolean = typeof navigator !== "undefined" ? navigator.onLine : true

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        console.log("[SyncEngine] Window online event received.")
        this.setNetworkOnline(true)
      })
      window.addEventListener("offline", () => {
        console.log("[SyncEngine] Window offline event received.")
        this.setNetworkOnline(false)
      })

      // Pre-flight network ping on startup (3000ms timeout)
      if (!navigator.onLine) {
        this.isOnlineState = false
      } else {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"
        fetch(`${baseUrl}/health`, { method: "GET", signal: controller.signal })
          .then((res) => {
            clearTimeout(timeoutId)
            this.setNetworkOnline(res.ok)
          })
          .catch(() => {
            clearTimeout(timeoutId)
            console.log("[SyncEngine] Pre-flight ping failed, falling back to navigator.onLine status.")
            this.setNetworkOnline(navigator.onLine)
          })
      }
    }
  }

  public setNetworkOnline(online: boolean) {
    if (this.isOnlineState !== online) {
      console.log(`[SyncEngine] Network state changed: ${this.isOnlineState} -> ${online}`)
      this.isOnlineState = online
      this.notify()
      if (online) {
        const settings = settingsStore.getSettings()
        if (settings.autoSyncOnReconnect) {
          this.processQueue()
        } else {
          console.log("[SyncEngine] Auto-sync on reconnect is disabled in settings.")
        }
      }
    }
  }

  public subscribe(listener: SyncListener) {
    this.listeners.add(listener)
    this.notify()
    return () => {
      this.listeners.delete(listener)
    }
  }

  private async notify() {
    const pendingCount = await db.offlineQueue.count()
    const status = {
      isOnline: this.isOnlineState,
      isSyncing: this.isSyncing,
      pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      error: this.lastError,
    }
    this.listeners.forEach((listener) => listener(status as any))
  }

  public async getPendingCount(): Promise<number> {
    return await db.offlineQueue.count()
  }

  public isNetworkOnline(): boolean {
    return this.isOnlineState
  }

  /**
   * Enqueues an offline mutation to be processed when online.
   */
  public async enqueueMutation(params: {
    entity_type: OfflineQueueItem["entity_type"]
    action: OfflineQueueItem["action"]
    endpoint: string
    method: OfflineQueueItem["method"]
    payload: any
    temp_id?: string
    blob_ids?: string[]
  }) {
    const client_mutation_id = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    await db.offlineQueue.add({
      client_mutation_id,
      entity_type: params.entity_type,
      action: params.action,
      endpoint: params.endpoint,
      method: params.method,
      payload: params.payload,
      temp_id: params.temp_id,
      blob_ids: params.blob_ids,
      retry_count: 0,
      created_at: Date.now(),
    })

    console.log(`[SyncEngine] Enqueued ${params.action} for ${params.entity_type} (${params.temp_id || params.endpoint})`)
    this.notify()

    // If currently online, process immediately
    if (this.isNetworkOnline()) {
      this.processQueue()
    }
  }

  /**
   * Processes all pending offline mutations in FIFO order.
   */
  public async processQueue() {
    if (this.isSyncing) return
    if (!this.isNetworkOnline()) {
      console.log("[SyncEngine] Network offline. Skipping queue processing.")
      this.notify()
      return
    }

    // Auto-recover any unsynced offline records from IndexedDB into outbox queue
    await this.resyncUnsyncedRecords()

    const queueItems = await db.offlineQueue.orderBy("created_at").toArray()
    if (queueItems.length === 0) {
      this.notify()
      return
    }

    this.isSyncing = true
    this.lastError = null
    this.notify()

    console.log(`[SyncEngine] Starting processing ${queueItems.length} queued offline mutations...`)

    for (const item of queueItems) {
      if (!this.isNetworkOnline()) {
        console.log("[SyncEngine] Lost connectivity during sync processing. Pausing.")
        break
      }

      try {
        await this.processItem(item)
        if (item.id) {
          await db.offlineQueue.delete(item.id)
        }
        this.lastSyncedAt = Date.now()
      } catch (err: any) {
        console.error(`[SyncEngine] Error processing queue item #${item.id} (${item.entity_type}):`, err)
        const errMsg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to process offline mutation"
        this.lastError = errMsg

        const status = err?.response?.status
        const isTooLarge = status === 413 || (typeof errMsg === "string" && (errMsg.toLowerCase().includes("too large") || errMsg.toLowerCase().includes("payloadtoolargeerror")))

        // If rate limited (429), pause queue loop immediately
        if (status === 429) {
          console.warn("[SyncEngine] Backend rate limit hit (429 Too Many Requests). Pausing queue processing.")
          break
        }

        const isClientError = status && status >= 400 && status < 500

        // If payload too large (413), client error (400 Bad Request, 409 Conflict), or retries >= 3:
        if (isTooLarge || isClientError || (item.retry_count || 0) >= 3) {
          console.warn(`[SyncEngine] Discarding unresolvable item #${item.id} (${item.entity_type}) after status ${status || 'too large / client error'}`)
          if (item.id) {
            await db.offlineQueue.delete(item.id)
          }
          if (item.temp_id && item.entity_type === "mother") {
            await db.mothers.update(item.temp_id, { sync_status: "synced" })
          }
        } else if (item.id) {
          await db.offlineQueue.update(item.id, {
            retry_count: (item.retry_count || 0) + 1,
            last_error: this.lastError || undefined,
          })
        }

        // If network error, stop processing rest of queue
        if (!navigator.onLine || err?.code === "ERR_NETWORK" || !err.response) {
          break
        }
      }
    }

    this.isSyncing = false
    this.notify()
  }

  private extractCanonicalId(responseData: any): string | null {
    if (!responseData) return null
    if (typeof responseData === "string") return responseData

    if (responseData.result?.mother?.mother_id) return responseData.result.mother.mother_id
    if (responseData.result?.user?.user_id) return responseData.result.user.user_id
    if (responseData.mother?.mother_id) return responseData.mother.mother_id

    if (responseData.pregnancy?.pregnancy_id) return responseData.pregnancy.pregnancy_id
    if (responseData.referral?.referral_id) return responseData.referral.referral_id
    if (responseData.data?.referral_id) return responseData.data.referral_id
    if (responseData.prenatalVisit?.visit_id) return responseData.prenatalVisit.visit_id
    if (responseData.appointment?.appointment_id) return responseData.appointment.appointment_id
    if (responseData.screening?.screening_id) return responseData.screening.screening_id
    if (responseData.lab?.screening_id) return responseData.lab.screening_id
    if (responseData.supplement?.supplement_id) return responseData.supplement.supplement_id

    const targetObj = responseData.result || responseData.data || responseData
    if (targetObj && typeof targetObj === "object") {
      return (
        targetObj._id ||
        targetObj.id ||
        targetObj.mother_id ||
        targetObj.user_id ||
        targetObj.pregnancy_id ||
        targetObj.visit_id ||
        targetObj.appointment_id ||
        targetObj.screening_id ||
        targetObj.supplement_id ||
        null
      )
    }

    return null
  }

  private async processItem(item: OfflineQueueItem) {
    let payload = item.payload

    // Handle Blob file uploads if blob_ids exist
    if (item.blob_ids && item.blob_ids.length > 0) {
      for (const blobId of item.blob_ids) {
        const storedBlob = await db.blobs.get(blobId)
        if (storedBlob) {
          const formData = new FormData()
          formData.append("file", storedBlob.data, storedBlob.filename)

          const uploadRes = await apiClient.post("/api/v1/lab-screening/upload", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          })

          const uploadedUrl = uploadRes.data?.url || uploadRes.data?.fileUrl || uploadRes.data?.result
          if (uploadedUrl && typeof payload === "object") {
            if (payload.photo_url === blobId) payload.photo_url = uploadedUrl
            if (payload.file_url === blobId) payload.file_url = uploadedUrl
          }
          await db.blobs.delete(blobId)
        }
      }
    }

    // Replay HTTP request
    let response: any
    try {
      if (item.method === "POST") {
        response = await apiClient.post(item.endpoint, payload)
      } else if (item.method === "PUT") {
        response = await apiClient.put(item.endpoint, payload)
      } else if (item.method === "DELETE") {
        response = await apiClient.delete(item.endpoint)
      }
    } catch (err: any) {
      const errDetail = err.response?.data?.error || err.response?.data?.message || ""
      if (
        item.entity_type === "mother" &&
        item.action === "CREATE" &&
        item.temp_id &&
        typeof errDetail === "string" &&
        errDetail.toLowerCase().includes("user already exist")
      ) {
        console.warn(`[SyncEngine] Mother already exists on backend for ${item.temp_id}. Attempting automatic reconciliation...`)
        try {
          let remoteList: any[] = []
          try {
            const res = await apiClient.get("/api/v1/mother/active")
            remoteList = res.data?.result || res.data?.data || (Array.isArray(res.data) ? res.data : [])
          } catch {
            const res = await apiClient.get("/api/v1/mother/all")
            remoteList = res.data?.result || res.data?.data || (Array.isArray(res.data) ? res.data : [])
          }

          const fname = payload?.first_name?.toLowerCase()?.trim()
          const lname = payload?.last_name?.toLowerCase()?.trim()
          const serial = payload?.family_serial_no?.trim()

          const matched = remoteList.find((m: any) => {
            const mFname = (m.user?.first_name || m.first_name || "").toLowerCase().trim()
            const mLname = (m.user?.last_name || m.last_name || "").toLowerCase().trim()
            const mSerial = (m.family_serial_no || "").trim()
            if (serial && mSerial && serial === mSerial) return true
            return mFname && mLname && mFname === fname && mLname === lname
          })

          if (matched) {
            const canonicalId = matched.mother_id || matched._id || matched.id || matched.user_id
            await this.reconcileTempId("mother", item.temp_id, canonicalId, matched)
            return
          }
        } catch (fetchErr) {
          console.warn("[SyncEngine] Failed to auto-reconcile duplicate mother:", fetchErr)
        }
      }
      throw err
    }

    const responseData = response?.data

    // ID Reconciliation if temp_id was used
    if (item.temp_id && responseData) {
      const canonicalId = this.extractCanonicalId(responseData)
      if (canonicalId && canonicalId !== item.temp_id) {
        await this.reconcileTempId(item.entity_type, item.temp_id, canonicalId, responseData)
      }
    }
  }

  /**
   * Reconciles temporary local UUIDs with backend canonical IDs across Dexie tables & pending outbox items.
   */
  private async reconcileTempId(entityType: string, tempId: string, canonicalId: string, responseData: any) {
    console.log(`[SyncEngine] Reconciling temp ID ${tempId} -> canonical ID ${canonicalId}`)

    await db.transaction("rw", [db.mothers, db.pregnancies, db.prenatalVisits, db.appointments, db.labRecords, db.supplements, db.ehrDocuments, db.referrals, db.offlineQueue], async () => {
      let primaryCanonicalId = canonicalId

      if (entityType === "mother") {
        const canonicalMotherId = responseData?.result?.mother?.mother_id || responseData?.mother?.mother_id || canonicalId
        const canonicalUserId = responseData?.result?.user?.user_id || responseData?.user?.user_id || responseData?.result?.mother?.user_id || canonicalId
        primaryCanonicalId = canonicalMotherId

        const existingLocal = await db.mothers.get(tempId)
        if (existingLocal) {
          await db.mothers.delete(tempId)
          await db.mothers.put({
            ...existingLocal,
            ...(responseData?.result?.mother || responseData?.mother || {}),
            user: {
              ...(existingLocal.user || {}),
              ...(responseData?.result?.user || responseData?.user || {}),
              _id: canonicalUserId,
              user_id: canonicalUserId,
            },
            id: canonicalMotherId,
            _id: canonicalMotherId,
            mother_id: canonicalMotherId,
            user_id: canonicalUserId,
            sync_status: "synced",
            updated_at: Date.now(),
          })
        }
        await db.pregnancies.where("mother_id").equals(tempId).modify({ mother_id: canonicalMotherId })
        await db.prenatalVisits.where("mother_id").equals(tempId).modify({ mother_id: canonicalMotherId })
        await db.appointments.where("mother_id").equals(tempId).modify({ mother_id: canonicalMotherId })
        await db.appointments.where("user_id").equals(tempId).modify({ user_id: canonicalUserId })
        await db.labRecords.where("mother_id").equals(tempId).modify({ mother_id: canonicalMotherId })
        await db.supplements.where("mother_id").equals(tempId).modify({ mother_id: canonicalMotherId })
        await db.ehrDocuments.where("mother_id").equals(tempId).modify({ mother_id: canonicalMotherId })
      } else if (entityType === "pregnancy") {
        const existingLocal = await db.pregnancies.get(tempId)
        if (existingLocal) {
          await db.pregnancies.delete(tempId)
          await db.pregnancies.put({
            ...existingLocal,
            ...(responseData?.pregnancy || responseData),
            id: canonicalId,
            pregnancy_id: canonicalId,
            sync_status: "synced",
            updated_at: Date.now(),
          })
        }
        const allVisits = await db.prenatalVisits.toArray()
        for (const v of allVisits) {
          if ((v.pregnancy_id === tempId || (v as any).pregnancyId === tempId) && v.id) {
            await db.prenatalVisits.update(v.id, { pregnancy_id: canonicalId })
          }
        }

        const allLabs = await db.labRecords.toArray()
        for (const l of allLabs) {
          if ((l.pregnancy_id === tempId || (l as any).pregnancyId === tempId) && l.id) {
            await db.labRecords.update(l.id, { pregnancy_id: canonicalId })
          }
        }

        const allSupps = await db.supplements.toArray()
        for (const s of allSupps) {
          if ((s.pregnancy_id === tempId || (s as any).pregnancyId === tempId) && s.id) {
            await db.supplements.update(s.id, { pregnancy_id: canonicalId })
          }
        }
      } else if (entityType === "appointment") {
        const existingLocal = await db.appointments.get(tempId)
        if (existingLocal) {
          await db.appointments.delete(tempId)
          await db.appointments.put({
            ...existingLocal,
            ...(responseData?.appointment || responseData),
            id: canonicalId,
            sync_status: "synced",
            updated_at: Date.now(),
          })
        }
      } else if (entityType === "prenatal_visit") {
        const existingLocal = await db.prenatalVisits.get(tempId)
        if (existingLocal) {
          await db.prenatalVisits.delete(tempId)
          await db.prenatalVisits.put({
            ...existingLocal,
            ...(responseData?.prenatalVisit || responseData),
            id: canonicalId,
            sync_status: "synced",
            updated_at: Date.now(),
          })
        }
      } else if (entityType === "referral" || entityType === "custom_request") {
        const existingLocal = await db.referrals.get(tempId)
        if (existingLocal) {
          await db.referrals.delete(tempId)
          const respObj = responseData?.data || responseData?.result || responseData
          await db.referrals.put({
            ...existingLocal,
            ...(typeof respObj === "object" ? respObj : {}),
            id: canonicalId,
            referral_id: canonicalId,
            sync_status: "synced",
            updated_at: Date.now(),
          })
        }
      }

      // Propagate reconciled canonical ID to remaining pending items in offlineQueue
      const remainingQueue = await db.offlineQueue.toArray()
      for (const queueItem of remainingQueue) {
        let modified = false
        let newEndpoint = queueItem.endpoint
        let newPayload = queueItem.payload

        if (newEndpoint && newEndpoint.includes(tempId)) {
          newEndpoint = newEndpoint.replaceAll(tempId, primaryCanonicalId)
          modified = true
        }

        if (newPayload) {
          let payloadStr = JSON.stringify(newPayload)
          if (payloadStr.includes(tempId)) {
            payloadStr = payloadStr.replaceAll(tempId, primaryCanonicalId)
            newPayload = JSON.parse(payloadStr)
            modified = true
          }
        }

        if (modified && queueItem.id) {
          await db.offlineQueue.update(queueItem.id, {
            endpoint: newEndpoint,
            payload: newPayload,
          })
        }
      }
    })
  }

  /**
   * Auto-recovers any offline records saved in local IndexedDB that are missing from the outbox queue.
   */
  public async resyncUnsyncedRecords() {
    try {
      const pendingQueue = await db.offlineQueue.toArray()
      const queuedTempIds = new Set(pendingQueue.map((q) => q.temp_id).filter(Boolean))

      // Build map of mother_id to active canonical pregnancy_id
      const allPregnancies = await db.pregnancies.toArray()
      const pregMap = new Map<string, string>()
      for (const p of allPregnancies) {
        const pId = p.pregnancy_id || p.id || p._id
        const pMid = p.mother_id || p.motherId
        if (pId && !pId.startsWith("temp-") && pMid) {
          pregMap.set(pMid, pId)
        }
      }

      // 1. Recover Unsynced Prenatal Visits
      const visits = await db.prenatalVisits.toArray()
      for (const visit of visits) {
        const isTemp = String(visit.id).startsWith("temp-") || visit.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(visit.id)) {
          const resolvedPregId = (visit.pregnancy_id && !visit.pregnancy_id.startsWith("temp-"))
            ? visit.pregnancy_id
            : (visit.mother_id ? pregMap.get(visit.mother_id) || visit.pregnancy_id : visit.pregnancy_id)

          console.log(`[SyncEngine] Auto-recovering offline prenatal visit ${visit.id} to outbox queue...`)
          await db.offlineQueue.add({
            client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entity_type: "prenatal_visit",
            action: "CREATE",
            endpoint: "/api/v1/prenatal-visit/register",
            method: "POST",
            payload: {
              mother_id: visit.mother_id,
              pregnancy_id: resolvedPregId,
              health_worker_id: visit.health_worker_id || "system",
              trimester: Number(visit.trimester) || 1,
              visit_number: Number(visit.visit_number) || 1,
              age_of_gestation_weeks: Number(visit.age_of_gestation_weeks) || 12,
              weight_kg: Number(visit.weight_kg) || 50,
              temperature_celsius: Number(visit.temperature_celsius) || 36.5,
              pulse_rate_bpm: Number(visit.pulse_rate_bpm) || 75,
              bp_systolic: Number(visit.bp_systolic) || 120,
              bp_diastolic: Number(visit.bp_diastolic) || 80,
              fundic_height_cm: visit.fundic_height_cm ? Number(visit.fundic_height_cm) : null,
              fetal_heart_tone_bpm: visit.fetal_heart_tone_bpm ? Number(visit.fetal_heart_tone_bpm) : null,
              chief_complaint: visit.chief_complaint || undefined,
              danger_signs_observed: visit.danger_signs_observed || undefined,
              risk_level_assessed: visit.risk_level_assessed || "Low Risk"
            },
            temp_id: visit.id,
            retry_count: 0,
            created_at: Date.now(),
          })
          queuedTempIds.add(visit.id)
        }
      }

      // 2. Recover Unsynced Pregnancies
      const pregnancies = await db.pregnancies.toArray()
      for (const preg of pregnancies) {
        const isTemp = String(preg.id).startsWith("temp-") || preg.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(preg.id)) {
          console.log(`[SyncEngine] Auto-recovering offline pregnancy ${preg.id} to outbox queue...`)
          await db.offlineQueue.add({
            client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entity_type: "pregnancy",
            action: "CREATE",
            endpoint: "/api/v1/pregnancy/register",
            method: "POST",
            payload: {
              mother_id: preg.mother_id,
              date_of_registration: preg.date_of_registration || new Date().toISOString(),
              lmp_date: preg.lmp_date,
              gravida: Number(preg.gravida) || 1,
              parity: Number(preg.parity) || 0,
              previous_delivery_history: preg.previous_delivery_history || undefined,
              co_morbidities: preg.co_morbidities || undefined,
              age_group: preg.age_group || "Adult",
              bmi_1st_trimester: preg.bmi_1st_trimester ? Number(preg.bmi_1st_trimester) : null,
              bmi_category: preg.bmi_category || "Normal",
              pregnancy_status: preg.pregnancy_status || "Active",
            },
            temp_id: preg.id,
            retry_count: 0,
            created_at: Date.now(),
          })
          queuedTempIds.add(preg.id)
        }
      }

      // 3. Recover Unsynced Lab Records
      const labs = await db.labRecords.toArray()
      for (const lab of labs) {
        const isTemp = String(lab.id).startsWith("temp-") || lab.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(lab.id)) {
          console.log(`[SyncEngine] Auto-recovering offline lab record ${lab.id} to outbox queue...`)
          await db.offlineQueue.add({
            client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entity_type: "lab_record",
            action: "CREATE",
            endpoint: "/api/v1/lab-screening/register",
            method: "POST",
            payload: {
              mother_id: lab.mother_id,
              pregnancy_id: lab.pregnancy_id,
              visit_id: lab.visit_id,
              screening_type: lab.screening_type,
              result: lab.result,
              file_url: lab.file_url || undefined,
              date_of_screening: lab.date_of_screening || new Date().toISOString(),
              remarks: lab.remarks || undefined,
            },
            temp_id: lab.id,
            retry_count: 0,
            created_at: Date.now(),
          })
          queuedTempIds.add(lab.id)
        }
      }

      // 4. Recover Unsynced Supplements
      const supps = await db.supplements.toArray()
      for (const supp of supps) {
        const isTemp = String(supp.id).startsWith("temp-") || supp.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(supp.id)) {
          console.log(`[SyncEngine] Auto-recovering offline supplement ${supp.id} to outbox queue...`)
          await db.offlineQueue.add({
            client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entity_type: "supplement",
            action: "CREATE",
            endpoint: "/api/v1/supplement/register",
            method: "POST",
            payload: {
              mother_id: supp.mother_id,
              pregnancy_id: supp.pregnancy_id,
              visit_id: supp.visit_id,
              supplement_type: supp.supplement_type,
              tablets_given_count: Number(supp.tablets_given_count) || 1,
              date_given: supp.date_given || new Date().toISOString(),
            },
            temp_id: supp.id,
            retry_count: 0,
            created_at: Date.now(),
          })
          queuedTempIds.add(supp.id)
        }
      }

      // 5. Recover Unsynced Referrals
      const referrals = await db.referrals.toArray()
      for (const ref of referrals) {
        const isTemp = String(ref.id).startsWith("temp-") || ref.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(ref.id)) {
          console.log(`[SyncEngine] Auto-recovering offline referral ${ref.id} to outbox queue...`)
          await db.offlineQueue.add({
            client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entity_type: "custom_request",
            action: "CREATE",
            endpoint: "/api/v1/referral/register",
            method: "POST",
            payload: {
              pregnancy_id: ref.pregnancy_id,
              from_facility_id: ref.from_facility_id,
              to_facility_id: ref.to_facility_id,
              external_facility_name: ref.external_facility_name,
              reason: ref.reason,
            },
            temp_id: ref.id,
            retry_count: 0,
            created_at: Date.now(),
          })
          queuedTempIds.add(ref.id)
        } else if (ref.sync_status === "pending_update" && ref.id && !ref.id.startsWith("temp-")) {
          console.log(`[SyncEngine] Auto-recovering offline referral update ${ref.id} to outbox queue...`)
          await db.offlineQueue.add({
            client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entity_type: "custom_request",
            action: "UPDATE",
            endpoint: `/api/v1/referral/respond/${ref.referral_id || ref.id}`,
            method: "PUT",
            payload: {
              status: ref.status,
              response_notes: ref.response_notes,
              outcome: ref.outcome,
              is_completed: ref.is_completed,
            },
            retry_count: 0,
            created_at: Date.now(),
          })
        }
      }
    } catch (err) {
      console.warn("[SyncEngine] Auto-resync unsynced records error:", err)
    }
  }
}

export const syncEngine = new SyncEngine()
