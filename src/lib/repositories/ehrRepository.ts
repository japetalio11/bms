import { db } from "@/lib/db/bmsDatabase"

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

export const ehrRepository = {
  async getAllDocuments(facilityId?: string): Promise<EhrDocument[]> {
    try {
      await db.ehrDocuments
        .where("id")
        .startsWith("EHR-100")
        .delete()
        .catch(() => {})

      const localDocs = await db.ehrDocuments.toArray()
      if (!localDocs || localDocs.length === 0) {
        return []
      }

      return localDocs.map((item: any) => ({
        id: item.id,
        title: item.title || item.document_name || "Facility Document",
        category: item.category || "Clinical Protocols",
        patientName:
          item.patientName || item.patient_name || "Facility General",
        securityLevel:
          item.securityLevel || item.security_level || "Confidential",
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
      return []
    }
  },

  async createDocument(doc: EhrDocument): Promise<EhrDocument> {
    const localItem = {
      ...doc,
      document_name: doc.title,
      sync_status: "synced" as const,
      updated_at: Date.now(),
    }

    await db.ehrDocuments.put(localItem)
    return doc
  },

  async deleteDocument(id: string): Promise<void> {
    await db.ehrDocuments.delete(id)
  },
}
