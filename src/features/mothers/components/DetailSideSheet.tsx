import * as React from "react"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"
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
import { EditRecordModal } from "./EditRecordModal"
import { mothersApi } from "../api"

export interface DetailSideSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "pregnancy" | "visitation" | "appointment" | "laboratory" | "prescription" | null
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

  if (!data) return null

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this record? This action cannot be undone.")) {
      return
    }

    setDeleting(true)
    let endpoint = ""
    if (type === "pregnancy") {
      endpoint = `/api/v1/pregnancy/delete/${data.pregnancy_id}`
    } else if (type === "visitation") {
      endpoint = `/api/v1/prenatal-visit/delete/${data.visit_id}`
    } else if (type === "appointment") {
      endpoint = `/api/v1/appointment/delete/${data.appointment_id || data._id}`
    } else if (type === "laboratory") {
      endpoint = `/api/v1/lab-screening/delete/${data.screening_id}`
    } else if (type === "prescription") {
      endpoint = `/api/v1/supplement/delete/${data.supplement_id}`
    }

    try {
      if (endpoint) {
        await mothersApi.deleteRecord(endpoint)
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to delete record")
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
      <SheetContent side="right" showCloseButton={false} className="w-full sm:max-w-[450px] bg-background dark:bg-[#0a0a0a] border-l border-sidebar-border p-0 flex flex-col">
        {/* Header */}
        <div className="shrink-0 p-4 border-b border-sidebar-border flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-foreground dark:text-white">
              {getHeaderTitle()}
            </h2>
            <div className="flex items-center gap-2">
              {type === "appointment" && (
                <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-blue-500/10 text-blue-500 capitalize">
                  <CheckCircle2 className="h-3 w-3" />
                  {data.status || "Scheduled"}
                </Badge>
              )}
              {type === "visitation" && (
                <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-blue-500/10 text-blue-500">
                  <Clock className="h-3 w-3" />
                  Trimester {data.trimester || "N/A"}
                </Badge>
              )}
              {type === "pregnancy" && (
                <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-purple-500/10 text-purple-500 capitalize">
                  <Baby className="h-3 w-3" />
                  {data.pregnancy_status || "Active"}
                </Badge>
              )}
              {type === "laboratory" && (
                <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-emerald-500/10 text-emerald-500 capitalize">
                  <FlaskConical className="h-3 w-3" />
                  {data.sync_status || "Synced"}
                </Badge>
              )}
              {type === "prescription" && (
                <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${data.is_completed ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"}`}>
                  <Pill className="h-3 w-3" />
                  {data.is_completed ? "Completed" : "In Progress"}
                </Badge>
              )}
              <Badge className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none bg-green-500/10 text-green-500">
                <Activity className="h-3 w-3" />
                {data.risk_level_assessed || data.risk || "Low Risk"}
              </Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground dark:text-white" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto flex flex-col">

          {/* PREGNANCY VIEW */}
          {type === "pregnancy" && (
            <>
              <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
                <h3 className="text-xs font-semibold text-foreground dark:text-white">Obstetric Summary</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Baby className="h-3.5 w-3.5" />
                      <span className="text-xs">Gravida / Parity</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">G{data.gravida ?? 0} P{data.parity ?? 0}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">LMP Date</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{formatDate(data.lmp_date || data.lmp)}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs">Registration Date</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{formatDate(data.date_of_registration)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
                <h3 className="text-xs font-semibold text-foreground dark:text-white">Clinical Assessment</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <ActivitySquare className="h-3.5 w-3.5" />
                      <span className="text-xs">1st Trimester BMI</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.bmi_1st_trimester ?? "N/A"} ({data.bmi_category || "Normal"})</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      <span className="text-xs">Co-morbidities</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.co_morbidities || "None recorded"}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <History className="h-3.5 w-3.5" />
                      <span className="text-xs">Previous Deliveries</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.previous_delivery_history || "None recorded"}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* VISITATION VIEW */}
          {type === "visitation" && (
            <>
              <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
                <h3 className="text-xs font-semibold text-foreground dark:text-white">Visit Details</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">Visit Date</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{formatDate(data.visit_date)}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Stethoscope className="h-3.5 w-3.5" />
                      <span className="text-xs">Visit Number</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">Visit #{data.visit_number || 1}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
                <h3 className="text-xs font-semibold text-foreground dark:text-white">Maternal Vitals</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <HeartPulse className="h-3.5 w-3.5" />
                      <span className="text-xs">Blood Pressure</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">
                      {data.bp_systolic && data.bp_diastolic ? `${data.bp_systolic}/${data.bp_diastolic} mmHg` : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <ActivitySquare className="h-3.5 w-3.5" />
                      <span className="text-xs">Pulse Rate</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.pulse_rate_bpm ? `${data.pulse_rate_bpm} bpm` : "N/A"}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Thermometer className="h-3.5 w-3.5" />
                      <span className="text-xs">Body Temp</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.temperature_celsius ? `${data.temperature_celsius} °C` : "N/A"}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Weight className="h-3.5 w-3.5" />
                      <span className="text-xs">Weight</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.weight_kg ? `${data.weight_kg} kg` : "N/A"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
                <h3 className="text-xs font-semibold text-foreground dark:text-white">Fetal & Visit Metrics</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Baby className="h-3.5 w-3.5" />
                      <span className="text-xs">Gestational Age</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.age_of_gestation_weeks ? `${data.age_of_gestation_weeks} Weeks` : "N/A"}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <HeartPulse className="h-3.5 w-3.5" />
                      <span className="text-xs">Fetal Heart Tone</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.fetal_heart_tone_bpm ? `${data.fetal_heart_tone_bpm} bpm` : "N/A"}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Ruler className="h-3.5 w-3.5" />
                      <span className="text-xs">Fundic Height</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.fundic_height_cm ? `${data.fundic_height_cm} cm` : "N/A"}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* APPOINTMENT VIEW */}
          {type === "appointment" && (
            <>
              <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
                <h3 className="text-xs font-semibold text-foreground dark:text-white">Visit Details</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">Date & Time</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">
                      {formatDate(data.appointment_date)} {data.appointment_time || ""}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Stethoscope className="h-3.5 w-3.5" />
                      <span className="text-xs">Purpose</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.appointment_type || data.type || "Prenatal Checkup"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
                <h3 className="text-xs font-semibold text-foreground dark:text-white">Notes & Reason</h3>
                <p className="text-xs text-foreground dark:text-white leading-relaxed">
                  {data.reason || "No additional notes provided for this appointment."}
                </p>
              </div>
            </>
          )}

          {/* LABORATORY VIEW */}
          {type === "laboratory" && (
            <>
              <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
                <h3 className="text-xs font-semibold text-foreground dark:text-white">Screening Summary</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <FlaskConical className="h-3.5 w-3.5" />
                      <span className="text-xs">Screening Type</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.screening_type || "N/A"}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">Date of Screening</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{formatDate(data.date_of_screening)}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="text-xs">Result</span>
                    </div>
                    <span className="text-xs font-medium text-foreground dark:text-white flex-1">{data.result || "N/A"}</span>
                  </div>
                  {data.file_url && (
                    <div className="flex items-center">
                      <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="text-xs">Attachment</span>
                      </div>
                      <a
                        href={data.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1 font-medium flex-1 truncate"
                      >
                        View Attachment Document
                        <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
                <h3 className="text-xs font-semibold text-foreground dark:text-white">Remarks</h3>
                <p className="text-xs text-foreground dark:text-white leading-relaxed">
                  {data.remarks || "No clinical remarks logged for this screening."}
                </p>
              </div>
            </>
          )}

          {/* PRESCRIPTION VIEW */}
          {type === "prescription" && (
            <>
              <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
                <h3 className="text-xs font-semibold text-foreground dark:text-white">Medication Summary</h3>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Pill className="h-3.5 w-3.5" />
                      <span className="text-xs">Supplement Type</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.supplement_type || "N/A"}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <ActivitySquare className="h-3.5 w-3.5" />
                      <span className="text-xs">Tablets Given</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{data.tablets_given_count ?? "N/A"} tablets</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs">Date Given</span>
                    </div>
                    <span className="text-xs text-foreground dark:text-white flex-1">{formatDate(data.date_given)}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Activity Log */}
          <div className="flex flex-col gap-4 p-4 pb-6">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-semibold text-foreground dark:text-white">Activity Log</h3>
              <History className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Recent actions performed for this record.</p>
            
            <div className="flex gap-3 mt-1">
              <div className="flex flex-col items-center mt-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-foreground dark:bg-white shrink-0" />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground dark:text-white">Record registered in system</span>
                <span className="text-[10px] text-muted-foreground">{formatDate(data.updated_at || data.created_at || new Date())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 pb-8 md:pb-4 border-t border-sidebar-border flex flex-col gap-2">
          <Button
            onClick={() => setEditModalOpen(true)}
            className="w-full h-8 text-xs font-medium bg-[#111] text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            Edit Record
          </Button>
          <Button
            variant="outline"
            disabled={deleting}
            onClick={handleDelete}
            className="w-full h-8 text-xs font-medium border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-600 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/20"
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
    </Sheet>
  )
}
