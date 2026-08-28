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
  const [riskLevel, setRiskLevel] = React.useState<string>("Low Risk")

  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const pregnancies = motherData?.pregnancies || []

  React.useEffect(() => {
    if (pregnancies.length > 0) {
      const activePreg = pregnancies.find((p: any) => p.pregnancy_status?.toLowerCase() === "active") || pregnancies[0]
      setPregnancyId(activePreg.pregnancy_id || activePreg._id || activePreg.id || "")
      if (activePreg.gestational_age_weeks) {
        setGestationWeeks(Number(activePreg.gestational_age_weeks))
      }
      if (activePreg.trimester) {
        setTrimester(Number(activePreg.trimester))
      }
      if (activePreg.risk_flag) {
        setRiskLevel(activePreg.risk_flag)
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
    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    try {
      const payload = {
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
        risk_level_assessed: riskLevel
      }

      await mothersApi.registerPrenatalVisit(payload)
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
          <Label className="text-xs font-medium text-foreground dark:text-white">Target Pregnancy Record *</Label>
          {pregnancies.length === 0 ? (
            <div className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded border border-sidebar-border">
              No pregnancy registered for this mother. Please create a pregnancy record first.
            </div>
          ) : (
            <Select value={pregnancyId} onValueChange={setPregnancyId}>
              <SelectTrigger className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
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
            <Label htmlFor="visitNumber" className="text-xs font-medium text-foreground dark:text-white">Visit No. *</Label>
            <Input
              id="visitNumber"
              type="number"
              min={1}
              max={20}
              value={visitNumber}
              onChange={(e) => setVisitNumber(Number(e.target.value))}
              className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gestationWeeks" className="text-xs font-medium text-foreground dark:text-white">Gestation (Wks) *</Label>
            <Input
              id="gestationWeeks"
              type="number"
              min={1}
              max={45}
              value={gestationWeeks}
              onChange={(e) => handleGestationChange(e.target.value)}
              className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground dark:text-white">Trimester *</Label>
            <Select value={String(trimester)} onValueChange={(val) => setTrimester(Number(val))}>
              <SelectTrigger className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
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
        <div className="rounded-xl border border-sidebar-border/80 bg-muted/20 dark:bg-[#121212] p-4 flex flex-col gap-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Maternal Vital Signs</span>
            <span className="text-[10px] text-muted-foreground bg-muted dark:bg-[#1e1e1e] px-2 py-0.5 rounded border border-sidebar-border/50 font-medium">Standard Clinical Units</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bpSystolic" className="text-xs font-semibold text-foreground dark:text-white">BP Systolic *</Label>
              <div className="relative">
                <Input
                  id="bpSystolic"
                  type="number"
                  placeholder="120"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                  className="!h-9 pr-14 bg-background dark:bg-[#080808] border-sidebar-border text-xs font-medium text-foreground dark:text-white focus-visible:ring-1"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">mmHg</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bpDiastolic" className="text-xs font-semibold text-foreground dark:text-white">BP Diastolic *</Label>
              <div className="relative">
                <Input
                  id="bpDiastolic"
                  type="number"
                  placeholder="80"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                  className="!h-9 pr-14 bg-background dark:bg-[#080808] border-sidebar-border text-xs font-medium text-foreground dark:text-white focus-visible:ring-1"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">mmHg</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weightKg" className="text-xs font-semibold text-foreground dark:text-white">Weight *</Label>
              <div className="relative">
                <Input
                  id="weightKg"
                  type="number"
                  step="0.1"
                  placeholder="55.0"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="!h-9 pr-10 bg-background dark:bg-[#080808] border-sidebar-border text-xs font-medium text-foreground dark:text-white focus-visible:ring-1"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">kg</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pulseRateBpm" className="text-xs font-semibold text-foreground dark:text-white">Pulse Rate *</Label>
              <div className="relative">
                <Input
                  id="pulseRateBpm"
                  type="number"
                  placeholder="75"
                  value={pulseRateBpm}
                  onChange={(e) => setPulseRateBpm(e.target.value)}
                  className="!h-9 pr-12 bg-background dark:bg-[#080808] border-sidebar-border text-xs font-medium text-foreground dark:text-white focus-visible:ring-1"
                />
                <span className="absolute right-3 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">BPM</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-sidebar-border/40">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tempCelsius" className="text-xs font-semibold text-foreground dark:text-white">Temperature *</Label>
              <div className="relative">
                <Input
                  id="tempCelsius"
                  type="number"
                  step="0.1"
                  placeholder="36.5"
                  value={temperatureCelsius}
                  onChange={(e) => setTemperatureCelsius(e.target.value)}
                  className="!h-9 pr-8 bg-background dark:bg-[#080808] border-sidebar-border text-xs font-medium text-foreground dark:text-white focus-visible:ring-1"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">°C</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fundicHeight" className="text-xs font-semibold text-foreground dark:text-white">Fundal Height</Label>
              <div className="relative">
                <Input
                  id="fundicHeight"
                  type="number"
                  step="0.5"
                  placeholder="24.0"
                  value={fundicHeightCm}
                  onChange={(e) => setFundicHeightCm(e.target.value)}
                  className="!h-9 pr-9 bg-background dark:bg-[#080808] border-sidebar-border text-xs font-medium text-foreground dark:text-white focus-visible:ring-1"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">cm</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fetalHeartTone" className="text-xs font-semibold text-foreground dark:text-white">Fetal Heart Tone</Label>
              <div className="relative">
                <Input
                  id="fetalHeartTone"
                  type="number"
                  placeholder="140"
                  value={fetalHeartToneBpm}
                  onChange={(e) => setFetalHeartToneBpm(e.target.value)}
                  className="!h-9 pr-11 bg-background dark:bg-[#080808] border-sidebar-border text-xs font-medium text-foreground dark:text-white focus-visible:ring-1"
                />
                <span className="absolute right-2.5 top-2.5 text-[10px] font-medium text-muted-foreground/80 pointer-events-none">BPM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Assessment */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground dark:text-white">Risk Level Assessed</Label>
            <Select value={riskLevel} onValueChange={setRiskLevel}>
              <SelectTrigger className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white">
                <SelectValue placeholder="Select Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low Risk">Low Risk</SelectItem>
                <SelectItem value="Moderate Risk">Moderate Risk</SelectItem>
                <SelectItem value="High Risk">High Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dangerSigns" className="text-xs font-medium text-foreground dark:text-white">Danger Signs Observed</Label>
            <Input
              id="dangerSigns"
              placeholder="e.g. Severe headache, vaginal bleeding"
              value={dangerSigns}
              onChange={(e) => setDangerSigns(e.target.value)}
              className="!h-8 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="chiefComplaint" className="text-xs font-medium text-foreground dark:text-white">Chief Complaint / Clinical Notes</Label>
          <Textarea
            id="chiefComplaint"
            placeholder="Enter reason for visit or clinical findings..."
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            className="resize-none h-[60px] bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs text-foreground dark:text-white"
          />
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-sidebar-border mt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="h-8 text-xs bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-medium"
          >
            {loading ? "Recording..." : "Save Vitals Record"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
