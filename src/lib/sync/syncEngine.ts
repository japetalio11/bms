import { db } from "@/lib/db/bmsDatabase"
import type { OfflineQueueItem } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"

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

      // Fast pre-flight network ping on startup (500ms timeout)
      if (!navigator.onLine) {
        this.isOnlineState = false
      } else {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 500)
        const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"
        fetch(`${baseUrl}/api/v1/health`, { method: "HEAD", mode: "no-cors", signal: controller.signal })
          .then(() => {
            clearTimeout(timeoutId)
            this.setNetworkOnline(true)
          })
          .catch(() => {
            clearTimeout(timeoutId)
            console.log("[SyncEngine] Pre-flight ping failed. Setting status to OFFLINE.")
            this.setNetworkOnline(false)
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
        this.processQueue()
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
        this.lastError = err?.message || "Failed to process offline mutation"

        // Increment retry count
        if (item.id) {
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
    if (item.method === "POST") {
      response = await apiClient.post(item.endpoint, payload)
    } else if (item.method === "PUT") {
      response = await apiClient.put(item.endpoint, payload)
    } else if (item.method === "DELETE") {
      response = await apiClient.delete(item.endpoint)
    }

    const responseData = response?.data?.result || response?.data?.data || response?.data

    // ID Reconciliation if temp_id was used
    if (item.temp_id && responseData) {
      const canonicalId = responseData._id || responseData.id || responseData.mother_id
      if (canonicalId && canonicalId !== item.temp_id) {
        await this.reconcileTempId(item.entity_type, item.temp_id, canonicalId, responseData)
      }
    }
  }

  /**
   * Reconciles temporary local UUIDs with backend canonical IDs across Dexie tables.
   */
  private async reconcileTempId(entityType: string, tempId: string, canonicalId: string, responseData: any) {
    console.log(`[SyncEngine] Reconciling temp ID ${tempId} -> canonical ID ${canonicalId}`)

    await db.transaction("rw", [db.mothers, db.pregnancies, db.prenatalVisits, db.appointments, db.labRecords, db.supplements, db.ehrDocuments], async () => {
      if (entityType === "mother") {
        const existingLocal = await db.mothers.get(tempId)
        if (existingLocal) {
          await db.mothers.delete(tempId)
          await db.mothers.put({
            ...existingLocal,
            ...responseData,
            id: canonicalId,
            sync_status: "synced",
            updated_at: Date.now(),
          })
        }
        // Update foreign key references in other tables
        await db.pregnancies.where("mother_id").equals(tempId).modify({ mother_id: canonicalId })
        await db.prenatalVisits.where("mother_id").equals(tempId).modify({ mother_id: canonicalId })
        await db.appointments.where("mother_id").equals(tempId).modify({ mother_id: canonicalId })
        await db.labRecords.where("mother_id").equals(tempId).modify({ mother_id: canonicalId })
        await db.supplements.where("mother_id").equals(tempId).modify({ mother_id: canonicalId })
        await db.ehrDocuments.where("mother_id").equals(tempId).modify({ mother_id: canonicalId })
      } else if (entityType === "appointment") {
        const existingLocal = await db.appointments.get(tempId)
        if (existingLocal) {
          await db.appointments.delete(tempId)
          await db.appointments.put({
            ...existingLocal,
            ...responseData,
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
            ...responseData,
            id: canonicalId,
            sync_status: "synced",
            updated_at: Date.now(),
          })
        }
      }
    })
  }
}

export const syncEngine = new SyncEngine()
