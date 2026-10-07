import * as React from "react"
import { ResponsiveModal } from "@/components/ui/responsive-modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Calendar as CalendarIcon, Upload, Check, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  validatePrenatalVitals,
  validatePregnancyData,
  validateSupplementData,
  validateLabData,
  CLINICAL_LIMITS,
} from "@/lib/clinicalValidation"
import { mothersApi } from "../api"

export interface EditRecordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type:
    | "pregnancy"
    | "visitation"
    | "appointment"
    | "laboratory"
    | "prescription"
    | "delivery"
    | "postpartum"
    | null
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
  const [eddDateVal, setEddDateVal] = React.useState<Date | undefined>()
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
      setError(
        err.response?.data?.error || err.message || "Failed to upload file"
      )
    } finally {
      setUploading(false)
    }
  }

  React.useEffect(() => {
    if (!data) return
    setError(null)
    setFormData({ ...data })

    if (type === "pregnancy") {
      if (data.lmp_date) setDateVal(new Date(data.lmp_date))
      if (data.edd_date) setEddDateVal(new Date(data.edd_date))
    } else if (type === "visitation" && data.visit_date) {
      setDateVal(new Date(data.visit_date))
    } else if (type === "postpartum" && data.visit_date) {
      setDateVal(new Date(data.visit_date))
    } else if (type === "appointment" && data.appointment_date) {
      setDateVal(new Date(data.appointment_date))
    } else if (type === "laboratory" && data.date_of_screening) {
      setDateVal(new Date(data.date_of_screening))
    } else if (type === "prescription" && data.date_given) {
      setDateVal(new Date(data.date_given))
    } else if (type === "delivery" && data.delivery_date) {
      setDateVal(new Date(data.delivery_date))
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
        const matchedPreg = allPregs.find(
          (p: any) =>
            p.temp_id === payload.pregnancy_id ||
            p.id === payload.pregnancy_id ||
            (motherId && (p.mother_id === motherId || p.motherId === motherId))
        )
        if (
          matchedPreg &&
          matchedPreg.pregnancy_id &&
          !matchedPreg.pregnancy_id.startsWith("temp-")
        ) {
          payload.pregnancy_id = matchedPreg.pregnancy_id
        }
      }

      if (type === "pregnancy") {
        if (dateVal) payload.lmp_date = dateVal.toISOString()
        if (eddDateVal) payload.edd_date = eddDateVal.toISOString()
        if (payload.gravida !== undefined) payload.gravida = Number(payload.gravida)
        if (payload.parity !== undefined) payload.parity = Number(payload.parity)
        if (payload.height_cm !== undefined && payload.height_cm !== "") {
          payload.height_cm = Number(payload.height_cm)
        } else {
          payload.height_cm = null
        }
        payload.completed_8anc = Boolean(payload.completed_8anc)
        payload.prev_caesarean = Boolean(payload.prev_caesarean)
        payload.consecutive_miscarriages = Boolean(payload.consecutive_miscarriages)
        payload.stillbirth_history = Boolean(payload.stillbirth_history)
        payload.pph_history = Boolean(payload.pph_history)
        payload.has_tb = Boolean(payload.has_tb)
        payload.has_heart_disease = Boolean(payload.has_heart_disease)
        payload.has_diabetes = Boolean(payload.has_diabetes)
        payload.has_asthma = Boolean(payload.has_asthma)
        payload.has_goiter = Boolean(payload.has_goiter)

        const pregVal = validatePregnancyData({
          lmp_date: payload.lmp_date,
          gravida: payload.gravida,
          parity: payload.parity,
          edd_date: payload.edd_date,
          height_cm: payload.height_cm,
        })
        if (!pregVal.isValid) {
          setError(pregVal.errors.join(" "))
          setLoading(false)
          return
        }

        let pregId = data.pregnancy_id || data.id || data._id
        if (pregId && pregId.startsWith("temp-")) {
          const allPregs = await db.pregnancies.toArray()
          const matched = allPregs.find(
            (p: any) =>
              p.temp_id === pregId ||
              p.id === pregId ||
              (motherId &&
                (p.mother_id === motherId || p.motherId === motherId))
          )
          if (
            matched &&
            matched.pregnancy_id &&
            !matched.pregnancy_id.startsWith("temp-")
          ) {
            pregId = matched.pregnancy_id
          }
        }
        endpoint = `/api/v1/pregnancy/update/${pregId}`
        await db.pregnancies
          .update(pregId, { ...payload, updated_at: Date.now() })
          .catch(() => {})
      } else if (type === "visitation") {
        if (dateVal) payload.visit_date = dateVal.toISOString()
        if (payload.pulse_rate_bpm !== undefined && payload.pulse_rate_bpm !== "")
          payload.pulse_rate_bpm = Number(payload.pulse_rate_bpm)
        if (payload.bp_systolic !== undefined && payload.bp_systolic !== "")
          payload.bp_systolic = Number(payload.bp_systolic)
        if (payload.bp_diastolic !== undefined && payload.bp_diastolic !== "")
          payload.bp_diastolic = Number(payload.bp_diastolic)
        if (payload.weight_kg !== undefined && payload.weight_kg !== "")
          payload.weight_kg = Number(payload.weight_kg)
        if (payload.temperature_celsius !== undefined && payload.temperature_celsius !== "")
          payload.temperature_celsius = Number(payload.temperature_celsius)
        if (payload.fundic_height_cm !== undefined && payload.fundic_height_cm !== "")
          payload.fundic_height_cm = Number(payload.fundic_height_cm)
        if (payload.fetal_heart_tone_bpm !== undefined && payload.fetal_heart_tone_bpm !== "")
          payload.fetal_heart_tone_bpm = Number(payload.fetal_heart_tone_bpm)

        payload.has_vaginal_bleeding = Boolean(payload.has_vaginal_bleeding)
        payload.has_pallor = Boolean(payload.has_pallor)
        payload.has_edema = Boolean(payload.has_edema)
        payload.has_fever = Boolean(payload.has_fever)

        const vitalsVal = validatePrenatalVitals({
          trimester: payload.trimester,
          visit_number: payload.visit_number,
          age_of_gestation_weeks: payload.age_of_gestation_weeks,
          weight_kg: payload.weight_kg,
          temperature_celsius: payload.temperature_celsius,
          pulse_rate_bpm: payload.pulse_rate_bpm,
          bp_systolic: payload.bp_systolic,
          bp_diastolic: payload.bp_diastolic,
          fundic_height_cm: payload.fundic_height_cm || undefined,
          fetal_heart_tone_bpm: payload.fetal_heart_tone_bpm || undefined,
        })
        if (!vitalsVal.isValid) {
          setError(vitalsVal.errors.join(" "))
          setLoading(false)
          return
        }

        let visitId = data.visit_id || data.id || data._id
        if (visitId && visitId.startsWith("temp-")) {
          const allVisits = await db.prenatalVisits.toArray()
          const matched = allVisits.find(
            (v: any) =>
              v.temp_id === visitId ||
              v.id === visitId ||
              (motherId &&
                (v.mother_id === motherId || v.motherId === motherId))
          )
          if (
            matched &&
            matched.visit_id &&
            !matched.visit_id.startsWith("temp-")
          ) {
            visitId = matched.visit_id
          }
        }
        if (data.pregnancy_id && !payload.pregnancy_id) {
          payload.pregnancy_id = data.pregnancy_id
        }
        endpoint = `/api/v1/prenatal-visit/update/${visitId}`
        await db.prenatalVisits
          .update(visitId, { ...payload, updated_at: Date.now() })
          .catch(() => {})
      } else if (type === "appointment") {
        let apptId = data.appointment_id || data._id || data.id
        if (apptId && apptId.startsWith("temp-")) {
          const allAppts = await db.appointments.toArray()
          const matched = allAppts.find(
            (a: any) =>
              a.temp_id === apptId ||
              a.id === apptId ||
              (motherId && (a.mother_id === motherId || a.user_id === motherId))
          )
          if (
            matched &&
            matched.appointment_id &&
            !matched.appointment_id.startsWith("temp-")
          ) {
            apptId = matched.appointment_id
          }
        }
        endpoint = `/api/v1/appointment/update/${apptId}`
        if (dateVal) payload.appointment_date = dateVal.toISOString()
        await db.appointments
          .update(apptId, { ...payload, updated_at: Date.now() })
          .catch(() => {})
      } else if (type === "laboratory") {
        if (dateVal) payload.date_of_screening = dateVal.toISOString()
        const labVal = validateLabData({
          screening_type: payload.screening_type,
          result: payload.result,
          date_of_screening: payload.date_of_screening,
        })
        if (!labVal.isValid) {
          setError(labVal.errors.join(" "))
          setLoading(false)
          return
        }

        let screenId = data.screening_id || data.id || data._id
        if (screenId && screenId.startsWith("temp-")) {
          const allLabs = await db.labRecords.toArray()
          const matched = allLabs.find(
            (l: any) =>
              l.temp_id === screenId ||
              l.id === screenId ||
              (motherId &&
                (l.mother_id === motherId || l.motherId === motherId))
          )
          if (
            matched &&
            matched.screening_id &&
            !matched.screening_id.startsWith("temp-")
          ) {
            screenId = matched.screening_id
          }
        }
        if (data.pregnancy_id && !payload.pregnancy_id)
          payload.pregnancy_id = data.pregnancy_id
        endpoint = `/api/v1/lab-screening/update/${screenId}`
        await db.labRecords
          .update(screenId, { ...payload, updated_at: Date.now() })
          .catch(() => {})
      } else if (type === "prescription") {
        if (dateVal) payload.date_given = dateVal.toISOString()
        if (payload.tablets_given_count !== undefined && payload.tablets_given_count !== "")
          payload.tablets_given_count = Number(payload.tablets_given_count)

        const suppVal = validateSupplementData({
          supplement_type: payload.supplement_type,
          date_given: payload.date_given,
          tablets_given_count: payload.tablets_given_count,
        })
        if (!suppVal.isValid) {
          setError(suppVal.errors.join(" "))
          setLoading(false)
          return
        }

        let suppId = data.supplement_id || data.id || data._id
        if (suppId && suppId.startsWith("temp-")) {
          const allSupps = await db.supplements.toArray()
          const matched = allSupps.find(
            (s: any) =>
              s.temp_id === suppId ||
              s.id === suppId ||
              (motherId &&
                (s.mother_id === motherId || s.motherId === motherId))
          )
          if (
            matched &&
            matched.supplement_id &&
            !matched.supplement_id.startsWith("temp-")
          ) {
            suppId = matched.supplement_id
          }
        }
        if (data.pregnancy_id && !payload.pregnancy_id)
          payload.pregnancy_id = data.pregnancy_id
        endpoint = `/api/v1/supplement/update`
        payload.supplement_id = suppId
        await db.supplements
          .update(suppId, { ...payload, updated_at: Date.now() })
          .catch(() => {})
      } else if (type === "delivery") {
        if (dateVal) payload.delivery_date = dateVal.toISOString()
        if (
          payload.duration_of_labor_hours !== undefined &&
          payload.duration_of_labor_hours !== ""
        ) {
          payload.duration_of_labor_hours = Number(
            payload.duration_of_labor_hours
          )
        }
        if (payload.blood_loss_ml !== undefined && payload.blood_loss_ml !== "") {
          payload.blood_loss_ml = Number(payload.blood_loss_ml)
        }
        payload.immediate_breastfeeding = Boolean(payload.immediate_breastfeeding)

        let delId = data.delivery_id || data.id || data._id
        if (delId && delId.startsWith("temp-")) {
          const allDeliveries = await db.deliveries.toArray()
          const matched = allDeliveries.find(
            (d: any) =>
              d.temp_id === delId ||
              d.id === delId ||
              (data.pregnancy_id && d.pregnancy_id === data.pregnancy_id)
          )
          if (
            matched &&
            matched.delivery_id &&
            !matched.delivery_id.startsWith("temp-")
          ) {
            delId = matched.delivery_id
          }
        }
        endpoint = `/api/v1/delivery-outcome/update/${delId}`
        await db.deliveries
          .update(delId, { ...payload, updated_at: Date.now() })
          .catch(() => {})
      } else if (type === "postpartum") {
        if (dateVal) payload.visit_date = dateVal.toISOString()
        if (payload.pulse_rate_bpm !== undefined && payload.pulse_rate_bpm !== "")
          payload.pulse_rate_bpm = Number(payload.pulse_rate_bpm)
        if (payload.bp_systolic !== undefined && payload.bp_systolic !== "")
          payload.bp_systolic = Number(payload.bp_systolic)
        if (payload.bp_diastolic !== undefined && payload.bp_diastolic !== "")
          payload.bp_diastolic = Number(payload.bp_diastolic)
        if (payload.weight_kg !== undefined && payload.weight_kg !== "")
          payload.weight_kg = Number(payload.weight_kg)
        if (payload.temperature_celsius !== undefined && payload.temperature_celsius !== "")
          payload.temperature_celsius = Number(payload.temperature_celsius)
        if (payload.fundic_height_cm !== undefined && payload.fundic_height_cm !== "")
          payload.fundic_height_cm = Number(payload.fundic_height_cm)
        if (payload.fp_quantity_given !== undefined && payload.fp_quantity_given !== "")
          payload.fp_quantity_given = Number(payload.fp_quantity_given)

        payload.foul_smelling_discharge = Boolean(payload.foul_smelling_discharge)
        payload.cord_condition_normal = Boolean(payload.cord_condition_normal)

        let postId = data.postpartum_visit_id || data.visit_id || data.id || data._id
        if (postId && postId.startsWith("temp-")) {
          const allPosts = await db.postpartumVisits.toArray()
          const matched = allPosts.find(
            (p: any) =>
              p.temp_id === postId ||
              p.id === postId ||
              p.postpartum_visit_id === postId ||
              (data.pregnancy_id && p.pregnancy_id === data.pregnancy_id)
          )
          if (
            matched &&
            matched.postpartum_visit_id &&
            !matched.postpartum_visit_id.startsWith("temp-")
          ) {
            postId = matched.postpartum_visit_id
          }
        }
        endpoint = `/api/v1/postpartum-visit/update/${postId}`
        await db.postpartumVisits
          .update(postId, { ...payload, updated_at: Date.now() })
          .catch(() => {})
      }

      if (endpoint) {
        await mothersApi.updateRecord(endpoint, payload)
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      setError(
        err.response?.data?.error || err.message || "Failed to update record"
      )
    } finally {
      setLoading(false)
    }
  }

  const getTitle = () => {
    switch (type) {
      case "pregnancy":
        return "Edit Pregnancy Record"
      case "visitation":
        return "Edit Prenatal Visit"
      case "appointment":
        return "Edit Appointment"
      case "laboratory":
        return "Edit Laboratory Screening"
      case "prescription":
        return "Edit Prescription / Supplement"
      case "delivery":
        return "Edit Delivery Record"
      case "postpartum":
        return "Edit Postpartum Visit"
      default:
        return "Edit Record"
    }
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title={getTitle()}
      description="Update record details and click save to apply changes."
      className={cn(
        "sm:max-w-xl",
        (type === "visitation" || type === "delivery" || type === "pregnancy") && "md:max-w-2xl"
      )}
    >
      <div className="flex max-h-[80vh] flex-col gap-4 overflow-y-auto px-1 py-2">
        {error && (
          <div className="rounded border border-destructive/50 bg-destructive/10 p-2.5 text-center text-xs font-medium text-destructive">
            {error}
          </div>
        )}

        {type === "pregnancy" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Gravida
                </Label>
                <Input
                  type="number"
                  value={formData.gravida ?? 1}
                  onChange={(e) => handleChange("gravida", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Parity
                </Label>
                <Input
                  type="number"
                  value={formData.parity ?? 0}
                  onChange={(e) => handleChange("parity", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  LMP Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "!h-9 w-full justify-start border-border bg-card text-left text-xs font-normal",
                        !dateVal && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateVal ? format(dateVal, "PPP") : <span>Pick LMP Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateVal}
                      onSelect={setDateVal}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  EDD Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "!h-9 w-full justify-start border-border bg-card text-left text-xs font-normal",
                        !eddDateVal && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {eddDateVal ? format(eddDateVal, "PPP") : <span>Pick EDD Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eddDateVal}
                      onSelect={setEddDateVal}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Status
                </Label>
                <Select
                  value={formData.pregnancy_status || "Active"}
                  onValueChange={(v) => handleChange("pregnancy_status", v)}
                >
                  <SelectTrigger className="!h-9 w-full min-w-0 justify-between border-border bg-card px-3 text-xs text-card-foreground [&>span]:truncate [&>span]:block pr-7">
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
                <Label className="text-xs font-medium text-foreground">
                  Maternal Height (cm)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 152"
                  value={formData.height_cm ?? ""}
                  onChange={(e) => handleChange("height_cm", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="editCompleted8Anc"
                checked={Boolean(formData.completed_8anc)}
                onCheckedChange={(checked) => handleChange("completed_8anc", Boolean(checked))}
              />
              <Label htmlFor="editCompleted8Anc" className="text-xs cursor-pointer text-foreground">
                Completed 8 ANC Visits benchmark
              </Label>
            </div>

            <div className="my-1 h-px bg-border" />
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                Obstetric High-Risk History
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editPrevCaesarean"
                    checked={Boolean(formData.prev_caesarean)}
                    onCheckedChange={(c) => handleChange("prev_caesarean", Boolean(c))}
                  />
                  <Label htmlFor="editPrevCaesarean" className="text-xs cursor-pointer">
                    Previous Caesarean
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editConsecutiveMiscarriages"
                    checked={Boolean(formData.consecutive_miscarriages)}
                    onCheckedChange={(c) => handleChange("consecutive_miscarriages", Boolean(c))}
                  />
                  <Label htmlFor="editConsecutiveMiscarriages" className="text-xs cursor-pointer">
                    3+ Consecutive Miscarriages
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editStillbirthHistory"
                    checked={Boolean(formData.stillbirth_history)}
                    onCheckedChange={(c) => handleChange("stillbirth_history", Boolean(c))}
                  />
                  <Label htmlFor="editStillbirthHistory" className="text-xs cursor-pointer">
                    Stillbirth History
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editPphHistory"
                    checked={Boolean(formData.pph_history)}
                    onCheckedChange={(c) => handleChange("pph_history", Boolean(c))}
                  />
                  <Label htmlFor="editPphHistory" className="text-xs cursor-pointer">
                    Postpartum Hemorrhage History
                  </Label>
                </div>
              </div>
            </div>

            <div className="my-1 h-px bg-border" />
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                Chronic Medical Conditions
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editHasTb"
                    checked={Boolean(formData.has_tb)}
                    onCheckedChange={(c) => handleChange("has_tb", Boolean(c))}
                  />
                  <Label htmlFor="editHasTb" className="text-xs cursor-pointer">
                    Tuberculosis (TB)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editHasHeartDisease"
                    checked={Boolean(formData.has_heart_disease)}
                    onCheckedChange={(c) => handleChange("has_heart_disease", Boolean(c))}
                  />
                  <Label htmlFor="editHasHeartDisease" className="text-xs cursor-pointer">
                    Heart Disease
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editHasDiabetes"
                    checked={Boolean(formData.has_diabetes)}
                    onCheckedChange={(c) => handleChange("has_diabetes", Boolean(c))}
                  />
                  <Label htmlFor="editHasDiabetes" className="text-xs cursor-pointer">
                    Diabetes Mellitus
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editHasAsthma"
                    checked={Boolean(formData.has_asthma)}
                    onCheckedChange={(c) => handleChange("has_asthma", Boolean(c))}
                  />
                  <Label htmlFor="editHasAsthma" className="text-xs cursor-pointer">
                    Bronchial Asthma
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editHasGoiter"
                    checked={Boolean(formData.has_goiter)}
                    onCheckedChange={(c) => handleChange("has_goiter", Boolean(c))}
                  />
                  <Label htmlFor="editHasGoiter" className="text-xs cursor-pointer">
                    Goiter / Thyroid Disorder
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Co-morbidities
              </Label>
              <Input
                type="text"
                placeholder="e.g. Hypertension, Diabetes, Asthma"
                value={formData.co_morbidities || ""}
                onChange={(e) => handleChange("co_morbidities", e.target.value)}
                className="!h-9 border-border bg-card text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Previous Delivery History
              </Label>
              <Textarea
                placeholder="Notes on past deliveries..."
                value={formData.previous_delivery_history || ""}
                onChange={(e) =>
                  handleChange("previous_delivery_history", e.target.value)
                }
                className="h-[65px] resize-none border-border bg-card text-xs text-card-foreground"
              />
            </div>
          </div>
        )}

        {type === "visitation" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  BP Systolic (mmHg)
                </Label>
                <Input
                  type="number"
                  value={formData.bp_systolic ?? ""}
                  onChange={(e) => handleChange("bp_systolic", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  BP Diastolic (mmHg)
                </Label>
                <Input
                  type="number"
                  value={formData.bp_diastolic ?? ""}
                  onChange={(e) => handleChange("bp_diastolic", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Weight (kg)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight_kg ?? ""}
                  onChange={(e) => handleChange("weight_kg", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Pulse Rate (bpm)
                </Label>
                <Input
                  type="number"
                  value={formData.pulse_rate_bpm ?? ""}
                  onChange={(e) =>
                    handleChange("pulse_rate_bpm", e.target.value)
                  }
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Body Temp (°C)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.temperature_celsius ?? ""}
                  onChange={(e) =>
                    handleChange("temperature_celsius", e.target.value)
                  }
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Fundic Height (cm)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.fundic_height_cm ?? ""}
                  onChange={(e) =>
                    handleChange("fundic_height_cm", e.target.value)
                  }
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Fetal Heart Tone (bpm)
                </Label>
                <Input
                  type="number"
                  value={formData.fetal_heart_tone_bpm ?? ""}
                  onChange={(e) =>
                    handleChange("fetal_heart_tone_bpm", e.target.value)
                  }
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Fetal Presentation
                </Label>
                <Select
                  value={formData.fetal_presentation || "Cephalic"}
                  onValueChange={(v) => handleChange("fetal_presentation", v)}
                >
                  <SelectTrigger className="!h-9 border-border bg-card text-xs text-card-foreground">
                    <SelectValue placeholder="Presentation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cephalic">Cephalic (Head first)</SelectItem>
                    <SelectItem value="Breech">Breech</SelectItem>
                    <SelectItem value="Transverse">Transverse / Shoulder</SelectItem>
                    <SelectItem value="Other">Other / Undetermined</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="my-1 h-px bg-border" />
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                Danger Signs & Clinical Symptoms
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editVaginalBleeding"
                    checked={Boolean(formData.has_vaginal_bleeding)}
                    onCheckedChange={(c) => handleChange("has_vaginal_bleeding", Boolean(c))}
                  />
                  <Label htmlFor="editVaginalBleeding" className="text-xs cursor-pointer">
                    Vaginal Bleeding
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editPallor"
                    checked={Boolean(formData.has_pallor)}
                    onCheckedChange={(c) => handleChange("has_pallor", Boolean(c))}
                  />
                  <Label htmlFor="editPallor" className="text-xs cursor-pointer">
                    Severe Pallor
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editEdema"
                    checked={Boolean(formData.has_edema)}
                    onCheckedChange={(c) => handleChange("has_edema", Boolean(c))}
                  />
                  <Label htmlFor="editEdema" className="text-xs cursor-pointer">
                    Edema (Hands/Face)
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editFever"
                    checked={Boolean(formData.has_fever)}
                    onCheckedChange={(c) => handleChange("has_fever", Boolean(c))}
                  />
                  <Label htmlFor="editFever" className="text-xs cursor-pointer">
                    High Fever
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Chief Complaint
              </Label>
              <Textarea
                placeholder="Patient symptoms or complaints..."
                value={formData.chief_complaint || ""}
                onChange={(e) => handleChange("chief_complaint", e.target.value)}
                className="h-[60px] resize-none border-border bg-card text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Danger Signs Observed
              </Label>
              <Textarea
                placeholder="Observed clinical warnings or notes..."
                value={formData.danger_signs_observed || ""}
                onChange={(e) => handleChange("danger_signs_observed", e.target.value)}
                className="h-[60px] resize-none border-border bg-card text-xs text-card-foreground"
              />
            </div>
          </div>
        )}

        {type === "appointment" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Appointment Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "!h-9 w-full justify-start border-border bg-card text-left text-xs font-normal",
                      !dateVal && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dateVal ? format(dateVal, "PPP") : <span>Pick Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateVal}
                    onSelect={setDateVal}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Appointment Time
              </Label>
              <Input
                type="text"
                value={formData.appointment_time || ""}
                onChange={(e) =>
                  handleChange("appointment_time", e.target.value)
                }
                className="!h-9 border-border bg-card text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Status
              </Label>
              <Select
                value={formData.status || "scheduled"}
                onValueChange={(v) => handleChange("status", v)}
              >
                <SelectTrigger className="!h-9 w-full min-w-0 justify-between border-border bg-card px-3 text-xs text-card-foreground [&>span]:truncate [&>span]:block pr-7">
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
              <Label className="text-xs font-medium text-foreground">
                Reason
              </Label>
              <Textarea
                value={formData.reason || ""}
                onChange={(e) => handleChange("reason", e.target.value)}
                className="h-[65px] resize-none border-border bg-card text-xs text-card-foreground"
              />
            </div>
          </div>
        )}

        {type === "laboratory" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Screening Result
              </Label>
              <Input
                type="text"
                value={formData.result || ""}
                onChange={(e) => handleChange("result", e.target.value)}
                className="!h-9 border-border bg-card text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Document / Lab Attachment (Optional)
              </Label>
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-3">
                <label className="flex-1 cursor-pointer">
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
                    className="pointer-events-none h-9 w-full gap-2 border-border bg-card px-3 text-xs font-medium text-card-foreground"
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
                <span className="truncate text-[10px] font-medium text-emerald-600">
                  Attached: {formData.file_url.split("/").pop()}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Remarks
              </Label>
              <Textarea
                value={formData.remarks || ""}
                onChange={(e) => handleChange("remarks", e.target.value)}
                className="h-[65px] resize-none border-border bg-card text-xs text-card-foreground"
              />
            </div>
          </div>
        )}

        {type === "prescription" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Tablets Given Count
              </Label>
              <Input
                type="number"
                value={formData.tablets_given_count ?? ""}
                onChange={(e) =>
                  handleChange("tablets_given_count", e.target.value)
                }
                className="!h-9 border-border bg-card text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Status
              </Label>
              <Select
                value={formData.is_completed ? "completed" : "in_progress"}
                onValueChange={(v) =>
                  handleChange("is_completed", v === "completed")
                }
              >
                <SelectTrigger className="!h-9 w-full min-w-0 justify-between border-border bg-card px-3 text-xs text-card-foreground [&>span]:truncate [&>span]:block pr-7">
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

        {type === "delivery" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Delivery Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "!h-9 w-full justify-start border-border bg-card text-left text-xs font-normal",
                      !dateVal && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {dateVal ? format(dateVal, "PPP") : <span>Pick Date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateVal}
                    onSelect={setDateVal}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 min-w-0">
                <Label className="text-xs font-medium text-foreground">
                  Place of Delivery
                </Label>
                <Select
                  value={
                    formData.place_of_delivery ||
                    "Rural Health Unit / Birthing Clinic"
                  }
                  onValueChange={(v) => handleChange("place_of_delivery", v)}
                >
                  <SelectTrigger className="!h-9 w-full min-w-0 justify-between border-border bg-card px-3 text-xs text-card-foreground [&>span]:truncate [&>span]:block pr-7">
                    <SelectValue placeholder="Place" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.place_of_delivery &&
                      ![
                        "Rural Health Unit / Birthing Clinic",
                        "District Hospital",
                        "Provincial / Tertiary Hospital",
                        "Private Hospital / Clinic",
                        "Barangay Health Station",
                        "Birthing Home",
                        "Hospital",
                        "Home Delivery",
                        "In-Transit",
                        "Other",
                      ].includes(formData.place_of_delivery) && (
                        <SelectItem value={formData.place_of_delivery}>
                          {formData.place_of_delivery}
                        </SelectItem>
                      )}
                    <SelectItem value="Rural Health Unit / Birthing Clinic">
                      Rural Health Unit / Birthing Clinic
                    </SelectItem>
                    <SelectItem value="District Hospital">
                      District Hospital
                    </SelectItem>
                    <SelectItem value="Provincial / Tertiary Hospital">
                      Provincial / Tertiary Hospital
                    </SelectItem>
                    <SelectItem value="Private Hospital / Clinic">
                      Private Hospital / Clinic
                    </SelectItem>
                    <SelectItem value="Barangay Health Station">
                      Barangay Health Station
                    </SelectItem>
                    <SelectItem value="Birthing Home">
                      Birthing Home
                    </SelectItem>
                    <SelectItem value="Hospital">
                      Hospital
                    </SelectItem>
                    <SelectItem value="Home Delivery">
                      Home Delivery
                    </SelectItem>
                    <SelectItem value="In-Transit">
                      In-Transit
                    </SelectItem>
                    <SelectItem value="Other">
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <Label className="text-xs font-medium text-foreground">
                  Mode of Delivery
                </Label>
                <Select
                  value={
                    formData.mode_of_delivery ||
                    "Normal Spontaneous Vaginal Delivery (NSVD)"
                  }
                  onValueChange={(v) => handleChange("mode_of_delivery", v)}
                >
                  <SelectTrigger className="!h-9 w-full min-w-0 justify-between border-border bg-card px-3 text-xs text-card-foreground [&>span]:truncate [&>span]:block pr-7">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.mode_of_delivery &&
                      ![
                        "Normal Spontaneous Vaginal Delivery (NSVD)",
                        "Normal Spontaneous (NSVD)",
                        "Cesarean Section (C-Section)",
                        "Assisted Vaginal Delivery (Forceps/Vacuum)",
                        "Assisted Vaginal (Forceps/Vacuum)",
                        "Breech Extraction",
                        "Other",
                      ].includes(formData.mode_of_delivery) && (
                        <SelectItem value={formData.mode_of_delivery}>
                          {formData.mode_of_delivery}
                        </SelectItem>
                      )}
                    <SelectItem value="Normal Spontaneous Vaginal Delivery (NSVD)">
                      Normal Spontaneous Vaginal Delivery (NSVD)
                    </SelectItem>
                    <SelectItem value="Normal Spontaneous (NSVD)">
                      Normal Spontaneous (NSVD)
                    </SelectItem>
                    <SelectItem value="Cesarean Section (C-Section)">
                      Cesarean Section (C-Section)
                    </SelectItem>
                    <SelectItem value="Assisted Vaginal Delivery (Forceps/Vacuum)">
                      Assisted Vaginal Delivery (Forceps/Vacuum)
                    </SelectItem>
                    <SelectItem value="Assisted Vaginal (Forceps/Vacuum)">
                      Assisted Vaginal (Forceps/Vacuum)
                    </SelectItem>
                    <SelectItem value="Breech Extraction">
                      Breech Extraction
                    </SelectItem>
                    <SelectItem value="Other">
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Labor Duration (hrs)
                </Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.duration_of_labor_hours ?? ""}
                  onChange={(e) =>
                    handleChange("duration_of_labor_hours", e.target.value)
                  }
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Blood Loss (mL)
                </Label>
                <Input
                  type="number"
                  step="10"
                  value={formData.blood_loss_ml ?? ""}
                  onChange={(e) =>
                    handleChange("blood_loss_ml", e.target.value)
                  }
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Complications & Remarks
              </Label>
              <Textarea
                value={formData.delivery_complications || ""}
                onChange={(e) =>
                  handleChange("delivery_complications", e.target.value)
                }
                placeholder="None or specify any maternal complications..."
                className="h-[65px] resize-none border-border bg-card text-xs text-card-foreground"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 min-w-0">
                <Label className="text-xs font-medium text-foreground">
                  Birth Attendant
                </Label>
                <Select
                  value={formData.birth_attendant || "Registered Midwife"}
                  onValueChange={(v) => handleChange("birth_attendant", v)}
                >
                  <SelectTrigger className="!h-9 border-border bg-card text-xs text-card-foreground">
                    <SelectValue placeholder="Birth Attendant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MD / Obstetrician">MD / Obstetrician</SelectItem>
                    <SelectItem value="Registered Midwife">Registered Midwife</SelectItem>
                    <SelectItem value="Registered Nurse">Registered Nurse</SelectItem>
                    <SelectItem value="Traditional Birth Attendant / Hilot">Traditional Birth Attendant / Hilot</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-0">
                <Label className="text-xs font-medium text-foreground">
                  Maternal Outcome
                </Label>
                <Select
                  value={formData.maternal_outcome || "Alive and Well"}
                  onValueChange={(v) => handleChange("maternal_outcome", v)}
                >
                  <SelectTrigger className="!h-9 border-border bg-card text-xs text-card-foreground">
                    <SelectValue placeholder="Outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alive and Well">Alive and Well</SelectItem>
                    <SelectItem value="Complications">Complications</SelectItem>
                    <SelectItem value="Maternal Death">Maternal Death</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="editImmediateBreastfeeding"
                checked={Boolean(formData.immediate_breastfeeding)}
                onCheckedChange={(c) => handleChange("immediate_breastfeeding", Boolean(c))}
              />
              <Label htmlFor="editImmediateBreastfeeding" className="text-xs cursor-pointer text-foreground">
                Initiated Immediate Breastfeeding (within 1 hour)
              </Label>
            </div>
          </div>
        )}

        {type === "postpartum" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Visit Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "!h-9 w-full justify-start border-border bg-card text-left text-xs font-normal",
                        !dateVal && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateVal ? format(dateVal, "PPP") : <span>Pick Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateVal}
                      onSelect={setDateVal}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Visit Timing
                </Label>
                <Select
                  value={formData.visit_timing || "24 Hours"}
                  onValueChange={(v) => handleChange("visit_timing", v)}
                >
                  <SelectTrigger className="!h-9 border-border bg-card text-xs text-card-foreground">
                    <SelectValue placeholder="Timing" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24 Hours">24 Hours (Day 1)</SelectItem>
                    <SelectItem value="1 Week">1 Week (Day 3-7)</SelectItem>
                    <SelectItem value="6 Weeks">6 Weeks</SelectItem>
                    <SelectItem value="Routine">Routine Postpartum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  BP Systolic (mmHg)
                </Label>
                <Input
                  type="number"
                  value={formData.bp_systolic ?? ""}
                  onChange={(e) => handleChange("bp_systolic", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  BP Diastolic (mmHg)
                </Label>
                <Input
                  type="number"
                  value={formData.bp_diastolic ?? ""}
                  onChange={(e) => handleChange("bp_diastolic", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Weight (kg)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.weight_kg ?? ""}
                  onChange={(e) => handleChange("weight_kg", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Pulse Rate (bpm)
                </Label>
                <Input
                  type="number"
                  value={formData.pulse_rate_bpm ?? ""}
                  onChange={(e) => handleChange("pulse_rate_bpm", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Body Temp (°C)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.temperature_celsius ?? ""}
                  onChange={(e) => handleChange("temperature_celsius", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  Fundic Height (cm)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  value={formData.fundic_height_cm ?? ""}
                  onChange={(e) => handleChange("fundic_height_cm", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="my-1 h-px bg-border" />
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                Clinical Assessments
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editFoulSmellingDischarge"
                    checked={Boolean(formData.foul_smelling_discharge)}
                    onCheckedChange={(c) => handleChange("foul_smelling_discharge", Boolean(c))}
                  />
                  <Label htmlFor="editFoulSmellingDischarge" className="text-xs cursor-pointer">
                    Foul-Smelling Lochia / Discharge
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="editCordConditionNormal"
                    checked={formData.cord_condition_normal !== undefined ? Boolean(formData.cord_condition_normal) : true}
                    onCheckedChange={(c) => handleChange("cord_condition_normal", Boolean(c))}
                  />
                  <Label htmlFor="editCordConditionNormal" className="text-xs cursor-pointer">
                    Cord Condition Normal
                  </Label>
                </div>
              </div>
            </div>

            <div className="my-1 h-px bg-border" />
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                Family Planning (FP) Counseling
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-foreground">
                    FP Method Accepted
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. Pills, Implanon, Condom"
                    value={formData.fp_method_accepted || ""}
                    onChange={(e) => handleChange("fp_method_accepted", e.target.value)}
                    className="!h-9 border-border bg-card text-xs text-card-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium text-foreground">
                    FP Quantity Given
                  </Label>
                  <Input
                    type="number"
                    value={formData.fp_quantity_given ?? ""}
                    onChange={(e) => handleChange("fp_quantity_given", e.target.value)}
                    className="!h-9 border-border bg-card text-xs text-card-foreground"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground">
                  FP Follow-Up Date
                </Label>
                <Input
                  type="date"
                  value={formData.fp_follow_up_date ? formData.fp_follow_up_date.split("T")[0] : ""}
                  onChange={(e) => handleChange("fp_follow_up_date", e.target.value)}
                  className="!h-9 border-border bg-card text-xs text-card-foreground"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Chief Complaint
              </Label>
              <Textarea
                placeholder="Maternal complaints or physical recovery symptoms..."
                value={formData.chief_complaint || ""}
                onChange={(e) => handleChange("chief_complaint", e.target.value)}
                className="h-[60px] resize-none border-border bg-card text-xs text-card-foreground"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium text-foreground">
                Danger Signs Observed
              </Label>
              <Textarea
                placeholder="Observed danger signs or postpartum flags..."
                value={formData.danger_signs_observed || ""}
                onChange={(e) => handleChange("danger_signs_observed", e.target.value)}
                className="h-[60px] resize-none border-border bg-card text-xs text-card-foreground"
              />
            </div>
          </div>
        )}

        <div className="mt-1 flex justify-end gap-2 border-t border-border pt-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="h-8 bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  )
}
