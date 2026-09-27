export interface PrenatalVisitItem {
  visit_id?: string
  pregnancy_id?: string
  health_worker_id?: string
  visit_date: string
  trimester?: number
  visit_number?: number
  age_of_gestation_weeks?: number
  gestational_age_weeks?: number
  weight_kg?: number | string
  temperature_celsius?: number | string
  pulse_rate_bpm?: number
  bp_diastolic?: number
  bp_systolic?: number
  blood_pressure?: string
  fundic_height_cm?: number | string
  fundic_height?: number | string
  fetal_heart_tone_bpm?: number
  fetal_heart_tone?: number
  chief_complaint?: string
  danger_signs_observed?: string
  risk_level_assessed?: string
  healthWorker?: {
    first_name?: string
    last_name?: string
    role?: string
  }
}

export interface LabScreeningItem {
  screening_id?: string
  visit_id?: string
  date_of_screening: string
  screening_type: string
  result?: string
  remarks?: string
  file_url?: string
}

export interface SupplementItem {
  supplement_id?: string
  visit_id?: string
  date_given: string
  supplement_type: string
  tablets_given_count?: number
  is_completed?: boolean
}

export interface CDSSAlertItem {
  alert_id?: string
  pregnancy_id?: string
  visit_id?: string
  alert_type?: string
  alert_message: string
  severity?: string // 'High', 'Moderate', 'Low'
  is_resolved?: boolean
  resolved_by?: string
  resolved_at?: string
  updated_at?: string
}

export interface NewbornRecordItem {
  newborn_id?: string
  delivery_id?: string
  sex: string
  birth_weight_kg: number | string
  status_at_birth: string
  apgar_score: number
}

export interface PostpartumVisitItem {
  postpartum_visit_id?: string
  delivery_id?: string
  visit_date: string
  visit_number: number
  weight_kg?: number | string
  temperature_celsius?: number | string
  pulse_rate_bpm?: number
  bp_diastolic?: number
  bp_systolic?: number
  fundic_height_cm?: number | string
  chief_complaint?: string
  danger_signs_observed?: string
  risk_level_assessed?: string
  vitamin_a_given?: boolean
  iron_supplement_given?: boolean
}

export interface DeliveryOutcomeItem {
  delivery_id: string
  pregnancy_id?: string
  delivery_date: string
  place_of_delivery: string
  mode_of_delivery: string
  duration_of_labor_hours?: number | string
  blood_loss_ml?: number
  delivery_complications?: string
  newbornRecords?: NewbornRecordItem[]
  postpartumVisits?: PostpartumVisitItem[]
}

export interface AppointmentItem {
  appointment_id: string
  appointment_date: string
  appointment_time: string
  appointment_type: string
  reason?: string
  status: string
}

export interface PreviousReferralItem {
  referral_id: string
  date_referred: string
  status: string
  reason: string
  fromFacility?: { facility_name: string }
  toFacility?: { facility_name: string }
  external_facility_name?: string
}

export interface PublicReferralData {
  referral_id: string
  status: string // 'pending', 'acknowledged', 'accepted', 'in_progress', 'completed', 'rejected', 'transferred', 'cancelled'
  date_referred: string
  reason: string
  response_notes?: string
  outcome?: string
  date_responded?: string
  version?: number
  isPinRequired: boolean
  isPinVerified: boolean
  referring_facility: {
    facility_id?: string
    name: string
    address?: string
    contact?: string
    email?: string
    type?: string
    profile_url?: string
  }
  destination_facility: {
    facility_id?: string
    name: string
    address?: string
    contact?: string
    email?: string
  }
  patient?: {
    mother_id?: string
    name: string
    first_name?: string
    middle_name?: string
    last_name?: string
    age?: number
    birth_date?: string
    blood_type?: string
    civil_status?: string
    phone?: string
    address?: string
    email?: string
    profile_url?: string
    family_serial_no?: string
    allergies?: string
  }
  obstetric_info?: {
    pregnancy_id?: string
    gravida?: number
    parity?: number
    lmp_date?: string
    age_group?: string
    bmi_category?: string
    pregnancy_status?: string
    co_morbidities?: string
    previous_delivery_history?: string
    allergies?: string
    deworming_given?: boolean
    deworming_date?: string
    latest_vitals?: {
      visit_date: string
      gestational_age_weeks?: number
      bp?: string
      pulse_rate?: number
      temp?: number | string
      fundic_height?: number | string
      fetal_heart_tone?: number
      risk_level?: string
      danger_signs?: string
      chief_complaint?: string
    } | null
  }
  prenatal_visits?: PrenatalVisitItem[]
  lab_screenings?: LabScreeningItem[]
  supplements?: SupplementItem[]
  cdss_alerts?: CDSSAlertItem[]
  delivery_outcomes?: DeliveryOutcomeItem[]
  appointments?: AppointmentItem[]
  previous_referrals?: PreviousReferralItem[]
}

export interface ParsedReferralDetails {
  chiefComplaint: string
  clinicalConcern: string
  requestedAction: string
  previousDelivery: string
  coMorbidities: string
  allergies: string
  cleanNarrative: string
  lmpParsed?: string
  eddParsed?: string
  aogParsed?: string
  gravidaParaParsed?: string
}

export interface VitalStatusDetails {
  bpLevel: "emergency" | "warning" | "elevated" | "normal" | "unknown"
  bpLabel: string
  bpBadgeClass: string
  pulseLevel: "warning" | "normal" | "unknown"
  pulseLabel: string
  tempLevel: "fever" | "hypothermia" | "normal" | "unknown"
  tempLabel: string
  fhtLevel: "distress" | "normal" | "unknown"
  fhtLabel: string
}

export interface ClinicalAlertBadge {
  id: string
  type: "cdss" | "danger" | "obstetric" | "allergy" | "age" | "info"
  severity: "critical" | "warning" | "info"
  title: string
  description?: string
}

export interface DocumentModalData {
  title: string
  type: "lab" | "prescription" | "ultrasound" | "form" | "photo" | "Clinical Photo ID" | string
  date: string
  result?: string
  remarks?: string
  fileUrl?: string
  file_url?: string
  metadata?: Record<string, string | number>
}
