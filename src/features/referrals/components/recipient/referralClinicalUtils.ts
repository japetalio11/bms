import type {
  PublicReferralData,
  ParsedReferralDetails,
  VitalStatusDetails,
  ClinicalAlertBadge,
  CDSSAlertItem,
  PrenatalVisitItem,
} from "./referralTypes"

export function parseReferralDetails(
  rawReason: string | undefined,
  obstetric?: PublicReferralData["obstetric_info"],
  patient?: PublicReferralData["patient"]
): ParsedReferralDetails {
  const fallbackCC =
    obstetric?.latest_vitals?.chief_complaint ||
    "Routine maternal clinical transfer & continuity of care"
  const fallbackPrevDel = obstetric?.previous_delivery_history || "None recorded"
  const fallbackCoMorb = obstetric?.co_morbidities || "None reported"
  const fallbackAllergies =
    patient?.allergies || obstetric?.allergies || "No known drug allergies (NKDA)"

  if (!rawReason || !rawReason.trim()) {
    return {
      chiefComplaint: fallbackCC,
      clinicalConcern: obstetric?.latest_vitals?.danger_signs || "Routine care endorsement",
      requestedAction: "Specialist maternal evaluation and continuity of prenatal care",
      previousDelivery: fallbackPrevDel,
      coMorbidities: fallbackCoMorb,
      allergies: fallbackAllergies,
      cleanNarrative: "No notes added.",
    }
  }

  const text = rawReason.trim()

  const ccMatch = text.match(/(?:CC:|Chief Complaint:|Reason:|Indication:)\s*([^\n\r]+)/i)
  const actionMatch = text.match(/(?:Requested Action:|Action:|Plan:|Request:)\s*([^\n\r]+)/i)
  const concernMatch = text.match(/(?:Clinical Concern:|Concern:|Danger Signs?:)\s*([^\n\r]+)/i)
  const lmpMatch = text.match(/LMP\s*[-:]\s*([^\n\r]+)/i)
  const edcMatch = text.match(/(?:EDC|EDD)\s*[-:]\s*([^\n\r]+)/i)
  const aogMatch = text.match(/AOG\s*[-:]\s*([^\n\r]+)/i)
  const gpMatch = text.match(/(G\d+\s*P\d+(?:\s*\(\d+-\d+-\d+-\d+\))?)/i)
  const prevDelMatch = text.match(/Previous Delivery\s*[-:]\s*([^\n\r]+)/i)
  const coMorbMatch = text.match(/Co-morbidities\s*[-:]\s*([^\n\r]+)/i)
  const allergyMatch = text.match(/Allergies\s*[-:]\s*([^\n\r]+)/i)

  const lines = text.split("\n")
  const filteredLines = lines.filter((line) => {
    const l = line.trim()
    if (!l) return false
    if (
      l.startsWith("BMC ONLINE REFERRAL") ||
      l.startsWith("Good morning") ||
      l.startsWith("Good afternoon") ||
      l.startsWith("For online referral:") ||
      l.startsWith("Complete name:") ||
      l.startsWith("Age:") ||
      l.startsWith("Address:") ||
      l.startsWith("CP Number:") ||
      l.startsWith("Civil status:") ||
      l.startsWith("Bday:") ||
      l.startsWith("V/S:") ||
      l.startsWith("T:") ||
      l.startsWith("PR:") ||
      l.startsWith("BP:") ||
      l.startsWith("wt:") ||
      l.startsWith("ht:") ||
      l.startsWith("LMP -") ||
      l.startsWith("EDC -") ||
      l.startsWith("AOG -") ||
      l.match(/^G\d+P\d+/i) ||
      l.startsWith("Previous Delivery:") ||
      l.startsWith("Co-morbidities:") ||
      l.startsWith("Allergies:") ||
      l.startsWith("CC:") ||
      l.startsWith("Chief Complaint:") ||
      l.startsWith("Reason:") ||
      l.startsWith("Thank you") ||
      l.includes("💛")
    ) {
      return false
    }
    return true
  })

  const extractedCC =
    ccMatch?.[1]?.trim() ||
    (filteredLines.length > 0 && filteredLines[0].length < 120
      ? filteredLines[0]
      : fallbackCC)

  let requestedAction = actionMatch?.[1]?.trim()
  if (!requestedAction) {
    const lowerCC = extractedCC.toLowerCase()
    if (lowerCC.includes("admission") || lowerCC.includes("admit")) {
      requestedAction = "Urgent admission & maternal-fetal inpatient evaluation"
    } else if (lowerCC.includes("c-section") || lowerCC.includes("cesarean")) {
      requestedAction = "Emergency obstetric evaluation for cesarean delivery capability"
    } else if (lowerCC.includes("high-risk") || lowerCC.includes("preeclampsia") || lowerCC.includes("hypertension")) {
      requestedAction = "Specialist OB/GYN evaluation and hypertensive triage management"
    } else if (lowerCC.includes("check up") || lowerCC.includes("checkup") || lowerCC.includes("prenatal")) {
      requestedAction = "Comprehensive high-risk prenatal consultation & diagnostic workup"
    } else {
      requestedAction = "Clinical evaluation, consultation, and continuation of maternal care"
    }
  }

  let clinicalConcern = concernMatch?.[1]?.trim()
  if (!clinicalConcern) {
    if (obstetric?.latest_vitals?.danger_signs) {
      clinicalConcern = `Danger Signs: ${obstetric.latest_vitals.danger_signs}`
    } else if (extractedCC.toLowerCase().includes("high-risk")) {
      clinicalConcern = "High-risk pregnancy protocol triage"
    } else {
      clinicalConcern = extractedCC
    }
  }

  return {
    chiefComplaint: extractedCC,
    clinicalConcern,
    requestedAction,
    previousDelivery: prevDelMatch?.[1]?.trim() || fallbackPrevDel,
    coMorbidities: coMorbMatch?.[1]?.trim() || fallbackCoMorb,
    allergies: allergyMatch?.[1]?.trim() || fallbackAllergies,
    cleanNarrative:
      filteredLines.join("\n").trim() || "No notes added.",
    lmpParsed: lmpMatch?.[1]?.trim(),
    eddParsed: edcMatch?.[1]?.trim(),
    aogParsed: aogMatch?.[1]?.trim(),
    gravidaParaParsed: gpMatch?.[1]?.trim(),
  }
}

