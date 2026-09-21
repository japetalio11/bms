export type RiskVariant = "high" | "moderate" | "low" | "none"

export function getRiskVariant(
  risk?: string | null
): RiskVariant {
  if (
    !risk ||
    risk === "N/A" ||
    risk.trim() === "" ||
    risk.toLowerCase() === "no risk assessed"
  ) {
    return "none"
  }
  const lower = risk.toLowerCase().trim()
  if (
    lower.includes("high") ||
    lower.includes("critical") ||
    lower.includes("severe")
  ) {
    return "high"
  }
  if (
    lower.includes("med") ||
    lower.includes("mod") ||
    lower.includes("warning") ||
    lower.includes("amber")
  ) {
    return "moderate"
  }
  if (lower.includes("low")) {
    return "low"
  }
  return "low"
}

export function getRiskLabel(risk?: string | null): string {
  const variant = getRiskVariant(risk)
  switch (variant) {
    case "high":
      return "High Risk"
    case "moderate":
      return "Moderate"
    case "low":
      return "Low Risk"
    case "none":
    default:
      return "No Risk Assessed"
  }
}

export function getRiskBadgeClasses(risk?: string | null): {
  badge: string
  bg: string
  text: string
  border: string
  dot: string
} {
  const variant = getRiskVariant(risk)
  switch (variant) {
    case "high":
      return {
        badge: "bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/20",
        bg: "bg-red-500/10",
        text: "text-red-500 dark:text-red-400",
        border: "border-red-500/20",
        dot: "bg-red-500",
      }
    case "moderate":
      return {
        badge: "bg-amber-500/10 text-amber-500 dark:text-amber-400 border-amber-500/20",
        bg: "bg-amber-500/10",
        text: "text-amber-500 dark:text-amber-400",
        border: "border-amber-500/20",
        dot: "bg-amber-500",
      }
    case "low":
      return {
        badge: "bg-green-500/10 text-green-500 dark:text-green-400 border-green-500/20",
        bg: "bg-green-500/10",
        text: "text-green-500 dark:text-green-400",
        border: "border-green-500/20",
        dot: "bg-green-500",
      }
    case "none":
    default:
      return {
        badge: "bg-muted text-muted-foreground border-transparent",
        bg: "bg-muted",
        text: "text-muted-foreground",
        border: "border-transparent",
        dot: "bg-muted-foreground",
      }
  }
}

export function normalizeRiskString(str: string): string {
  if (!str) return "Low Risk"
  const variant = getRiskVariant(str)
  if (variant === "high") return "High Risk"
  if (variant === "moderate") return "Medium Risk"
  if (variant === "low") return "Low Risk"
  return str
}

export interface RiskSubjectRecord {
  risk_flag?: string | null
  risk_level?: string | null
  risk?: string | null
  user?: {
    risk_flag?: string | null
    risk_level?: string | null
    user_id?: string
  } | null
  patient?: {
    risk_flag?: string | null
    risk_level?: string | null
    user?: unknown
  } | null
  pregnancies?: Array<Record<string, unknown>>
  pregnancy?: Record<string, unknown>
  prenatalVisits?: Array<Record<string, unknown>>
  visits?: Array<Record<string, unknown>>
  prenatal_visits?: Array<Record<string, unknown>>
  cdssAlerts?: Array<Record<string, unknown>>
  alerts?: Array<Record<string, unknown>>
  [key: string]: unknown
}

