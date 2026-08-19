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
import axios from "axios"

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
    const token = localStorage.getItem("token")
    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    const payload = new FormData()
    payload.append("file", file)

    try {
      const res = await axios.post(`${baseUrl}/api/v1/lab-screening/upload`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      })
      if (res.data?.file_url) {
        handleChange("file_url", res.data.file_url)
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

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    const token = localStorage.getItem("token")
    const baseUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:6700"

    let url = ""
    let payload = { ...formData }

    if (type === "pregnancy") {
      url = `${baseUrl}/api/v1/pregnancy/update/${data.pregnancy_id}`
      if (dateVal) payload.lmp_date = dateVal.toISOString()
      if (payload.gravida) payload.gravida = Number(payload.gravida)
      if (payload.parity) payload.parity = Number(payload.parity)
    } else if (type === "visitation") {
      url = `${baseUrl}/api/v1/prenatal-visit/update/${data.visit_id}`
      if (dateVal) payload.visit_date = dateVal.toISOString()
      if (payload.bp_systolic) payload.bp_systolic = Number(payload.bp_systolic)
      if (payload.bp_diastolic) payload.bp_diastolic = Number(payload.bp_diastolic)
      if (payload.pulse_rate_bpm) payload.pulse_rate_bpm = Number(payload.pulse_rate_bpm)
      if (payload.weight_kg) payload.weight_kg = Number(payload.weight_kg)
      if (payload.temperature_celsius) payload.temperature_celsius = Number(payload.temperature_celsius)
      if (payload.fundic_height_cm) payload.fundic_height_cm = Number(payload.fundic_height_cm)
      if (payload.fetal_heart_tone_bpm) payload.fetal_heart_tone_bpm = Number(payload.fetal_heart_tone_bpm)
    } else if (type === "appointment") {
      url = `${baseUrl}/api/v1/appointment/update/${data.appointment_id || data._id}`
      if (dateVal) payload.appointment_date = dateVal.toISOString()
    } else if (type === "laboratory") {
      url = `${baseUrl}/api/v1/lab-screening/update/${data.screening_id}`
      if (dateVal) payload.date_of_screening = dateVal.toISOString()
    } else if (type === "prescription") {
      url = `${baseUrl}/api/v1/supplement/update`
      payload.supplement_id = data.supplement_id
      if (dateVal) payload.date_given = dateVal.toISOString()
      if (payload.tablets_given_count) payload.tablets_given_count = Number(payload.tablets_given_count)
    }

    try {
      if (url) {
        await axios.put(url, payload, {
          headers: { Authorization: `Bearer ${token}` }
        })
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
                <Label className="text-xs font-medium text-foreground dark:text-white">Gravida</Label>
                <Input
                  type="number"
                  value={formData.gravida ?? 1}
                  onChange={(e) => handleChange("gravida", e.target.value)}
                  className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground dark:text-white">Parity</Label>
                <Input
                  type="number"
                  value={formData.parity ?? 0}
                  onChange={(e) => handleChange("parity", e.target.value)}
                  className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">LMP Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full !h-9 justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs", !dateVal && "text-muted-foreground")}>
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
              <Label className="text-xs font-medium text-foreground dark:text-white">Status</Label>
              <Select value={formData.pregnancy_status || "Active"} onValueChange={(v) => handleChange("pregnancy_status", v)}>
                <SelectTrigger className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs">
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
              <Label className="text-xs font-medium text-foreground dark:text-white">Co-morbidities</Label>
              <Input
                type="text"
                placeholder="e.g. Hypertension, Diabetes, Asthma"
                value={formData.co_morbidities || ""}
                onChange={(e) => handleChange("co_morbidities", e.target.value)}
                className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">Previous Delivery History</Label>
              <Textarea
                placeholder="Notes on past deliveries..."
                value={formData.previous_delivery_history || ""}
                onChange={(e) => handleChange("previous_delivery_history", e.target.value)}
                className="resize-none h-[65px] bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
              />
            </div>
          </div>
        )}

        {/* VISITATION EDIT FORM */}
        {type === "visitation" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground dark:text-white">BP Systolic (mmHg)</Label>
                <Input
                  type="number"
                  value={formData.bp_systolic ?? ""}
                  onChange={(e) => handleChange("bp_systolic", e.target.value)}
                  className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground dark:text-white">BP Diastolic (mmHg)</Label>
                <Input
                  type="number"
                  value={formData.bp_diastolic ?? ""}
                  onChange={(e) => handleChange("bp_diastolic", e.target.value)}
                  className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground dark:text-white">Weight (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight_kg ?? ""}
                  onChange={(e) => handleChange("weight_kg", e.target.value)}
                  className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground dark:text-white">Pulse Rate (bpm)</Label>
                <Input
                  type="number"
                  value={formData.pulse_rate_bpm ?? ""}
                  onChange={(e) => handleChange("pulse_rate_bpm", e.target.value)}
                  className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground dark:text-white">Body Temp (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.temperature_celsius ?? ""}
                  onChange={(e) => handleChange("temperature_celsius", e.target.value)}
                  className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground dark:text-white">Fundic Height (cm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.fundic_height_cm ?? ""}
                  onChange={(e) => handleChange("fundic_height_cm", e.target.value)}
                  className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* APPOINTMENT EDIT FORM */}
        {type === "appointment" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">Appointment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full !h-9 justify-start text-left font-normal bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs", !dateVal && "text-muted-foreground")}>
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
              <Label className="text-xs font-medium text-foreground dark:text-white">Appointment Time</Label>
              <Input
                type="text"
                value={formData.appointment_time || ""}
                onChange={(e) => handleChange("appointment_time", e.target.value)}
                className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">Status</Label>
              <Select value={formData.status || "scheduled"} onValueChange={(v) => handleChange("status", v)}>
                <SelectTrigger className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs">
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
              <Label className="text-xs font-medium text-foreground dark:text-white">Reason</Label>
              <Textarea
                value={formData.reason || ""}
                onChange={(e) => handleChange("reason", e.target.value)}
                className="resize-none h-[65px] bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
              />
            </div>
          </div>
        )}

        {/* LABORATORY EDIT FORM */}
        {type === "laboratory" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">Screening Result</Label>
              <Input
                type="text"
                value={formData.result || ""}
                onChange={(e) => handleChange("result", e.target.value)}
                className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">Document / Lab Attachment (Optional)</Label>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-sidebar-border bg-muted/30 dark:bg-[#0a0a0a]">
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
                    className="w-full h-9 px-3 text-xs font-medium border-sidebar-border gap-2 pointer-events-none bg-background dark:bg-black"
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
                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium truncate">
                  Attached: {formData.file_url.split('/').pop()}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">Remarks</Label>
              <Textarea
                value={formData.remarks || ""}
                onChange={(e) => handleChange("remarks", e.target.value)}
                className="resize-none h-[65px] bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
              />
            </div>
          </div>
        )}

        {/* PRESCRIPTION EDIT FORM */}
        {type === "prescription" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">Tablets Given Count</Label>
              <Input
                type="number"
                value={formData.tablets_given_count ?? ""}
                onChange={(e) => handleChange("tablets_given_count", e.target.value)}
                className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground dark:text-white">Status</Label>
              <Select value={formData.is_completed ? "completed" : "in_progress"} onValueChange={(v) => handleChange("is_completed", v === "completed")}>
                <SelectTrigger className="!h-9 bg-background dark:bg-[#0a0a0a] border-sidebar-border text-xs">
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

        <div className="flex justify-end gap-2 pt-3 border-t border-sidebar-border mt-1">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="h-8 text-xs bg-foreground text-background hover:bg-foreground/90 dark:bg-white dark:text-black dark:hover:bg-zinc-200 font-medium"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