export function calculateObstetricIndices(lmpDateStr?: string, fallbackWeeks = 0) {
  if (!lmpDateStr) {
    return {
      gestationalWeeks: fallbackWeeks,
      gestationalDays: 0,
      formattedAog: fallbackWeeks > 0 ? `${fallbackWeeks} Weeks` : "Not Specified",
      eddFormatted: "Not Specified",
      eddDateObj: null as Date | null,
      daysRemaining: null as number | null,
      trimester:
        fallbackWeeks > 0
          ? fallbackWeeks <= 12
            ? "1st Trimester"
            : fallbackWeeks <= 27
              ? "2nd Trimester"
              : "3rd Trimester"
          : "Active Pregnancy",
      progressPercent:
        fallbackWeeks > 0
          ? Math.min(100, Math.max(0, Math.round((fallbackWeeks / 40) * 100)))
          : 0,
    }
  }

  const lmp = new Date(lmpDateStr)
  if (isNaN(lmp.getTime())) {
    return {
      gestationalWeeks: fallbackWeeks,
      gestationalDays: 0,
      formattedAog: fallbackWeeks > 0 ? `${fallbackWeeks} Weeks` : "Not Specified",
      eddFormatted: "Not Specified",
      eddDateObj: null as Date | null,
      daysRemaining: null as number | null,
      trimester: "Active Pregnancy",
      progressPercent: 0,
    }
  }

  const eddDate = new Date(lmp.getTime() + 280 * 24 * 60 * 60 * 1000)
  const now = new Date()
  const diffTime = now.getTime() - lmp.getTime()
  const totalDays = Math.max(0, Math.floor(diffTime / (24 * 60 * 60 * 1000)))
  const gestationalWeeks = Math.floor(totalDays / 7)
  const gestationalDays = totalDays % 7

  const daysRemaining = Math.ceil(
    (eddDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  )

  let trimester = "1st Trimester (1-12w)"
  if (gestationalWeeks > 27) {
    trimester = "3rd Trimester (28-40w)"
  } else if (gestationalWeeks > 12) {
    trimester = "2nd Trimester (13-27w)"
  }

  const formattedAog =
    gestationalWeeks > 0
      ? gestationalDays > 0
        ? `${gestationalWeeks}w ${gestationalDays}d`
        : `${gestationalWeeks} Weeks`
      : fallbackWeeks > 0
        ? `${fallbackWeeks} Weeks`
        : "Not Specified"

  const eddFormatted = eddDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((gestationalWeeks / 40) * 100))
  )

  return {
    gestationalWeeks,
    gestationalDays,
    formattedAog,
    eddFormatted,
    eddDateObj: eddDate,
    daysRemaining,
    trimester,
    progressPercent,
  }
}