export function extractRiskLevel(
  motherOrItem?: any,
  pregnancies?: any[],
  visits?: any[]
): string {
  if (!motherOrItem) return "Low Risk"

  const castItem = (motherOrItem || {}) as RiskSubjectRecord

  const pregs: any[] =
    pregnancies ||
    castItem.pregnancies ||
    (castItem.pregnancy ? [castItem.pregnancy] : [])

  let activePreg: any = null
  if (Array.isArray(pregs) && pregs.length > 0) {
    activePreg =
      pregs.find(
        (p: any) =>
          String(p.pregnancy_status || p.status || "").toLowerCase() ===
          "active"
      ) || pregs[0]
  }

  const candidateVisits: any[] = []
  if (Array.isArray(visits) && visits.length > 0) {
    candidateVisits.push(...visits)
  }
  if (activePreg) {
    if (Array.isArray(activePreg.prenatalVisits)) {
      candidateVisits.push(...activePreg.prenatalVisits)
    }
    if (Array.isArray(activePreg.visits)) {
      candidateVisits.push(...activePreg.visits)
    }
  }
  if (candidateVisits.length === 0) {
    if (Array.isArray(castItem.prenatalVisits)) {
      candidateVisits.push(...castItem.prenatalVisits)
    } else if (Array.isArray(castItem.visits)) {
      candidateVisits.push(...castItem.visits)
    } else if (Array.isArray(castItem.prenatal_visits)) {
      candidateVisits.push(...castItem.prenatal_visits)
    }
  }

  let latestVisit: any = null
  let maxTime = -1

  for (let i = 0; i < candidateVisits.length; i++) {
    const v = candidateVisits[i]
    if (!v) continue

    const tRaw = v.visit_date || v.created_at || v.date || null
    let t = 0
    if (typeof tRaw === "number") {
      t = tRaw
    } else if (typeof tRaw === "string" && tRaw.trim() !== "") {
      const parsed = Date.parse(tRaw)
      t = isNaN(parsed) ? 0 : parsed
    }

    if (t === 0 && v.visit_number) {
      t = Number(v.visit_number)
    }

    if (latestVisit === null || t >= maxTime) {
      maxTime = t
      latestVisit = v
    }
  }

  if (latestVisit) {
    const vRisk = String(
      latestVisit.risk_level_assessed ||
        latestVisit.risk_level ||
        latestVisit.risk_flag ||
        latestVisit.risk ||
        ""
    ).trim()

    if (vRisk && vRisk.toUpperCase() !== "N/A" && vRisk.toLowerCase() !== "no risk assessed") {
      const variant = getRiskVariant(vRisk)
      if (variant === "high") return "High Risk"
      if (variant === "moderate") return "Medium Risk"
      if (variant === "low") return "Low Risk"
    }

    let sys: number | null =
      latestVisit.bp_systolic != null && latestVisit.bp_systolic !== ""
        ? Number(latestVisit.bp_systolic)
        : null
    let dia: number | null =
      latestVisit.bp_diastolic != null && latestVisit.bp_diastolic !== ""
        ? Number(latestVisit.bp_diastolic)
        : null

    if ((sys === null || dia === null) && latestVisit.blood_pressure) {
      const match = String(latestVisit.blood_pressure).match(
        /(\d+)\s*\/\s*(\d+)/
      )
      if (match) {
        sys = parseInt(match[1], 10)
        dia = parseInt(match[2], 10)
      }
    }

    if ((sys !== null && sys >= 140) || (dia !== null && dia >= 90)) {
      return "High Risk"
    }
    if ((sys !== null && sys >= 130) || (dia !== null && dia >= 85)) {
      return "Medium Risk"
    }
  }

  const candidateAlerts: any[] = [
    ...(castItem.cdssAlerts || []),
    ...(castItem.alerts || []),
    ...(activePreg && Array.isArray(activePreg.cdssAlerts)
      ? activePreg.cdssAlerts
      : []),
  ]

  for (let i = 0; i < candidateAlerts.length; i++) {
    const a = candidateAlerts[i]
    if (!a || a.is_resolved) continue
    const sev = String(a.severity || a.alert_type || "").toLowerCase()
    if (
      sev.includes("high") ||
      sev.includes("critical") ||
      sev.includes("severe")
    ) {
      return "High Risk"
    }
    if (
      sev.includes("med") ||
      sev.includes("mod") ||
      sev.includes("warning") ||
      sev.includes("amber")
    ) {
      return "Medium Risk"
    }
  }

  if (activePreg) {
    const pregRisk = String(
      activePreg.risk_flag || activePreg.risk_level || activePreg.risk || ""
    ).trim()
    if (pregRisk && pregRisk.toUpperCase() !== "N/A") {
      const variant = getRiskVariant(pregRisk)
      if (variant === "high") return "High Risk"
      if (variant === "moderate") return "Medium Risk"
      if (variant === "low") return "Low Risk"
    }
  }

  const directRisk = String(
    castItem.risk_flag ||
      castItem.risk_level ||
      castItem.risk ||
      castItem.user?.risk_flag ||
      castItem.user?.risk_level ||
      castItem.patient?.risk_flag ||
      castItem.patient?.risk_level ||
      ""
  ).trim()

  if (directRisk && directRisk.toUpperCase() !== "N/A") {
    const variant = getRiskVariant(directRisk)
    if (variant === "high") return "High Risk"
    if (variant === "moderate") return "Medium Risk"
    if (variant === "low") return "Low Risk"
  }

  return "Low Risk"
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

export function calculateOfflineTEWSRisk(input: ClinicalVitalsInput): {
  risk_level: "Low Risk" | "Moderate Risk" | "High Risk"
  raw_level: "LOW" | "MODERATE" | "HIGH"
  tews_score: number
  reasons: string[]
} {
  const sys = input.bp_systolic != null ? Number(input.bp_systolic) : null
  const dia = input.bp_diastolic != null ? Number(input.bp_diastolic) : null
  const hr = input.pulse_rate_bpm != null ? Number(input.pulse_rate_bpm) : null
  const temp =
    input.temperature_celsius != null ? Number(input.temperature_celsius) : null
  const dangerSigns = input.danger_signs_observed || ""

  const reasons: string[] = []

  let sysScore = 0
  if (sys != null && !isNaN(sys)) {
    if (sys < 90) {
      sysScore = 3
      reasons.push(`Severe hypotension (SBP ${sys} < 90)`)
    } else if (sys <= 139) {
      sysScore = 0
    } else if (sys <= 149) {
      sysScore = 1
      reasons.push(`Mildly elevated SBP (${sys})`)
    } else if (sys <= 159) {
      sysScore = 2
      reasons.push(`Moderate hypertension (SBP ${sys})`)
    } else {
      sysScore = 3
      reasons.push(`Severe hypertension (SBP ${sys} >= 160)`)
    }
  }

  let diaScore = 0
  if (dia != null && !isNaN(dia)) {
    if (dia < 50) {
      diaScore = 3
      reasons.push(`Severe diastolic hypotension (DBP ${dia} < 50)`)
    } else if (dia <= 89) {
      diaScore = 0
    } else if (dia <= 99) {
      diaScore = 1
      reasons.push(`Mildly elevated DBP (${dia})`)
    } else if (dia <= 109) {
      diaScore = 2
      reasons.push(`Moderate diastolic hypertension (DBP ${dia})`)
    } else {
      diaScore = 3
      reasons.push(`Severe diastolic hypertension (DBP ${dia} >= 110)`)
    }
  }

  let hrScore = 0
  if (hr != null && !isNaN(hr)) {
    if (hr < 50) {
      hrScore = 3
      reasons.push(`Severe bradycardia (HR ${hr} < 50)`)
    } else if (hr <= 99) {
      hrScore = 0
    } else if (hr <= 109) {
      hrScore = 1
      reasons.push(`Mild tachycardia (HR ${hr})`)
    } else if (hr <= 119) {
      hrScore = 2
      reasons.push(`Moderate tachycardia (HR ${hr})`)
    } else {
      hrScore = 3
      reasons.push(`Severe tachycardia (HR ${hr} >= 120)`)
    }
  }

  let tempScore = 0
  if (temp != null && !isNaN(temp)) {
    if (temp < 36.0) {
      tempScore = 3
      reasons.push(`Hypothermia (${temp}°C < 36.0)`)
    } else if (temp <= 37.4) {
      tempScore = 0
    } else if (temp <= 37.9) {
      tempScore = 1
      reasons.push(`Low-grade fever (${temp}°C)`)
    } else {
      tempScore = 3
      reasons.push(`High fever (${temp}°C >= 38.0)`)
    }
  }

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
  if (
    input.previous_delivery_history &&
    input.previous_delivery_history.toLowerCase().includes("cesarean")
  ) {
    demographicWeight += 3
    reasons.push("Previous cesarean delivery")
  }

  let velocityMultiplier = 0
  if (input.baseline_bp_systolic != null && sys != null) {
    const deltaSys = sys - input.baseline_bp_systolic
    if (deltaSys >= 30) {
      velocityMultiplier = 2
      reasons.push(
        `BP Systolic rapid elevation (+${deltaSys} mmHg above baseline)`
      )
    }
  }
  if (input.baseline_bp_diastolic != null && dia != null) {
    const deltaDia = dia - input.baseline_bp_diastolic
    if (deltaDia >= 15) {
      velocityMultiplier = 2
      reasons.push(
        `BP Diastolic rapid elevation (+${deltaDia} mmHg above baseline)`
      )
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
