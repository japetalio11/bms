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
import { Activity, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { calculateOfflineTEWSRisk } from "@/lib/riskUtils"
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
  const [temperatureCelsius, setTemperatureCelsius] = React.useState<string>("36.5")
  const [pulseRateBpm, setPulseRateBpm] = React.useState<string>("")
  const [bpSystolic, setBpSystolic] = React.useState<string>("")
  const [bpDiastolic, setBpDiastolic] = React.useState<string>("")
  const [fundicHeightCm, setFundicHeightCm] = React.useState<string>("")
  const [fetalHeartToneBpm, setFetalHeartToneBpm] = React.useState<string>("")
  const [chiefComplaint, setChiefComplaint] = React.useState<string>("")
  const [dangerSigns, setDangerSigns] = React.useState<string>("")

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const pregnancies = motherData?.pregnancies || []

  // Dynamic real-time TEWS Risk Level computed by the system
  const calculatedAssessment = React.useMemo(() => {
    const activePreg = pregnancies.find((p: any) => p.pregnancy_id === pregnancyId || p.id === pregnancyId) || pregnancies[0]
    let motherAge: number | null = null
    if (motherData?.age) {
      motherAge = Number(motherData.age)
    } else if (motherData?.birth_date) {
      motherAge = Math.floor((Date.now() - new Date(motherData.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }

    const baselineVisit = (motherData?.prenatalVisits || []).find((v: any) => v.pregnancy_id === pregnancyId && (v.trimester === 1 || v.visit_number === 1))

    return calculateOfflineTEWSRisk({
      bp_systolic: bpSystolic ? Number(bpSystolic) : null,
      bp_diastolic: bpDiastolic ? Number(bpDiastolic) : null,
      pulse_rate_bpm: pulseRateBpm ? Number(pulseRateBpm) : null,
      temperature_celsius: temperatureCelsius ? Number(temperatureCelsius) : null,
      danger_signs_observed: dangerSigns,
      mother_age: motherAge,
      parity: activePreg?.parity != null ? Number(activePreg.parity) : null,
      previous_delivery_history: activePreg?.previous_delivery_history || null,
      baseline_bp_systolic: baselineVisit?.bp_systolic ? Number(baselineVisit.bp_systolic) : null,
      baseline_bp_diastolic: baselineVisit?.bp_diastolic ? Number(baselineVisit.bp_diastolic) : null,
    })
  }, [bpSystolic, bpDiastolic, pulseRateBpm, temperatureCelsius, dangerSigns, motherData, pregnancyId, pregnancies])

  React.useEffect(() => {
    if (open) {
      const existingVisits = motherData?.prenatalVisits || []
      setVisitNumber(existingVisits.length + 1)

      if (pregnancies.length > 0) {
        const activePreg = pregnancies.find((p: any) => p.pregnancy_status?.toLowerCase() === "active") || pregnancies[0]
        setPregnancyId(activePreg.pregnancy_id || activePreg._id || activePreg.id || "")
        if (activePreg.gestational_age_weeks) {
          setGestationWeeks(Number(activePreg.gestational_age_weeks))
        }
        if (activePreg.trimester) {
          setTrimester(Number(activePreg.trimester))
        }
      }
    }
  }, [motherData, open])

  // Automatically calculate trimester based on gestation weeks if user updates it
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

    if (!pregnancyId) {
      setError("Please select or specify an active pregnancy record.")
      return
    }

    if (!weightKg || !bpSystolic || !bpDiastolic || !pulseRateBpm || !temperatureCelsius) {
      setError("Please fill in all mandatory vital signs (Weight, BP, Pulse, Temperature).")
      return
    }

    const sys = Number(bpSystolic)
    const dia = Number(bpDiastolic)
    if (dia >= sys) {
      setError("Diastolic BP cannot be equal to or higher than Systolic BP.")
      return
    }

    // Determine current user ID from token/localStorage
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
      setError("Could not determine current logged in health worker account. Please login again.")
      return
    }

    setLoading(true)

    try {
      const motherId = motherData?.mother_id || motherData?.user_id || motherData?._id || motherData?.id || ""

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
        fetal_heart_tone_bpm: fetalHeartToneBpm ? Number(fetalHeartToneBpm) : null,
        chief_complaint: chiefComplaint || undefined,
        danger_signs_observed: dangerSigns || undefined,
        risk_level_assessed: calculatedAssessment.risk_level,
      }

      await mothersApi.registerPrenatalVisit(payload)
      toast.success(`Prenatal visit recorded. System assessed: ${calculatedAssessment.risk_level}`)
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.details?.[0] || err.message || "Failed to log vitals"
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
      <div className="flex flex-col gap-4 py-2 overflow-y-auto max-h-[80vh] px-1">
        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2.5 text-center text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        {/* Pregnancy Selector */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-foreground">Target Pregnancy Record *</Label>
          {pregnancies.length === 0 ? (
            <div className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded border border-border">
              No pregnancy registered for this mother. Please create a pregnancy record first.
            </div>
          ) : (
            <Select value={pregnancyId} onValueChange={setPregnancyId}>
              <SelectTrigger className="!h-8 bg-card border-border text-xs text-card-foreground">
                <SelectValue placeholder="Select Pregnancy" />
              </SelectTrigger>
              <SelectContent>
                {pregnancies.map((p: any, idx: number) => {
                  const isLatest = idx === 0
                  const pId = p.pregnancy_id || p._id || p.id || String(idx)
                  return (
                    <SelectItem key={pId} value={pId}>
                      Pregnancy #{pregnancies.length - idx} {isLatest ? "(Latest)" : ""} - {p.pregnancy_status || "Active"} (LMP: {p.lmp_date ? new Date(p.lmp_date).toLocaleDateString() : (p.date_of_registration ? new Date(p.date_of_registration).toLocaleDateString() : "N/A")})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Visit Details Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="visitNumber" className="text-xs font-medium text-foreground">Visit No. *</Label>
            <Input
              id="visitNumber"
              type="number"
              min={1}
              max={20}
              value={visitNumber}
              onChange={(e) => setVisitNumber(Number(e.target.value))}
              className="!h-8 bg-card border-border text-xs text-card-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gestationWeeks" className="text-xs font-medium text-foreground">Gestation (Wks) *</Label>
            <Input
              id="gestationWeeks"
              type="number"
              min={1}
              max={45}
              value={gestationWeeks}
              onChange={(e) => handleGestationChange(e.target.value)}
              className="!h-8 bg-card border-border text-xs text-card-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground">Trimester *</Label>
            <Select value={String(trimester)} onValueChange={(val) => setTrimester(Number(val))}>
              <SelectTrigger className="!h-8 bg-card border-border text-xs text-card-foreground">
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

        {/* Vitals Grid */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Maternal Vital Signs</span>
            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border font-medium">Standard Clinical Units</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bpSystolic" className="text-xs font-semibold text-foreground">BP Systolic *</Label>
              <div className="relative">
                <Input
                  id="bpSystolic"
                  type="number"
                  placeholder="120"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                  className="!h-9 pr-14 bg-card border-border text-xs font-medium text-card-foreground focus-visible:ring-1"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">mmHg</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bpDiastolic" className="text-xs font-semibold text-foreground">BP Diastolic *</Label>
              <div className="relative">
                <Input
                  id="bpDiastolic"
                  type="number"
                  placeholder="80"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                  className="!h-9 pr-14 bg-card border-border text-xs font-medium text-card-foreground focus-visible:ring-1"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">mmHg</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weightKg" className="text-xs font-semibold text-foreground">Weight *</Label>
              <div className="relative">
                <Input
                  id="weightKg"
                  type="number"
                  step="0.1"
                  placeholder="55.0"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="!h-9 pr-10 bg-card border-border text-xs font-medium text-card-foreground focus-visible:ring-1"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">kg</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pulseRateBpm" className="text-xs font-semibold text-foreground">Pulse Rate *</Label>
              <div className="relative">
                <Input
                  id="pulseRateBpm"
                  type="number"
                  placeholder="75"
                  value={pulseRateBpm}
                  onChange={(e) => setPulseRateBpm(e.target.value)}
                  className="!h-9 pr-12 bg-card border-border text-xs font-medium text-card-foreground focus-visible:ring-1"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">BPM</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tempCelsius" className="text-xs font-semibold text-foreground">Temperature *</Label>
              <div className="relative">
                <Input
                  id="tempCelsius"
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  value={temperatureCelsius}
                  onChange={(e) => setTemperatureCelsius(e.target.value)}
                  className="!h-9 pr-8 bg-card border-border text-xs font-medium text-card-foreground focus-visible:ring-1"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">°C</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fundicHeight" className="text-xs font-semibold text-foreground">Fundal Height</Label>
              <div className="relative">
                <Input
                  id="fundicHeight"
                  type="number"
                  step="0.5"
                  placeholder="24.0"
                  value={fundicHeightCm}
                  onChange={(e) => setFundicHeightCm(e.target.value)}
                  className="!h-9 pr-9 bg-card border-border text-xs font-medium text-card-foreground focus-visible:ring-1"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">cm</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fetalHeartTone" className="text-xs font-semibold text-foreground">Fetal Heart Tone</Label>
              <div className="relative">
                <Input
                  id="fetalHeartTone"
                  type="number"
                  placeholder="140"
                  value={fetalHeartToneBpm}
                  onChange={(e) => setFetalHeartToneBpm(e.target.value)}
                  className="!h-9 pr-11 bg-card border-border text-xs font-medium text-card-foreground focus-visible:ring-1"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">BPM</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Processed Clinical Risk Assessment (CDSS Engine) */}
        <div className="rounded-xl border border-border bg-muted/30 p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-primary" />
              System Clinical Risk Assessment (CDSS)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-mono">
                TEWS Score: {calculatedAssessment.tews_score}
              </span>
              <Badge
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border-none shadow-none",
                  calculatedAssessment.risk_level === "High Risk"
                    ? "bg-destructive/15 text-destructive border-destructive/20"
                    : calculatedAssessment.risk_level === "Moderate Risk"
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
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

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {calculatedAssessment.reasons.length > 0 ? (
              <span>Triggered by: {calculatedAssessment.reasons.join(", ")}</span>
            ) : (
              <span>All vital signs and physiological markers are within standard clinical baseline limits.</span>
            )}
          </p>
        </div>

        {/* Observations and Notes */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dangerSigns" className="text-xs font-medium text-foreground">Danger Signs Observed</Label>
          <Input
            id="dangerSigns"
            placeholder="e.g. Severe headache, vaginal bleeding, vision disturbance"
            value={dangerSigns}
            onChange={(e) => setDangerSigns(e.target.value)}
            className="!h-8 bg-card border-border text-xs text-card-foreground"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chiefComplaint" className="text-xs font-medium text-foreground">Chief Complaint / Clinical Notes</Label>
          <Textarea
            id="chiefComplaint"
            placeholder="Enter reason for visit or clinical findings..."
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            className="resize-none h-[60px] bg-card border-border text-xs text-card-foreground"
          />
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-border mt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            {loading ? "Recording..." : "Save Vitals Record"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