export function classifyVitals(
  bpString?: string,
  pulse?: number,
  temp?: number | string,
  fht?: number
): VitalStatusDetails {
  let bpLevel: VitalStatusDetails["bpLevel"] = "unknown"
  let bpLabel = "Unspecified"
  let bpBadgeClass = "bg-transparent text-muted-foreground border-border/80"

  if (bpString) {
    const match = bpString.match(/(\d+)\s*\/\s*(\d+)/)
    if (match) {
      const sys = parseInt(match[1], 10)
      const dia = parseInt(match[2], 10)

      if (sys >= 160 || dia >= 110) {
        bpLevel = "emergency"
        bpLabel = "Severe HTN / Hypertensive Emergency"
        bpBadgeClass = "bg-red-600 text-white border-transparent font-bold shadow-xs"
      } else if (sys >= 140 || dia >= 90) {
        bpLevel = "warning"
        bpLabel = "Gestational HTN (Stage 1 / Alert)"
        bpBadgeClass = "bg-amber-500 text-amber-950 border-transparent font-bold shadow-xs"
      } else if (sys >= 120 || dia >= 80) {
        bpLevel = "elevated"
        bpLabel = "Elevated Pre-HTN"
        bpBadgeClass = "bg-transparent text-foreground border-border/80 font-medium"
      } else {
        bpLevel = "normal"
        bpLabel = "Normotensive"
        bpBadgeClass = "bg-transparent text-muted-foreground border-border/80 font-normal"
      }
    }
  }

  let pulseLevel: VitalStatusDetails["pulseLevel"] = "unknown"
  let pulseLabel = "Normal"
  if (pulse) {
    if (pulse > 100) {
      pulseLevel = "warning"
      pulseLabel = "Maternal Tachycardia (>100 bpm)"
    } else if (pulse < 60) {
      pulseLevel = "warning"
      pulseLabel = "Maternal Bradycardia (<60 bpm)"
    } else {
      pulseLevel = "normal"
      pulseLabel = "Normal Heart Rate (60-100 bpm)"
    }
  }

  let tempLevel: VitalStatusDetails["tempLevel"] = "unknown"
  let tempLabel = "Normal"
  const tempNum = typeof temp === "string" ? parseFloat(temp) : temp
  if (tempNum) {
    if (tempNum >= 38.0) {
      tempLevel = "fever"
      tempLabel = "Pyrexia / Fever (≥38.0°C)"
    } else if (tempNum < 36.0) {
      tempLevel = "hypothermia"
      tempLabel = "Hypothermia (<36.0°C)"
    } else {
      tempLevel = "normal"
      tempLabel = "Afebrile / Normal (36.5-37.5°C)"
    }
  }

  let fhtLevel: VitalStatusDetails["fhtLevel"] = "unknown"
  let fhtLabel = "Normal"
  if (fht) {
    if (fht < 110) {
      fhtLevel = "distress"
      fhtLabel = "Fetal Bradycardia (<110 bpm) - DISTRESS"
    } else if (fht > 160) {
      fhtLevel = "distress"
      fhtLabel = "Fetal Tachycardia (>160 bpm) - DISTRESS"
    } else {
      fhtLevel = "normal"
      fhtLabel = "Reassuring FHT (120-160 bpm)"
    }
  }

  return {
    bpLevel,
    bpLabel,
    bpBadgeClass,
    pulseLevel,
    pulseLabel,
    tempLevel,
    tempLabel,
    fhtLevel,
    fhtLabel,
  }
}

export type UrgencyTier = "emergency" | "urgent" | "priority" | "routine"

