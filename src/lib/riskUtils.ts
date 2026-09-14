/**
 * Utility to extract and normalize risk level consistently across
 * Mothers Page, Mother Profile, Appointments, and Calendar pages.
 */
export function extractRiskLevel(motherOrItem: any, pregnancies?: any[], visits?: any[]): string {
  if (!motherOrItem) return "Low Risk"

  // 1. Check direct risk_flag / risk_level on object or nested user/patient
  const directRisk =
    motherOrItem.risk_flag ||
    motherOrItem.risk_level ||
    motherOrItem.risk ||
    motherOrItem.user?.risk_flag ||
    motherOrItem.user?.risk_level ||
    motherOrItem.patient?.risk_flag ||
    motherOrItem.patient?.risk_level

  if (directRisk && typeof directRisk === "string" && directRisk.trim() !== "" && directRisk.toUpperCase() !== "N/A") {
    return normalizeRiskString(directRisk)
  }

  // 2. Check pregnancy records
  const pregs = pregnancies || motherOrItem.pregnancies || (motherOrItem.pregnancy ? [motherOrItem.pregnancy] : [])
  if (Array.isArray(pregs) && pregs.length > 0) {
    for (const preg of pregs) {
      const pregRisk = preg.risk_flag || preg.risk_level || preg.risk
      if (pregRisk && typeof pregRisk === "string" && pregRisk.trim() !== "" && pregRisk.toUpperCase() !== "N/A") {
        return normalizeRiskString(pregRisk)
      }
    }
  }

  // 3. Check prenatal visits or vitals
  const vList = visits || motherOrItem.prenatalVisits || motherOrItem.visits || motherOrItem.prenatal_visits || []
  if (Array.isArray(vList) && vList.length > 0) {
    for (const v of vList) {
      const vRisk = v.risk_level_assessed || v.risk_level || v.risk_flag
      if (vRisk && typeof vRisk === "string" && vRisk.trim() !== "" && vRisk.toUpperCase() !== "N/A") {
        return normalizeRiskString(vRisk)
      }

      // Check blood pressure vitals: SBP >= 140 or DBP >= 90 => High Risk
      const bpStr = v.blood_pressure || v.bp || (v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : null)
      if (bpStr) {
        const match = String(bpStr).match(/(\d+)\s*\/\s*(\d+)/)
        if (match) {
          const sys = parseInt(match[1], 10)
          const dia = parseInt(match[2], 10)
          if (sys >= 140 || dia >= 90) {
            return "High Risk"
          } else if (sys >= 130 || dia >= 85) {
            return "Medium Risk"
          }
        }
      }
    }
  }

  // 4. Check CDSS alerts (severe / high severity alerts indicate High Risk)
  const alerts = motherOrItem.cdssAlerts || motherOrItem.alerts || motherOrItem.pregnancy?.cdssAlerts || []
  if (Array.isArray(alerts) && alerts.length > 0) {
    for (const a of alerts) {
      if (a.is_resolved) continue
      const sev = (a.severity || a.alert_type || "").toLowerCase()
      if (sev.includes("high") || sev.includes("critical") || sev.includes("severe")) {
        return "High Risk"
      }
      if (sev.includes("medium") || sev.includes("moderate") || sev.includes("warning")) {
        return "Medium Risk"
      }
    }
  }

  return "Low Risk"
}

export function normalizeRiskString(str: string): string {
  if (!str) return "Low Risk"
  const lower = str.toLowerCase()
  if (lower.includes("high")) return "High Risk"
  if (lower.includes("med") || lower.includes("moderate")) return "Medium Risk"
  if (lower.includes("low")) return "Low Risk"
  return str
}

export interface ClinicalVitalsInput {
  bp_systolic?: number | string | null
  bp_diastolic?: number | string | null
  pulse_rate_bpm?: number | string | null
  temperature_celsius?: number | string | null
  danger_signs_observed?: string | null
  mother_age?: number | null
  parity?: number | null
  previous_delivery_history?: string | null
  baseline_bp_systolic?: number | null
  baseline_bp_diastolic?: number | null
}

/**
 * Offline-compatible clinical vitals and TEWS risk assessment engine.
 * Mirrors the backend evaluate_clinical_vitals scoring algorithm.
 */
