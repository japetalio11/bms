/**
 * Clinical and Medical Data Validation Helpers
 * 
 * Ensures maternal, fetal, and reproductive health records conform to 
 * physiological thresholds and backend constraints before saving locally
 * or transmitting to the remote API.
 */

export interface ClinicalValidationResult {
  isValid: boolean
  errors: string[]
  errorMap: Record<string, string>
}

export interface PrenatalVitalsInput {
  trimester?: number | string | null
  visit_number?: number | string | null
  age_of_gestation_weeks?: number | string | null
  weight_kg?: number | string | null
  temperature_celsius?: number | string | null
  pulse_rate_bpm?: number | string | null
  bp_systolic?: number | string | null
  bp_diastolic?: number | string | null
  fundic_height_cm?: number | string | null
  fetal_heart_tone_bpm?: number | string | null
  blood_sugar_mg_dl?: number | string | null
  respiratory_rate_cpm?: number | string | null
  oxygen_saturation_pct?: number | string | null
}

export const CLINICAL_LIMITS = {
  trimester: { min: 1, max: 3, label: "Trimester" },
  visit_number: { min: 1, max: 20, label: "Visit number" },
  age_of_gestation_weeks: { min: 1, max: 45, label: "Age of gestation (weeks)" },
  weight_kg: { min: 30, max: 250, label: "Weight (kg)" },
  temperature_celsius: { min: 30.0, max: 45.0, label: "Temperature (°C)" },
  pulse_rate_bpm: { min: 30, max: 250, label: "Pulse rate (BPM)" },
  bp_systolic: { min: 50, max: 300, label: "Systolic BP (mmHg)" },
  bp_diastolic: { min: 30, max: 200, label: "Diastolic BP (mmHg)" },
  fundic_height_cm: { min: 5, max: 60, label: "Fundic height (cm)" },
  fetal_heart_tone_bpm: { min: 50, max: 220, label: "Fetal heart tone (BPM)" },
  blood_sugar_mg_dl: { min: 30, max: 600, label: "Blood sugar (mg/dL)" },
  respiratory_rate_cpm: { min: 8, max: 60, label: "Respiratory rate (cpm)" },
  oxygen_saturation_pct: { min: 50, max: 100, label: "Oxygen saturation (%)" },
}

/**
 * Validates clinical vitals for prenatal visits and encounters
 */
