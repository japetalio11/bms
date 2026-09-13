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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon, Upload, Check, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { mothersApi } from "../api"

export interface EditRecordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "pregnancy" | "visitation" | "appointment" | "laboratory" | "prescription" | null
  data: any
  onSuccess?: () => void
}

export function EditRecordModal({
  open,
  onOpenChange,
  type,
  data,
  onSuccess,
}: EditRecordModalProps) {
  const [formData, setFormData] = React.useState<any>({})
  const [dateVal, setDateVal] = React.useState<Date | undefined>()
  const [uploading, setUploading] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const res = await mothersApi.uploadLabFile(file)
      if (res?.file_url) {
        handleChange("file_url", res.file_url)
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  React.useEffect(() => {
    if (!data) return
    setError(null)
    setFormData({ ...data })

    if (type === "pregnancy" && data.lmp_date) {
      setDateVal(new Date(data.lmp_date))
    } else if (type === "visitation" && data.visit_date) {
      setDateVal(new Date(data.visit_date))
    } else if (type === "appointment" && data.appointment_date) {
      setDateVal(new Date(data.appointment_date))
    } else if (type === "laboratory" && data.date_of_screening) {
      setDateVal(new Date(data.date_of_screening))
    } else if (type === "prescription" && data.date_given) {
      setDateVal(new Date(data.date_given))
    }
  }, [data, type, open])

  if (!data) return null

  const handleChange = (field: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: val }))
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    let endpoint = ""
    let payload: any = { ...formData }
    const motherId = data.mother_id || data.motherId || data.targetId || ""

    if (motherId && !payload.mother_id) {
      payload.mother_id = motherId
    }

    try {
      const { db } = await import("@/lib/db/bmsDatabase")

      if (data.pregnancy_id || data.pregnancyId) {
        payload.pregnancy_id = data.pregnancy_id || data.pregnancyId
      }

      if (payload.pregnancy_id && payload.pregnancy_id.startsWith("temp-")) {
        const allPregs = await db.pregnancies.toArray()
        const matchedPreg = allPregs.find((p: any) => p.temp_id === payload.pregnancy_id || p.id === payload.pregnancy_id || (motherId && (p.mother_id === motherId || p.motherId === motherId)))
        if (matchedPreg && matchedPreg.pregnancy_id && !matchedPreg.pregnancy_id.startsWith("temp-")) {
          payload.pregnancy_id = matchedPreg.pregnancy_id
        }
      }

      if (type === "pregnancy") {
        let pregId = data.pregnancy_id || data.id || data._id
        if (pregId && pregId.startsWith("temp-")) {
          const allPregs = await db.pregnancies.toArray()
          const matched = allPregs.find((p: any) => p.temp_id === pregId || p.id === pregId || (motherId && (p.mother_id === motherId || p.motherId === motherId)))
          if (matched && matched.pregnancy_id && !matched.pregnancy_id.startsWith("temp-")) {
            pregId = matched.pregnancy_id
          }
        }
        endpoint = `/api/v1/pregnancy/update/${pregId}`
        if (dateVal) payload.lmp_date = dateVal.toISOString()
        if (payload.gravida) payload.gravida = Number(payload.gravida)
        if (payload.parity) payload.parity = Number(payload.parity)
        await db.pregnancies.update(pregId, { ...payload, updated_at: Date.now() }).catch(() => {})
      } else if (type === "visitation") {
        let visitId = data.visit_id || data.id || data._id
        if (visitId && visitId.startsWith("temp-")) {
          const allVisits = await db.prenatalVisits.toArray()
          const matched = allVisits.find((v: any) => v.temp_id === visitId || v.id === visitId || (motherId && (v.mother_id === motherId || v.motherId === motherId)))
          if (matched && matched.visit_id && !matched.visit_id.startsWith("temp-")) {
            visitId = matched.visit_id
          }
        }
        if (data.pregnancy_id && !payload.pregnancy_id) {
          payload.pregnancy_id = data.pregnancy_id
        }
        endpoint = `/api/v1/prenatal-visit/update/${visitId}`
        if (dateVal) payload.visit_date = dateVal.toISOString()
        if (payload.pulse_rate_bpm) payload.pulse_rate_bpm = Number(payload.pulse_rate_bpm)
        if (payload.bp_systolic) payload.bp_systolic = Number(payload.bp_systolic)
        if (payload.bp_diastolic) payload.bp_diastolic = Number(payload.bp_diastolic)
        if (payload.weight_kg) payload.weight_kg = Number(payload.weight_kg)
        if (payload.temperature_celsius) payload.temperature_celsius = Number(payload.temperature_celsius)
        if (payload.fundic_height_cm) payload.fundic_height_cm = Number(payload.fundic_height_cm)
        if (payload.fetal_heart_tone_bpm) payload.fetal_heart_tone_bpm = Number(payload.fetal_heart_tone_bpm)
        await db.prenatalVisits.update(visitId, { ...payload, updated_at: Date.now() }).catch(() => {})
      } else if (type === "appointment") {
        let apptId = data.appointment_id || data._id || data.id
        if (apptId && apptId.startsWith("temp-")) {
          const allAppts = await db.appointments.toArray()
          const matched = allAppts.find((a: any) => a.temp_id === apptId || a.id === apptId || (motherId && (a.mother_id === motherId || a.user_id === motherId)))
          if (matched && matched.appointment_id && !matched.appointment_id.startsWith("temp-")) {
            apptId = matched.appointment_id
          }
        }
        endpoint = `/api/v1/appointment/update/${apptId}`
        if (dateVal) payload.appointment_date = dateVal.toISOString()
        await db.appointments.update(apptId, { ...payload, updated_at: Date.now() }).catch(() => {})
      } else if (type === "laboratory") {
        let screenId = data.screening_id || data.id || data._id
        if (screenId && screenId.startsWith("temp-")) {
          const allLabs = await db.labRecords.toArray()
          const matched = allLabs.find((l: any) => l.temp_id === screenId || l.id === screenId || (motherId && (l.mother_id === motherId || l.motherId === motherId)))
          if (matched && matched.screening_id && !matched.screening_id.startsWith("temp-")) {
            screenId = matched.screening_id
          }
        }
        if (data.pregnancy_id && !payload.pregnancy_id) payload.pregnancy_id = data.pregnancy_id
        endpoint = `/api/v1/lab-screening/update/${screenId}`
        if (dateVal) payload.date_of_screening = dateVal.toISOString()
        await db.labRecords.update(screenId, { ...payload, updated_at: Date.now() }).catch(() => {})
      } else if (type === "prescription") {
        let suppId = data.supplement_id || data.id || data._id
        if (suppId && suppId.startsWith("temp-")) {
          const allSupps = await db.supplements.toArray()
          const matched = allSupps.find((s: any) => s.temp_id === suppId || s.id === suppId || (motherId && (s.mother_id === motherId || s.motherId === motherId)))
          if (matched && matched.supplement_id && !matched.supplement_id.startsWith("temp-")) {
            suppId = matched.supplement_id
          }
        }
        if (data.pregnancy_id && !payload.pregnancy_id) payload.pregnancy_id = data.pregnancy_id
        endpoint = `/api/v1/supplement/update`
        payload.supplement_id = suppId
        if (dateVal) payload.date_given = dateVal.toISOString()
        if (payload.tablets_given_count) payload.tablets_given_count = Number(payload.tablets_given_count)
        await db.supplements.update(suppId, { ...payload, updated_at: Date.now() }).catch(() => {})
      }

      if (endpoint) {
        await mothersApi.updateRecord(endpoint, payload)
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to update record")
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (type) {
      case "pregnancy": return "Edit Pregnancy Record"
      case "visitation": return "Edit Prenatal Visit"
      case "appointment": return "Edit Appointment"
      case "laboratory": return "Edit Laboratory Screening"
      case "prescription": return "Edit Prescription / Supplement"
      default: return "Edit Record"
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={getTitle()}
      description="Update record details and click save to apply changes."
      className="sm:max-w-[500px]"
    >
      <div className="flex flex-col gap-4 py-2 overflow-y-auto max-h-[80vh] px-1">
        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2.5 text-center text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        {/* PREGNANCY EDIT FORM */}
        {type === "pregnancy" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">Gravida</Label>
                <Input
                  type="number"
                  value={formData.gravida ?? 1}
                  onChange={(e) => handleChange("gravida", e.target.value)}
                  className="!h-9 bg-card border-border text-xs text-card-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">Parity</Label>
                <Input
                  type="number"
                  value={formData.parity ?? 0}
                  onChange={(e) => handleChange("parity", e.target.value)}
                  className="!h-9 bg-card border-border text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">LMP Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full !h-9 justify-start text-left font-normal bg-card border-border text-xs", !dateVal && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dateVal ? format(dateVal, "PPP") : <span>Pick Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateVal} onSelect={setDateVal} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Status</Label>
              <Select value={formData.pregnancy_status || "Active"} onValueChange={(v) => handleChange("pregnancy_status", v)}>
                <SelectTrigger className="!h-9 bg-card border-border text-xs text-card-foreground">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Co-morbidities</Label>
              <Input
                type="text"
                placeholder="e.g. Hypertension, Diabetes, Asthma"
                value={formData.co_morbidities || ""}
                onChange={(e) => handleChange("co_morbidities", e.target.value)}
                className="!h-9 bg-card border-border text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Previous Delivery History</Label>
              <Textarea
                placeholder="Notes on past deliveries..."
                value={formData.previous_delivery_history || ""}
                onChange={(e) => handleChange("previous_delivery_history", e.target.value)}
                className="resize-none h-[65px] bg-card border-border text-xs text-card-foreground"
              />
            </div>
          </div>
        )}

        {/* VISITATION EDIT FORM */}
        {type === "visitation" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">BP Systolic (mmHg)</Label>
                <Input
                  type="number"
                  value={formData.bp_systolic ?? ""}
                  onChange={(e) => handleChange("bp_systolic", e.target.value)}
                  className="!h-9 bg-card border-border text-xs text-card-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">BP Diastolic (mmHg)</Label>
                <Input
                  type="number"
                  value={formData.bp_diastolic ?? ""}
                  onChange={(e) => handleChange("bp_diastolic", e.target.value)}
                  className="!h-9 bg-card border-border text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight_kg ?? ""}
                  onChange={(e) => handleChange("weight_kg", e.target.value)}
                  className="!h-9 bg-card border-border text-xs text-card-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">Pulse Rate (bpm)</Label>
                <Input
                  type="number"
                  value={formData.pulse_rate_bpm ?? ""}
                  onChange={(e) => handleChange("pulse_rate_bpm", e.target.value)}
                  className="!h-9 bg-card border-border text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">Body Temp (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.temperature_celsius ?? ""}
                  onChange={(e) => handleChange("temperature_celsius", e.target.value)}
                  className="!h-9 bg-card border-border text-xs text-card-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">Fundic Height (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.fundic_height_cm ?? ""}
                  onChange={(e) => handleChange("fundic_height_cm", e.target.value)}
                  className="!h-9 bg-card border-border text-xs text-card-foreground"
                />
              </div>
            </div>
          </div>
        )}

        {/* APPOINTMENT EDIT FORM */}
        {type === "appointment" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Appointment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full !h-9 justify-start text-left font-normal bg-card border-border text-xs", !dateVal && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dateVal ? format(dateVal, "PPP") : <span>Pick Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateVal} onSelect={setDateVal} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Appointment Time</Label>
              <Input
                type="text"
                value={formData.appointment_time || ""}
                onChange={(e) => handleChange("appointment_time", e.target.value)}
                className="!h-9 bg-card border-border text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Status</Label>
              <Select value={formData.status || "scheduled"} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger className="!h-9 bg-card border-border text-xs text-card-foreground">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Reason</Label>
              <Textarea
                value={formData.reason || ""}
                onChange={(e) => handleChange("reason", e.target.value)}
                className="resize-none h-[65px] bg-card border-border text-xs text-card-foreground"
              />
            </div>
          </div>
        )}

        {/* LABORATORY EDIT FORM */}
        {type === "laboratory" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Screening Result</Label>
              <Input
                type="text"
                value={formData.result || ""}
                onChange={(e) => handleChange("result", e.target.value)}
                className="!h-9 bg-card border-border text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Document / Lab Attachment (Optional)</Label>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/40">
                <label className="cursor-pointer flex-1">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,application/pdf"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploading}
                    className="w-full h-9 px-3 text-xs font-medium border-border gap-2 pointer-events-none bg-card text-card-foreground"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        Uploading Document...
                      </>
                    ) : formData.file_url ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-green-500" />
                        Document Attached (Click to Replace)
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        Choose File (PNG, JPG, PDF)
                      </>
                    )}
                  </Button>
                </label>
              </div>
              {formData.file_url && (
                <span className="text-[10px] text-emerald-600 font-medium truncate">
                  Attached: {formData.file_url.split('/').pop()}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Remarks</Label>
              <Textarea
                value={formData.remarks || ""}
                onChange={(e) => handleChange("remarks", e.target.value)}
                className="resize-none h-[65px] bg-card border-border text-xs text-card-foreground"
              />
            </div>
          </div>
        )}

        {/* PRESCRIPTION EDIT FORM */}
        {type === "prescription" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Tablets Given Count</Label>
              <Input
                type="number"
                value={formData.tablets_given_count ?? ""}
                onChange={(e) => handleChange("tablets_given_count", e.target.value)}
                className="!h-9 bg-card border-border text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">Status</Label>
              <Select value={formData.is_completed ? "completed" : "in_progress"} onValueChange={(v) => handleChange("is_completed", v === "completed")}>
                <SelectTrigger className="!h-9 bg-card border-border text-xs text-card-foreground">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-border mt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