export function calculateOfflineTEWSRisk(input: ClinicalVitalsInput): {
  risk_level: "Low Risk" | "Moderate Risk" | "High Risk"
  raw_level: "LOW" | "MODERATE" | "HIGH"
  tews_score: number
  reasons: string[]
} {
  const sys = input.bp_systolic != null ? Number(input.bp_systolic) : null
  const dia = input.bp_diastolic != null ? Number(input.bp_diastolic) : null
  const hr = input.pulse_rate_bpm != null ? Number(input.pulse_rate_bpm) : null
  const temp = input.temperature_celsius != null ? Number(input.temperature_celsius) : null
  const dangerSigns = input.danger_signs_observed || ""

  const reasons: string[] = []

  // Systolic BP score
  let sysScore = 0
  if (sys != null && !isNaN(sys)) {
    if (sys < 90) { sysScore = 3; reasons.push(`Severe hypotension (SBP ${sys} < 90)`); }
    else if (sys <= 139) { sysScore = 0; }
    else if (sys <= 149) { sysScore = 1; reasons.push(`Mildly elevated SBP (${sys})`); }
    else if (sys <= 159) { sysScore = 2; reasons.push(`Moderate hypertension (SBP ${sys})`); }
    else { sysScore = 3; reasons.push(`Severe hypertension (SBP ${sys} >= 160)`); }
  }

  // Diastolic BP score
  let diaScore = 0
  if (dia != null && !isNaN(dia)) {
    if (dia < 50) { diaScore = 3; reasons.push(`Severe diastolic hypotension (DBP ${dia} < 50)`); }
    else if (dia <= 89) { diaScore = 0; }
    else if (dia <= 99) { diaScore = 1; reasons.push(`Mildly elevated DBP (${dia})`); }
    else if (dia <= 109) { diaScore = 2; reasons.push(`Moderate diastolic hypertension (DBP ${dia})`); }
    else { diaScore = 3; reasons.push(`Severe diastolic hypertension (DBP ${dia} >= 110)`); }
  }

  // Pulse rate score
  let hrScore = 0
  if (hr != null && !isNaN(hr)) {
    if (hr < 50) { hrScore = 3; reasons.push(`Severe bradycardia (HR ${hr} < 50)`); }
    else if (hr <= 99) { hrScore = 0; }
    else if (hr <= 109) { hrScore = 1; reasons.push(`Mild tachycardia (HR ${hr})`); }
    else if (hr <= 119) { hrScore = 2; reasons.push(`Moderate tachycardia (HR ${hr})`); }
    else { hrScore = 3; reasons.push(`Severe tachycardia (HR ${hr} >= 120)`); }
  }

  // Temperature score
  let tempScore = 0
  if (temp != null && !isNaN(temp)) {
    if (temp < 36.0) { tempScore = 3; reasons.push(`Hypothermia (${temp}°C < 36.0)`); }
    else if (temp <= 37.4) { tempScore = 0; }
    else if (temp <= 37.9) { tempScore = 1; reasons.push(`Low-grade fever (${temp}°C)`); }
    else { tempScore = 3; reasons.push(`High fever (${temp}°C >= 38.0)`); }
  }

  // Danger signs score
  let dangerScore = 0
  if (dangerSigns.trim()) {
    const lower = dangerSigns.toLowerCase()
    if (
      lower.includes("bleeding") ||
      lower.includes("severe headache") ||
      lower.includes("convulsion") ||
      lower.includes("vision") ||
      lower.includes("seizure") ||
      lower.includes("unconscious")
    ) {
      dangerScore = 3
      reasons.push(`Critical danger sign observed: ${dangerSigns}`)
    } else {
      dangerScore = 1
      reasons.push(`Clinical observation noted: ${dangerSigns}`)
    }
  }

  const vitalScores = [sysScore, diaScore, hrScore, tempScore, dangerScore]
  const sumVitalScores = vitalScores.reduce((acc, curr) => acc + curr, 0)
  const maxVitalScore = Math.max(...vitalScores)

  // Demographic weights
  let demographicWeight = 0
  if (input.mother_age != null) {
    if (input.mother_age < 19 || input.mother_age >= 35) {
      demographicWeight += 2
      reasons.push(`Maternal age risk (${input.mother_age} yrs)`)
    }
  }
  if (input.parity != null && input.parity >= 5) {
    demographicWeight += 2
    reasons.push(`Grand multiparity (Parity: ${input.parity})`)
  }
  if (input.previous_delivery_history && input.previous_delivery_history.toLowerCase().includes("cesarean")) {
    demographicWeight += 3
    reasons.push("Previous cesarean delivery")
  }

  // Velocity multiplier
  let velocityMultiplier = 0
  if (input.baseline_bp_systolic != null && sys != null) {
    const deltaSys = sys - input.baseline_bp_systolic
    if (deltaSys >= 30) {
      velocityMultiplier = 2
      reasons.push(`BP Systolic rapid elevation (+${deltaSys} mmHg above baseline)`)
    }
  }
  if (input.baseline_bp_diastolic != null && dia != null) {
    const deltaDia = dia - input.baseline_bp_diastolic
    if (deltaDia >= 15) {
      velocityMultiplier = 2
      reasons.push(`BP Diastolic rapid elevation (+${deltaDia} mmHg above baseline)`)
    }
  }

  const TEWS = sumVitalScores + demographicWeight + velocityMultiplier

  let raw_level: "LOW" | "MODERATE" | "HIGH" = "LOW"
  let risk_level: "Low Risk" | "Moderate Risk" | "High Risk" = "Low Risk"

  if (TEWS >= 6 || maxVitalScore >= 3) {
    raw_level = "HIGH"
    risk_level = "High Risk"
  } else if (TEWS >= 4 || maxVitalScore === 2) {
    raw_level = "MODERATE"
    risk_level = "Moderate Risk"
  }

  return {
    risk_level,
    raw_level,
    tews_score: TEWS,
    reasons,
  }
}

