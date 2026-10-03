import Dexie, { type Table } from "dexie"

export interface LocalMother {
  id: string
  first_name?: string
  last_name?: string
  middle_name?: string
  phone_number?: string
  facility_id?: string
  facility_ids?: string[]
  assigned_worker_id?: string
  created_by_id?: string
  assignedWorker?: any
  assigned_worker?: any
  creator?: any
  facilityEnrollments?: Array<{
    facility_id: string
    status: string
    facility?: {
      facility_id: string
      facility_name: string
      type?: string
    }
  }>
  photo_url?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface LocalPregnancy {
  id: string
  mother_id: string
  lmp?: string
  lmp_date?: string
  edd?: string
  edd_date?: string
  gravida?: number
  para?: number
  status?: string
  pregnancy_status?: string
  height_cm?: number
  completed_8anc?: boolean
  prev_caesarean?: boolean
  consecutive_miscarriages?: boolean
  stillbirth_history?: boolean
  pph_history?: boolean
  has_tb?: boolean
  has_heart_disease?: boolean
  has_diabetes?: boolean
  has_asthma?: boolean
  has_goiter?: boolean
  age_group?: string
  bmi_1st_trimester?: number
  bmi_category?: string
  co_morbidities?: string
  previous_delivery_history?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface LocalPrenatalVisit {
  id: string
  mother_id: string
  pregnancy_id?: string
  health_worker_id?: string
  visit_date?: string
  trimester?: number
  visit_number?: number
  age_of_gestation_weeks?: number
  gestational_age?: number
  weight?: number
  weight_kg?: number
  blood_pressure?: string
  bp_systolic?: number
  bp_diastolic?: number
  heart_rate?: number
  pulse_rate_bpm?: number
  temperature_celsius?: number
  fundic_height_cm?: number
  fetal_heart_tone_bpm?: number
  fetal_presentation?: string
  has_vaginal_bleeding?: boolean
  has_pallor?: boolean
  has_edema?: boolean
  has_fever?: boolean
  chief_complaint?: string
  danger_signs_observed?: string
  risk_level_assessed?: string
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
  document_id?: string
  mother_id?: string
  facility_id?: string
  title?: string
  document_name?: string
  category?: string
  patient_name?: string
  patientName?: string
  security_level?: string
  securityLevel?: string
  format?: string
  size?: string
  date_uploaded?: string
  dateUploaded?: string
  uploaded_by?: string
  uploadedBy?: string
  file_url?: string
  fileUrl?: string
  temp_blob_id?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  last_error?: string
  updated_at: number
  [key: string]: any
}

export interface LocalMessage {
  id: string
  sender_id: string
  receiver_id: string
  message_type?: string
  message_content: string
  message_date: string
  is_read?: boolean
  contact_name?: string
  contact_avatar?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface LocalReferral {
  id: string
  referral_id?: string
  pregnancy_id?: string
  mother_id?: string
  from_facility_id?: string
  to_facility_id?: string
  external_facility_name?: string
  reason?: string
  date_referred?: string
  secure_link?: string
  shared_pin?: string
  is_completed?: boolean
  status?: string
  response_notes?: string
  outcome?: string
  date_responded?: string
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  last_error?: string
  updated_at: number
  pregnancy?: any
  fromFacility?: any
  toFacility?: any
  [key: string]: any
}

export interface LocalNotification {
  id: string
  notification_id?: string
  user_id: string
  notification_type: string
  notification_message: string
  notification_date: string
  is_read: boolean
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface LocalDeliveryOutcome {
  id: string
  delivery_id?: string
  pregnancy_id: string
  delivery_date?: string
  place_of_delivery?: string
  mode_of_delivery?: string
  duration_of_labor_hours?: number
  blood_loss_ml?: number
  delivery_complications?: string
  birth_attendant?: string
  maternal_outcome?: string
  immediate_breastfeeding?: boolean
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  newbornRecords?: LocalNewbornRecord[]
  postpartumVisits?: LocalPostpartumVisit[]
  [key: string]: any
}

export interface LocalNewbornRecord {
  id: string
  newborn_id?: string
  delivery_id: string
  sex: string
  birth_weight_kg: number
  status_at_birth: string
  apgar_score: number
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface LocalPostpartumVisit {
  id: string
  postpartum_visit_id?: string
  delivery_id: string
  visit_date?: string
  visit_number?: number
  visit_timing?: string
  weight_kg?: number
  temperature_celsius?: number
  pulse_rate_bpm?: number
  bp_diastolic?: number
  bp_systolic?: number
  fundic_height_cm?: number
  chief_complaint?: string
  danger_signs_observed?: string
  foul_smelling_discharge?: boolean
  cord_condition_normal?: boolean
  fp_method_accepted?: string
  fp_quantity_given?: number
  fp_follow_up_date?: string
  risk_level_assessed?: string
  vitamin_a_given?: boolean
  iron_supplement_given?: boolean
  sync_status: "synced" | "pending_create" | "pending_update" | "error"
  updated_at: number
  [key: string]: any
}

export interface OfflineQueueItem {
  id?: number
  client_mutation_id: string
  entity_type:
    | "mother"
    | "pregnancy"
    | "prenatal_visit"
    | "appointment"
    | "lab_record"
    | "supplement"
    | "ehr_doc"
    | "message"
    | "referral"
    | "notification"
    | "delivery_outcome"
    | "newborn_record"
    | "postpartum_visit"
    | "custom_request"
    | "user"
  action: "CREATE" | "UPDATE" | "DELETE"
  endpoint: string
  method: "POST" | "PUT" | "DELETE"
  payload: any
  temp_id?: string
  blob_ids?: string[]
  retry_count: number
  last_error?: string
  status?: "pending" | "processing" | "error"
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
  messages!: Table<LocalMessage, string>
  referrals!: Table<LocalReferral, string>
  notifications!: Table<LocalNotification, string>
  deliveries!: Table<LocalDeliveryOutcome, string>
  newborns!: Table<LocalNewbornRecord, string>
  postpartumVisits!: Table<LocalPostpartumVisit, string>
  offlineQueue!: Table<OfflineQueueItem, number>
  blobs!: Table<LocalBlob, string>
  userSession!: Table<any, string>

  constructor() {
    super("BMS_Offline_DB")
    this.version(1).stores({
      mothers: "id, facility_id, phone_number, sync_status, updated_at",
      pregnancies: "id, mother_id, sync_status, updated_at",
      prenatalVisits: "id, mother_id, visit_date, sync_status, updated_at",
      appointments:
        "id, mother_id, user_id, facility_id, appointment_date, status, sync_status, updated_at",
      labRecords: "id, mother_id, sync_status, updated_at",
      supplements: "id, mother_id, sync_status, updated_at",
      ehrDocuments: "id, mother_id, sync_status, updated_at",
      offlineQueue:
        "++id, client_mutation_id, entity_type, created_at, retry_count",
      blobs: "id",
      userSession: "id",
    })

    this.version(2).stores({
      mothers:
        "id, mother_id, user_id, facility_id, phone_number, sync_status, updated_at",
      pregnancies: "id, pregnancy_id, mother_id, sync_status, updated_at",
      prenatalVisits:
        "id, visit_id, pregnancy_id, mother_id, visit_date, sync_status, updated_at",
      appointments:
        "id, appointment_id, mother_id, user_id, facility_id, appointment_date, status, sync_status, updated_at",
      labRecords:
        "id, screening_id, pregnancy_id, mother_id, sync_status, updated_at",
      supplements:
        "id, supplement_id, pregnancy_id, mother_id, sync_status, updated_at",
      ehrDocuments: "id, mother_id, sync_status, updated_at",
      offlineQueue:
        "++id, client_mutation_id, entity_type, created_at, retry_count",
      blobs: "id",
      userSession: "id",
    })

    this.version(3).stores({
      mothers:
        "id, mother_id, user_id, facility_id, phone_number, sync_status, updated_at",
      pregnancies: "id, pregnancy_id, mother_id, sync_status, updated_at",
      prenatalVisits:
        "id, visit_id, pregnancy_id, mother_id, visit_date, sync_status, updated_at",
      appointments:
        "id, appointment_id, mother_id, user_id, facility_id, appointment_date, status, sync_status, updated_at",
      labRecords:
        "id, screening_id, pregnancy_id, mother_id, sync_status, updated_at",
      supplements:
        "id, supplement_id, pregnancy_id, mother_id, sync_status, updated_at",
      ehrDocuments: "id, mother_id, sync_status, updated_at",
      messages:
        "id, sender_id, receiver_id, message_date, is_read, sync_status, updated_at",
      offlineQueue:
        "++id, client_mutation_id, entity_type, created_at, retry_count",
      blobs: "id",
      userSession: "id",
    })

    this.version(4).stores({
      mothers:
        "id, mother_id, user_id, facility_id, phone_number, sync_status, updated_at",
      pregnancies: "id, pregnancy_id, mother_id, sync_status, updated_at",
      prenatalVisits:
        "id, visit_id, pregnancy_id, mother_id, visit_date, sync_status, updated_at",
      appointments:
        "id, appointment_id, mother_id, user_id, facility_id, appointment_date, status, sync_status, updated_at",
      labRecords:
        "id, screening_id, pregnancy_id, mother_id, sync_status, updated_at",
      supplements:
        "id, supplement_id, pregnancy_id, mother_id, sync_status, updated_at",
      ehrDocuments: "id, mother_id, sync_status, updated_at",
      messages:
        "id, sender_id, receiver_id, message_date, is_read, sync_status, updated_at",
      referrals:
        "id, referral_id, pregnancy_id, from_facility_id, to_facility_id, status, sync_status, updated_at",
      offlineQueue:
        "++id, client_mutation_id, entity_type, created_at, retry_count",
      blobs: "id",
      userSession: "id",
    })

    this.version(5).stores({
      mothers:
        "id, mother_id, user_id, facility_id, phone_number, sync_status, updated_at",
      pregnancies: "id, pregnancy_id, mother_id, sync_status, updated_at",
      prenatalVisits:
        "id, visit_id, pregnancy_id, mother_id, visit_date, sync_status, updated_at",
      appointments:
        "id, appointment_id, mother_id, user_id, facility_id, appointment_date, status, sync_status, updated_at",
      labRecords:
        "id, screening_id, pregnancy_id, mother_id, sync_status, updated_at",
      supplements:
        "id, supplement_id, pregnancy_id, mother_id, sync_status, updated_at",
      ehrDocuments: "id, mother_id, sync_status, updated_at",
      messages:
        "id, sender_id, receiver_id, message_date, is_read, sync_status, updated_at",
      referrals:
        "id, referral_id, pregnancy_id, from_facility_id, to_facility_id, status, sync_status, updated_at",
      notifications:
        "id, notification_id, user_id, notification_type, is_read, sync_status, updated_at",
      offlineQueue:
        "++id, client_mutation_id, entity_type, created_at, retry_count",
      blobs: "id",
      userSession: "id",
    })

    this.version(6).stores({
      mothers:
        "id, mother_id, user_id, facility_id, assigned_worker_id, created_by_id, phone_number, sync_status, updated_at",
      pregnancies: "id, pregnancy_id, mother_id, sync_status, updated_at",
      prenatalVisits:
        "id, visit_id, pregnancy_id, mother_id, visit_date, sync_status, updated_at",
      appointments:
        "id, appointment_id, mother_id, user_id, facility_id, appointment_date, status, sync_status, updated_at",
      labRecords:
        "id, screening_id, pregnancy_id, mother_id, sync_status, updated_at",
      supplements:
        "id, supplement_id, pregnancy_id, mother_id, sync_status, updated_at",
      ehrDocuments: "id, mother_id, sync_status, updated_at",
      messages:
        "id, sender_id, receiver_id, message_date, is_read, sync_status, updated_at",
      referrals:
        "id, referral_id, pregnancy_id, from_facility_id, to_facility_id, status, sync_status, updated_at",
      notifications:
        "id, notification_id, user_id, notification_type, is_read, sync_status, updated_at",
      offlineQueue:
        "++id, client_mutation_id, entity_type, created_at, retry_count",
      blobs: "id",
      userSession: "id",
    })

    this.version(7).stores({
      mothers:
        "id, mother_id, user_id, facility_id, assigned_worker_id, created_by_id, phone_number, sync_status, updated_at",
      pregnancies: "id, pregnancy_id, mother_id, sync_status, updated_at",
      prenatalVisits:
        "id, visit_id, pregnancy_id, mother_id, visit_date, sync_status, updated_at",
      appointments:
        "id, appointment_id, mother_id, user_id, facility_id, appointment_date, status, sync_status, updated_at",
      labRecords:
        "id, screening_id, pregnancy_id, mother_id, sync_status, updated_at",
      supplements:
        "id, supplement_id, pregnancy_id, mother_id, sync_status, updated_at",
      ehrDocuments:
        "id, document_id, mother_id, facility_id, sync_status, updated_at",
      messages:
        "id, sender_id, receiver_id, message_date, is_read, sync_status, updated_at",
      referrals:
        "id, referral_id, pregnancy_id, mother_id, from_facility_id, to_facility_id, status, sync_status, updated_at",
      notifications:
        "id, notification_id, user_id, notification_type, is_read, sync_status, updated_at",
      offlineQueue:
        "++id, client_mutation_id, entity_type, created_at, retry_count",
      blobs: "id",
      userSession: "id",
    })

    this.version(8).stores({
      mothers:
        "id, mother_id, user_id, facility_id, assigned_worker_id, created_by_id, phone_number, sync_status, updated_at",
      pregnancies: "id, pregnancy_id, mother_id, sync_status, updated_at",
      prenatalVisits:
        "id, visit_id, pregnancy_id, mother_id, visit_date, sync_status, updated_at",
      appointments:
        "id, appointment_id, mother_id, user_id, facility_id, appointment_date, status, sync_status, updated_at",
      labRecords:
        "id, screening_id, pregnancy_id, mother_id, sync_status, updated_at",
      supplements:
        "id, supplement_id, pregnancy_id, mother_id, sync_status, updated_at",
      ehrDocuments:
        "id, document_id, mother_id, facility_id, sync_status, updated_at",
      messages:
        "id, sender_id, receiver_id, message_date, is_read, sync_status, updated_at",
      referrals:
        "id, referral_id, pregnancy_id, mother_id, from_facility_id, to_facility_id, status, sync_status, updated_at",
      notifications:
        "id, notification_id, user_id, notification_type, is_read, sync_status, updated_at",
      deliveries:
        "id, delivery_id, pregnancy_id, delivery_date, sync_status, updated_at",
      newborns:
        "id, newborn_id, delivery_id, sex, sync_status, updated_at",
      postpartumVisits:
        "id, postpartum_visit_id, delivery_id, visit_date, sync_status, updated_at",
      offlineQueue:
        "++id, client_mutation_id, entity_type, created_at, retry_count",
      blobs: "id",
      userSession: "id",
    })
  }

  public async clearClinicalCache(
    preserveUnsyncedQueue: boolean = false
  ): Promise<void> {
    await Promise.all([
      this.mothers.clear(),
      this.pregnancies.clear(),
      this.prenatalVisits.clear(),
      this.appointments.clear(),
      this.labRecords.clear(),
      this.supplements.clear(),
      this.ehrDocuments.clear(),
      this.messages.clear(),
      this.referrals.clear(),
      this.notifications.clear(),
      this.deliveries.clear(),
      this.newborns.clear(),
      this.postpartumVisits.clear(),
      this.blobs.clear(),
      this.userSession.clear(),
      ...(preserveUnsyncedQueue ? [] : [this.offlineQueue.clear()]),
    ])
  }
}

export const db = new BMSDatabase()
