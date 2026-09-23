import { db } from "@/lib/db/bmsDatabase"
import type { OfflineQueueItem } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { settingsStore } from "@/lib/settingsStore"
import { validatePrenatalVitals } from "@/lib/clinicalValidation"

type SyncListener = (status: {
  isSyncing: boolean
  pendingCount: number
  lastSyncedAt: number | null
  error: string | null
}) => void

class SyncEngine {
  private isSyncing = false
  private listeners: Set<SyncListener> = new Set()
  private lastSyncedAt: number | null = null
  private lastError: string | null = null
  private isOnlineState: boolean =
    typeof navigator !== "undefined" ? navigator.onLine : true

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

      if (!navigator.onLine) {
        this.isOnlineState = false
      } else {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        const baseUrl =
          import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"
        fetch(`${baseUrl}/health`, { method: "GET", signal: controller.signal })
          .then((res) => {
            clearTimeout(timeoutId)
            this.setNetworkOnline(res.ok)
          })
          .catch(() => {
            clearTimeout(timeoutId)
            console.log(
              "[SyncEngine] Pre-flight ping failed, falling back to navigator.onLine status."
            )
            this.setNetworkOnline(navigator.onLine)
          })
      }
    }
  }

  public setNetworkOnline(online: boolean) {
    if (this.isOnlineState !== online) {
      console.log(
        `[SyncEngine] Network state changed: ${this.isOnlineState} -> ${online}`
      )
      this.isOnlineState = online
      this.notify()
      if (online) {
        this.syncEhrDocuments().catch(() => {})
        const settings = settingsStore.getSettings()
        if (settings.autoSyncOnReconnect) {
          this.processQueue()
        } else {
          console.log(
            "[SyncEngine] Auto-sync on reconnect is disabled in settings."
          )
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

  public async enqueueMutation(params: {
    entity_type: OfflineQueueItem["entity_type"]
    action: OfflineQueueItem["action"]
    endpoint: string
    method: OfflineQueueItem["method"]
    payload: any
    temp_id?: string
    blob_ids?: string[]
  }) {
    if (params.entity_type === "prenatal_visit" && params.payload) {
      const v = validatePrenatalVitals({
        trimester: params.payload.trimester,
        visit_number: params.payload.visit_number,
        age_of_gestation_weeks: params.payload.age_of_gestation_weeks,
        weight_kg: params.payload.weight_kg,
        temperature_celsius: params.payload.temperature_celsius,
        pulse_rate_bpm: params.payload.pulse_rate_bpm,
        bp_systolic: params.payload.bp_systolic,
        bp_diastolic: params.payload.bp_diastolic,
        fundic_height_cm: params.payload.fundic_height_cm,
        fetal_heart_tone_bpm: params.payload.fetal_heart_tone_bpm,
      })
      if (!v.isValid) {
        console.error("[SyncEngine] Blocked enqueueing invalid prenatal visit:", v.errors)
        throw new Error(`Invalid medical data provided: ${v.errors.join(", ")}`)
      }
    }

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

    console.log(
      `[SyncEngine] Enqueued ${params.action} for ${params.entity_type} (${params.temp_id || params.endpoint})`
    )
    this.notify()

    if (this.isNetworkOnline()) {
      this.processQueue()
    }
  }

  public async getQueue(): Promise<OfflineQueueItem[]> {
    return await db.offlineQueue.orderBy("created_at").toArray()
  }

  public async cancelPendingMutation(entityId: string): Promise<boolean> {
    const pendingItems = await db.offlineQueue.toArray()
    let cancelled = false
    for (const item of pendingItems) {
      if (
        item.temp_id === entityId ||
        (item.endpoint && item.endpoint.includes(entityId))
      ) {
        if (item.id) {
          await db.offlineQueue.delete(item.id)
          cancelled = true
        }
      }
    }
    if (cancelled) {
      this.notify()
    }
    return cancelled
  }

  public async processQueue() {
    if (this.isSyncing) return
    if (!this.isNetworkOnline()) {
      console.log("[SyncEngine] Network offline. Skipping queue processing.")
      this.notify()
      return
    }

    await this.resyncUnsyncedRecords()

    const queueItems = await db.offlineQueue.orderBy("created_at").toArray()
    if (queueItems.length === 0) {
      this.notify()
      return
    }

    this.isSyncing = true
    this.lastError = null
    this.notify()

    console.log(
      `[SyncEngine] Starting processing ${queueItems.length} queued offline mutations...`
    )

    for (const item of queueItems) {
      if (!this.isNetworkOnline()) {
        console.log(
          "[SyncEngine] Lost connectivity during sync processing. Pausing."
        )
        break
      }

      try {
        await this.processItem(item)
        if (item.id) {
          await db.offlineQueue.delete(item.id)
        }
        this.lastSyncedAt = Date.now()
      } catch (err: any) {
        console.error(
          `[SyncEngine] Error processing queue item #${item.id} (${item.entity_type}):`,
          err
        )
        const errMsg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to process offline mutation"
        this.lastError = errMsg

        const status = err?.response?.status
        const isTooLarge =
          status === 413 ||
          (typeof errMsg === "string" &&
            (errMsg.toLowerCase().includes("too large") ||
              errMsg.toLowerCase().includes("payloadtoolargeerror")))

        if (status === 429) {
          console.warn(
            "[SyncEngine] Backend rate limit hit (429 Too Many Requests). Pausing queue processing."
          )
          break
        }

        const isUnrecoverableAuth = status === 401 || status === 403
        const isUnrecoverableClient =
          status === 400 ||
          status === 422 ||
          status === 404 ||
          (typeof errMsg === "string" &&
            (errMsg.toLowerCase().includes("invalid medical data") ||
              errMsg.toLowerCase().includes("required fields are missing") ||
              errMsg.toLowerCase().includes("validation")))
        const isMaxRetries = (item.retry_count || 0) >= 5

        const tableMap: Record<string, any> = {
          mother: db.mothers,
          pregnancy: db.pregnancies,
          prenatal_visit: db.prenatalVisits,
          appointment: db.appointments,
          lab_record: db.labRecords,
          supplement: db.supplements,
          referral: db.referrals,
          custom_request: db.referrals,
          message: db.messages,
          ehr_doc: db.ehrDocuments,
          ehr_document: db.ehrDocuments,
        }

        const targetEntityId = item.temp_id || (item.endpoint ? item.endpoint.split("/").pop() : undefined)
        if (targetEntityId) {
          const table = tableMap[item.entity_type]
          if (table) {
            await table
              .update(targetEntityId, {
                sync_status: "error",
                last_error: errMsg,
              })
              .catch(() => {})
          }
          if (item.entity_type === "user") {
            try {
              const cached = await db.userSession.get("facility_staff_cache")
              if (cached && Array.isArray(cached.data)) {
                const updated = cached.data.map((u: any) => {
                  if (u.id === targetEntityId || u.user_id === targetEntityId) {
                    return {
                      ...u,
                      sync_status: "error",
                      last_error: errMsg,
                    }
                  }
                  return u
                })
                await db.userSession.put({
                  id: "facility_staff_cache",
                  data: updated,
                  updated_at: Date.now(),
                })
              }
            } catch {}
          }
        }

        if (item.id) {
          await db.offlineQueue.update(item.id, {
            retry_count: (item.retry_count || 0) + 1,
            last_error: errMsg,
          })
        }

        if (!navigator.onLine || err?.code === "ERR_NETWORK" || !err.response) {
          break
        }
      }
    }

    const remainingQueue = await db.offlineQueue.toArray()
    const errorItems = remainingQueue.filter((q) => q.last_error || (q.retry_count || 0) >= 5)
    if (remainingQueue.length === 0) {
      this.lastError = null
    } else if (errorItems.length > 0) {
      this.lastError = errorItems[0].last_error || "Some offline mutations encountered errors."
    }

    this.isSyncing = false
    this.notify()
  }

  private extractCanonicalId(responseData: any): string | null {
    if (!responseData) return null
    if (typeof responseData === "string") return responseData

    if (responseData.result?.mother?.mother_id)
      return responseData.result.mother.mother_id
    if (responseData.result?.user?.user_id)
      return responseData.result.user.user_id
    if (responseData.mother?.mother_id) return responseData.mother.mother_id

    if (responseData.pregnancy?.pregnancy_id)
      return responseData.pregnancy.pregnancy_id
    if (responseData.message?.message_id) return responseData.message.message_id
    if (responseData.data?.message_id) return responseData.data.message_id
    if (responseData.referral?.referral_id)
      return responseData.referral.referral_id
    if (responseData.data?.referral_id) return responseData.data.referral_id
    if (responseData.prenatalVisit?.visit_id)
      return responseData.prenatalVisit.visit_id
    if (responseData.appointment?.appointment_id)
      return responseData.appointment.appointment_id
    if (responseData.screening?.screening_id)
      return responseData.screening.screening_id
    if (responseData.lab?.screening_id) return responseData.lab.screening_id
    if (responseData.supplement?.supplement_id)
      return responseData.supplement.supplement_id
    if (responseData.supplement_record?.supplement_id)
      return responseData.supplement_record.supplement_id

    const targetObj =
      responseData.result ||
      responseData.data ||
      responseData.supplement_record ||
      responseData
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
        targetObj.referral_id ||
        targetObj.message_id ||
        null
      )
    }

    return null
  }

  private async resolvePayloadIdentifiers(payload: any): Promise<any> {
    if (!payload || typeof payload !== "object") return payload
    const resolved = { ...payload }

    // 1. Resolve mother_id
    if (resolved.mother_id && String(resolved.mother_id).startsWith("temp-")) {
      try {
        const m = await db.mothers.get(resolved.mother_id)
        if (m && m.mother_id && !String(m.mother_id).startsWith("temp-")) {
          resolved.mother_id = m.mother_id
          if (resolved.motherId) resolved.motherId = m.mother_id
        }
      } catch {}
    }

    // 2. Resolve pregnancy_id
    if (resolved.pregnancy_id) {
      const pIdStr = String(resolved.pregnancy_id)
      if (pIdStr.startsWith("temp-") || pIdStr.startsWith("preg-")) {
        try {
          const p = await db.pregnancies.get(resolved.pregnancy_id)
          if (p && p.pregnancy_id && !String(p.pregnancy_id).startsWith("temp-") && !String(p.pregnancy_id).startsWith("preg-")) {
            resolved.pregnancy_id = p.pregnancy_id
          } else if (resolved.mother_id) {
            const mIdStr = String(resolved.mother_id)
            const allPregs = await db.pregnancies.toArray()
            const matchingPreg = allPregs.find((preg) => {
              const pMid = preg.mother_id || (preg as any).motherId
              const pregId = preg.pregnancy_id || preg.id
              return (
                (pMid === mIdStr || (pMid && mIdStr && (pMid.includes(mIdStr) || mIdStr.includes(pMid)))) &&
                pregId &&
                !String(pregId).startsWith("temp-") &&
                !String(pregId).startsWith("preg-")
              )
            })
            if (matchingPreg && (matchingPreg.pregnancy_id || matchingPreg.id)) {
              resolved.pregnancy_id = matchingPreg.pregnancy_id || matchingPreg.id
            }
          }
        } catch {}
      }
    }

    // 3. Resolve visit_id
    if (resolved.visit_id && String(resolved.visit_id).startsWith("temp-")) {
      try {
        const v = await db.prenatalVisits.get(resolved.visit_id)
        if (v && v.visit_id && !String(v.visit_id).startsWith("temp-")) {
          resolved.visit_id = v.visit_id
        } else if (resolved.pregnancy_id && !String(resolved.pregnancy_id).startsWith("temp-")) {
          const matchingVisit = await db.prenatalVisits
            .where("pregnancy_id")
            .equals(resolved.pregnancy_id)
            .first()
          if (matchingVisit && matchingVisit.visit_id && !String(matchingVisit.visit_id).startsWith("temp-")) {
            resolved.visit_id = matchingVisit.visit_id
          } else {
            delete resolved.visit_id
          }
        } else {
          delete resolved.visit_id
        }
      } catch {}
    }

    return resolved
  }

  private async processItem(item: OfflineQueueItem) {
    let payload = await this.resolvePayloadIdentifiers(item.payload)

    if (item.blob_ids && item.blob_ids.length > 0) {
      for (const blobId of item.blob_ids) {
        const storedBlob = await db.blobs.get(blobId)
        if (storedBlob) {
          const formData = new FormData()
          formData.append("file", storedBlob.data, storedBlob.filename)

          const uploadRes = await apiClient.post(
            "/api/v1/lab-screening/upload",
            formData,
            {
              headers: { "Content-Type": "multipart/form-data" },
            }
          )

          const uploadedUrl =
            uploadRes.data?.url ||
            uploadRes.data?.fileUrl ||
            uploadRes.data?.result
          if (uploadedUrl && typeof payload === "object") {
            if (payload.photo_url === blobId || (typeof payload.photo_url === "string" && payload.photo_url.startsWith("data:"))) {
              payload.photo_url = uploadedUrl
            }
            if (payload.profile_url === blobId || (typeof payload.profile_url === "string" && payload.profile_url.startsWith("data:"))) {
              payload.profile_url = uploadedUrl
            }
            if (payload.file_url === blobId || (typeof payload.file_url === "string" && payload.file_url.startsWith("data:"))) {
              payload.file_url = uploadedUrl
            }
          }
          await db.blobs.delete(blobId)
        }
      }
    }

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
      const errDetail =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        ""
      const isDuplicateError =
        typeof errDetail === "string" &&
        (errDetail.toLowerCase().includes("user already exist") ||
          errDetail.toLowerCase().includes("already registered") ||
          errDetail.toLowerCase().includes("already exist") ||
          errDetail.toLowerCase().includes("same credentials") ||
          errDetail.toLowerCase().includes("duplicate") ||
          errDetail.toLowerCase().includes("unique constraint"))

      if (
        item.entity_type === "mother" &&
        item.action === "CREATE" &&
        item.temp_id &&
        isDuplicateError
      ) {
        console.warn(
          `[SyncEngine] Mother duplicate detected on backend for ${item.temp_id} ("${errDetail}"). Attempting automatic reconciliation...`
        )
        try {
          let remoteList: any[] = []
          try {
            const res = await apiClient.get("/api/v1/mother/active")
            remoteList =
              res.data?.result ||
              res.data?.data ||
              (Array.isArray(res.data) ? res.data : [])
          } catch {
            const res = await apiClient.get("/api/v1/mother/all")
            remoteList =
              res.data?.result ||
              res.data?.data ||
              (Array.isArray(res.data) ? res.data : [])
          }

          const fname = payload?.first_name?.toLowerCase()?.trim()
          const lname = payload?.last_name?.toLowerCase()?.trim()
          const serial = payload?.family_serial_no?.trim()
          const phone = (payload?.phone_number || payload?.phone || "").trim()
          const email = (payload?.email || "").toLowerCase().trim()

          const matched = remoteList.find((m: any) => {
            const mFname = (m.user?.first_name || m.first_name || "")
              .toLowerCase()
              .trim()
            const mLname = (m.user?.last_name || m.last_name || "")
              .toLowerCase()
              .trim()
            const mSerial = (m.family_serial_no || "").trim()
            const mPhone = (m.user?.phone_number || m.phone_number || "").trim()
            const mEmail = (m.user?.email || m.email || "").toLowerCase().trim()

            if (serial && mSerial && serial === mSerial) return true
            if (phone && mPhone && phone === mPhone) return true
            if (email && mEmail && email === mEmail) return true
            return mFname && mLname && mFname === fname && mLname === lname
          })

          if (matched) {
            const canonicalId =
              matched.mother_id || matched._id || matched.id || matched.user_id
            await this.reconcileTempId(
              "mother",
              item.temp_id,
              canonicalId,
              matched
            )
            return
          }
        } catch (fetchErr) {
          console.warn(
            "[SyncEngine] Failed to auto-reconcile duplicate mother:",
            fetchErr
          )
        }
      }

      if (
        item.entity_type === "user" &&
        item.action === "CREATE" &&
        item.temp_id &&
        isDuplicateError
      ) {
        console.warn(
          `[SyncEngine] Staff duplicate detected on backend for ${item.temp_id} ("${errDetail}"). Attempting automatic reconciliation...`
        )
        try {
          const res = await apiClient.get("/api/v1/user/facility")
          const remoteList: any[] =
            res.data?.result ||
            res.data?.data ||
            (Array.isArray(res.data) ? res.data : [])

          const email = (payload?.email || "").toLowerCase().trim()
          const phone = (payload?.phone_number || payload?.phone || "").trim()
          const fname = (payload?.first_name || "").toLowerCase().trim()
          const lname = (payload?.last_name || "").toLowerCase().trim()

          const matched = remoteList.find((u: any) => {
            const uEmail = (u.email || "").toLowerCase().trim()
            const uPhone = (u.phone_number || "").trim()
            const uFname = (u.first_name || "").toLowerCase().trim()
            const uLname = (u.last_name || "").toLowerCase().trim()

            if (email && uEmail && email === uEmail) return true
            if (phone && uPhone && phone === uPhone) return true
            return fname && lname && fname === uFname && lname === uLname
          })

          if (matched) {
            const canonicalId = matched.user_id || matched.id || matched._id
            await this.reconcileTempId(
              "user",
              item.temp_id,
              canonicalId,
              { user: matched }
            )
            return
          }
        } catch (fetchErr) {
          console.warn(
            "[SyncEngine] Failed to auto-reconcile duplicate staff member:",
            fetchErr
          )
        }
      }
      throw err
    }

    const responseData = response?.data

    if (item.temp_id && responseData) {
      const canonicalId = this.extractCanonicalId(responseData)
      if (canonicalId && canonicalId !== item.temp_id) {
        await this.reconcileTempId(
          item.entity_type,
          item.temp_id,
          canonicalId,
          responseData
        )
      }
    }

    try {
      if (item.entity_type === "mother") {
        const targetId = item.temp_id || (item.endpoint ? item.endpoint.split("/").pop() : undefined)
        if (targetId) {
          const local = (await db.mothers.get(targetId)) || (await db.mothers.where("mother_id").equals(targetId).first())
          if (local) {
            const respMother = responseData?.result?.mother || responseData?.result || responseData?.mother || {}
            const respUser = responseData?.result?.user || responseData?.user || respMother.user || {}
            const resolvedPhoto = respUser.profile_url || respMother.photo_url || payload?.photo_url || payload?.profile_url || local.photo_url
            await db.mothers.update(local.id, {
              ...respMother,
              photo_url: resolvedPhoto,
              profile_url: resolvedPhoto,
              user: {
                ...(local.user || {}),
                ...respUser,
                profile_url: resolvedPhoto,
              },
              sync_status: "synced",
              last_error: undefined,
              updated_at: Date.now(),
            })
          }
        }
      } else if (item.entity_type === "ehr_doc") {
        const targetId = item.temp_id || (item.endpoint ? item.endpoint.split("/").pop() : undefined)
        if (targetId) {
          const docId = responseData?.data?.document_id || responseData?.document_id || responseData?.id || targetId
          const local = await db.ehrDocuments.get(targetId)
          if (local) {
            if (targetId !== docId) {
              await db.ehrDocuments.delete(targetId)
            }
            await db.ehrDocuments.put({
              ...local,
              ...(responseData?.data || responseData || {}),
              id: docId,
              document_id: docId,
              sync_status: "synced",
              last_error: undefined,
              updated_at: Date.now(),
            })
          }
        }
      } else if (item.entity_type === "referral" || item.entity_type === "custom_request") {
        const targetId = item.temp_id || (item.endpoint ? item.endpoint.split("/").pop() : undefined)
        if (targetId) {
          const refId = responseData?.data?.referral_id || responseData?.referral?.referral_id || responseData?.referral_id || targetId
          const local = (await db.referrals.get(targetId)) || (await db.referrals.where("referral_id").equals(targetId).first())
          if (local) {
            if (targetId !== refId) {
              await db.referrals.delete(targetId)
            }
            await db.referrals.put({
              ...local,
              ...(responseData?.data || responseData?.referral || responseData || {}),
              id: refId,
              referral_id: refId,
              sync_status: "synced",
              last_error: undefined,
              updated_at: Date.now(),
            })
          }
        }
      }
    } catch (syncStateErr) {
      console.warn("[SyncEngine] Failed to update local Dexie record after successful mutation:", syncStateErr)
    }
  }

  private async reconcileTempId(
    entityType: string,
    tempId: string,
    canonicalId: string,
    responseData: any
  ) {
    console.log(
      `[SyncEngine] Reconciling temp ID ${tempId} -> canonical ID ${canonicalId}`
    )

    await db.transaction(
      "rw",
      [
        db.mothers,
        db.pregnancies,
        db.prenatalVisits,
        db.appointments,
        db.labRecords,
        db.supplements,
        db.ehrDocuments,
        db.messages,
        db.referrals,
        db.offlineQueue,
      ],
      async () => {
        let primaryCanonicalId = canonicalId

        if (entityType === "mother") {
          const canonicalMotherId =
            responseData?.result?.mother?.mother_id ||
            responseData?.mother?.mother_id ||
            canonicalId
          const canonicalUserId =
            responseData?.result?.user?.user_id ||
            responseData?.user?.user_id ||
            responseData?.result?.mother?.user_id ||
            canonicalId
          primaryCanonicalId = canonicalMotherId

          const existingLocal = await db.mothers.get(tempId)
          if (existingLocal) {
            const respMother = responseData?.result?.mother || responseData?.mother || {}
            const respUser = responseData?.result?.user || responseData?.user || {}
            const preservedPhoto =
              respMother.photo_url ||
              respUser.profile_url ||
              existingLocal.photo_url ||
              existingLocal.profile_url ||
              existingLocal.user?.profile_url ||
              ""

            await db.mothers.delete(tempId)
            await db.mothers.put({
              ...existingLocal,
              ...respMother,
              photo_url: preservedPhoto,
              profile_url: preservedPhoto,
              user: {
                ...(existingLocal.user || {}),
                ...respUser,
                profile_url: preservedPhoto,
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
          await db.pregnancies
            .where("mother_id")
            .equals(tempId)
            .modify({ mother_id: canonicalMotherId })
          await db.prenatalVisits
            .where("mother_id")
            .equals(tempId)
            .modify({ mother_id: canonicalMotherId })
          await db.appointments
            .where("mother_id")
            .equals(tempId)
            .modify({ mother_id: canonicalMotherId })
          await db.appointments
            .where("user_id")
            .equals(tempId)
            .modify({ user_id: canonicalUserId })
          await db.labRecords
            .where("mother_id")
            .equals(tempId)
            .modify({ mother_id: canonicalMotherId })
          await db.supplements
            .where("mother_id")
            .equals(tempId)
            .modify({ mother_id: canonicalMotherId })
          await db.ehrDocuments
            .where("mother_id")
            .equals(tempId)
            .modify({ mother_id: canonicalMotherId })
          await db.referrals
            .where("mother_id")
            .equals(tempId)
            .modify({ mother_id: canonicalMotherId })
            .catch(() => {})
          await db.messages
            .where("receiver_id")
            .equals(tempId)
            .modify({ receiver_id: canonicalUserId })
          await db.messages
            .where("sender_id")
            .equals(tempId)
            .modify({ sender_id: canonicalUserId })
        } else if (entityType === "pregnancy") {
          const existingLocal = await db.pregnancies.get(tempId)
          if (existingLocal) {
            await db.pregnancies.delete(tempId)
            await db.pregnancies.put({
              ...existingLocal,
              ...(responseData?.pregnancy || responseData?.result || responseData),
              id: canonicalId,
              pregnancy_id: canonicalId,
              sync_status: "synced",
              updated_at: Date.now(),
            })
          }
          const allVisits = await db.prenatalVisits.toArray()
          for (const v of allVisits) {
            if (
              (v.pregnancy_id === tempId ||
                (v as any).pregnancyId === tempId) &&
              v.id
            ) {
              await db.prenatalVisits.update(v.id, {
                pregnancy_id: canonicalId,
              })
            }
          }

          const allLabs = await db.labRecords.toArray()
          for (const l of allLabs) {
            if (
              (l.pregnancy_id === tempId ||
                (l as any).pregnancyId === tempId) &&
              l.id
            ) {
              await db.labRecords.update(l.id, { pregnancy_id: canonicalId })
            }
          }

          const allSupps = await db.supplements.toArray()
          for (const s of allSupps) {
            if (
              (s.pregnancy_id === tempId ||
                (s as any).pregnancyId === tempId) &&
              s.id
            ) {
              await db.supplements.update(s.id, { pregnancy_id: canonicalId })
            }
          }

          const allRefs = await db.referrals.toArray()
          for (const r of allRefs) {
            if (
              (r.pregnancy_id === tempId ||
                (r as any).pregnancyId === tempId) &&
              r.id
            ) {
              await db.referrals.update(r.id, {
                pregnancy_id: canonicalId,
              })
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
              appointment_id: canonicalId,
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
        } else if (entityType === "lab_record") {
          const existingLocal = await db.labRecords.get(tempId)
          if (existingLocal) {
            await db.labRecords.delete(tempId)
            const respObj =
              responseData?.data ||
              responseData?.result ||
              responseData?.screening ||
              responseData
            await db.labRecords.put({
              ...existingLocal,
              ...(typeof respObj === "object" ? respObj : {}),
              id: canonicalId,
              screening_id: canonicalId,
              sync_status: "synced",
              updated_at: Date.now(),
            })
          }
        } else if (entityType === "supplement") {
          const existingLocal = await db.supplements.get(tempId)
          if (existingLocal) {
            await db.supplements.delete(tempId)
            const respObj =
              responseData?.supplement_record ||
              responseData?.data ||
              responseData?.result ||
              responseData?.supplement ||
              responseData
            await db.supplements.put({
              ...existingLocal,
              ...(typeof respObj === "object" ? respObj : {}),
              id: canonicalId,
              supplement_id: canonicalId,
              sync_status: "synced",
              updated_at: Date.now(),
            })
          }
        } else if (entityType === "referral") {
          const existingLocal = await db.referrals.get(tempId)
          if (existingLocal) {
            await db.referrals.delete(tempId)
            const respObj =
              responseData?.data || responseData?.result || responseData
            await db.referrals.put({
              ...existingLocal,
              ...(typeof respObj === "object" ? respObj : {}),
              id: canonicalId,
              referral_id: canonicalId,
              sync_status: "synced",
              updated_at: Date.now(),
            })
          }
        } else if (entityType === "message") {
          const existingLocal = await db.messages.get(tempId)
          if (existingLocal) {
            await db.messages.delete(tempId)
            const respObj =
              responseData?.data || responseData?.result || responseData
            await db.messages.put({
              ...existingLocal,
              ...(typeof respObj === "object" ? respObj : {}),
              id: canonicalId,
              sync_status: "synced",
              updated_at: Date.now(),
            })
          }
        } else if (entityType === "ehr_document") {
          const existingLocal = await db.ehrDocuments.get(tempId)
          if (existingLocal) {
            await db.ehrDocuments.delete(tempId)
            const respObj =
              responseData?.data || responseData?.result || responseData
            await db.ehrDocuments.put({
              ...existingLocal,
              ...(typeof respObj === "object" ? respObj : {}),
              id: canonicalId,
              document_id: canonicalId,
              sync_status: "synced",
              updated_at: Date.now(),
            })
          }
        } else if (entityType === "user" || entityType === "custom_request") {
          try {
            const cached = await db.userSession.get("facility_staff_cache")
            if (cached && Array.isArray(cached.data)) {
              const userObj =
                responseData?.user ||
                responseData?.result ||
                responseData?.data ||
                responseData
              const userEmail = (userObj?.email || "").toLowerCase().trim()
              const updated = cached.data
                .filter((u: any) => {
                  if (
                    userEmail &&
                    (u.email || "").toLowerCase().trim() === userEmail &&
                    u.id !== tempId &&
                    u.id !== canonicalId
                  ) {
                    return false
                  }
                  return true
                })
                .map((u: any) => {
                  if (
                    u.id === tempId ||
                    u.user_id === tempId ||
                    (userEmail && (u.email || "").toLowerCase().trim() === userEmail)
                  ) {
                    const mergedObj = typeof userObj === "object" ? userObj : {}
                    return {
                      ...u,
                      ...mergedObj,
                      email: mergedObj.email || u.email || "",
                      phone_number: mergedObj.phone_number || u.phone_number || "",
                      id: canonicalId,
                      user_id: canonicalId,
                      status: "Active",
                      is_active: true,
                      sync_status: "synced",
                      updated_at: Date.now(),
                    }
                  }
                  return u
                })
              await db.userSession.put({
                id: "facility_staff_cache",
                data: updated,
                updated_at: Date.now(),
              })
            }
          } catch (err) {
            console.warn(
              "[SyncEngine] Failed to reconcile user tempId in cache:",
              err
            )
          }
        }

        const remainingQueue = await db.offlineQueue.toArray()
        for (const queueItem of remainingQueue) {
          let modified = false
          let newEndpoint = queueItem.endpoint
          let newPayload = queueItem.payload

          const targetReplacement =
            entityType === "mother" &&
            (queueItem.entity_type === "message" ||
              queueItem.endpoint?.includes("/message"))
              ? responseData?.result?.user?.user_id ||
                responseData?.user?.user_id ||
                primaryCanonicalId
              : primaryCanonicalId

          if (newEndpoint && newEndpoint.includes(tempId)) {
            newEndpoint = newEndpoint.replaceAll(tempId, targetReplacement)
            modified = true
          }

          if (newPayload) {
            let payloadStr = JSON.stringify(newPayload)
            if (payloadStr.includes(tempId)) {
              payloadStr = payloadStr.replaceAll(tempId, targetReplacement)
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

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("bms:temp-id-reconciled", {
              detail: {
                entityType,
                tempId,
                canonicalId: primaryCanonicalId,
                responseData,
              },
            })
          )
        }
      }
    )
  }

  public async resyncUnsyncedRecords() {
    try {
      const pendingQueue = await db.offlineQueue.toArray()
      const queuedTempIds = new Set(
        pendingQueue.map((q) => q.temp_id).filter(Boolean)
      )

      const allPregnancies = await db.pregnancies.toArray()
      const pregMap = new Map<string, string>()
      for (const p of allPregnancies) {
        const pId = p.pregnancy_id || p.id || p._id
        const pMid = p.mother_id || p.motherId
        if (pId && !pId.startsWith("temp-") && pMid) {
          pregMap.set(pMid, pId)
        }
      }

      const mothers = await db.mothers.toArray()
      for (const mother of mothers) {
        const isTemp =
          String(mother.id).startsWith("temp-") ||
          mother.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(mother.id)) {
          console.log(
            `[SyncEngine] Auto-recovering offline mother ${mother.id} to outbox queue...`
          )
          await db.offlineQueue.add({
            client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entity_type: "mother",
            action: "CREATE",
            endpoint: "/api/v1/mother/register",
            method: "POST",
            payload: {
              first_name: mother.first_name || mother.user?.first_name,
              last_name: mother.last_name || mother.user?.last_name,
              middle_name: mother.middle_name || mother.user?.middle_name,
              address: mother.address || mother.user?.address,
              phone_number: mother.phone_number || mother.user?.phone_number,
              email: mother.email || mother.user?.email,
              birth_date: mother.birth_date,
              civil_status: mother.civil_status,
              blood_type: mother.blood_type,
              family_serial_no: mother.family_serial_no,
              facility_id: mother.facility_id,
            },
            temp_id: mother.id,
            retry_count: 0,
            created_at: Date.now(),
          })
          queuedTempIds.add(mother.id)
        } else if (
          mother.sync_status === "pending_update" &&
          mother.id &&
          !String(mother.id).startsWith("temp-")
        ) {
          const mId = mother.mother_id || mother.id
          const alreadyQueued = pendingQueue.some(
            (q) =>
              q.endpoint?.includes(`/mother/update/${mId}`) ||
              (q.temp_id === mId && q.action === "UPDATE")
          )
          if (!alreadyQueued) {
            console.log(
              `[SyncEngine] Auto-recovering offline mother update ${mId} to outbox queue...`
            )
            await db.offlineQueue.add({
              client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              entity_type: "mother",
              action: "UPDATE",
              endpoint: `/api/v1/mother/update/${mId}`,
              method: "PUT",
              payload: {
                first_name: mother.first_name || mother.user?.first_name,
                last_name: mother.last_name || mother.user?.last_name,
                middle_name: mother.middle_name || mother.user?.middle_name,
                address: mother.address || mother.user?.address,
                phone_number: mother.phone_number || mother.user?.phone_number,
                email: mother.email || mother.user?.email,
                birth_date: mother.birth_date,
                civil_status: mother.civil_status,
                blood_type: mother.blood_type,
                family_serial_no: mother.family_serial_no,
                photo_url: mother.photo_url || mother.profile_url || mother.user?.profile_url,
                profile_url: mother.photo_url || mother.profile_url || mother.user?.profile_url,
              },
              retry_count: 0,
              created_at: Date.now(),
            })
          }
        }
      }

      const pregnancies = await db.pregnancies.toArray()
      for (const preg of pregnancies) {
        const isTemp =
          String(preg.id).startsWith("temp-") ||
          preg.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(preg.id)) {
          console.log(
            `[SyncEngine] Auto-recovering offline pregnancy ${preg.id} to outbox queue...`
          )
          const resolvedMotherId =
            preg.mother_id && !String(preg.mother_id).startsWith("temp-")
              ? preg.mother_id
              : (await db.mothers.get(preg.mother_id))?.mother_id || preg.mother_id

          await db.offlineQueue.add({
            client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entity_type: "pregnancy",
            action: "CREATE",
            endpoint: "/api/v1/pregnancy/register",
            method: "POST",
            payload: {
              mother_id: resolvedMotherId,
              date_of_registration:
                preg.date_of_registration || new Date().toISOString(),
              lmp_date: preg.lmp_date || preg.date_of_registration || new Date().toISOString(),
              gravida: Number(preg.gravida ?? 1),
              parity: Number(preg.parity ?? 0),
              previous_delivery_history:
                preg.previous_delivery_history || undefined,
              co_morbidities: preg.co_morbidities || undefined,
              age_group: preg.age_group || "Adult",
              bmi_1st_trimester: preg.bmi_1st_trimester
                ? Number(preg.bmi_1st_trimester)
                : null,
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

      const visits = await db.prenatalVisits.toArray()
      for (const visit of visits) {
        const isTemp =
          String(visit.id).startsWith("temp-") ||
          visit.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(visit.id)) {
          const resolvedPregId =
            visit.pregnancy_id && !visit.pregnancy_id.startsWith("temp-")
              ? visit.pregnancy_id
              : visit.mother_id
                ? pregMap.get(visit.mother_id) || visit.pregnancy_id
                : visit.pregnancy_id

          console.log(
            `[SyncEngine] Auto-recovering offline prenatal visit ${visit.id} to outbox queue...`
          )
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
              age_of_gestation_weeks:
                Number(visit.age_of_gestation_weeks) || 12,
              weight_kg: Number(visit.weight_kg) || 50,
              temperature_celsius: Number(visit.temperature_celsius) || 36.5,
              pulse_rate_bpm: Number(visit.pulse_rate_bpm) || 75,
              bp_systolic: Number(visit.bp_systolic) || 120,
              bp_diastolic: Number(visit.bp_diastolic) || 80,
              fundic_height_cm: visit.fundic_height_cm
                ? Number(visit.fundic_height_cm)
                : null,
              fetal_heart_tone_bpm: visit.fetal_heart_tone_bpm
                ? Number(visit.fetal_heart_tone_bpm)
                : null,
              chief_complaint: visit.chief_complaint || undefined,
              danger_signs_observed: visit.danger_signs_observed || undefined,
              risk_level_assessed: visit.risk_level_assessed || "Low Risk",
            },
            temp_id: visit.id,
            retry_count: 0,
            created_at: Date.now(),
          })
          queuedTempIds.add(visit.id)
        }
      }

      const appointments = await db.appointments.toArray()
      for (const appt of appointments) {
        const isTemp =
          String(appt.id).startsWith("temp-") ||
          appt.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(appt.id)) {
          console.log(
            `[SyncEngine] Auto-recovering offline appointment ${appt.id} to outbox queue...`
          )
          await db.offlineQueue.add({
            client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entity_type: "appointment",
            action: "CREATE",
            endpoint: "/api/v1/appointment/register",
            method: "POST",
            payload: {
              mother_id: appt.mother_id,
              user_id: appt.user_id,
              facility_id: appt.facility_id,
              appointment_date: appt.appointment_date,
              appointment_time: appt.appointment_time,
              appointment_type: appt.appointment_type,
              reason: (appt as any).reason || undefined,
              status: appt.status || "Scheduled",
            },
            temp_id: appt.id,
            retry_count: 0,
            created_at: Date.now(),
          })
          queuedTempIds.add(appt.id)
        }
      }

      const labs = await db.labRecords.toArray()
      for (const lab of labs) {
        const isTemp =
          String(lab.id).startsWith("temp-") ||
          lab.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(lab.id)) {
          console.log(
            `[SyncEngine] Auto-recovering offline lab record ${lab.id} to outbox queue...`
          )
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
              date_of_screening:
                lab.date_of_screening || new Date().toISOString(),
              remarks: lab.remarks || undefined,
            },
            temp_id: lab.id,
            retry_count: 0,
            created_at: Date.now(),
          })
          queuedTempIds.add(lab.id)
        }
      }

      const supps = await db.supplements.toArray()
      for (const supp of supps) {
        const isTemp =
          String(supp.id).startsWith("temp-") ||
          supp.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(supp.id)) {
          console.log(
            `[SyncEngine] Auto-recovering offline supplement ${supp.id} to outbox queue...`
          )
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

      const referrals = await db.referrals.toArray()
      for (const ref of referrals) {
        const isTemp =
          String(ref.id).startsWith("temp-") ||
          ref.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(ref.id)) {
          console.log(
            `[SyncEngine] Auto-recovering offline referral ${ref.id} to outbox queue...`
          )
          await db.offlineQueue.add({
            client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entity_type: "referral",
            action: "CREATE",
            endpoint: "/api/v1/referral/register",
            method: "POST",
            payload: {
              pregnancy_id: ref.pregnancy_id,
              mother_id: ref.mother_id || undefined,
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
        } else if (
          ref.sync_status === "pending_update" &&
          ref.id &&
          !ref.id.startsWith("temp-")
        ) {
          console.log(
            `[SyncEngine] Auto-recovering offline referral update ${ref.id} to outbox queue...`
          )
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

      const msgs = await db.messages.toArray()
      for (const msg of msgs) {
        const isTemp =
          String(msg.id).startsWith("temp-") ||
          msg.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(msg.id)) {
          console.log(
            `[SyncEngine] Auto-recovering offline message ${msg.id} to outbox queue...`
          )
          await db.offlineQueue.add({
            client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entity_type: "message",
            action: "CREATE",
            endpoint: "/api/v1/message/create",
            method: "POST",
            payload: {
              receiver_id: msg.receiver_id,
              message_content: msg.message_content,
              message_type: msg.message_type || "text",
              message_date: msg.message_date || new Date().toISOString(),
            },
            temp_id: msg.id,
            retry_count: 0,
            created_at: Date.now(),
          })
          queuedTempIds.add(msg.id)
        }
      }

      const staffCached = await db.userSession.get("facility_staff_cache")
      if (staffCached && Array.isArray(staffCached.data)) {
        for (const staff of staffCached.data) {
          const isTemp =
            String(staff.id).startsWith("temp-") ||
            staff.sync_status === "pending_create"
          if (isTemp && !queuedTempIds.has(staff.id)) {
            console.log(
              `[SyncEngine] Auto-recovering offline staff creation ${staff.id} to outbox queue...`
            )
            await db.offlineQueue.add({
              client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              entity_type: "user",
              action: "CREATE",
              endpoint: "/api/v1/auth/create-staff",
              method: "POST",
              payload: {
                first_name: staff.first_name,
                last_name: staff.last_name,
                email: staff.email,
                phone_number: staff.phone_number,
                role: staff.role || staff.position,
                sector: staff.sector,
                password: Math.random().toString(36).slice(-8) + "Aa1!",
              },
              temp_id: staff.id,
              retry_count: 0,
              created_at: Date.now(),
            })
            queuedTempIds.add(staff.id)
          }
        }
      }
      const ehrDocs = await db.ehrDocuments.toArray()
      for (const doc of ehrDocs) {
        const isTemp =
          String(doc.id).startsWith("temp-") ||
          String(doc.id).startsWith("EHR-") ||
          doc.sync_status === "pending_create"
        if (isTemp && !queuedTempIds.has(doc.id)) {
          console.log(
            `[SyncEngine] Auto-recovering offline EHR document ${doc.id} to outbox queue...`
          )
          await db.offlineQueue.add({
            client_mutation_id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            entity_type: "ehr_doc",
            action: "CREATE",
            endpoint: "/api/v1/ehr/register",
            method: "POST",
            payload: {
              title: doc.title || doc.document_name,
              category: doc.category,
              patient_name: doc.patientName || doc.patient_name,
              security_level: doc.securityLevel || doc.security_level,
              format: doc.format,
              size: doc.size,
              file_url: doc.fileUrl || doc.file_url,
              uploaded_by: doc.uploadedBy || doc.uploaded_by,
              mother_id: doc.mother_id,
              facility_id: doc.facility_id,
            },
            temp_id: doc.id,
            retry_count: 0,
            created_at: Date.now(),
          })
          queuedTempIds.add(doc.id)
        }
      }
    } catch (err) {
      console.warn("[SyncEngine] Auto-resync unsynced records error:", err)
    }
  }

  public async syncEhrDocuments(): Promise<void> {
    if (!this.isNetworkOnline()) return
    try {
      const userStr =
        typeof window !== "undefined" ? localStorage.getItem("user") : null
      const user = userStr ? JSON.parse(userStr) : null
      const facilityId = user?.facility_id || user?.facilityId
      const queryParams = facilityId ? `?facility_id=${facilityId}` : ""
      const res = await apiClient.get(`/api/v1/ehr/getAll${queryParams}`)
      const remoteDocs =
        res.data?.data || (Array.isArray(res.data) ? res.data : [])

      if (Array.isArray(remoteDocs) && remoteDocs.length > 0) {
        const pendingQueue = await this.getQueue()
        const pendingTempIds = new Set(
          pendingQueue.map((m) => m.temp_id).filter(Boolean)
        )

        const formattedRemote = remoteDocs
          .filter((item: any) => {
            const canonicalId = item.document_id || item.id
            return !pendingTempIds.has(canonicalId)
          })
          .map((item: any) => {
            const canonicalId = item.document_id || item.id
            const motherUser = item.mother?.user
            const resolvedPatientName =
              item.patient_name ||
              (motherUser
                ? `${motherUser.first_name || ""} ${motherUser.last_name || ""}`.trim()
                : "Facility General")

            return {
              id: canonicalId,
              document_id: canonicalId,
              title: item.title || item.document_name || "Facility Document",
              document_name:
                item.title || item.document_name || "Facility Document",
              category: item.category || "Clinical Protocols",
              patientName: resolvedPatientName,
              patient_name: resolvedPatientName,
              securityLevel:
                item.security_level || item.securityLevel || "Confidential",
              security_level:
                item.security_level || item.securityLevel || "Confidential",
              format: item.format || "PDF",
              size: item.size || "1.0 MB",
              dateUploaded: item.created_at
                ? new Date(item.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }),
              date_uploaded: item.created_at || new Date().toISOString(),
              uploadedBy:
                item.uploaded_by || item.uploadedBy || "Healthcare Staff",
              uploaded_by:
                item.uploaded_by || item.uploadedBy || "Healthcare Staff",
              fileUrl: item.file_url || item.fileUrl,
              file_url: item.file_url || item.fileUrl,
              mother_id: item.mother_id,
              facility_id: item.facility_id || facilityId,
              sync_status: "synced" as const,
              updated_at: item.updated_at
                ? new Date(item.updated_at).getTime()
                : Date.now(),
            }
          })

        if (formattedRemote.length > 0) {
          await db.ehrDocuments.bulkPut(formattedRemote)
        }
      }
    } catch (err) {
      console.warn("[SyncEngine] Failed to pre-cache EHR documents:", err)
    }
  }
}

export const syncEngine = new SyncEngine()