export function determineReferralUrgency(
  riskLevel: string,
  parsed: ParsedReferralDetails,
  cdssAlerts: CDSSAlertItem[] = [],
  vitals?: NonNullable<PublicReferralData["obstetric_info"]>["latest_vitals"]
): {
  tier: UrgencyTier
  title: string
  badgeText: string
  containerClass: string
  badgeClass: string
  actionAdvice: string
} {
  const riskLower = (riskLevel || "").toLowerCase()
  const ccLower = parsed.chiefComplaint.toLowerCase()
  const dangerLower = (vitals?.danger_signs || "").toLowerCase()

  const isEmergency =
    vitals?.bp?.includes("160") ||
    vitals?.bp?.includes("170") ||
    vitals?.bp?.includes("180") ||
    vitals?.bp?.includes("/110") ||
    vitals?.bp?.includes("/120") ||
    dangerLower.includes("bleeding") ||
    dangerLower.includes("convulsion") ||
    dangerLower.includes("loss of consciousness") ||
    ccLower.includes("severe preeclampsia") ||
    ccLower.includes("eclampsia") ||
    ccLower.includes("hemorrhage") ||
    ccLower.includes("abruptio") ||
    cdssAlerts.some((a) => a.severity?.toLowerCase() === "high" && !a.is_resolved)

  if (isEmergency) {
    return {
      tier: "emergency",
      title: "EMERGENCY CLINICAL TRANSFER",
      badgeText: "STAT / EMERGENCY",
      containerClass: "border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-100",
      badgeClass: "bg-red-600 text-white font-black animate-pulse shadow-xs",
      actionAdvice: "Immediate OB physician triage and emergency bed preparation required.",
    }
  }

  const isUrgent =
    riskLower.includes("high") ||
    ccLower.includes("high-risk") ||
    ccLower.includes("hypertension") ||
    ccLower.includes("labor") ||
    Boolean(vitals?.danger_signs) ||
    cdssAlerts.some((a) => !a.is_resolved)

  if (isUrgent) {
    return {
      tier: "urgent",
      title: "URGENT MATERNAL TRIAGE",
      badgeText: "URGENT TRIAGE",
      containerClass: "border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100",
      badgeClass: "bg-amber-500 text-amber-950 font-black shadow-xs",
      actionAdvice: "Requires prompt evaluation by attending obstetrician upon arrival.",
    }
  }

  const isPriority =
    riskLower.includes("med") ||
    riskLower.includes("mod") ||
    (parsed.previousDelivery && parsed.previousDelivery.toLowerCase().includes("c-section")) ||
    (parsed.coMorbidities && !parsed.coMorbidities.toLowerCase().includes("none"))

  if (isPriority) {
    return {
      tier: "priority",
      title: "PRIORITY SPECIALIST CONSULTATION",
      badgeText: "PRIORITY CARE",
      containerClass: "border-border/80 bg-muted/30 text-foreground",
      badgeClass: "bg-transparent text-foreground border-border/80 font-bold",
      actionAdvice: "Scheduled specialist assessment and diagnostic review recommended.",
    }
  }

  return {
    tier: "routine",
    title: "ROUTINE CLINICAL REFERRAL",
    badgeText: "ROUTINE CONTINUITY",
    containerClass: "border-border/80 bg-muted/20 text-foreground",
    badgeClass: "bg-transparent text-muted-foreground border-border/80 font-medium",
    actionAdvice: "Standard maternal outpatient continuity and prenatal follow-up.",
  }
}

export interface ClinicalConsistencyIssue {
  hasInconsistency: boolean
  shortLabel: string
  message: string
  field: "aog" | "urgency" | "vitals"
}

