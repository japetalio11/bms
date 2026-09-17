import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { calculateOfflineTEWSRisk } from "@/lib/riskUtils"
import { mothersApi } from "@/features/mothers/api"
import { db } from "@/lib/db/bmsDatabase"
import { toast } from "sonner"
import { Activity, AlertTriangle, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"

export interface LogVitalsModalProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  appointment?: any
  onSuccess?: (assessment?: any) => void
}

export function LogVitalsModal({ 
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  appointment,
  onSuccess
}: LogVitalsModalProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = controlledOpen !== undefined
  const isOpen = isControlled ? controlledOpen : internalOpen
  const handleOpenChange = (val: boolean) => {
    if (!isControlled) setInternalOpen(val)
    controlledOnOpenChange?.(val)
  }

  // Form states
  const [dangerSigns, setDangerSigns] = React.useState<Record<string, boolean>>({
    vaginalBleeding: false,
    headacheVision: false,
    puffiness: false,
    paleAnemic: false,
  })

  const [sys, setSys] = React.useState<string>("120")
  const [dia, setDia] = React.useState<string>("80")
  const [hr, setHr] = React.useState<string>("75")
  const [temp, setTemp] = React.useState<string>("36.5")
  const [sugar, setSugar] = React.useState<string>("95")
  const [weight, setWeight] = React.useState<string>("65")
  const [resp, setResp] = React.useState<string>("18")
  const [o2, setO2] = React.useState<string>("98")

  const [gest, setGest] = React.useState<string>("24")
  const [fht, setFht] = React.useState<string>("140")
  const [fundic, setFundic] = React.useState<string>("24")

  // Triage assessment & recording state
  const [assessmentResult, setAssessmentResult] = React.useState<{
    risk_level: "Low Risk" | "Moderate Risk" | "High Risk"
    tews_score: number
    reasons: string[]
  } | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [showConfirmation, setShowConfirmation] = React.useState(false)

  // Prepopulate or reset when opened
  React.useEffect(() => {
    if (isOpen) {
      setAssessmentResult(null)
      setShowConfirmation(false)
    }
  }, [isOpen])

  // Danger signs text for TEWS calculation
  const getDangerSignsText = () => {
    const signs: string[] = []
    if (dangerSigns.vaginalBleeding) signs.push("vaginal bleeding")
    if (dangerSigns.headacheVision) signs.push("severe headache and blurred vision")
    if (dangerSigns.puffiness) signs.push("facial and hand edema")
    if (dangerSigns.paleAnemic) signs.push("pallor and anemia")
    return signs.join(", ")
  }

  const handleRunRiskTriage = async () => {
    if (!sys || !dia || !hr || !temp || !weight) {
      toast.error("Please fill in the core vitals (BP, Heart Rate, Temp, Weight).")
      return
    }

    const numSys = Number(sys)
    const numDia = Number(dia)
    if (numDia >= numSys) {
      toast.error("Diastolic BP cannot be equal to or higher than Systolic BP.")
      return
    }

    const dangerText = getDangerSignsText()
    const result = calculateOfflineTEWSRisk({
      bp_systolic: numSys,
      bp_diastolic: numDia,
      pulse_rate_bpm: Number(hr),
      temperature_celsius: Number(temp),
      danger_signs_observed: dangerText,
    })

    setAssessmentResult(result)

    // Run visit persistence
    setIsSaving(true)
    try {
      // 1. Resolve logged-in health worker ID from token / localStorage
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
        // Fallback to active session user if available
        const session = await db.userSession.toArray().catch(() => [])
        if (session.length > 0 && session[0]?.id) {
          healthWorkerId = session[0].id
        }
      }

      // 2. Resolve target mother and pregnancy
      let targetMotherId = appointment?.mother_id || appointment?.mother?.mother_id || appointment?.raw?.mother_id || appointment?.user_id || appointment?.raw?.user_id || ""
      let targetPregnancyId = appointment?.pregnancy_id || appointment?.mother?.pregnancies?.[0]?.pregnancy_id || appointment?.mother?.pregnancies?.[0]?.id || ""

      // If missing from appointment, query local database using exact name match only
      if (!targetMotherId && appointment?.name && appointment.name !== "Unknown Mother" && appointment.name !== "Patient") {
        const cleanName = appointment.name.trim().toLowerCase()
        const matchingMother = await db.mothers.filter((m) => {
          const fullName = [m.first_name, m.middle_name, m.last_name].filter(Boolean).join(" ").trim().toLowerCase()
          const firstLast = [m.first_name, m.last_name].filter(Boolean).join(" ").trim().toLowerCase()
          return fullName === cleanName || firstLast === cleanName
        }).first()
        if (matchingMother) {
          targetMotherId = matchingMother.mother_id || matchingMother.id
        }
      }

      if (targetMotherId && !targetPregnancyId) {
        const foundPregnancy = await db.pregnancies
          .where("mother_id")
          .equals(targetMotherId)
          .first()
        if (foundPregnancy) {
          targetPregnancyId = foundPregnancy.pregnancy_id || foundPregnancy.id
        }
      }

      // Fallback IDs if unattached to allow offline saving
      if (!targetMotherId) targetMotherId = appointment?.id ? `mother-${appointment.id}` : "unknown-mother"
      if (!targetPregnancyId) targetPregnancyId = `preg-${targetMotherId}`

      // Calculate trimester from gestation weeks
      const numWeeks = Number(gest) || 24
      let trimester = 2
      if (numWeeks <= 12) trimester = 1
      else if (numWeeks > 27) trimester = 3

      // Count past visits to compute visit number
      let visitNumber = 1
      try {
        const pastVisits = await db.prenatalVisits.where("mother_id").equals(targetMotherId).toArray()
        visitNumber = pastVisits.length + 1
      } catch {
        visitNumber = 1
      }

      const visitPayload = {
        mother_id: targetMotherId,
        pregnancy_id: targetPregnancyId,
        health_worker_id: healthWorkerId || "system-worker",
        trimester,
        visit_number: visitNumber,
        age_of_gestation_weeks: numWeeks,
        weight_kg: Number(weight) || 65,
        temperature_celsius: Number(temp) || 36.5,
        pulse_rate_bpm: Number(hr) || 75,
        bp_systolic: numSys,
        bp_diastolic: numDia,
        fundic_height_cm: fundic ? Number(fundic) : null,
        fetal_heart_tone_bpm: fht ? Number(fht) : null,
        danger_signs_observed: dangerText || undefined,
        risk_level_assessed: result.risk_level,
        visit_date: new Date().toISOString(),
      }

      // Save via mothersApi (syncEngine + local Dexie with fallback)
      await mothersApi.registerPrenatalVisit(visitPayload)

      // First close the active input modal cleanly
      handleOpenChange(false)
      setShowConfirmation(true)

      if (result.risk_level === "High Risk") {
        toast.error(`Visit Recorded • High Risk (TEWS: ${result.tews_score})`, {
          description: result.reasons.length > 0 ? result.reasons.join(" • ") : "Immediate clinical escalation advised."
        })
      } else if (result.risk_level === "Moderate Risk") {
        toast.warning(`Visit Recorded • Moderate Risk (TEWS: ${result.tews_score})`, {
          description: result.reasons.length > 0 ? result.reasons.join(" • ") : "Close clinical monitoring recommended."
        })
      } else {
        toast.success(`Prenatal Visit Recorded Successfully (TEWS: ${result.tews_score})`, {
          description: "All vitals recorded and assessed within normal limits."
        })
      }

      onSuccess?.(result)
    } catch (err: any) {
      console.error("Error recording prenatal visit:", err)
      const errorMsg = err.response?.data?.error || err.message || "Failed to record prenatal visit"
      toast.error(errorMsg)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ResponsiveModal 
      open={isOpen}
      onOpenChange={handleOpenChange}
      trigger={children}
      title="Log Vitals"
      description="Record the clinical measurements, run real-time CDSS risk triage, and save the prenatal visit record."
      className="sm:max-w-[700px]"
    >
      <div className="flex flex-col gap-5 py-2 max-h-[75vh] overflow-y-auto pr-1">
        {/* Section 1: Clinical Danger Signs */}
        <div className="flex flex-col gap-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-red-500">Clinical Danger Signs</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="danger1" 
                checked={dangerSigns.vaginalBleeding}
                onCheckedChange={(checked) => setDangerSigns((prev) => ({ ...prev, vaginalBleeding: !!checked }))}
                className="border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" 
              />
              <Label htmlFor="danger1" className="text-xs font-medium text-red-800 dark:text-red-200 cursor-pointer">
                Any type of vaginal bleeding
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="danger2" 
                checked={dangerSigns.headacheVision}
                onCheckedChange={(checked) => setDangerSigns((prev) => ({ ...prev, headacheVision: !!checked }))}
                className="border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" 
              />
              <Label htmlFor="danger2" className="text-xs font-medium text-red-800 dark:text-red-200 cursor-pointer">
                Headache, dizziness, blurred vision
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="danger3" 
                checked={dangerSigns.puffiness}
                onCheckedChange={(checked) => setDangerSigns((prev) => ({ ...prev, puffiness: !!checked }))}
                className="border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" 
              />
              <Label htmlFor="danger3" className="text-xs font-medium text-red-800 dark:text-red-200 cursor-pointer">
                Puffiness of face and hands
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="danger4" 
                checked={dangerSigns.paleAnemic}
                onCheckedChange={(checked) => setDangerSigns((prev) => ({ ...prev, paleAnemic: !!checked }))}
                className="border-red-300 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500" 
              />
              <Label htmlFor="danger4" className="text-xs font-medium text-red-800 dark:text-red-200 cursor-pointer">
                Being pale or anemic
              </Label>
            </div>
          </div>
        </div>

        {/* Section 2: Maternal Vitals */}
        <div className="flex flex-col gap-2.5">
          <h4 className="text-xs font-semibold text-foreground dark:text-white uppercase tracking-wider">Maternal Vitals</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sys" className="text-xs text-muted-foreground">Systolic (mmHg) *</Label>
              <Input 
                id="sys" 
                type="number" 
                placeholder="120" 
                value={sys}
                onChange={(e) => setSys(e.target.value)}
                className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dia" className="text-xs text-muted-foreground">Diastolic (mmHg) *</Label>
              <Input 
                id="dia" 
                type="number" 
                placeholder="80" 
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="hr" className="text-xs text-muted-foreground">Heart Rate (bpm) *</Label>
              <Input 
                id="hr" 
                type="number" 
                placeholder="85" 
                value={hr}
                onChange={(e) => setHr(e.target.value)}
                className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="temp" className="text-xs text-muted-foreground">Body Temp (°C) *</Label>
              <Input 
                id="temp" 
                type="number" 
                step="0.1" 
                placeholder="36.5" 
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sugar" className="text-xs text-muted-foreground">Blood Sugar (mg/dL)</Label>
              <Input 
                id="sugar" 
                type="number" 
                placeholder="95" 
                value={sugar}
                onChange={(e) => setSugar(e.target.value)}
                className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weight" className="text-xs text-muted-foreground">Weight (kg) *</Label>
              <Input 
                id="weight" 
                type="number" 
                step="0.1" 
                placeholder="65.2" 
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="resp" className="text-xs text-muted-foreground">Resp Rate (cpm)</Label>
              <Input 
                id="resp" 
                type="number" 
                placeholder="18" 
                value={resp}
                onChange={(e) => setResp(e.target.value)}
                className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="o2" className="text-xs text-muted-foreground">O2 Saturation (%)</Label>
              <Input 
                id="o2" 
                type="number" 
                placeholder="98" 
                value={o2}
                onChange={(e) => setO2(e.target.value)}
                className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" 
              />
            </div>
          </div>
        </div>

        {/* Section 3: Fetal & Visit Metrics */}
        <div className="flex flex-col gap-2.5">
          <h4 className="text-xs font-semibold text-foreground dark:text-white uppercase tracking-wider">Fetal & Visit Metrics</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gest" className="text-xs text-muted-foreground">Gestational Age (Wks)</Label>
              <Input 
                id="gest" 
                type="number" 
                placeholder="24" 
                value={gest}
                onChange={(e) => setGest(e.target.value)}
                className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fht" className="text-xs text-muted-foreground">Fetal Heart Tone (bpm)</Label>
              <Input 
                id="fht" 
                type="number" 
                placeholder="140" 
                value={fht}
                onChange={(e) => setFht(e.target.value)}
                className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fundic" className="text-xs text-muted-foreground">Fundic Height (cm)</Label>
              <Input 
                id="fundic" 
                type="number" 
                placeholder="24" 
                value={fundic}
                onChange={(e) => setFundic(e.target.value)}
                className="!h-8 text-xs bg-background dark:bg-black border-sidebar-border" 
              />
            </div>
          </div>
        </div>

        {/* Live CDSS Risk Triage Result Display */}
        {assessmentResult && (
          <div className="rounded-lg border border-border bg-muted/40 p-3.5 flex flex-col gap-2 animate-in fade-in-50 duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-primary" />
                Clinical Risk Assessment Result
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground font-mono">
                  TEWS Score: {assessmentResult.tews_score}
                </span>
                <Badge
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border-none shadow-none ${
                    assessmentResult.risk_level === "High Risk"
                      ? "bg-red-500/15 text-red-600 dark:text-red-400"
                      : assessmentResult.risk_level === "Moderate Risk"
                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {assessmentResult.risk_level === "High Risk" ? (
                    <ShieldAlert className="h-3 w-3" />
                  ) : assessmentResult.risk_level === "Moderate Risk" ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3" />
                  )}
                  {assessmentResult.risk_level}
                </Badge>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {assessmentResult.reasons.length > 0 ? (
                <span>Triggers: {assessmentResult.reasons.join(", ")}</span>
              ) : (
                <span>All vital parameters and signs are within baseline normal ranges.</span>
              )}
            </p>
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-4 border-t border-sidebar-border mt-2">
        <Button variant="ghost" className="h-8 text-xs text-foreground dark:text-white hover:bg-accent dark:hover:bg-white/5" onClick={() => handleOpenChange(false)}>
          Cancel
        </Button>
        <Button 
          onClick={handleRunRiskTriage}
          disabled={isSaving}
          className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium flex items-center gap-1.5"
        >
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isSaving ? "Recording Visit..." : "Run Risk Triage & Record Visit"}
        </Button>
      </div>
    </ResponsiveModal>
  )
}