export function validatePrenatalVitals(data: PrenatalVitalsInput): ClinicalValidationResult {
  const errors: string[] = []
  const errorMap: Record<string, string> = {}

  const addError = (field: string, message: string) => {
    errors.push(message)
    if (!errorMap[field]) {
      errorMap[field] = message
    }
  }

  // 1. Trimester
  if (data.trimester !== undefined && data.trimester !== null && data.trimester !== "") {
    const val = Number(data.trimester)
    if (isNaN(val) || val < CLINICAL_LIMITS.trimester.min || val > CLINICAL_LIMITS.trimester.max) {
      addError("trimester", `Trimester must be between ${CLINICAL_LIMITS.trimester.min} and ${CLINICAL_LIMITS.trimester.max}.`)
    }
  }

  // 2. Visit number
  if (data.visit_number !== undefined && data.visit_number !== null && data.visit_number !== "") {
    const val = Number(data.visit_number)
    if (isNaN(val) || val < CLINICAL_LIMITS.visit_number.min || val > CLINICAL_LIMITS.visit_number.max) {
      addError("visit_number", `Visit number must be a positive integer between ${CLINICAL_LIMITS.visit_number.min} and ${CLINICAL_LIMITS.visit_number.max}.`)
    }
  }

  // 3. Gestation (Weeks)
  if (data.age_of_gestation_weeks !== undefined && data.age_of_gestation_weeks !== null && data.age_of_gestation_weeks !== "") {
    const val = Number(data.age_of_gestation_weeks)
    if (isNaN(val) || val < CLINICAL_LIMITS.age_of_gestation_weeks.min || val > CLINICAL_LIMITS.age_of_gestation_weeks.max) {
      addError("age_of_gestation_weeks", `Age of gestation must be between ${CLINICAL_LIMITS.age_of_gestation_weeks.min} and ${CLINICAL_LIMITS.age_of_gestation_weeks.max} weeks.`)
    }
  }

  // 4. Weight (kg)
  if (data.weight_kg !== undefined && data.weight_kg !== null && data.weight_kg !== "") {
    const val = Number(data.weight_kg)
    if (isNaN(val) || val < CLINICAL_LIMITS.weight_kg.min || val > CLINICAL_LIMITS.weight_kg.max) {
      addError("weight_kg", `Weight must be between ${CLINICAL_LIMITS.weight_kg.min} and ${CLINICAL_LIMITS.weight_kg.max} kg.`)
    }
  }

  // 5. Temperature (°C)
  if (data.temperature_celsius !== undefined && data.temperature_celsius !== null && data.temperature_celsius !== "") {
    const val = Number(data.temperature_celsius)
    if (isNaN(val) || val < CLINICAL_LIMITS.temperature_celsius.min || val > CLINICAL_LIMITS.temperature_celsius.max) {
      addError("temperature_celsius", `Temperature must be between ${CLINICAL_LIMITS.temperature_celsius.min.toFixed(1)}°C and ${CLINICAL_LIMITS.temperature_celsius.max.toFixed(1)}°C.`)
    }
  }

  // 6. Pulse Rate (BPM)
  if (data.pulse_rate_bpm !== undefined && data.pulse_rate_bpm !== null && data.pulse_rate_bpm !== "") {
    const val = Number(data.pulse_rate_bpm)
    if (isNaN(val) || val < CLINICAL_LIMITS.pulse_rate_bpm.min || val > CLINICAL_LIMITS.pulse_rate_bpm.max) {
      addError("pulse_rate_bpm", `Pulse rate must be between ${CLINICAL_LIMITS.pulse_rate_bpm.min} and ${CLINICAL_LIMITS.pulse_rate_bpm.max} BPM.`)
    }
  }

  // 7. Systolic Blood Pressure
  let numSys: number | null = null
  if (data.bp_systolic !== undefined && data.bp_systolic !== null && data.bp_systolic !== "") {
    const val = Number(data.bp_systolic)
    if (isNaN(val) || val < CLINICAL_LIMITS.bp_systolic.min || val > CLINICAL_LIMITS.bp_systolic.max) {
      addError("bp_systolic", `Systolic blood pressure must be between ${CLINICAL_LIMITS.bp_systolic.min} and ${CLINICAL_LIMITS.bp_systolic.max} mmHg.`)
    } else {
      numSys = val
    }
  }

  // 8. Diastolic Blood Pressure
  let numDia: number | null = null
  if (data.bp_diastolic !== undefined && data.bp_diastolic !== null && data.bp_diastolic !== "") {
    const val = Number(data.bp_diastolic)
    if (isNaN(val) || val < CLINICAL_LIMITS.bp_diastolic.min || val > CLINICAL_LIMITS.bp_diastolic.max) {
      addError("bp_diastolic", `Diastolic blood pressure must be between ${CLINICAL_LIMITS.bp_diastolic.min} and ${CLINICAL_LIMITS.bp_diastolic.max} mmHg.`)
    } else {
      numDia = val
    }
  }

  // 9. Systolic vs Diastolic Relationship
  if (numSys !== null && numDia !== null) {
    if (numDia >= numSys) {
      addError("bp_diastolic", "Diastolic BP cannot be equal to or higher than Systolic BP.")
    } else if (numSys - numDia < 10) {
      addError("bp_systolic", "Pulse pressure (Systolic minus Diastolic) is too narrow (< 10 mmHg).")
    }
  }

  // 10. Fundic Height (cm) - Optional
  if (data.fundic_height_cm !== undefined && data.fundic_height_cm !== null && data.fundic_height_cm !== "") {
    const val = Number(data.fundic_height_cm)
    if (isNaN(val) || val < CLINICAL_LIMITS.fundic_height_cm.min || val > CLINICAL_LIMITS.fundic_height_cm.max) {
      addError("fundic_height_cm", `Fundic height must be between ${CLINICAL_LIMITS.fundic_height_cm.min} and ${CLINICAL_LIMITS.fundic_height_cm.max} cm.`)
    }
  }

  // 11. Fetal Heart Tone (BPM) - Optional
  if (data.fetal_heart_tone_bpm !== undefined && data.fetal_heart_tone_bpm !== null && data.fetal_heart_tone_bpm !== "") {
    const val = Number(data.fetal_heart_tone_bpm)
    if (isNaN(val) || val < CLINICAL_LIMITS.fetal_heart_tone_bpm.min || val > CLINICAL_LIMITS.fetal_heart_tone_bpm.max) {
      addError("fetal_heart_tone_bpm", `Fetal heart tone must be between ${CLINICAL_LIMITS.fetal_heart_tone_bpm.min} and ${CLINICAL_LIMITS.fetal_heart_tone_bpm.max} BPM.`)
    }
  }

  // 12. Blood Sugar (mg/dL) - Optional
  if (data.blood_sugar_mg_dl !== undefined && data.blood_sugar_mg_dl !== null && data.blood_sugar_mg_dl !== "") {
    const val = Number(data.blood_sugar_mg_dl)
    if (isNaN(val) || val < CLINICAL_LIMITS.blood_sugar_mg_dl.min || val > CLINICAL_LIMITS.blood_sugar_mg_dl.max) {
      addError("blood_sugar_mg_dl", `Blood sugar must be between ${CLINICAL_LIMITS.blood_sugar_mg_dl.min} and ${CLINICAL_LIMITS.blood_sugar_mg_dl.max} mg/dL.`)
    }
  }

  // 13. Respiratory Rate (cpm) - Optional
  if (data.respiratory_rate_cpm !== undefined && data.respiratory_rate_cpm !== null && data.respiratory_rate_cpm !== "") {
    const val = Number(data.respiratory_rate_cpm)
    if (isNaN(val) || val < CLINICAL_LIMITS.respiratory_rate_cpm.min || val > CLINICAL_LIMITS.respiratory_rate_cpm.max) {
      addError("respiratory_rate_cpm", `Respiratory rate must be between ${CLINICAL_LIMITS.respiratory_rate_cpm.min} and ${CLINICAL_LIMITS.respiratory_rate_cpm.max} cpm.`)
    }
  }

  // 14. Oxygen Saturation (%) - Optional
  if (data.oxygen_saturation_pct !== undefined && data.oxygen_saturation_pct !== null && data.oxygen_saturation_pct !== "") {
    const val = Number(data.oxygen_saturation_pct)
    if (isNaN(val) || val < CLINICAL_LIMITS.oxygen_saturation_pct.min || val > CLINICAL_LIMITS.oxygen_saturation_pct.max) {
      addError("oxygen_saturation_pct", `Oxygen saturation must be between ${CLINICAL_LIMITS.oxygen_saturation_pct.min} and ${CLINICAL_LIMITS.oxygen_saturation_pct.max}%.`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    errorMap,
  }
}

/**
 * Validates pregnancy registration data
 */
export function validatePregnancyData(data: {
  lmp_date?: string | Date | null
  gravida?: number | string | null
  parity?: number | string | null
  pregnancy_status?: string | null
}): ClinicalValidationResult {
  const errors: string[] = []
  const errorMap: Record<string, string> = {}

  const addError = (field: string, message: string) => {
    errors.push(message)
    if (!errorMap[field]) {
      errorMap[field] = message
    }
  }

  if (!data.lmp_date) {
    addError("lmp_date", "Last Menstrual Period (LMP) date is required.")
  } else {
    const lmp = new Date(data.lmp_date)
    if (isNaN(lmp.getTime())) {
      addError("lmp_date", "Invalid LMP date provided.")
    } else if (lmp > new Date()) {
      addError("lmp_date", "LMP date cannot be in the future.")
    }
  }

  let numGravida: number | null = null
  if (data.gravida !== undefined && data.gravida !== null && data.gravida !== "") {
    const g = Number(data.gravida)
    if (isNaN(g) || g < 1 || g > 30) {
      addError("gravida", "Gravida must be a positive number between 1 and 30.")
    } else {
      numGravida = g
    }
  }

  let numParity: number | null = null
  if (data.parity !== undefined && data.parity !== null && data.parity !== "") {
    const p = Number(data.parity)
    if (isNaN(p) || p < 0 || p > 30) {
      addError("parity", "Parity must be a non-negative number between 0 and 30.")
    } else {
      numParity = p
    }
  }

  if (numGravida !== null && numParity !== null) {
    if (numParity > numGravida) {
      addError("parity", `Parity (${numParity}) cannot exceed Gravida (${numGravida}).`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    errorMap,
  }
}

/**
 * Validates supplement record data
 */
export function validateSupplementData(data: {
  supplement_type?: string | null
  date_given?: string | Date | null
  tablets_given_count?: number | string | null
}): ClinicalValidationResult {
  const errors: string[] = []
  const errorMap: Record<string, string> = {}

  const addError = (field: string, message: string) => {
    errors.push(message)
    if (!errorMap[field]) {
      errorMap[field] = message
    }
  }

  if (!data.supplement_type || !String(data.supplement_type).trim()) {
    addError("supplement_type", "Supplement type is required.")
  }

  if (!data.date_given) {
    addError("date_given", "Date given is required.")
  } else {
    const d = new Date(data.date_given)
    if (isNaN(d.getTime())) {
      addError("date_given", "Invalid date given.")
    } else if (d > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      addError("date_given", "Date given cannot be in the future.")
    }
  }

  if (data.tablets_given_count !== undefined && data.tablets_given_count !== null && data.tablets_given_count !== "") {
    const count = Number(data.tablets_given_count)
    if (isNaN(count) || count < 1 || count > 500) {
      addError("tablets_given_count", "Tablets given count must be between 1 and 500.")
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    errorMap,
  }
}

/**
 * Validates laboratory screening record
 */
export function validateLabData(data: {
  screening_type?: string | null
  result?: string | null
  date_of_screening?: string | Date | null
}): ClinicalValidationResult {
  const errors: string[] = []
  const errorMap: Record<string, string> = {}

  const addError = (field: string, message: string) => {
    errors.push(message)
    if (!errorMap[field]) {
      errorMap[field] = message
    }
  }

  if (!data.screening_type || !String(data.screening_type).trim()) {
    addError("screening_type", "Screening test type is required.")
  }

  if (!data.date_of_screening) {
    addError("date_of_screening", "Date of screening is required.")
  } else {
    const d = new Date(data.date_of_screening)
    if (isNaN(d.getTime())) {
      addError("date_of_screening", "Invalid screening date.")
    } else if (d > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
      addError("date_of_screening", "Screening date cannot be in the future.")
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    errorMap,
  }
}
