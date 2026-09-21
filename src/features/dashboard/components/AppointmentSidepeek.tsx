import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  CheckCircle2,
  Clock,
  X,
  Calendar,
  Activity,
  AlertTriangle,
  ActivitySquare,
  HeartPulse,
  Stethoscope,
  Droplets,
  Thermometer,
  Weight,
  Wind,
  Baby,
  Ruler,
  History,
} from "lucide-react"
import { LogVitalsModal } from "./LogVitalsModal"
import { RegisterSupplementModal } from "@/features/mothers/components/RegisterSupplementModal"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { db } from "@/lib/db/bmsDatabase"
import { toast } from "sonner"
import { appointmentRepository } from "@/lib/repositories/appointmentRepository"
import {
  getRiskVariant,
  getRiskLabel,
  getRiskBadgeClasses,
} from "@/lib/riskUtils"

export function AppointmentSidepeek({
  appointment,
  onClose,
  onCancelAppointment,
  onStatusChange,
}: {
  appointment: any
  onClose: () => void
  onCancelAppointment?: (id: string) => void
  onStatusChange?: (
    appointmentId: string,
    newStatus: string,
    newRisk?: string
  ) => void
}) {
  if (!appointment) return null

  const [localStatus, setLocalStatus] = React.useState<string>(
    appointment.status || "Pending"
  )
  const [localRisk, setLocalRisk] = React.useState<string>(
    appointment.risk || "Low Risk"
  )

  const [vitalsLogged, setVitalsLogged] = React.useState<boolean>(
    appointment.status?.toLowerCase() === "completed" ||
      !!appointment.vitals_logged
  )

  React.useEffect(() => {
    if (appointment?.status) {
      setLocalStatus(appointment.status)
      if (appointment.status.toLowerCase() === "completed") {
        setVitalsLogged(true)
      }
    }
    if (appointment?.risk) {
      setLocalRisk(appointment.risk)
    }
  }, [appointment?.status, appointment?.risk, appointment?.id])

  const [vitalsModalOpen, setVitalsModalOpen] = React.useState(false)
  const [showVitalsConfirmation, setShowVitalsConfirmation] =
    React.useState(false)
  const [vitalsConfirmationData, setVitalsConfirmationData] =
    React.useState<any>(null)

  const [prescriptionModalOpen, setPrescriptionModalOpen] =
    React.useState(false)
  const [showPrescriptionConfirmation, setShowPrescriptionConfirmation] =
    React.useState(false)
  const [motherData, setMotherData] = React.useState<any>(null)
  const [visitationList, setVisitationList] = React.useState<any[]>([])

  React.useEffect(() => {
    let isMounted = true

    async function loadMotherContext() {
      if (!appointment) return

      try {
        let mid =
          appointment.mother_id ||
          appointment.mother?.mother_id ||
          appointment.mother?.id ||
          appointment.raw?.mother_id ||
          appointment.user_id ||
          appointment.raw?.user_id ||
          ""
        let matchingMother: any = null

        if (mid) {
          matchingMother = await db.mothers.get(mid)
          if (!matchingMother) {
            const allM = await db.mothers.toArray()
            matchingMother = allM.find(
              (m: any) =>
                m.id === mid || m.mother_id === mid || m.user_id === mid
            )
          }
        }

        if (!matchingMother && (appointment.name || appointment.motherName)) {
          const searchName = (appointment.name || appointment.motherName || "")
            .trim()
            .toLowerCase()
          if (searchName !== "unknown mother" && searchName !== "patient") {
            const allM = await db.mothers.toArray()
            matchingMother = allM.find((m: any) => {
              const fullName = [m.first_name, m.middle_name, m.last_name]
                .filter(Boolean)
                .join(" ")
                .trim()
                .toLowerCase()
              const firstLast = [m.first_name, m.last_name]
                .filter(Boolean)
                .join(" ")
                .trim()
                .toLowerCase()
              return fullName === searchName || firstLast === searchName
            })
          }
        }

        const motherIdToUse =
          matchingMother?.mother_id ||
          matchingMother?.id ||
          mid ||
          appointment.id ||
          "unknown"

        const [allPregs, allVisits] = await Promise.all([
          db.pregnancies.toArray().catch(() => []),
          db.prenatalVisits.toArray().catch(() => []),
        ])

        const matchedPregs = allPregs.filter(
          (p: any) =>
            p.mother_id === motherIdToUse ||
            p.mother_id === mid ||
            (matchingMother?.user_id && p.mother_id === matchingMother.user_id)
        )
        const matchedVisits = allVisits.filter(
          (v: any) =>
            v.mother_id === motherIdToUse ||
            v.mother_id === mid ||
            (matchingMother?.user_id && v.mother_id === matchingMother.user_id)
        )

        if (isMounted) {
          setMotherData({
            ...(matchingMother || {}),
            mother_id: motherIdToUse,
            name: appointment.name || appointment.motherName,
            pregnancies:
              matchedPregs.length > 0
                ? matchedPregs
                : appointment.mother?.pregnancies || [
                    {
                      pregnancy_id:
                        appointment.pregnancy_id || `preg-${motherIdToUse}`,
                      pregnancy_status: "Active",
                    },
                  ],
            prenatalVisits: matchedVisits,
          })
          setVisitationList(matchedVisits)
        }
      } catch (err) {
        console.error(
          "Error loading mother context in AppointmentSidepeek:",
          err
        )
      }
    }

    loadMotherContext()
    return () => {
      isMounted = false
    }
  }, [appointment])

  const latestVisit = React.useMemo(() => {
    if (vitalsConfirmationData) {
      return {
        bp_systolic: vitalsConfirmationData.bp_systolic,
        bp_diastolic: vitalsConfirmationData.bp_diastolic,
        pulse_rate_bpm: vitalsConfirmationData.pulse_rate_bpm,
        temperature_celsius: vitalsConfirmationData.temperature_celsius,
        weight_kg: vitalsConfirmationData.weight_kg,
        ...vitalsConfirmationData,
      }
    }
    if (visitationList && visitationList.length > 0) {
      return visitationList[visitationList.length - 1]
    }
    return null
  }, [visitationList, vitalsConfirmationData])

  const isCompleted = localStatus.toLowerCase() === "completed"
  const isCancelled = localStatus.toLowerCase() === "cancelled"
  const isConfirmed =
    localStatus.toLowerCase() === "confirmed" ||
    localStatus.toLowerCase() === "active"
  const isHighRisk = localRisk === "High Risk" || localRisk === "high"

  const handleCancel = () => {
    if (isCompleted) {
      toast.error("Completed appointments cannot be cancelled.")
      return
    }
    if (appointment.id && onCancelAppointment) {
      onCancelAppointment(appointment.id)
    }
  }

  const markAppointmentCompleted = async (newRisk?: string) => {
    const apptId = appointment.id || appointment.appointment_id
    setLocalStatus("Completed")
    appointment.status = "Completed"
    if (newRisk) {
      setLocalRisk(newRisk)
      appointment.risk = newRisk
    }
    if (onStatusChange && apptId) {
      onStatusChange(apptId, "Completed", newRisk)
    }

    if (apptId) {
      try {
        await appointmentRepository.completeAppointment(apptId)
      } catch (err) {
        console.error("Error marking appointment completed in repository:", err)
      }
    }
  }

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-card text-card-foreground xl:w-[450px]">
      <div className="flex shrink-0 items-start justify-between border-b border-border p-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {appointment.name || appointment.motherName || "Patient"} -{" "}
            {appointment.type || "Appointment"}
          </h2>
          <div className="flex items-center gap-2">
            <Badge
              className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${
                isCompleted
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : isCancelled
                    ? "bg-red-500/10 text-red-500"
                    : isConfirmed
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-amber-500/10 text-amber-500"
              }`}
            >
              {isCompleted || isConfirmed ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              {localStatus}
            </Badge>
            <Badge
              className={`inline-flex items-center gap-1 rounded-sm border-none px-1.5 py-0.5 text-[10px] font-medium shadow-none ${getRiskBadgeClasses(localRisk).badge}`}
            >
              {getRiskVariant(localRisk) === "high" ? (
                <Activity className="h-3 w-3" />
              ) : getRiskVariant(localRisk) === "moderate" ? (
                <AlertTriangle className="h-3 w-3" />
              ) : getRiskVariant(localRisk) === "low" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Activity className="h-3 w-3 opacity-60" />
              )}
              {getRiskLabel(localRisk)}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
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
                {appointment.date || appointment.datetime || "N/A"}
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <Stethoscope className="h-3.5 w-3.5" />
                <span className="text-xs">Purpose</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {appointment.type || "Prenatal Checkup"}
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
                {latestVisit?.bp_systolic && latestVisit?.bp_diastolic
                  ? `${latestVisit.bp_systolic}/${latestVisit.bp_diastolic} mmHg`
                  : latestVisit?.blood_pressure ||
                    appointment.blood_pressure ||
                    "120/80 mmHg"}
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <ActivitySquare className="h-3.5 w-3.5" />
                <span className="text-xs">Heart Rate</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {latestVisit?.pulse_rate_bpm ||
                  latestVisit?.heart_rate ||
                  appointment.heart_rate ||
                  "75"}{" "}
                bpm
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <Droplets className="h-3.5 w-3.5" />
                <span className="text-xs">Blood Sugar</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {latestVisit?.blood_sugar ||
                  appointment.blood_sugar ||
                  "90 mg/dL"}
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <Thermometer className="h-3.5 w-3.5" />
                <span className="text-xs">Body Temp</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {latestVisit?.temperature_celsius ||
                  appointment.temperature ||
                  "37.0"}{" "}
                °C
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <Weight className="h-3.5 w-3.5" />
                <span className="text-xs">Weight</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {latestVisit?.weight_kg ||
                  latestVisit?.weight ||
                  appointment.weight ||
                  "65"}{" "}
                kg
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <Wind className="h-3.5 w-3.5" />
                <span className="text-xs">Resp. Rate</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {latestVisit?.respiratory_rate ||
                  appointment.respiratory_rate ||
                  "22"}{" "}
                cpm
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
                {latestVisit?.age_of_gestation_weeks ||
                  latestVisit?.gestational_age ||
                  appointment.gestational_age ||
                  "24"}{" "}
                Weeks
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <HeartPulse className="h-3.5 w-3.5" />
                <span className="text-xs">Fetal Heart Tone</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {latestVisit?.fetal_heart_tone_bpm ||
                  appointment.fetal_heart_tone ||
                  "140"}{" "}
                bpm
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex w-[160px] shrink-0 items-center gap-2 text-muted-foreground">
                <Ruler className="h-3.5 w-3.5" />
                <span className="text-xs">Fundic Height</span>
              </div>
              <span className="flex-1 text-xs text-foreground">
                {latestVisit?.fundic_height_cm ||
                  appointment.fundic_height ||
                  "22"}{" "}
                cm
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 p-4 pb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground">
              Activity Log
            </h3>
            <History className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">
            Recent actions performed for this appointment.
          </p>

          <div className="mt-1 flex gap-3">
            <div className="mt-1.5 flex flex-col items-center">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">
                Scheduled appointment
              </span>
              <span className="text-[10px] text-muted-foreground">
                {appointment.date || "Scheduled"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-border p-4 pb-8 md:pb-4">
        <Button
          onClick={() => setVitalsModalOpen(true)}
          disabled={vitalsLogged || isCancelled}
          className="h-8 w-full bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {vitalsLogged ? "Vitals Logged (Completed)" : "Log Vitals"}
        </Button>

        <Button
          onClick={() => setPrescriptionModalOpen(true)}
          disabled={isCancelled}
          className="h-8 w-full border border-border bg-secondary text-xs font-medium text-secondary-foreground hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Log Prescription
        </Button>

        {!isCancelled && !isCompleted && (
          <Button
            variant="outline"
            onClick={handleCancel}
            className="h-8 w-full border border-red-500/20 text-xs font-medium text-red-500 hover:bg-red-500/10 hover:text-red-600"
          >
            Cancel Appointment
          </Button>
        )}
      </div>

      <LogVitalsModal
        open={vitalsModalOpen}
        onOpenChange={setVitalsModalOpen}
        appointment={appointment}
        onSuccess={async (assessment) => {
          setVitalsLogged(true)
          setVitalsConfirmationData(assessment)
          await markAppointmentCompleted(assessment?.risk_level)
          setShowVitalsConfirmation(true)
        }}
      />

      {vitalsConfirmationData && (
        <ConfirmationModal
          open={showVitalsConfirmation}
          onOpenChange={setShowVitalsConfirmation}
          title="Prenatal Visit & Vitals Recorded"
          description={`The clinical vitals encounter and automated CDSS risk assessment have been successfully processed for ${appointment.name || appointment.motherName || "the patient"} and the appointment has been marked as Completed.`}
          type={
            vitalsConfirmationData.risk_level === "High Risk"
              ? "high-risk"
              : vitalsConfirmationData.risk_level === "Moderate Risk"
                ? "warning"
                : "success"
          }
          actionLabel="Acknowledge & Close"
          details={[
            {
              label: "Assessed Risk",
              value: vitalsConfirmationData.risk_level || "Normal",
            },
            {
              label: "TEWS Score",
              value: vitalsConfirmationData.tews_score ?? 0,
            },
            { label: "Appointment Status", value: "Completed" },
            { label: "Date Logged", value: new Date().toLocaleDateString() },
          ]}
        />
      )}

      {motherData && (
        <RegisterSupplementModal
          open={prescriptionModalOpen}
          onOpenChange={setPrescriptionModalOpen}
          motherData={motherData}
          visitationList={visitationList}
          onSuccess={async () => {
            await markAppointmentCompleted()
            setShowPrescriptionConfirmation(true)
            toast.success("Prescription / supplement recorded successfully")
          }}
        />
      )}

      <ConfirmationModal
        open={showPrescriptionConfirmation}
        onOpenChange={setShowPrescriptionConfirmation}
        title="Prescription Recorded"
        description={`Prescription / supplement has been successfully recorded for ${appointment.name || appointment.motherName || "the patient"}. The appointment has been marked as Completed.`}
        type="success"
        actionLabel="Acknowledge & Close"
        details={[
          {
            label: "Patient",
            value: appointment.name || appointment.motherName || "Patient",
          },
          { label: "Appointment Status", value: "Completed" },
          { label: "Record Status", value: "Saved & Enqueued for Sync" },
          { label: "Date Logged", value: new Date().toLocaleDateString() },
        ]}
      />
    </div>
  )
}
