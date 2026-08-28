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
