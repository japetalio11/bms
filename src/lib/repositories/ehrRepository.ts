import { db } from "@/lib/db/bmsDatabase"
import type { LocalEhrDocument } from "@/lib/db/bmsDatabase"
import { apiClient } from "@/lib/apiClient"
import { syncEngine } from "@/lib/sync/syncEngine"

export interface EhrDocument {
  id: string
  title: string
  category: string
  patientName: string
  securityLevel: string
  format: string
  size: string
  dateUploaded: string
  uploadedBy: string
  fileUrl?: string
  mother_id?: string
  facility_id?: string
  sync_status?: "synced" | "pending_create" | "pending_update" | "error"
  last_error?: string
}

export const ehrRepository = {
  async getAllDocuments(facilityId?: string): Promise<EhrDocument[]> {
    let localList: LocalEhrDocument[] = []
    try {
      localList = await db.ehrDocuments.toArray()
    } catch (err) {
      console.warn("[ehrRepository] Local Dexie query error:", err)
    }

    if (syncEngine.isNetworkOnline()) {
      try {
        const queryParams = facilityId ? `?facility_id=${facilityId}` : ""
        const res = await apiClient.get(`/api/v1/ehr/getAll${queryParams}`)
        const remoteDocs = res.data?.data || (Array.isArray(res.data) ? res.data : [])

        if (Array.isArray(remoteDocs)) {
          const pendingQueue = await syncEngine.getQueue()
          const pendingTempIds = new Set(
            pendingQueue.map((m) => m.temp_id).filter(Boolean)
          )

          const formattedRemote: LocalEhrDocument[] = remoteDocs.map((item: any) => {
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
              document_name: item.title || item.document_name || "Facility Document",
              category: item.category || "Clinical Protocols",
              patientName: resolvedPatientName,
              patient_name: resolvedPatientName,
              securityLevel: item.security_level || item.securityLevel || "Confidential",
              security_level: item.security_level || item.securityLevel || "Confidential",
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
              uploadedBy: item.uploaded_by || item.uploadedBy || "Healthcare Staff",
              uploaded_by: item.uploaded_by || item.uploadedBy || "Healthcare Staff",
              fileUrl: item.file_url || item.fileUrl,
              file_url: item.file_url || item.fileUrl,
              mother_id: item.mother_id,
              facility_id: item.facility_id || facilityId,
              sync_status: "synced" as const,
              updated_at: item.updated_at ? new Date(item.updated_at).getTime() : Date.now(),
            }
          })

          const remoteIds = new Set(formattedRemote.map((d) => d.id))

          // Clean up stale synced documents that no longer exist on server, preserving pending outbox docs
          const toDelete = localList.filter((d) => {
            const isPending =
              d.sync_status !== "synced" ||
              (d.id && pendingTempIds.has(d.id)) ||
              (d.document_id && pendingTempIds.has(d.document_id))
            if (isPending) return false
            return (
              !remoteIds.has(d.id) &&
              (!d.document_id || !remoteIds.has(d.document_id))
            )
          })

          for (const item of toDelete) {
            if (item.id) await db.ehrDocuments.delete(item.id).catch(() => {})
          }

          if (formattedRemote.length > 0) {
            await db.ehrDocuments.bulkPut(formattedRemote)
          }

          localList = await db.ehrDocuments.toArray()
        }
      } catch (apiErr) {
        console.warn("[ehrRepository] Online getAllDocuments failed, using offline fallback:", apiErr)
      }
    }

    let result = localList
    if (facilityId) {
      result = result.filter(
        (doc) => !doc.facility_id || doc.facility_id === facilityId
      )
    }

    return result.map((item: any) => ({
      id: item.id || item.document_id,
      title: item.title || item.document_name || "Facility Document",
      category: item.category || "Clinical Protocols",
      patientName: item.patientName || item.patient_name || "Facility General",
      securityLevel: item.securityLevel || item.security_level || "Confidential",
      format: item.format || "PDF",
      size: item.size || "1.0 MB",
      dateUploaded:
        item.dateUploaded ||
        new Date(item.updated_at || Date.now()).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      uploadedBy: item.uploadedBy || item.uploaded_by || "Healthcare Staff",
      fileUrl: item.fileUrl || item.file_url,
      mother_id: item.mother_id,
      facility_id: item.facility_id,
      sync_status: item.sync_status,
      last_error: item.last_error,
    }))
  },

  async getLocalDocuments(facilityId?: string): Promise<EhrDocument[]> {
    let localList: LocalEhrDocument[] = []
    try {
      localList = await db.ehrDocuments.toArray()
    } catch (err) {
      console.warn("[ehrRepository] Local Dexie query error:", err)
    }

    let result = localList
    if (facilityId) {
      result = result.filter(
        (doc) => !doc.facility_id || doc.facility_id === facilityId
      )
    }

    return result.map((item: any) => ({
      id: item.id || item.document_id,
      title: item.title || item.document_name || "Facility Document",
      category: item.category || "Clinical Protocols",
      patientName: item.patientName || item.patient_name || "Facility General",
      securityLevel: item.securityLevel || item.security_level || "Confidential",
      format: item.format || "PDF",
      size: item.size || "1.0 MB",
      dateUploaded:
        item.dateUploaded ||
        new Date(item.updated_at || Date.now()).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      uploadedBy: item.uploadedBy || item.uploaded_by || "Healthcare Staff",
      fileUrl: item.fileUrl || item.file_url,
      mother_id: item.mother_id,
      facility_id: item.facility_id,
      sync_status: item.sync_status,
      last_error: item.last_error,
    }))
  },

  async createDocument(doc: EhrDocument): Promise<EhrDocument> {
    const isOnline = syncEngine.isNetworkOnline()
    const tempId = doc.id || `temp-ehr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    const localItem: LocalEhrDocument = {
      ...doc,
      id: tempId,
      document_id: tempId,
      title: doc.title,
      document_name: doc.title,
      patient_name: doc.patientName,
      patientName: doc.patientName,
      security_level: doc.securityLevel,
      securityLevel: doc.securityLevel,
      uploaded_by: doc.uploadedBy,
      uploadedBy: doc.uploadedBy,
      file_url: doc.fileUrl,
      fileUrl: doc.fileUrl,
      sync_status: (isOnline ? "synced" : "pending_create") as "synced" | "pending_create",
      updated_at: Date.now(),
    }

    await db.ehrDocuments.put(localItem)

    const payload = {
      title: doc.title,
      category: doc.category,
      patient_name: doc.patientName,
      security_level: doc.securityLevel,
      format: doc.format,
      size: doc.size,
      file_url: doc.fileUrl,
      uploaded_by: doc.uploadedBy,
      mother_id: doc.mother_id,
      facility_id: doc.facility_id,
    }

    if (isOnline) {
      try {
        const res = await apiClient.post("/api/v1/ehr/register", payload)
        const created = res.data?.data
        if (created?.document_id) {
          await db.ehrDocuments.delete(tempId)
          const canonicalDoc: LocalEhrDocument = {
            ...localItem,
            id: created.document_id,
            document_id: created.document_id,
            sync_status: "synced",
            updated_at: Date.now(),
          }
          await db.ehrDocuments.put(canonicalDoc)
          return {
            ...doc,
            id: created.document_id,
            sync_status: "synced",
          }
        }
      } catch (err) {
        console.warn("[ehrRepository] Online createDocument failed, enqueuing for sync:", err)
      }
    }

    localItem.sync_status = "pending_create"
    await db.ehrDocuments.put(localItem)

    await syncEngine.enqueueMutation({
      entity_type: "ehr_doc",
      action: "CREATE",
      endpoint: "/api/v1/ehr/register",
      method: "POST",
      payload,
      temp_id: tempId,
    })

    return {
      ...doc,
      id: tempId,
      sync_status: "pending_create",
    }
  },

  async deleteDocument(id: string): Promise<void> {
    await db.ehrDocuments.delete(id)
    if (id.startsWith("temp-") || id.startsWith("EHR-")) {
      await syncEngine.cancelPendingMutation(id)
    }

    if (syncEngine.isNetworkOnline() && !id.startsWith("temp-")) {
      try {
        await apiClient.delete(`/api/v1/ehr/delete/${id}`)
      } catch (err) {
        console.warn("[ehrRepository] Online deleteDocument failed, enqueuing delete:", err)
        await syncEngine.enqueueMutation({
          entity_type: "ehr_doc",
          action: "DELETE",
          endpoint: `/api/v1/ehr/delete/${id}`,
          method: "DELETE",
          payload: { id },
          temp_id: id,
        })
      }
    } else if (!id.startsWith("temp-")) {
      await syncEngine.enqueueMutation({
        entity_type: "ehr_doc",
        action: "DELETE",
        endpoint: `/api/v1/ehr/delete/${id}`,
        method: "DELETE",
        payload: { id },
        temp_id: id,
      })
    }
  },
}
