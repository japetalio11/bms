import * as React from "react"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/utils"
import {
  Calendar,
  Clock,
  CheckCircle2,
  X,
  Activity,
  HeartPulse,
  ActivitySquare,
  Thermometer,
  Weight,
  Baby,
  Ruler,
  Stethoscope,
  FlaskConical,
  Pill,
  FileText,
  History,
  ShieldAlert,
  Trash2,
  Edit,
  ExternalLink,
} from "lucide-react"
import { ConfirmDeleteModal } from "@/components/ui/confirm-delete-modal"
import { toast } from "sonner"
import { EditRecordModal } from "./EditRecordModal"
import {
  getRiskVariant,
  getRiskLabel,
  getRiskBadgeClasses,
} from "@/lib/riskUtils"
import { mothersApi } from "../api"
import { db } from "@/lib/db/bmsDatabase"
import { motherRepository } from "@/lib/repositories/motherRepository"
import { appointmentRepository } from "@/lib/repositories/appointmentRepository"

export interface DetailSideSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type:
    | "pregnancy"
    | "visitation"
    | "appointment"
    | "laboratory"
    | "prescription"
    | null
  data: any
  motherName?: string
  onSuccess?: () => void
}

export function DetailSideSheet({
  open,
  onOpenChange,
  type,
  data,
  motherName = "Mother",
  onSuccess,
}: DetailSideSheetProps) {
  const [deleting, setDeleting] = React.useState(false)
  const [editModalOpen, setEditModalOpen] = React.useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false)

  const handleViewAttachment = (fileUrl: string) => {
    if (!fileUrl) return
    if (fileUrl.startsWith("data:")) {
      try {
        const parts = fileUrl.split(",")
        const mime = parts[0].match(/:(.*?);/)?.[1] || "application/pdf"
        const bstr = atob(parts[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n)
        }
        const blob = new Blob([u8arr], { type: mime })
        const blobUrl = URL.createObjectURL(blob)
        window.open(blobUrl, "_blank")
        return
      } catch (e) {
        console.error("Failed to convert base64 data to blob URL:", e)
      }
    }
    window.open(fileUrl, "_blank")
  }

  if (!data) return null

  const executeDelete = async () => {
    setDeleting(true)
    let recordId: string | undefined
    if (type === "visitation") {
      recordId = data.visit_id || data.id || data._id
    } else if (type === "pregnancy") {
      recordId = data.pregnancy_id || data.id || data._id
    } else if (type === "appointment") {
      recordId = data.appointment_id || data.id || data._id
    } else if (type === "laboratory") {
      recordId = data.screening_id || data.id || data._id
    } else if (type === "prescription") {
      recordId = data.supplement_id || data.id || data._id
    } else {
      recordId =
        data.visit_id ||
        data.pregnancy_id ||
        data.appointment_id ||
        data.screening_id ||
        data.supplement_id ||
        data._id ||
        data.id
    }

    if (!recordId) {
      toast.error("Invalid record identifier")
      setDeleting(false)
      return
    }

    try {
      if (type === "pregnancy") {
        await motherRepository.deletePregnancy(recordId)
      } else if (type === "visitation") {
        await motherRepository.deletePrenatalVisit(recordId)
      } else if (type === "appointment") {
        await appointmentRepository.deleteAppointment(recordId)
      } else if (type === "laboratory") {
        await motherRepository.deleteLabRecord(recordId)
      } else if (type === "prescription") {
        await motherRepository.deleteSupplement(recordId)
      }

      toast.success("Record deleted successfully")
      onSuccess?.()
      setConfirmDeleteOpen(false)
      onOpenChange(false)
    } catch (err: any) {
      toast.error(
        err.response?.data?.error || err.message || "Failed to delete record"
      )
    } finally {
      setDeleting(false)
    }
  }

  const getHeaderTitle = () => {
    switch (type) {
      case "pregnancy":
        return `${motherName} - Pregnancy Record`
      case "visitation":
        return `${motherName} - Prenatal Visit`
      case "appointment":
        return `${motherName} - ${data.appointment_type || data.type || "Appointment"}`
      case "laboratory":
        return `${motherName} - Lab Screening`
      case "prescription":
        return `${motherName} - Prescription`
      default:
        return `${motherName} - Record Details`
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex w-full flex-col border-l border-border bg-card p-0 text-card-foreground sm:max-w-[450px]"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-border p-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-foreground">
              {getHeaderTitle()}
            </h2>
            <div className="flex items-center gap-2">
              {type === "appointment" && (
                <Badge className="inline-flex items-center gap-1 rounded-sm border-none bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-500 capitalize shadow-none">
                  <CheckCircle2 className="h-3 w-3" />
                  {data.status || "Scheduled"}
                </Badge>
              )}
              {type === "visitation" && (
                <Badge className="inline-flex items-center gap-1 rounded-sm border-none bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-500 shadow-none">
                  <Clock className="h-3 w-3" />
                  Trimester {data.trimester || "N/A"}
                </Badge>
              )}
              {type === "pregnancy" && (
                <Badge className="inline-flex items-center gap-1 rounded-sm border-none bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-medium text-purple-500 capitalize shadow-none">
                  <Baby className="h-3 w-3" />
                  {data.pregnancy_status || "Active"}
                </Badge>
              )}
              {type === "laboratory" && (
                <Badge className="inline-flex items-center gap-1 rounded-sm border-none bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-500 capitalize shadow-none">
                  <FlaskConical className="h-3 w-3" />
                  {data.sync_status || "Synced"}
                </Badge>
              )}
              {type === "prescription" && (
                <Badge
                  className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${data.is_completed ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}
                >
                  <Pill className="h-3 w-3" />
                  {data.is_completed ? "Completed" : "In Progress"}
                </Badge>
              )}
              {(() => {
                const currentRisk =
                  data.risk_level_assessed || data.risk || "Low Risk"
                const variant = getRiskVariant(currentRisk)
                const label = getRiskLabel(currentRisk)
                const classes = getRiskBadgeClasses(currentRisk)
                return (
                  <Badge
                    className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${classes.badge}`}
                  >
                    <Activity className="h-3 w-3" />
                    {label}
                  </Badge>
                )
              })()}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {type === "pregnancy" && (
            <>
              <div className="flex flex-col gap-4 border-b border-border p-4">
                <h3 className="text-xs font-semibold text-foreground">
                  Obstetric Summary
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Baby className="h-3.5 w-3.5" />
                      <span className="text-xs">Gravida / Parity</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      G{data.gravida ?? 0} P{data.parity ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">LMP Date</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {formatDate(data.lmp_date || data.lmp)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">Registration Date</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {formatDate(data.date_of_registration)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-b border-border p-4">
                <h3 className="text-xs font-semibold text-foreground">
                  Clinical Assessment
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <ActivitySquare className="h-3.5 w-3.5" />
                      <span className="text-xs">1st Trimester BMI</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.bmi_1st_trimester ?? "N/A"} (
                      {data.bmi_category || "Normal"})
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span className="text-xs">Co-morbidities</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.co_morbidities || "None recorded"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <History className="h-3.5 w-3.5" />
                      <span className="text-xs">Previous Deliveries</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.previous_delivery_history || "None recorded"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {type === "visitation" && (
            <>
              <div className="flex flex-col gap-4 border-b border-border p-4">
                <h3 className="text-xs font-semibold text-foreground">
                  Visit Details
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">Visit Date</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {formatDate(data.visit_date)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Stethoscope className="h-3.5 w-3.5" />
                      <span className="text-xs">Visit Number</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      Visit #{data.visit_number || 1}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-b border-border p-4">
                <h3 className="text-xs font-semibold text-foreground">
                  Maternal Vitals
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <HeartPulse className="h-3.5 w-3.5" />
                      <span className="text-xs">Blood Pressure</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.bp_systolic && data.bp_diastolic
                        ? `${data.bp_systolic}/${data.bp_diastolic} mmHg`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <ActivitySquare className="h-3.5 w-3.5" />
                      <span className="text-xs">Pulse Rate</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.pulse_rate_bpm
                        ? `${data.pulse_rate_bpm} bpm`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Thermometer className="h-3.5 w-3.5" />
                      <span className="text-xs">Body Temp</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.temperature_celsius
                        ? `${data.temperature_celsius} °C`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Weight className="h-3.5 w-3.5" />
                      <span className="text-xs">Weight</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.weight_kg ? `${data.weight_kg} kg` : "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-b border-border p-4">
                <h3 className="text-xs font-semibold text-foreground">
                  Fetal & Visit Metrics
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Baby className="h-3.5 w-3.5" />
                      <span className="text-xs">Gestational Age</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.age_of_gestation_weeks
                        ? `${data.age_of_gestation_weeks} Weeks`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <HeartPulse className="h-3.5 w-3.5" />
                      <span className="text-xs">Fetal Heart Tone</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.fetal_heart_tone_bpm
                        ? `${data.fetal_heart_tone_bpm} bpm`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Ruler className="h-3.5 w-3.5" />
                      <span className="text-xs">Fundic Height</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.fundic_height_cm
                        ? `${data.fundic_height_cm} cm`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {type === "appointment" && (
            <>
              <div className="flex flex-col gap-4 border-b border-border p-4">
                <h3 className="text-xs font-semibold text-foreground">
                  Visit Details
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">Date & Time</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {formatDate(data.appointment_date)}{" "}
                      {data.appointment_time || ""}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Stethoscope className="h-3.5 w-3.5" />
                      <span className="text-xs">Purpose</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.appointment_type || data.type || "Prenatal Checkup"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-b border-border p-4">
                <h3 className="text-xs font-semibold text-foreground">
                  Notes & Reason
                </h3>
                <p className="text-xs leading-relaxed text-foreground">
                  {data.reason ||
                    "No additional notes provided for this appointment."}
                </p>
              </div>
            </>
          )}

          {type === "laboratory" && (
            <>
              <div className="flex flex-col gap-4 border-b border-border p-4">
                <h3 className="text-xs font-semibold text-foreground">
                  Screening Summary
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <FlaskConical className="h-3.5 w-3.5" />
                      <span className="text-xs">Screening Type</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.screening_type || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">Date of Screening</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {formatDate(data.date_of_screening)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="text-xs">Result</span>
                    </div>
                    <span className="flex-1 text-xs font-medium text-foreground">
                      {data.result || "N/A"}
                    </span>
                  </div>
                  {data.file_url && (
                    <div className="flex flex-col gap-2 pt-1">
                      <div className="flex items-center">
                        <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span className="text-xs">Attachment</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleViewAttachment(data.file_url)}
                          className="flex flex-1 cursor-pointer items-center gap-1 truncate text-left text-xs font-medium text-blue-500 hover:underline"
                        >
                          View Attachment Document
                          <ExternalLink className="inline h-3 w-3" />
                        </button>
                      </div>
                      {(data.file_url.startsWith("data:image/") ||
                        data.file_url.match(
                          /\.(png|jpg|jpeg|webp|gif)($|\?)/i
                        )) && (
                        <div className="mt-1 max-w-sm overflow-hidden rounded-lg border border-border bg-muted/20 p-1">
                          <img
                            src={data.file_url}
                            alt="Laboratory Attachment"
                            className="max-h-56 w-full rounded-md object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 border-b border-border p-4">
                <h3 className="text-xs font-semibold text-foreground">
                  Remarks
                </h3>
                <p className="text-xs leading-relaxed text-foreground">
                  {data.remarks ||
                    "No clinical remarks logged for this screening."}
                </p>
              </div>
            </>
          )}

          {type === "prescription" && (
            <>
              <div className="flex flex-col gap-4 border-b border-border p-4">
                <h3 className="text-xs font-semibold text-foreground">
                  Medication Summary
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Pill className="h-3.5 w-3.5" />
                      <span className="text-xs">Supplement Type</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.supplement_type || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <ActivitySquare className="h-3.5 w-3.5" />
                      <span className="text-xs">Tablets Given</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {data.tablets_given_count ?? "N/A"} tablets
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">Date Given</span>
                    </div>
                    <span className="flex-1 text-xs text-foreground">
                      {formatDate(data.date_given)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-4 p-4 pb-6">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-foreground">
                Activity Log
              </h3>
              <History className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              Recent actions performed for this record.
            </p>

            <div className="mt-1 flex gap-3">
              <div className="mt-1.5 flex flex-col items-center">
                <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground">
                  Record registered in system
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(data.updated_at || data.created_at || new Date())}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4 pb-8 md:pb-4">
          <Button
            onClick={() => setEditModalOpen(true)}
            className="h-8 w-full bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            Edit Record
          </Button>
          <Button
            variant="outline"
            disabled={deleting}
            onClick={() => setConfirmDeleteOpen(true)}
            className="h-8 w-full cursor-pointer border-red-500/20 text-xs font-medium text-red-500 hover:bg-red-500/10 hover:text-red-600"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            {deleting ? "Deleting..." : "Delete Record"}
          </Button>
        </div>
      </SheetContent>

      <EditRecordModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        type={type}
        data={data}
        onSuccess={() => {
          onSuccess?.()
          onOpenChange(false)
        }}
      />

      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete ${type ? type.charAt(0).toUpperCase() + type.slice(1) : "Record"}`}
        description="Are you sure you want to delete this record from the database? This action cannot be undone."
        isDeleting={deleting}
        onConfirm={executeDelete}
      />
    </Sheet>
  )
}