export function checkClinicalConsistency(
  urgencyTier: UrgencyTier,
  parsed: ParsedReferralDetails,
  obstetric?: PublicReferralData["obstetric_info"],
  cdssAlerts: CDSSAlertItem[] = [],
  gestationalWeeks = 0,
  fundicHeightCm?: number | string
): ClinicalConsistencyIssue | null {
  const combinedText = [
    parsed.chiefComplaint,
    parsed.clinicalConcern,
    parsed.requestedAction,
    obstetric?.latest_vitals?.danger_signs,
    ...cdssAlerts.map((a) => `${a.alert_type} ${a.alert_message}`),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  const isLatePregnancyComplication =
    combinedText.includes("preeclampsia") ||
    combinedText.includes("pre-eclampsia") ||
    combinedText.includes("eclampsia") ||
    combinedText.includes("gestational hypertension") ||
    combinedText.includes("gestational htn") ||
    combinedText.includes("severe htn") ||
    combinedText.includes("hypertensive emergency") ||
    combinedText.includes("abruptio") ||
    combinedText.includes("placenta previa")

  if (isLatePregnancyComplication && gestationalWeeks > 0 && gestationalWeeks < 20) {
    return {
      hasInconsistency: true,
      shortLabel: `Check AOG (${gestationalWeeks}w) vs. Condition`,
      message: `Hypertensive disorders and preeclampsia typically manifest at ≥20 weeks AOG. Gestational age is shown as ${gestationalWeeks}w. Check records to confirm date of conception or LMP.`,
      field: "aog",
    }
  }

  const fundicNum = typeof fundicHeightCm === "string" ? parseFloat(fundicHeightCm) : fundicHeightCm
  if (fundicNum && fundicNum >= 20 && gestationalWeeks > 0 && gestationalWeeks < 14) {
    return {
      hasInconsistency: true,
      shortLabel: `Check Fundic (${fundicNum}cm) vs. AOG`,
      message: `Fundic height of ${fundicNum}cm is disproportionate to early gestational age (${gestationalWeeks}w). Please verify measurements.`,
      field: "vitals",
    }
  }

  return null
}

export function compileClinicalAlerts(
  obstetric?: PublicReferralData["obstetric_info"],
  patient?: PublicReferralData["patient"],
  prenatalVisits: PrenatalVisitItem[] = [],
  cdssAlerts: CDSSAlertItem[] = [],
  parsed?: ParsedReferralDetails
): ClinicalAlertBadge[] {
  const alerts: ClinicalAlertBadge[] = []

  if (cdssAlerts && cdssAlerts.length > 0) {
    cdssAlerts.forEach((alert, i) => {
      if (!alert.is_resolved) {
        const isCritical = alert.severity?.toLowerCase() === "high"
        alerts.push({
          id: `cdss-${alert.alert_id || i}`,
          type: "cdss",
          severity: isCritical ? "critical" : "warning",
          title: `CDSS Alert: ${alert.alert_type || "Clinical Warning"}`,
          description: alert.alert_message,
        })
      }
    })
  }

  const latestVitals = obstetric?.latest_vitals
  if (latestVitals?.danger_signs && latestVitals.danger_signs.trim()) {
    alerts.push({
      id: "danger-vitals",
      type: "danger",
      severity: "critical",
      title: "Active Danger Sign Observed",
      description: latestVitals.danger_signs,
    })
  }

  prenatalVisits.slice(0, 3).forEach((v, idx) => {
    if (
      v.danger_signs_observed &&
      v.danger_signs_observed.trim() &&
      v.danger_signs_observed !== latestVitals?.danger_signs
    ) {
      alerts.push({
        id: `danger-visit-${idx}`,
        type: "danger",
        severity: "warning",
        title: `Observed at Visit (${new Date(v.visit_date).toLocaleDateString()})`,
        description: v.danger_signs_observed,
      })
    }
  })

  const prevDel = (obstetric?.previous_delivery_history || parsed?.previousDelivery || "").toLowerCase()
  if (
    prevDel.includes("c-section") ||
    prevDel.includes("cesarean") ||
    prevDel.includes("section") ||
    prevDel.includes("scar")
  ) {
    alerts.push({
      id: "prev-cs",
      type: "obstetric",
      severity: "warning",
      title: "Previous Cesarean Section (Scarred Uterus)",
      description: "Documented history of prior surgical delivery; risk of uterine rupture in trial of labor.",
    })
  }

  const parity = obstetric?.parity ?? 0
  if (parity >= 5) {
    alerts.push({
      id: "grand-multipara",
      type: "obstetric",
      severity: "warning",
      title: `Grand Multiparous (Parity ${parity})`,
      description: "Elevated risk of precipitate labor, postpartum hemorrhage, and uterine atony.",
    })
  }

  const age = patient?.age
  if (age !== undefined && age !== null && age > 0) {
    if (age < 18) {
      alerts.push({
        id: "teen-preg",
        type: "age",
        severity: "warning",
        title: `Adolescent / Teenage Pregnancy (Age ${age})`,
        description: "High obstetric risk for cephalopelvic disproportion, preeclampsia, and low birth weight.",
      })
    } else if (age >= 35) {
      alerts.push({
        id: "ama-preg",
        type: "age",
        severity: "info",
        title: `Advanced Maternal Age (Age ${age})`,
        description: "Increased baseline risk of gestational hypertension, gestational diabetes, and chromosomal anomalies.",
      })
    }
  }

  const coMorb = (obstetric?.co_morbidities || parsed?.coMorbidities || "").trim()
  if (coMorb && !coMorb.toLowerCase().includes("none") && !coMorb.toLowerCase().includes("n/a")) {
    alerts.push({
      id: "comorbidities",
      type: "obstetric",
      severity: "warning",
      title: "Maternal Co-Morbidities",
      description: coMorb,
    })
  }

  const allergies = (patient?.allergies || obstetric?.allergies || parsed?.allergies || "").trim()
  if (
    allergies &&
    !allergies.toLowerCase().includes("no known") &&
    !allergies.toLowerCase().includes("nkda") &&
    !allergies.toLowerCase().includes("none")
  ) {
    alerts.push({
      id: "allergies",
      type: "allergy",
      severity: "critical",
      title: "Documented Drug Allergy / Precautions",
      description: allergies,
    })
  }

  return alerts
}

export interface StatusConfig {
  label: string
  badgeClass: string
  nextActionAdvice: string
  isActionable: boolean
}

export function formatStatusConfig(status?: string): StatusConfig {
  const norm = (status || "pending").toLowerCase().replace(/\s+/g, "_")

  switch (norm) {
    case "pending":
      return {
        label: "Pending Triage",
        badgeClass: "bg-transparent text-amber-700 dark:text-amber-400 border-amber-500/40",
        nextActionAdvice: "Awaiting review and acceptance by destination triage team.",
        isActionable: true,
      }
    case "acknowledged":
      return {
        label: "Acknowledged",
        badgeClass: "bg-transparent text-blue-700 dark:text-blue-400 border-blue-500/40",
        nextActionAdvice: "Referral reviewed. Patient transport in coordination.",
        isActionable: true,
      }
    case "accepted":
      return {
        label: "Transfer Accepted",
        badgeClass: "bg-transparent text-emerald-700 dark:text-emerald-400 border-emerald-500/40",
        nextActionAdvice: "Transfer accepted. Receiving facility preparing triage bed.",
        isActionable: true,
      }
    case "in_progress":
      return {
        label: "In Care",
        badgeClass: "bg-transparent text-purple-700 dark:text-purple-400 border-purple-500/40",
        nextActionAdvice: "Patient arrived at facility. Active care ongoing.",
        isActionable: true,
      }
    case "completed":
      return {
        label: "Completed",
        badgeClass: "bg-transparent text-muted-foreground border-border/80",
        nextActionAdvice: "Clinical care completed. Patient discharge or outcome documented.",
        isActionable: false,
      }
    case "rejected":
    case "declined":
      return {
        label: "Declined",
        badgeClass: "bg-transparent text-red-700 dark:text-red-400 border-red-500/40",
        nextActionAdvice: "Transfer declined by destination facility. Reason documented in registry.",
        isActionable: false,
      }
    case "transferred":
      return {
        label: "Rerouted",
        badgeClass: "bg-transparent text-cyan-700 dark:text-cyan-400 border-cyan-500/40",
        nextActionAdvice: "Patient redirected to another medical center.",
        isActionable: false,
      }
    case "cancelled":
      return {
        label: "Cancelled",
        badgeClass: "bg-transparent text-muted-foreground border-border/80",
        nextActionAdvice: "Referral withdrawn by referring health facility.",
        isActionable: false,
      }
    default:
      return {
        label: status || "Pending",
        badgeClass: "bg-transparent text-muted-foreground border-border/80",
        nextActionAdvice: "Review referral details.",
        isActionable: true,
      }
  }
}
