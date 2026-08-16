import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, X, Calendar, Activity, ActivitySquare, HeartPulse, Stethoscope, Droplets, Thermometer, Weight, Wind, Baby, Ruler, History } from "lucide-react"
import { LogVitalsModal } from "./LogVitalsModal"

export function AppointmentSidepeek({ appointment, onClose }: { appointment: any, onClose: () => void }) {
  if (!appointment) return null

  // Defaults for styling since we're using mock data
  const isConfirmed = appointment.status === 'Confirmed'
  const isHighRisk = appointment.risk === 'High Risk'

  return (
    <div className="flex flex-col h-full bg-background dark:bg-background dark:bg-[#0a0a0a] border-l border-sidebar-border w-full xl:w-[450px]">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-sidebar-border flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-foreground dark:text-foreground dark:text-white">
            {appointment.name || appointment.motherName} - {appointment.type}
          </h2>
          <div className="flex items-center gap-2">
            <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${isConfirmed ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'}`}>
              {isConfirmed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
              {appointment.status || 'Pending'}
            </Badge>
            <Badge className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-medium border-none shadow-none ${isHighRisk ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
              <Activity className="h-3 w-3" />
              {appointment.risk || 'Low Risk'}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground dark:text-foreground dark:text-white" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Group A: Visit Details */}
        <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-foreground dark:text-white">Visit Details</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs">Date & Time</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">{appointment.date || appointment.datetime || "June 08, 2026 08:00 AM"}</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Stethoscope className="h-3.5 w-3.5" />
                <span className="text-xs">Purpose</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">{appointment.type || "Prenatal Checkup"}</span>
            </div>
          </div>
        </div>

        {/* Group B: Maternal Vitals */}
        <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-foreground dark:text-white">Maternal Vitals</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <HeartPulse className="h-3.5 w-3.5" />
                <span className="text-xs">Blood Pressure</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">120/80 mmHg</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <ActivitySquare className="h-3.5 w-3.5" />
                <span className="text-xs">Heart Rate</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">75 bpm</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Droplets className="h-3.5 w-3.5" />
                <span className="text-xs">Blood Sugar</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">90 mg/dL</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Thermometer className="h-3.5 w-3.5" />
                <span className="text-xs">Body Temp</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">37.0 °C</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Weight className="h-3.5 w-3.5" />
                <span className="text-xs">Weight</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">65 kg</span>
            </div>

            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Wind className="h-3.5 w-3.5" />
                <span className="text-xs">Resp. Rate</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">22 cpm</span>
            </div>
          </div>
        </div>

        {/* Group C: Fetal & Visit Metrics */}
        <div className="flex flex-col gap-4 p-4 border-b border-sidebar-border">
          <h3 className="text-xs font-semibold text-foreground dark:text-foreground dark:text-white">Fetal & Visit Metrics</h3>
          <div className="flex flex-col gap-3">
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Baby className="h-3.5 w-3.5" />
                <span className="text-xs">Gestational Age</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">24 Weeks</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <HeartPulse className="h-3.5 w-3.5" />
                <span className="text-xs">Fetal Heart Tone</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">140 bpm</span>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center gap-2 text-muted-foreground w-[160px] shrink-0">
                <Ruler className="h-3.5 w-3.5" />
                <span className="text-xs">Fundic Height</span>
              </div>
              <span className="text-xs text-foreground dark:text-white flex-1">22 cm</span>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="flex flex-col gap-4 p-4 pb-6">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground dark:text-foreground dark:text-white">Activity Log</h3>
            <History className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Recent actions performed by this user.</p>
          
          <div className="flex gap-3 mt-1">
            <div className="flex flex-col items-center mt-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-foreground dark:bg-white shrink-0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground dark:text-foreground dark:text-white">Created an appointment</span>
              <span className="text-[10px] text-muted-foreground">June 05, 2026 10:00 AM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 p-4 pb-8 md:pb-4 border-t border-sidebar-border flex flex-col gap-3">
        <LogVitalsModal>
          <Button className="w-full h-8 text-xs font-medium bg-[#111] text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-zinc-200">
            Log Vitals
          </Button>
        </LogVitalsModal>
        <Button className="w-full h-8 text-xs font-medium bg-[#e5e5e5] text-black hover:bg-[#d5d5d5] dark:bg-[#e5e5e5] dark:text-black">
          Log Prescription
        </Button>
        <Button variant="outline" className="w-full h-8 text-xs font-medium bg-[#1e1e1e] text-white hover:bg-[#2a2a2a] border border-sidebar-border dark:bg-[#1e1e1e] dark:text-foreground dark:text-white dark:border-sidebar-border">
          Cancel Appointment
        </Button>
      </div>
    </div>
  )
}
