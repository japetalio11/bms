import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Activity,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { calculateOfflineTEWSRisk } from "@/lib/riskUtils"
import {
  validatePrenatalVitals,
  CLINICAL_LIMITS,
} from "@/lib/clinicalValidation"
import { mothersApi } from "../api"

export interface LogVitalsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  motherData: any
  onSuccess?: () => void
}

export function LogVitalsModal({
  open,
  onOpenChange,
  motherData,
  onSuccess,
}: LogVitalsModalProps) {
  const [pregnancyId, setPregnancyId] = React.useState<string>("")
  const [trimester, setTrimester] = React.useState<number>(1)
  const [visitNumber, setVisitNumber] = React.useState<number>(1)
  const [gestationWeeks, setGestationWeeks] = React.useState<number>(12)
  const [weightKg, setWeightKg] = React.useState<string>("")
  const [temperatureCelsius, setTemperatureCelsius] =
    React.useState<string>("36.5")
  const [pulseRateBpm, setPulseRateBpm] = React.useState<string>("")
  const [bpSystolic, setBpSystolic] = React.useState<string>("")
  const [bpDiastolic, setBpDiastolic] = React.useState<string>("")
  const [fundicHeightCm, setFundicHeightCm] = React.useState<string>("")
  const [fetalHeartToneBpm, setFetalHeartToneBpm] = React.useState<string>("")
  const [chiefComplaint, setChiefComplaint] = React.useState<string>("")
  const [dangerSigns, setDangerSigns] = React.useState<string>("")

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({})

  const pregnancies = motherData?.pregnancies || []

  const calculatedAssessment = React.useMemo(() => {
    const activePreg =
      pregnancies.find(
        (p: any) => p.pregnancy_id === pregnancyId || p.id === pregnancyId
      ) || pregnancies[0]
    let motherAge: number | null = null
    if (motherData?.age) {
      motherAge = Number(motherData.age)
    } else if (motherData?.birth_date) {
      motherAge = Math.floor(
        (Date.now() - new Date(motherData.birth_date).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    }

    const baselineVisit = (motherData?.prenatalVisits || []).find(
      (v: any) =>
        v.pregnancy_id === pregnancyId &&
        (v.trimester === 1 || v.visit_number === 1)
    )

    return calculateOfflineTEWSRisk({
      bp_systolic: bpSystolic ? Number(bpSystolic) : null,
      bp_diastolic: bpDiastolic ? Number(bpDiastolic) : null,
      pulse_rate_bpm: pulseRateBpm ? Number(pulseRateBpm) : null,
      temperature_celsius: temperatureCelsius
        ? Number(temperatureCelsius)
        : null,
      danger_signs_observed: dangerSigns,
      mother_age: motherAge,
      parity: activePreg?.parity != null ? Number(activePreg.parity) : null,
      previous_delivery_history: activePreg?.previous_delivery_history || null,
      baseline_bp_systolic: baselineVisit?.bp_systolic
        ? Number(baselineVisit.bp_systolic)
        : null,
      baseline_bp_diastolic: baselineVisit?.bp_diastolic
        ? Number(baselineVisit.bp_diastolic)
        : null,
    })
  }, [
    bpSystolic,
    bpDiastolic,
    pulseRateBpm,
    temperatureCelsius,
    dangerSigns,
    motherData,
    pregnancyId,
    pregnancies,
  ])

  React.useEffect(() => {
    if (open) {
      setError(null)
      setFieldErrors({})
      const existingVisits = motherData?.prenatalVisits || []
      setVisitNumber(existingVisits.length + 1)

      if (pregnancies.length > 0) {
        const activePreg =
          pregnancies.find(
            (p: any) => p.pregnancy_status?.toLowerCase() === "active"
          ) || pregnancies[0]
        setPregnancyId(
          activePreg.pregnancy_id || activePreg._id || activePreg.id || ""
        )
        if (activePreg.gestational_age_weeks) {
          setGestationWeeks(Number(activePreg.gestational_age_weeks))
        }
        if (activePreg.trimester) {
          setTrimester(Number(activePreg.trimester))
        }
      }
    }
  }, [motherData, open])

  const handleGestationChange = (val: string) => {
    const weeks = Number(val)
    setGestationWeeks(weeks)
    if (weeks <= 12) {
      setTrimester(1)
    } else if (weeks <= 27) {
      setTrimester(2)
    } else if (weeks > 27) {
      setTrimester(3)
    }
  }

  const handleSubmit = async () => {
    setError(null)
    setFieldErrors({})

    if (!pregnancyId) {
      setError("Please select or specify an active pregnancy record.")
      return
    }

    if (
      !weightKg ||
      !bpSystolic ||
      !bpDiastolic ||
      !pulseRateBpm ||
      !temperatureCelsius
    ) {
      setError(
        "Please fill in all mandatory vital signs (Weight, BP, Pulse, Temperature)."
      )
      return
    }

    // Validate clinical parameters
    const vitalsValidation = validatePrenatalVitals({
      trimester,
      visit_number: visitNumber,
      age_of_gestation_weeks: gestationWeeks,
      weight_kg: weightKg,
      temperature_celsius: temperatureCelsius,
      pulse_rate_bpm: pulseRateBpm,
      bp_systolic: bpSystolic,
      bp_diastolic: bpDiastolic,
      fundic_height_cm: fundicHeightCm || undefined,
      fetal_heart_tone_bpm: fetalHeartToneBpm || undefined,
    })

    if (!vitalsValidation.isValid) {
      setFieldErrors(vitalsValidation.errorMap)
      setError(vitalsValidation.errors.join(" "))
      return
    }

    const token = localStorage.getItem("token")
    let healthWorkerId = ""
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        healthWorkerId = payload.user_id || payload.id || payload.sub || ""
      } catch (e) {
        console.error("Error decoding token payload", e)
      }
    }

    if (!healthWorkerId) {
      setError(
        "Could not determine current logged in health worker account. Please login again."
      )
      return
    }

    setLoading(true)

    try {
      const motherId =
        motherData?.mother_id ||
        motherData?.user_id ||
        motherData?._id ||
        motherData?.id ||
        ""

      const payload = {
        mother_id: motherId,
        pregnancy_id: pregnancyId,
        health_worker_id: healthWorkerId,
        trimester: Number(trimester),
        visit_number: Number(visitNumber),
        age_of_gestation_weeks: Number(gestationWeeks),
        weight_kg: Number(weightKg),
        temperature_celsius: Number(temperatureCelsius),
        pulse_rate_bpm: Number(pulseRateBpm),
        bp_systolic: Number(bpSystolic),
        bp_diastolic: Number(bpDiastolic),
        fundic_height_cm: fundicHeightCm ? Number(fundicHeightCm) : null,
        fetal_heart_tone_bpm: fetalHeartToneBpm
          ? Number(fetalHeartToneBpm)
          : null,
        chief_complaint: chiefComplaint || undefined,
        danger_signs_observed: dangerSigns || undefined,
        risk_level_assessed: calculatedAssessment.risk_level,
      }

      await mothersApi.registerPrenatalVisit(payload)
      toast.success(
        `Prenatal visit recorded. System assessed: ${calculatedAssessment.risk_level}`
      )
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.details?.[0] ||
        err.message ||
        "Failed to log vitals"
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Log Prenatal Vitals & Encounter"
      description="Record clinical vital signs and observations for this mother's visit."
      className="sm:max-w-[560px]"
    >
      <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto px-1 py-2">
        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2.5 text-center text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">
            Target Pregnancy Record *
          </Label>
          {pregnancies.length === 0 ? (
            <div className="rounded border border-border bg-muted/40 p-2 text-xs text-muted-foreground italic">
              No pregnancy registered for this mother. Please create a pregnancy
              record first.
            </div>
          ) : (
            <Select value={pregnancyId} onValueChange={setPregnancyId}>
              <SelectTrigger className="!h-8 border-border bg-card text-xs text-card-foreground">
                <SelectValue placeholder="Select Pregnancy" />
              </SelectTrigger>
              <SelectContent>
                {pregnancies.map((p: any, idx: number) => {
                  const isLatest = idx === 0
                  const pId = p.pregnancy_id || p._id || p.id || String(idx)
                  return (
                    <SelectItem key={pId} value={pId}>
                      Pregnancy #{pregnancies.length - idx}{" "}
                      {isLatest ? "(Latest)" : ""} -{" "}
                      {p.pregnancy_status || "Active"} (LMP:{" "}
                      {p.lmp_date
                        ? new Date(p.lmp_date).toLocaleDateString()
                        : p.date_of_registration
                          ? new Date(
                              p.date_of_registration
                            ).toLocaleDateString()
                          : "N/A"}
                      )
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="visitNumber"
              className="text-xs font-medium text-foreground"
            >
              Visit No. *
            </Label>
            <Input
              id="visitNumber"
              type="number"
              min={1}
              max={20}
              value={visitNumber}
              onChange={(e) => setVisitNumber(Number(e.target.value))}
              className="!h-8 border-border bg-card text-xs text-card-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="gestationWeeks"
              className="text-xs font-medium text-foreground"
            >
              Gestation (Wks) *
            </Label>
            <Input
              id="gestationWeeks"
              type="number"
              min={1}
              max={45}
              value={gestationWeeks}
              onChange={(e) => handleGestationChange(e.target.value)}
              className="!h-8 border-border bg-card text-xs text-card-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground">
              Trimester *
            </Label>
            <Select
              value={String(trimester)}
              onValueChange={(val) => setTrimester(Number(val))}
            >
              <SelectTrigger className="!h-8 border-border bg-card text-xs text-card-foreground">
                <SelectValue placeholder="Trimester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1st Trimester</SelectItem>
                <SelectItem value="2">2nd Trimester</SelectItem>
                <SelectItem value="3">3rd Trimester</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              Maternal Vital Signs
            </span>
            <span className="rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Standard Clinical Units
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="bpSystolic"
                className={cn(
                  "text-xs font-semibold",
                  fieldErrors.bp_systolic ? "text-destructive" : "text-foreground"
                )}
              >
                BP Systolic *
              </Label>
              <div className="relative">
                <Input
                  id="bpSystolic"
                  type="number"
                  min={CLINICAL_LIMITS.bp_systolic.min}
                  max={CLINICAL_LIMITS.bp_systolic.max}
                  placeholder="120"
                  value={bpSystolic}
                  onChange={(e) => {
                    setBpSystolic(e.target.value)
                    if (fieldErrors.bp_systolic) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.bp_systolic
                        return next
                      })
                    }
                  }}
                  className={cn(
                    "!h-9 border-border bg-card pr-14 text-xs font-medium text-card-foreground focus-visible:ring-1",
                    fieldErrors.bp_systolic && "border-destructive/80 focus-visible:ring-destructive"
                  )}
                />
                <span className="pointer-events-none absolute top-2.5 right-3 text-[10px] font-medium text-muted-foreground/80">
                  mmHg
                </span>
              </div>
              {fieldErrors.bp_systolic && (
                <span className="text-[10px] text-destructive leading-tight">
                  {fieldErrors.bp_systolic}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="bpDiastolic"
                className={cn(
                  "text-xs font-semibold",
                  fieldErrors.bp_diastolic ? "text-destructive" : "text-foreground"
                )}
              >
                BP Diastolic *
              </Label>
              <div className="relative">
                <Input
                  id="bpDiastolic"
                  type="number"
                  min={CLINICAL_LIMITS.bp_diastolic.min}
                  max={CLINICAL_LIMITS.bp_diastolic.max}
                  placeholder="80"
                  value={bpDiastolic}
                  onChange={(e) => {
                    setBpDiastolic(e.target.value)
                    if (fieldErrors.bp_diastolic) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.bp_diastolic
                        return next
                      })
                    }
                  }}
                  className={cn(
                    "!h-9 border-border bg-card pr-14 text-xs font-medium text-card-foreground focus-visible:ring-1",
                    fieldErrors.bp_diastolic && "border-destructive/80 focus-visible:ring-destructive"
                  )}
                />
                <span className="pointer-events-none absolute top-2.5 right-3 text-[10px] font-medium text-muted-foreground/80">
                  mmHg
                </span>
              </div>
              {fieldErrors.bp_diastolic && (
                <span className="text-[10px] text-destructive leading-tight">
                  {fieldErrors.bp_diastolic}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="weightKg"
                className={cn(
                  "text-xs font-semibold",
                  fieldErrors.weight_kg ? "text-destructive" : "text-foreground"
                )}
              >
                Weight *
              </Label>
              <div className="relative">
                <Input
                  id="weightKg"
                  type="number"
                  step="0.1"
                  min={CLINICAL_LIMITS.weight_kg.min}
                  max={CLINICAL_LIMITS.weight_kg.max}
                  placeholder="55.0"
                  value={weightKg}
                  onChange={(e) => {
                    setWeightKg(e.target.value)
                    if (fieldErrors.weight_kg) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.weight_kg
                        return next
                      })
                    }
                  }}
                  className={cn(
                    "!h-9 border-border bg-card pr-10 text-xs font-medium text-card-foreground focus-visible:ring-1",
                    fieldErrors.weight_kg && "border-destructive/80 focus-visible:ring-destructive"
                  )}
                />
                <span className="pointer-events-none absolute top-2.5 right-3 text-[10px] font-medium text-muted-foreground/80">
                  kg
                </span>
              </div>
              {fieldErrors.weight_kg && (
                <span className="text-[10px] text-destructive leading-tight">
                  {fieldErrors.weight_kg}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="pulseRateBpm"
                className={cn(
                  "text-xs font-semibold",
                  fieldErrors.pulse_rate_bpm ? "text-destructive" : "text-foreground"
                )}
              >
                Pulse Rate *
              </Label>
              <div className="relative">
                <Input
                  id="pulseRateBpm"
                  type="number"
                  min={CLINICAL_LIMITS.pulse_rate_bpm.min}
                  max={CLINICAL_LIMITS.pulse_rate_bpm.max}
                  placeholder="75"
                  value={pulseRateBpm}
                  onChange={(e) => {
                    setPulseRateBpm(e.target.value)
                    if (fieldErrors.pulse_rate_bpm) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.pulse_rate_bpm
                        return next
                      })
                    }
                  }}
                  className={cn(
                    "!h-9 border-border bg-card pr-12 text-xs font-medium text-card-foreground focus-visible:ring-1",
                    fieldErrors.pulse_rate_bpm && "border-destructive/80 focus-visible:ring-destructive"
                  )}
                />
                <span className="pointer-events-none absolute top-2.5 right-3 text-[10px] font-medium text-muted-foreground/80">
                  BPM
                </span>
              </div>
              {fieldErrors.pulse_rate_bpm && (
                <span className="text-[10px] text-destructive leading-tight">
                  {fieldErrors.pulse_rate_bpm}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t border-border pt-3">
            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="tempCelsius"
                className={cn(
                  "text-xs font-semibold",
                  fieldErrors.temperature_celsius ? "text-destructive" : "text-foreground"
                )}
              >
                Temperature *
              </Label>
              <div className="relative">
                <Input
                  id="tempCelsius"
                  type="number"
                  step="0.1"
                  min={CLINICAL_LIMITS.temperature_celsius.min}
                  max={CLINICAL_LIMITS.temperature_celsius.max}
                  placeholder="36.5"
                  value={temperatureCelsius}
                  onChange={(e) => {
                    setTemperatureCelsius(e.target.value)
                    if (fieldErrors.temperature_celsius) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.temperature_celsius
                        return next
                      })
                    }
                  }}
                  className={cn(
                    "!h-9 border-border bg-card pr-8 text-xs font-medium text-card-foreground focus-visible:ring-1",
                    fieldErrors.temperature_celsius && "border-destructive/80 focus-visible:ring-destructive"
                  )}
                />
                <span className="pointer-events-none absolute top-2.5 right-2.5 text-[10px] font-medium text-muted-foreground/80">
                  °C
                </span>
              </div>
              {fieldErrors.temperature_celsius && (
                <span className="text-[10px] text-destructive leading-tight">
                  {fieldErrors.temperature_celsius}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="fundicHeight"
                className={cn(
                  "text-xs font-semibold",
                  fieldErrors.fundic_height_cm ? "text-destructive" : "text-foreground"
                )}
              >
                Fundal Height
              </Label>
              <div className="relative">
                <Input
                  id="fundicHeight"
                  type="number"
                  step="0.5"
                  min={CLINICAL_LIMITS.fundic_height_cm.min}
                  max={CLINICAL_LIMITS.fundic_height_cm.max}
                  placeholder="24.0"
                  value={fundicHeightCm}
                  onChange={(e) => {
                    setFundicHeightCm(e.target.value)
                    if (fieldErrors.fundic_height_cm) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.fundic_height_cm
                        return next
                      })
                    }
                  }}
                  className={cn(
                    "!h-9 border-border bg-card pr-9 text-xs font-medium text-card-foreground focus-visible:ring-1",
                    fieldErrors.fundic_height_cm && "border-destructive/80 focus-visible:ring-destructive"
                  )}
                />
                <span className="pointer-events-none absolute top-2.5 right-2.5 text-[10px] font-medium text-muted-foreground/80">
                  cm
                </span>
              </div>
              {fieldErrors.fundic_height_cm && (
                <span className="text-[10px] text-destructive leading-tight">
                  {fieldErrors.fundic_height_cm}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="fetalHeartTone"
                className={cn(
                  "text-xs font-semibold",
                  fieldErrors.fetal_heart_tone_bpm ? "text-destructive" : "text-foreground"
                )}
              >
                Fetal Heart Tone
              </Label>
              <div className="relative">
                <Input
                  id="fetalHeartTone"
                  type="number"
                  min={CLINICAL_LIMITS.fetal_heart_tone_bpm.min}
                  max={CLINICAL_LIMITS.fetal_heart_tone_bpm.max}
                  placeholder="140"
                  value={fetalHeartToneBpm}
                  onChange={(e) => {
                    setFetalHeartToneBpm(e.target.value)
                    if (fieldErrors.fetal_heart_tone_bpm) {
                      setFieldErrors((prev) => {
                        const next = { ...prev }
                        delete next.fetal_heart_tone_bpm
                        return next
                      })
                    }
                  }}
                  className={cn(
                    "!h-9 border-border bg-card pr-11 text-xs font-medium text-card-foreground focus-visible:ring-1",
                    fieldErrors.fetal_heart_tone_bpm && "border-destructive/80 focus-visible:ring-destructive"
                  )}
                />
                <span className="pointer-events-none absolute top-2.5 right-2.5 text-[10px] font-medium text-muted-foreground/80">
                  BPM
                </span>
              </div>
              {fieldErrors.fetal_heart_tone_bpm && (
                <span className="text-[10px] text-destructive leading-tight">
                  {fieldErrors.fetal_heart_tone_bpm}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-muted/30 p-3.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
              <Activity className="h-3.5 w-3.5 text-primary" />
              System Clinical Risk Assessment (CDSS)
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">
                TEWS Score: {calculatedAssessment.tews_score}
              </span>
              <Badge
                className={cn(
                  "inline-flex items-center gap-1 rounded border-none px-2 py-0.5 text-[11px] font-semibold shadow-none",
                  calculatedAssessment.risk_level === "High Risk"
                    ? "border-destructive/20 bg-destructive/15 text-destructive"
                    : calculatedAssessment.risk_level === "Moderate Risk"
                      ? "border-amber-500/20 bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "border-emerald-500/20 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                )}
              >
                {calculatedAssessment.risk_level === "High Risk" ? (
                  <ShieldAlert className="h-3 w-3" />
                ) : calculatedAssessment.risk_level === "Moderate Risk" ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <CheckCircle2 className="h-3 w-3" />
                )}
                {calculatedAssessment.risk_level}
              </Badge>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {calculatedAssessment.reasons.length > 0 ? (
              <span>
                Triggered by: {calculatedAssessment.reasons.join(", ")}
              </span>
            ) : (
              <span>
                All vital signs and physiological markers are within standard
                clinical baseline limits.
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="dangerSigns"
            className="text-xs font-medium text-foreground"
          >
            Danger Signs Observed
          </Label>
          <Input
            id="dangerSigns"
            placeholder="e.g. Severe headache, vaginal bleeding, vision disturbance"
            value={dangerSigns}
            onChange={(e) => setDangerSigns(e.target.value)}
            className="!h-8 border-border bg-card text-xs text-card-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="chiefComplaint"
            className="text-xs font-medium text-foreground"
          >
            Chief Complaint / Clinical Notes
          </Label>
          <Textarea
            id="chiefComplaint"
            placeholder="Enter reason for visit or clinical findings..."
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            className="h-[60px] resize-none border-border bg-card text-xs text-card-foreground"
          />
        </div>

        <div className="mt-1 flex justify-end gap-2 border-t border-border pt-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="h-8 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Recording..." : "Save Vitals Record"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
