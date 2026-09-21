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

  const pregs =
    pregnancies ||
    castItem.pregnancies ||
    (castItem.pregnancy ? [castItem.pregnancy] : [])

  // 2. Gather all visits from parameters, mother object, and all pregnancies
  const rawVisits = [
    ...(visits || []),
    ...(castItem.prenatalVisits || []),
    ...(castItem.visits || []),
    ...(castItem.prenatal_visits || []),
    ...(Array.isArray(pregs)
      ? pregs.flatMap(
          (p: Record<string, unknown>) =>
            (p.prenatalVisits as Array<Record<string, unknown>>) ||
            (p.visits as Array<Record<string, unknown>>) ||
            []
        )
      : []),
  ]

  // Deduplicate visits by id / visit_id
  const visitSeen = new Set<string>()
  const allVisitsList: Array<Record<string, unknown>> = []
  for (const v of rawVisits) {
    if (!v) continue
    const vid = String(
      v.visit_id ||
        v.id ||
        v._id ||
        `${v.visit_date}_${v.bp_systolic}_${v.visit_number}`
    )
    if (visitSeen.has(vid)) continue
    visitSeen.add(vid)
    allVisitsList.push(v)
  }

  // Sort visits so the latest visit is evaluated first
  allVisitsList.sort((a, b) => {
    const da = a.visit_date
      ? new Date(String(a.visit_date)).getTime()
      : a.created_at
        ? new Date(String(a.created_at)).getTime()
        : 0
    const db = b.visit_date
      ? new Date(String(b.visit_date)).getTime()
      : b.created_at
        ? new Date(String(b.created_at)).getTime()
        : 0
    return db - da
  })

  // 3. Gather all CDSS alerts
  const rawAlerts = [
    ...(castItem.cdssAlerts || []),
    ...(castItem.alerts || []),
    ...(castItem.pregnancy && Array.isArray((castItem.pregnancy as any).cdssAlerts)
      ? ((castItem.pregnancy as any).cdssAlerts as Array<Record<string, unknown>>)
      : []),
    ...(Array.isArray(pregs)
      ? pregs.flatMap(
          (p: Record<string, unknown>) =>
            (p.cdssAlerts as Array<Record<string, unknown>>) || []
        )
      : []),
  ]

  let hasHighRisk = false
  let hasModerateRisk = false

  // Check unresolved alerts
  for (const a of rawAlerts) {
    if (a.is_resolved) continue
    const sev = String(a.severity || a.alert_type || "").toLowerCase()
    if (
      sev.includes("high") ||
      sev.includes("critical") ||
      sev.includes("severe")
    ) {
      hasHighRisk = true
    } else if (
      sev.includes("medium") ||
      sev.includes("mod") ||
      sev.includes("warning") ||
      sev.includes("amber")
    ) {
      hasModerateRisk = true
    }
  }

  // Check visits
  for (const v of allVisitsList) {
    const vRisk = String(
      v.risk_level_assessed || v.risk_level || v.risk_flag || v.risk || ""
    )
    if (vRisk.trim() !== "" && vRisk.toUpperCase() !== "N/A") {
      const variant = getRiskVariant(vRisk)
      if (variant === "high") hasHighRisk = true
      else if (variant === "moderate") hasModerateRisk = true
    }

    const bpStr =
      v.blood_pressure ||
      v.bp ||
      (v.bp_systolic && v.bp_diastolic
        ? `${v.bp_systolic}/${v.bp_diastolic}`
        : null)
    if (bpStr) {
      const match = String(bpStr).match(/(\d+)\s*\/\s*(\d+)/)
      if (match) {
        const sys = parseInt(match[1], 10)
        const dia = parseInt(match[2], 10)
        if (sys >= 140 || dia >= 90) {
          hasHighRisk = true
        } else if (sys >= 130 || dia >= 85) {
          hasModerateRisk = true
        }
      }
    }
  }

  // Check active pregnancies
  if (Array.isArray(pregs) && pregs.length > 0) {
    for (const preg of pregs) {
      const pregRisk = String(
        preg.risk_flag || preg.risk_level || preg.risk || ""
      )
      if (pregRisk.trim() !== "" && pregRisk.toUpperCase() !== "N/A") {
        const variant = getRiskVariant(pregRisk)
        if (variant === "high") hasHighRisk = true
        else if (variant === "moderate") hasModerateRisk = true
      }
    }
  }

  // Check direct risk on mother or item
  const directRisk =
    castItem.risk_flag ||
    castItem.risk_level ||
    castItem.risk ||
    castItem.user?.risk_flag ||
    castItem.user?.risk_level ||
    castItem.patient?.risk_flag ||
    castItem.patient?.risk_level

  if (
    directRisk &&
    typeof directRisk === "string" &&
    directRisk.trim() !== "" &&
    directRisk.toUpperCase() !== "N/A"
  ) {
    const variant = getRiskVariant(directRisk)
    if (variant === "high") hasHighRisk = true
    else if (variant === "moderate") hasModerateRisk = true
  }

  // Final Clinical Decision
  if (hasHighRisk) return "High Risk"
  if (hasModerateRisk) return "Medium Risk"
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
