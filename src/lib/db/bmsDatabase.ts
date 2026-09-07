import Dexie, { type Table } from "dexie"

export interface LocalMother {
  id: string // primary key (_id or temp-uuid)
  first_name?: string
  last_name?: string
  middle_name?: string
  phone_number?: string
  facility_id?: string
  photo_url?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface LocalPregnancy {
  id: string
  mother_id: string
  lmp?: string
  edd?: string
  gravida?: number
  para?: number
  status?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface LocalPrenatalVisit {
  id: string
  mother_id: string
  visit_date?: string
  gestational_age?: number
  weight?: number
  blood_pressure?: string
  heart_rate?: number
  notes?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface LocalAppointment {
  id: string
  mother_id?: string
  user_id?: string
  facility_id?: string
  appointment_date?: string
  time_slot?: string
  type?: string
  status?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface LocalLabRecord {
  id: string
  mother_id: string
  test_name?: string
  result?: string
  file_url?: string
  temp_blob_id?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface LocalSupplement {
  id: string
  mother_id: string
  supplement_name?: string
  dosage?: string
  given_date?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface LocalEhrDocument {
  id: string
  mother_id?: string
  document_name?: string
  category?: string
  file_url?: string
  temp_blob_id?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface OfflineQueueItem {
  id?: number // Auto-increment ID
  client_mutation_id: string
  entity_type: "mother" | "pregnancy" | "prenatal_visit" | "appointment" | "lab_record" | "supplement" | "ehr_doc" | "custom_request"
  action: "CREATE" | "UPDATE" | "DELETE"
  endpoint: string
  method: "POST" | "PUT" | "DELETE"
  payload: any
  temp_id?: string
  blob_ids?: string[]
  retry_count: number
  last_error?: string
  created_at: number
}

export interface LocalBlob {
  id: string
  data: Blob
  filename: string
  mime_type: string
}

export class BMSDatabase extends Dexie {
  mothers!: Table<LocalMother, string>
  pregnancies!: Table<LocalPregnancy, string>
  prenatalVisits!: Table<LocalPrenatalVisit, string>
  appointments!: Table<LocalAppointment, string>
  labRecords!: Table<LocalLabRecord, string>
  supplements!: Table<LocalSupplement, string>
  ehrDocuments!: Table<LocalEhrDocument, string>
  offlineQueue!: Table<OfflineQueueItem, number>
  blobs!: Table<LocalBlob, string>
  userSession!: Table<any, string>

  constructor() {
    super("BMS_Offline_DB")
    this.version(1).stores({
      mothers: "id, facility_id, phone_number, sync_status, updated_at",
      pregnancies: "id, mother_id, sync_status, updated_at",
      prenatalVisits: "id, mother_id, visit_date, sync_status, updated_at",
      appointments: "id, mother_id, user_id, facility_id, appointment_date, status, sync_status, updated_at",
      labRecords: "id, mother_id, sync_status, updated_at",
      supplements: "id, mother_id, sync_status, updated_at",
      ehrDocuments: "id, mother_id, sync_status, updated_at",
      offlineQueue: "++id, client_mutation_id, entity_type, created_at, retry_count",
      blobs: "id",
      userSession: "id",
    })

    this.version(2).stores({
      mothers: "id, mother_id, user_id, facility_id, phone_number, sync_status, updated_at",
      pregnancies: "id, pregnancy_id, mother_id, sync_status, updated_at",
      prenatalVisits: "id, visit_id, pregnancy_id, mother_id, visit_date, sync_status, updated_at",
      appointments: "id, appointment_id, mother_id, user_id, facility_id, appointment_date, status, sync_status, updated_at",
      labRecords: "id, screening_id, pregnancy_id, mother_id, sync_status, updated_at",
      supplements: "id, supplement_id, pregnancy_id, mother_id, sync_status, updated_at",
      ehrDocuments: "id, mother_id, sync_status, updated_at",
      offlineQueue: "++id, client_mutation_id, entity_type, created_at, retry_count",
      blobs: "id",
      userSession: "id",
    })
  }
}

export const db = new BMSDatabase()
