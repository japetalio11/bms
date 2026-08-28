import { db } from "@/lib/db/bmsDatabase"
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
}

const SAMPLE_PDF_DATA_URL = "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDAKL1R5cGUgL1BhZ2VzCi9Db3VudCAxCi9LaWRzIFsgMyAwIFIgXQo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDIgMCBSCi9NZWRpYUJveCBbIDAgMCA2MTIgNzkyIF0KL1Jlc291cmNlcyA8PAovRm9udCA8PAovRjEgNCAwIFIKPj4KPj4KL0NvbnRlbnRzIDUgMCBSCj4+CmVuZG9iago0IDAgb2JqCjw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+PgplbmRvYmoKNSAwIG9iago8PAovTGVuZ3RoIDQ0Cj4+CnN0cmVhbQpCVAovRjEgMjQgVGYKNzIgNzEyIFRkCihNYXRlcm5hbCBIZWFsdGggRUhSIFJlY29yZCkgVGoKRU4Kc3RyZWFtCmVuZG9iagp4cmVmCjAgNgowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbgowMDAwMDAwNTggMDAwMDAgbgowMDAwMDAxMTUgMDAwMDAgbgowMDAwMDAyNDMgMDAwMDAgbgowMDAwMDAzMTIgMDAwMDAgbgordHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0MDcKJSVFT0YK"

const DEFAULT_DOCUMENTS: EhrDocument[] = [
  {
    id: "EHR-1001",
    title: "Maternal Health Clinical Guidelines 2026",
    category: "Clinical Protocols",
    patientName: "Facility General",
    securityLevel: "Standard",
    format: "PDF",
    size: "2.4 MB",
    dateUploaded: "Aug 15, 2026",
    uploadedBy: "Dr. Elena Rostova",
    fileUrl: SAMPLE_PDF_DATA_URL,
  },
  {
    id: "EHR-1002",
    title: "Complete Blood Count & Typhoid Screening",
    category: "Lab & Diagnostics",
    patientName: "Facility General",
    securityLevel: "Confidential",
    format: "PDF",
    size: "1.1 MB",
    dateUploaded: "Aug 20, 2026",
    uploadedBy: "Lab Technician",
    fileUrl: SAMPLE_PDF_DATA_URL,
  },
  {
    id: "EHR-1003",
    title: "Maternal Nutrition & Supplement Audit",
    category: "Facility Audit & Accreditation",
    patientName: "Facility General",
    securityLevel: "Restricted",
    format: "PDF",
    size: "3.8 MB",
    dateUploaded: "Aug 24, 2026",
    uploadedBy: "Chief Medical Officer",
    fileUrl: SAMPLE_PDF_DATA_URL,
  },
]

export const ehrRepository = {
  /**
   * Retrieves all EHR documents from local Dexie database.
   */
  async getAllDocuments(facilityId?: string): Promise<EhrDocument[]> {
    try {
      const localDocs = await db.ehrDocuments.toArray()

      // Seed initial sample documents if IndexedDB table is empty
      if (localDocs.length === 0) {
        const initialDocs = DEFAULT_DOCUMENTS.map((doc) => ({
          id: doc.id,
          title: doc.title,
          category: doc.category,
          patientName: doc.patientName,
          securityLevel: doc.securityLevel,
          format: doc.format,
          size: doc.size,
          dateUploaded: doc.dateUploaded,
          uploadedBy: doc.uploadedBy,
          facility_id: facilityId || "default",
          sync_status: "synced" as const,
          updated_at: Date.now(),
        }))
        await db.ehrDocuments.bulkPut(initialDocs)
        return DEFAULT_DOCUMENTS
      }

      return localDocs.map((item: any) => ({
        id: item.id,
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
      }))
    } catch (err) {
      console.warn("[ehrRepository] Dexie query error:", err)
      return DEFAULT_DOCUMENTS
    }
  },

  /**
   * Saves a new EHR document to local Dexie database and queues offline mutation.
   */
  async createDocument(doc: EhrDocument): Promise<EhrDocument> {
    const localItem = {
      ...doc,
      document_name: doc.title,
      sync_status: "pending_create" as const,
      updated_at: Date.now(),
    }

    await db.ehrDocuments.put(localItem)

    await syncEngine.enqueueMutation({
      entity_type: "ehr_doc",
      action: "CREATE",
      endpoint: "/api/v1/ehr/upload",
      method: "POST",
      payload: doc,
      temp_id: doc.id,
    })

    return doc
  },

  /**
   * Deletes an EHR document from local Dexie database.
   */
  async deleteDocument(id: string): Promise<void> {
    await db.ehrDocuments.delete(id)
    if (!id.startsWith("EHR-100")) {
      await syncEngine.enqueueMutation({
        entity_type: "ehr_doc",
        action: "DELETE",
        endpoint: `/api/v1/ehr/delete/${id}`,
        method: "DELETE",
        payload: {},
      })
    }
  },
}
