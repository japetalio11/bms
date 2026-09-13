import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, X, Calendar, Activity, ActivitySquare, HeartPulse, Stethoscope, Droplets, Thermometer, Weight, Wind, Baby, Ruler, History } from "lucide-react"
import { LogVitalsModal } from "./LogVitalsModal"
import { RegisterSupplementModal } from "@/features/mothers/components/RegisterSupplementModal"
import { ConfirmationModal } from "@/components/ui/confirmation-modal"
import { db } from "@/lib/db/bmsDatabase"
import { toast } from "sonner"
import { appointmentRepository } from "@/lib/repositories/appointmentRepository"

export function AppointmentSidepeek({ 
  appointment, 
  onClose,
  onCancelAppointment,
  onStatusChange,
}: { 
  appointment: any
  onClose: () => void
  onCancelAppointment?: (id: string) => void
  onStatusChange?: (appointmentId: string, newStatus: string, newRisk?: string) => void
}) {
  if (!appointment) return null

  // Local completion status & risk
  const [localStatus, setLocalStatus] = React.useState<string>(appointment.status || "Pending")
  const [localRisk, setLocalRisk] = React.useState<string>(appointment.risk || "Low Risk")
  // Track if vitals were logged for this appointment
  const [vitalsLogged, setVitalsLogged] = React.useState<boolean>(
    appointment.status?.toLowerCase() === 'completed' || !!appointment.vitals_logged
  )

  // Sync localStatus and localRisk when appointment prop changes
  React.useEffect(() => {
    if (appointment?.status) {
      setLocalStatus(appointment.status)
      if (appointment.status.toLowerCase() === 'completed') {
        setVitalsLogged(true)
      }
    }
    if (appointment?.risk) {
      setLocalRisk(appointment.risk)
    }
  }, [appointment?.status, appointment?.risk, appointment?.id])

  // Modals state
  const [vitalsModalOpen, setVitalsModalOpen] = React.useState(false)
  const [showVitalsConfirmation, setShowVitalsConfirmation] = React.useState(false)
  const [vitalsConfirmationData, setVitalsConfirmationData] = React.useState<any>(null)

  const [prescriptionModalOpen, setPrescriptionModalOpen] = React.useState(false)
  const [showPrescriptionConfirmation, setShowPrescriptionConfirmation] = React.useState(false)
  const [motherData, setMotherData] = React.useState<any>(null)
  const [visitationList, setVisitationList] = React.useState<any[]>([])

  // Load mother data & visits for prescription logging
  React.useEffect(() => {
    let isMounted = true

    async function loadMotherContext() {
      if (!appointment) return

      try {
        let mid = appointment.mother_id || appointment.mother?.mother_id || appointment.mother?.id || appointment.raw?.mother_id || appointment.user_id || appointment.raw?.user_id || ""
        let matchingMother: any = null

        if (mid) {
          matchingMother = await db.mothers.get(mid)
          if (!matchingMother) {
            const allM = await db.mothers.toArray()
            matchingMother = allM.find((m: any) => m.id === mid || m.mother_id === mid || m.user_id === mid)
          }
        }

        if (!matchingMother && (appointment.name || appointment.motherName)) {
          const searchName = (appointment.name || appointment.motherName || "").trim().toLowerCase()
          if (searchName !== "unknown mother" && searchName !== "patient") {
            const allM = await db.mothers.toArray()
            matchingMother = allM.find((m: any) => {
              const fullName = [m.first_name, m.middle_name, m.last_name].filter(Boolean).join(" ").trim().toLowerCase()
              const firstLast = [m.first_name, m.last_name].filter(Boolean).join(" ").trim().toLowerCase()
              return fullName === searchName || firstLast === searchName
            })
          }
        }

        const motherIdToUse = matchingMother?.mother_id || matchingMother?.id || mid || appointment.id || "unknown"

        // Load pregnancies & visits
        const [allPregs, allVisits] = await Promise.all([
          db.pregnancies.toArray().catch(() => []),
          db.prenatalVisits.toArray().catch(() => []),
        ])

        const matchedPregs = allPregs.filter((p: any) => p.mother_id === motherIdToUse || p.mother_id === mid || (matchingMother?.user_id && p.mother_id === matchingMother.user_id))
        const matchedVisits = allVisits.filter((v: any) => v.mother_id === motherIdToUse || v.mother_id === mid || (matchingMother?.user_id && v.mother_id === matchingMother.user_id))

        if (isMounted) {
          setMotherData({
            ...(matchingMother || {}),
            mother_id: motherIdToUse,
            name: appointment.name || appointment.motherName,
            pregnancies: matchedPregs.length > 0 ? matchedPregs : (appointment.mother?.pregnancies || [
              { pregnancy_id: appointment.pregnancy_id || `preg-${motherIdToUse}`, pregnancy_status: "Active" }
            ]),
            prenatalVisits: matchedVisits,
          })
          setVisitationList(matchedVisits)
        }
      } catch (err) {
        console.error("Error loading mother context in AppointmentSidepeek:", err)
      }
    }

    loadMotherContext()
    return () => { isMounted = false }
  }, [appointment])

  // Get most recent visit for display
  const latestVisit = React.useMemo(() => {
    if (vitalsConfirmationData) {
      return {
        bp_systolic: vitalsConfirmationData.bp_systolic,
        bp_diastolic: vitalsConfirmationData.bp_diastolic,
        pulse_rate_bpm: vitalsConfirmationData.pulse_rate_bpm,
        temperature_celsius: vitalsConfirmationData.temperature_celsius,
        weight_kg: vitalsConfirmationData.weight_kg,
        ...vitalsConfirmationData
      }
    }
    if (visitationList && visitationList.length > 0) {
      return visitationList[visitationList.length - 1]
    }
    return null
  }, [visitationList, vitalsConfirmationData])

  // Status styling
  const isCompleted = localStatus.toLowerCase() === 'completed'
  const isCancelled = localStatus.toLowerCase() === 'cancelled'
  const isConfirmed = localStatus.toLowerCase() === 'confirmed' || localStatus.toLowerCase() === 'active'
  const isHighRisk = localRisk === 'High Risk' || localRisk === 'high'

  const handleCancel = () => {
    if (isCompleted) {
      toast.error("Completed appointments cannot be cancelled.")
      return
    }
    if (appointment.id && onCancelAppointment) {
      onCancelAppointment(appointment.id)
    }
  }

  // Handle completing appointment after actions
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
    <div className="flex flex-col h-full bg-card text-card-foreground border-l border-border w-full xl:w-[450px]">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {appointment.name || appointment.motherName || "Patient"} - {appointment.type || "Appointment"}
          </h2>
          <div className="flex items-center gap-2">
            <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${
              isCompleted 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                : isCancelled 
                ? 'bg-red-500/10 text-red-500' 
                : isConfirmed 
                ? 'bg-blue-500/10 text-blue-500' 
                : 'bg-amber-500/10 text-amber-500'
            }`}>
              {isCompleted || isConfirmed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {localStatus}
            </Badge>
            <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${isHighRisk ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
              <Activity className="h-3 w-3" />
              {localRisk || 'Low Risk'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Group A: Visit Details */}
        <div className="flex flex-col gap-4 p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-foreground">Visit Details</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">Date & Time</span>
              </div>
              <span className="text-xs text-foreground flex-1">{appointment.date || appointment.datetime || "N/A"}</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Stethoscope className="h-3.5 w-3.5" />
                <span className="text-xs">Purpose</span>
              </div>
              <span className="text-xs text-foreground flex-1">{appointment.type || "Prenatal Checkup"}</span>
            </div>
          </div>
        </div>

        {/* Group B: Maternal Vitals */}
        <div className="flex flex-col gap-4 p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-foreground">Maternal Vitals</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <HeartPulse className="h-3.5 w-3.5" />
                <span className="text-xs">Blood Pressure</span>
              </div>
              <span className="text-xs text-foreground flex-1">
                {latestVisit?.bp_systolic && latestVisit?.bp_diastolic
                  ? `${latestVisit.bp_systolic}/${latestVisit.bp_diastolic} mmHg`
                  : latestVisit?.blood_pressure || appointment.blood_pressure || "120/80 mmHg"}
              </span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <ActivitySquare className="h-3.5 w-3.5" />
                <span className="text-xs">Heart Rate</span>
              </div>
              <span className="text-xs text-foreground flex-1">
                {latestVisit?.pulse_rate_bpm || latestVisit?.heart_rate || appointment.heart_rate || "75"} bpm
              </span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Droplets className="h-3.5 w-3.5" />
                <span className="text-xs">Blood Sugar</span>
              </div>
              <span className="text-xs text-foreground flex-1">
                {latestVisit?.blood_sugar || appointment.blood_sugar || "90 mg/dL"}
              </span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Thermometer className="h-3.5 w-3.5" />
                <span className="text-xs">Body Temp</span>
              </div>
              <span className="text-xs text-foreground flex-1">
                {latestVisit?.temperature_celsius || appointment.temperature || "37.0"} °C
              </span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Weight className="h-3.5 w-3.5" />
                <span className="text-xs">Weight</span>
              </div>
              <span className="text-xs text-foreground flex-1">
                {latestVisit?.weight_kg || latestVisit?.weight || appointment.weight || "65"} kg
              </span>
            </div>

            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Wind className="h-3.5 w-3.5" />
                <span className="text-xs">Resp. Rate</span>
              </div>
              <span className="text-xs text-foreground flex-1">
                {latestVisit?.respiratory_rate || appointment.respiratory_rate || "22"} cpm
              </span>
            </div>
          </div>
        </div>

        {/* Group C: Fetal & Visit Metrics */}
        <div className="flex flex-col gap-4 p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-foreground">Fetal & Visit Metrics</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Baby className="h-3.5 w-3.5" />
                <span className="text-xs">Gestational Age</span>
              </div>
              <span className="text-xs text-foreground flex-1">
                {latestVisit?.age_of_gestation_weeks || latestVisit?.gestational_age || appointment.gestational_age || "24"} Weeks
              </span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <HeartPulse className="h-3.5 w-3.5" />
                <span className="text-xs">Fetal Heart Tone</span>
              </div>
              <span className="text-xs text-foreground flex-1">
                {latestVisit?.fetal_heart_tone_bpm || appointment.fetal_heart_tone || "140"} bpm
              </span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Ruler className="h-3.5 w-3.5" />
                <span className="text-xs">Fundic Height</span>
              </div>
              <span className="text-xs text-foreground flex-1">
                {latestVisit?.fundic_height_cm || appointment.fundic_height || "22"} cm
              </span>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="flex flex-col gap-4 p-4 pb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground">Activity Log</h3>
            <History className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Recent actions performed for this appointment.</p>
          
          <div className="flex gap-3 mt-1">
            <div className="flex flex-col items-center mt-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-foreground shrink-0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">Scheduled appointment</span>
              <span className="text-[10px] text-muted-foreground">{appointment.date || "Scheduled"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 pb-8 md:pb-4 border-t border-border flex flex-col gap-3">
        <Button 
          onClick={() => setVitalsModalOpen(true)}
          disabled={vitalsLogged || isCancelled}
          className="w-full h-8 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {vitalsLogged ? "Vitals Logged (Completed)" : "Log Vitals"}
        </Button>

        <Button 
          onClick={() => setPrescriptionModalOpen(true)}
          disabled={isCancelled}
          className="w-full h-8 text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Log Prescription
        </Button>

        {!isCancelled && !isCompleted && (
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="w-full h-8 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 border border-red-500/20"
          >
            Cancel Appointment
          </Button>
        )}
      </div>

      {/* Log Vitals Modal */}
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

      {/* Vitals Confirmation Modal */}
      {vitalsConfirmationData && (
        <ConfirmationModal
          open={showVitalsConfirmation}
          onOpenChange={setShowVitalsConfirmation}
          title="Prenatal Visit & Vitals Recorded"
          description={`The clinical vitals encounter and automated CDSS risk assessment have been successfully processed for ${appointment.name || appointment.motherName || "the patient"} and the appointment has been marked as Completed.`}
          type={vitalsConfirmationData.risk_level === "High Risk" ? "high-risk" : vitalsConfirmationData.risk_level === "Moderate Risk" ? "warning" : "success"}
          actionLabel="Acknowledge & Close"
          details={[
            { label: "Assessed Risk", value: vitalsConfirmationData.risk_level || "Normal" },
            { label: "TEWS Score", value: vitalsConfirmationData.tews_score ?? 0 },
            { label: "Appointment Status", value: "Completed" },
            { label: "Date Logged", value: new Date().toLocaleDateString() },
          ]}
        />
      )}

      {/* Prescription / Supplement Modal */}
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

      {/* Prescription Confirmation Modal */}
      <ConfirmationModal
        open={showPrescriptionConfirmation}
        onOpenChange={setShowPrescriptionConfirmation}
        title="Prescription Recorded"
        description={`Prescription / supplement has been successfully recorded for ${appointment.name || appointment.motherName || "the patient"}. The appointment has been marked as Completed.`}
        type="success"
        actionLabel="Acknowledge & Close"
        details={[
          { label: "Patient", value: appointment.name || appointment.motherName || "Patient" },
          { label: "Appointment Status", value: "Completed" },
          { label: "Record Status", value: "Saved & Enqueued for Sync" },
          { label: "Date Logged", value: new Date().toLocaleDateString() },
        ]}
      />
    </div>
  )
}

