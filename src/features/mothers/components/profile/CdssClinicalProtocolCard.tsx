import React, { useState, useMemo } from "react"
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Stethoscope,
  Send,
  Sliders,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  getRiskVariant,
  getRiskLabel,
  getRiskBadgeClasses,
  calculateOfflineTEWSRisk,
} from "@/lib/riskUtils"
import { formatDate } from "@/lib/utils"

interface CdssClinicalProtocolCardProps {
  latestVisit?: any
  pregnancy?: any
  mother?: any
  allVisits?: any[]
  onInitiateReferral?: () => void
  onOverrideRisk?: () => void
  onLogVitals?: () => void
}

export const CdssClinicalProtocolCard: React.FC<CdssClinicalProtocolCardProps> = ({
  latestVisit,
  pregnancy,
  mother,
  allVisits = [],
  onInitiateReferral,
  onOverrideRisk,
  onLogVitals,
}) => {
  const analysis = useMemo(() => {
    if (!latestVisit && !pregnancy && !mother) return null

    const baselineVisit = allVisits.find(
      (v: any) => Number(v.trimester) === 1 || Number(v.visit_number) === 1
    )

    const input = {
      bp_systolic: latestVisit?.bp_systolic,
      bp_diastolic: latestVisit?.bp_diastolic,
      pulse_rate_bpm: latestVisit?.pulse_rate_bpm,
      temperature_celsius: latestVisit?.temperature_celsius,
      danger_signs_observed: latestVisit?.danger_signs_observed,
      has_vaginal_bleeding: latestVisit?.has_vaginal_bleeding,
      has_pallor: latestVisit?.has_pallor,
      has_edema: latestVisit?.has_edema,
      has_fever: latestVisit?.has_fever,
      fetal_presentation: latestVisit?.fetal_presentation,
      height_cm: pregnancy?.height_cm,
      prev_caesarean: pregnancy?.prev_caesarean,
      consecutive_miscarriages: pregnancy?.consecutive_miscarriages,
      stillbirth_history: pregnancy?.stillbirth_history,
      pph_history: pregnancy?.pph_history,
      has_tb: pregnancy?.has_tb,
      has_heart_disease: pregnancy?.has_heart_disease,
      has_diabetes: pregnancy?.has_diabetes,
      has_asthma: pregnancy?.has_asthma,
      has_goiter: pregnancy?.has_goiter,
      mother_age: mother?.age || mother?.user?.age,
      parity: pregnancy?.parity,
      previous_delivery_history: pregnancy?.previous_delivery_history,
      baseline_bp_systolic:
        baselineVisit && baselineVisit.visit_id !== latestVisit?.visit_id
          ? Number(baselineVisit.bp_systolic) || null
          : null,
      baseline_bp_diastolic:
        baselineVisit && baselineVisit.visit_id !== latestVisit?.visit_id
          ? Number(baselineVisit.bp_diastolic) || null
          : null,
    }

    const calculated = calculateOfflineTEWSRisk(input)
    const isOverride = Boolean(
      latestVisit?.override_reason ||
      (latestVisit?.danger_signs_observed &&
        latestVisit.danger_signs_observed.toLowerCase().includes("override"))
    )
    const effectiveRisk = isOverride
      ? (latestVisit?.risk_level_assessed || latestVisit?.risk_level || calculated.risk_level)
      : (calculated.risk_level || latestVisit?.risk_level_assessed || latestVisit?.risk_level)

    return {
      riskLevel: effectiveRisk,
      tewsScore: calculated.tews_score,
      reasons: calculated.reasons,
    }
  }, [latestVisit, pregnancy, mother, allVisits])

  const variant = getRiskVariant(analysis?.riskLevel)
  const isElevated = variant === "high" || variant === "moderate"
  const isHighRisk = variant === "high"
  const isModerateRisk = variant === "moderate"

  const [expanded, setExpanded] = useState<boolean>(isElevated)

  if (!analysis) {
    return (
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Stethoscope className="h-3.5 w-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-medium text-foreground">
              Maternal Risk Assessment
            </h3>
            <p className="text-[11px] text-muted-foreground">
              No visitation encounters recorded yet for clinical triage.
            </p>
          </div>
        </div>
        {onLogVitals && (
          <Button
            size="sm"
            variant="outline"
            onClick={onLogVitals}
            className="h-7 gap-1.5 text-xs font-medium"
          >
            <Stethoscope className="h-3 w-3" />
            <span>Record Vitals</span>
          </Button>
        )}
      </div>
    )
  }

  const badgeClasses = getRiskBadgeClasses(analysis.riskLevel)

  return (
    <div
      className={`relative overflow-hidden rounded-xl border transition-all ${
        isHighRisk
          ? "border-red-500/30 bg-red-500/[0.03] dark:bg-red-500/[0.06]"
          : isModerateRisk
          ? "border-amber-500/30 bg-amber-500/[0.03] dark:bg-amber-500/[0.06]"
          : "border-border bg-card"
      }`}
    >
      <div className="flex flex-col gap-2.5 p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                isHighRisk
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : isModerateRisk
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isHighRisk ? (
                <ShieldAlert className="h-4 w-4" />
              ) : isModerateRisk ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs font-semibold text-foreground">
                  Maternal Risk Assessment
                </h3>
                <span
                  className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold border-none shadow-none ${badgeClasses.bg} ${badgeClasses.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${badgeClasses.dot}`} />
                  {getRiskLabel(analysis.riskLevel)}
                </span>
                <span className="text-[11px] text-muted-foreground font-mono">
                  TEWS: {analysis.tewsScore}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {latestVisit?.visit_date
                  ? `Assessment based on ${formatDate(latestVisit.visit_date)} encounter vitals`
                  : "Based on latest encounter physiological vitals"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onOverrideRisk && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOverrideRisk}
                className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                <Sliders className="h-3 w-3 mr-1" />
                Override
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-1 flex flex-col gap-2.5 border-t border-border/60 pt-2.5">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Identified Risk Factors ({analysis.reasons.length})
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {analysis.reasons.length > 0 ? (
                  analysis.reasons.map((reason, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={`gap-1 rounded-sm border px-2 py-0.5 text-[10px] font-normal shadow-none ${
                        isHighRisk
                          ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300"
                          : isModerateRisk
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                      <span>{reason}</span>
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">
                    All physiological vitals and obstetric indicators are within normal baseline thresholds.
                  </span>
                )}
              </div>
            </div>

            {isHighRisk && onInitiateReferral && (
              <div className="flex items-center justify-end border-t border-border/50 pt-2">
                <Button
                  size="sm"
                  onClick={onInitiateReferral}
                  className="h-7 gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
                >
                  <Send className="h-3 w-3" />
                  <span>Initiate Referral</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
